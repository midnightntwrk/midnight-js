/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
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

import { ContractExecutable } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
import { assertDefined, assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';

import { type CallResult } from './call';
import { type ContractProviders } from './contract-providers';
import { CallTxFailedError, IncompleteCallTxPrivateStateConfig } from './errors';
import { isLedger8Request } from './internal/era';
import * as Transaction from './internal/transaction';
import {
  type AnyLedger8CallTxOptions,
  type AnyLedger8FinalizedCallTxData,
  type AnyLedger8SubmittedCallTx,
  LEDGER8_PIPELINE_NOT_WIRED,
  type Ledger8CallTxOptions,
  type Ledger8CircuitId,
  type Ledger8Contract,
  type Ledger8ContractProviders,
  type Ledger8FinalizedCallTxData,
  type Ledger8SubmittedCallTx
} from './ledger8-contract';
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

export type SubmitCallTxProviders<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>> =
  | ContractProviders<C>
  | SubmitTxProviders<C, PCK>;

/**
 * The retained-era arm. Accepts a contract produced by the PREVIOUS Compact toolchain, passed as
 * the raw contract instance rather than inside a `CompiledContract` container. It accepts the
 * shape but cannot execute it yet — see {@link LEDGER8_PIPELINE_NOT_WIRED}.
 *
 * ARM ORDER IS LOAD-BEARING, in two ways, and both are pinned by
 * `src/test/typecheck/overloads.test-d.ts`. This arm is declared FIRST so no current-era arm can
 * shadow it, and the LAST arm is left exactly as it was before this arm existed, because
 * `ReturnType<typeof f>` and `Parameters<typeof f>` both resolve from it and so does the error
 * TypeScript prints when no arm matches. See the module documentation in `./ledger8-contract.ts`.
 */
export async function submitCallTx<C extends Ledger8Contract, K extends Ledger8CircuitId<C>>(
  providers: Ledger8ContractProviders<C, K>,
  options: Ledger8CallTxOptions<C, K>
): Promise<Ledger8FinalizedCallTxData<C, K>>;

export async function submitCallTx<C extends Contract<undefined>, PCK extends Contract.ProvableCircuitId<C>>(
  providers: SubmitTxProviders<C, PCK>,
  options: CallTxOptionsBase<C, PCK>
): Promise<FinalizedCallTxData<C, PCK>>;

export async function submitCallTx<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: ContractProviders<C>,
  options: CallTxOptionsWithPrivateStateId<C, PCK>
): Promise<FinalizedCallTxData<C, PCK>>;

export async function submitCallTx<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: ContractProviders<C>,
  options: CallTxOptionsWithPrivateStateId<C, PCK>,
  transactionContext: TransactionContext<C, PCK>
): Promise<CallResult<C, PCK>>;

export async function submitCallTx<C extends Contract<undefined>, PCK extends Contract.ProvableCircuitId<C>>(
  providers: SubmitTxProviders<C, PCK>,
  options: CallTxOptionsBase<C, PCK>,
  transactionContext: TransactionContext<C, PCK>
): Promise<CallResult<C, PCK>>;

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
 *
 * @remarks
 * The returned {@link FinalizedCallTxData} (and the {@link CallResult} variant)
 * is privacy-sensitive and carries the unproven transaction and private
 * state. See those types for handling guidance before logging, serializing,
 * or transmitting the result.
 */
