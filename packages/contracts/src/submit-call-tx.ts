/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ContractExecutable } from '@midnight-ntwrk/compact-js';
import type { Contract } from '@midnight-ntwrk/compact-js/effect/Contract';
import { assertDefined, assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';

import { type CallResult } from './call';
import { type ContractProviders } from './contract-providers';
import { CallTxFailedError, IncompleteCallTxPrivateStateConfig } from './errors';
import * as Transaction from './internal/transaction';
import type { SubmitTxProviders } from './submit-tx';
import { submitTxAsync } from './submit-tx';
import { type TransactionContext } from './transaction';
import type { FinalizedCallTxData, SubmittedCallTx } from './tx-model';
import {
  type CallTxOptions,
  type CallTxOptionsBase,
  type CallTxOptionsWithPrivateStateId,
  createUnprovenCallTx
} from './unproven-call-tx';

export type SubmitCallTxProviders<C extends Contract.Any, ICK extends Contract.ImpureCircuitId<C>> =
  | ContractProviders<C>
  | SubmitTxProviders<C, ICK>;

export async function submitCallTx<C extends Contract<undefined>, ICK extends Contract.ImpureCircuitId<C>>(
  providers: SubmitTxProviders<C, ICK>,
  options: CallTxOptionsBase<C, ICK>
): Promise<FinalizedCallTxData<C, ICK>>;

export async function submitCallTx<C extends Contract.Any, ICK extends Contract.ImpureCircuitId<C>>(
  providers: ContractProviders<C>,
  options: CallTxOptionsWithPrivateStateId<C, ICK>
): Promise<FinalizedCallTxData<C, ICK>>;

export async function submitCallTx<C extends Contract.Any, ICK extends Contract.ImpureCircuitId<C>>(
  providers: ContractProviders<C>,
  options: CallTxOptionsWithPrivateStateId<C, ICK>,
  transactionContext: TransactionContext<C, ICK>
): Promise<CallResult<C, ICK>>;

export async function submitCallTx<C extends Contract<undefined>, ICK extends Contract.ImpureCircuitId<C>>(
  providers: SubmitTxProviders<C, ICK>,
  options: CallTxOptionsBase<C, ICK>,
  transactionContext: TransactionContext<C, ICK>
): Promise<CallResult<C, ICK>>;

 /**
 * Creates and submits a transaction for the invocation of a circuit on a given contract.
 *
 * ## Transaction Execution Phases
 *
 * Midnight transactions execute in two phases:
 * 1. **Guaranteed phase**: If failure occurs, the transaction is NOT included in the blockchain
 * 2. **Fallible phase**: If failure occurs, the transaction IS recorded on-chain as a partial success
 *
 * ## Failure Behavior
 *
 * **Guaranteed Phase Failure:**
 * - Transaction is rejected and not included in the blockchain
 * - `CallTxFailedError` is thrown with transaction data and circuit ID
 * - Private state updates are NOT stored (state remains unchanged)
 * - No on-chain record of the failed transaction
 *
 * **Fallible Phase Failure:**
 * - Transaction is recorded on-chain with non-`SucceedEntirely` status
 * - `CallTxFailedError` is thrown with transaction data and circuit ID
 * - Private state updates are NOT stored (state remains unchanged)
 * - Transaction appears in blockchain history as partial success
 *
 * @param providers The providers used to manage the invocation lifecycle.
 * @param options Configuration.
 * @param transactionContext Optional scoped transaction context to participate in an
 *        existing transaction scope.
 *
 * @returns A `Promise` that resolves with the finalized transaction data for the invocation of
 *         `circuitId` on `contract` with the given `args`; or rejects with an error if the invocation fails.
 *
 * @throws {CallTxFailedError} When transaction fails in either guaranteed or fallible phase.
 *         The error contains the finalized transaction data and circuit ID for debugging.
 */
export async function submitCallTx<C extends Contract.Any, ICK extends Contract.ImpureCircuitId<C>>(
  providers: SubmitCallTxProviders<C, ICK>,
  options: CallTxOptions<C, ICK>,
  transactionContext?: TransactionContext<C, ICK>
): Promise<FinalizedCallTxData<C, ICK> | CallResult<C, ICK>> {
  assertIsContractAddress(options.contractAddress);
  assertDefined(
    ContractExecutable.make(options.compiledContract)
      .getImpureCircuitIds()
      .find((circuitId) => circuitId as unknown as ICK === options.circuitId),
    `Circuit '${options.circuitId}' is undefined`
  );

  const hasPrivateStateProvider = 'privateStateProvider' in providers;
  const hasPrivateStateId = 'privateStateId' in options;

  if (hasPrivateStateId && !hasPrivateStateProvider) {
    throw new IncompleteCallTxPrivateStateConfig();
  }

  if (hasPrivateStateProvider) {
    providers.privateStateProvider.setContractAddress(options.contractAddress);
  }

  const callTxFn = async (txCtx: TransactionContext<C, ICK>) => {
    Transaction.mergeUnsubmittedCallTxData(
      txCtx,
      options.circuitId,
      await createUnprovenCallTx(providers, options, txCtx),
      hasPrivateStateId ? options.privateStateId : undefined
    );
  };

  return transactionContext
    ? Transaction.scoped(providers as ContractProviders<C, ICK>, callTxFn, transactionContext)
    : Transaction.scoped(providers as ContractProviders<C, ICK>, callTxFn)
}

/**
 * Creates and submits a transaction for the invocation of a circuit on a given contract,
 * returning immediately after submission without waiting for finalization.
 *
 * Unlike {@link submitCallTx}, this function does not wait for transaction finalization,
 * check transaction status, or update private state. The caller must handle these steps manually.
 *
 * ## Transaction Execution Phases
 *
 * Midnight transactions execute in two phases:
 * 1. **Guaranteed phase**: If failure occurs, the transaction is NOT included in the blockchain
 * 2. **Fallible phase**: If failure occurs, the transaction IS recorded on-chain as a partial success
 *
 * ## Manual Post-Submission Steps
 *
 * After calling this function, you must manually:
 * 1. Watch for transaction finalization using `providers.publicDataProvider.watchForTxData(txId)`
 * 2. Check transaction status (compare against `SucceedEntirely`)
 * 3. Handle failures appropriately (throw errors, log, etc.)
 * 4. Update private state if transaction succeeded and `privateStateId` was provided
 *
 * ## Failure Behavior (Manual Handling Required)
 *
 * **Guaranteed Phase Failure:**
 * - Transaction is rejected and not included in the blockchain
 * - `watchForTxData` may reject or return error status
 * - You must NOT store private state updates
 *
 * **Fallible Phase Failure:**
 * - Transaction is recorded on-chain with non-`SucceedEntirely` status
 * - `watchForTxData` returns transaction data with failed status
 * - You must NOT store private state updates
 * - Transaction appears in blockchain history as partial success
 *
 * @param providers The providers used to manage the invocation lifecycle.
 * @param options Configuration.
 *
 * @returns A `Promise` that resolves with the transaction ID and call transaction data immediately after submission;
 *         or rejects with an error if the submission fails.
 *
 * @example
 * ```typescript
 * // 1. Submit
 * const { txId, callTxData } = await submitCallTxAsync(providers, options);
 *
 * // 2. Watch (when ready)
 * const finalizedData = await providers.publicDataProvider.watchForTxData(txId);
 *
 * // 3. Check status
 * if (finalizedData.status !== SucceedEntirely) {
 *   throw new CallTxFailedError(finalizedData, options.circuitId);
 * }
 *
 * // 4. Update private state manually if needed
 * if (options.privateStateId) {
 *   await providers.privateStateProvider.set(
 *     privateStateId,
 *     callTxData.private.nextPrivateState
 *   );
 * }
 * ```
 */
export async function submitCallTxAsync<C extends Contract.Any, ICK extends Contract.ImpureCircuitId<C>>(
  providers: SubmitCallTxProviders<C, ICK>,
  options: CallTxOptions<C, ICK>
): Promise<SubmittedCallTx<C, ICK>> {
  assertIsContractAddress(options.contractAddress);
  assertDefined(
    ContractExecutable.make(options.compiledContract)
      .getImpureCircuitIds()
      .find((circuitId) => circuitId as unknown as ICK === options.circuitId),
    `Circuit '${options.circuitId}' is undefined`
  );

  const hasPrivateStateProvider = 'privateStateProvider' in providers;
  const hasPrivateStateId = 'privateStateId' in options;

  if (hasPrivateStateId && !hasPrivateStateProvider) {
    throw new IncompleteCallTxPrivateStateConfig();
  }

  if (hasPrivateStateProvider) {
    providers.privateStateProvider.setContractAddress(options.contractAddress);
  }

  const unprovenCallTxData = await createUnprovenCallTx(providers, options);

  const txId = await submitTxAsync(providers, {
    unprovenTx: unprovenCallTxData.private.unprovenTx,
    circuitId: options.circuitId
  });

  return {
    txId,
    callTxData: unprovenCallTxData
  };
}