export async function submitCallTx<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: SubmitCallTxProviders<C, PCK>,
  options: CallTxOptions<C, PCK> | AnyLedger8CallTxOptions,
  transactionContext?: TransactionContext<C, PCK>
): Promise<FinalizedCallTxData<C, PCK> | CallResult<C, PCK> | AnyLedger8FinalizedCallTxData> {
  if (isLedger8Request<AnyLedger8CallTxOptions>(options)) {
    throw new Error(LEDGER8_PIPELINE_NOT_WIRED);
  }
  assertIsContractAddress(options.contractAddress);
  assertDefined(
    ContractExecutable.make(options.compiledContract)
      .getProvableCircuitIds()
      .find((circuitId) => circuitId as unknown as PCK === options.circuitId), // eslint-disable-line no-restricted-syntax
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

  const callTxFn = async (txCtx: TransactionContext<C, PCK>) => {
    Transaction.mergeUnsubmittedCallTxData(
      txCtx,
      options.circuitId,
      await createUnprovenCallTx(providers, options, txCtx),
      hasPrivateStateId ? options.privateStateId : undefined
    );
  };

  return transactionContext
    ? Transaction.scoped(providers as ContractProviders<C, PCK>, callTxFn, transactionContext)
    : Transaction.scoped(providers as ContractProviders<C, PCK>, callTxFn)
}

/**
 * The retained-era arm. Accepts a contract produced by the PREVIOUS Compact toolchain, passed as
 * the raw contract instance rather than inside a `CompiledContract` container. It accepts the
 * shape but cannot execute it yet — see {@link LEDGER8_PIPELINE_NOT_WIRED}.
 *
 * ARM ORDER IS LOAD-BEARING, in two ways, and both are pinned by
 * `src/test/typecheck/overloads.test-d.ts`. This arm is declared FIRST so no current-era arm can
 * shadow it, and the LAST arm is left exactly as it was before this arm existed, because
 * `ReturnType<typeof f>` and `Parameters<typeof f>` both resolve from it and so does the error
 * TypeScript prints when no arm matches. See the module documentation in `./ledger8-contract.ts`.
 */
export async function submitCallTxAsync<C extends Ledger8Contract, K extends Ledger8CircuitId<C>>(
  providers: Ledger8ContractProviders<C, K>,
  options: Ledger8CallTxOptions<C, K>
): Promise<Ledger8SubmittedCallTx<C, K>>;

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
 * @remarks
 * The returned {@link SubmittedCallTx} is privacy-sensitive and carries the
 * unproven transaction and private state via `callTxData`. See that type for
 * handling guidance before logging, serializing, or transmitting the result.
 *
 * @example
 * ```typescript
 * // 1. Submit
 * const { txId, callTxData } = await submitCallTxAsync(providers, options);
 *
 * // 2. Watch (when ready). The read surface reports both ledger eras, so the
 * //    record is version-tagged.
 * const record = await providers.publicDataProvider.watchForTxData(txId);
 *
 * // 3. Narrow to the v9 arm. This flow submits v9 transactions only, so a v8
 * //    record means the provider is pointed at the wrong network.
 * if (record.version !== 'v9') {
 *   throw new EraInvariantViolationError('watchForTxData', options.circuitId);
 * }
 *
 * // 4. Check status
 * if (record.status !== SucceedEntirely) {
 *   throw new CallTxFailedError(record, options.circuitId);
 * }
 *
 * // 5. Update private state manually if needed
 * if (options.privateStateId) {
 *   await providers.privateStateProvider.set(
 *     privateStateId,
 *     callTxData.private.nextPrivateState
 *   );
 * }
 * ```
 */
export async function submitCallTxAsync<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: SubmitCallTxProviders<C, PCK>,
  options: CallTxOptions<C, PCK>
): Promise<SubmittedCallTx<C, PCK>>;

export async function submitCallTxAsync<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: SubmitCallTxProviders<C, PCK>,
  options: CallTxOptions<C, PCK> | AnyLedger8CallTxOptions
): Promise<SubmittedCallTx<C, PCK> | AnyLedger8SubmittedCallTx> {
  if (isLedger8Request<AnyLedger8CallTxOptions>(options)) {
    throw new Error(LEDGER8_PIPELINE_NOT_WIRED);
  }
  assertIsContractAddress(options.contractAddress);
  assertDefined(
    ContractExecutable.make(options.compiledContract)
      .getProvableCircuitIds()
      .find((circuitId) => circuitId as unknown as PCK === options.circuitId), // eslint-disable-line no-restricted-syntax
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
