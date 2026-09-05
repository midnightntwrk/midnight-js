/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
import { type AnyProvableCircuitId, type FinalizedTxData } from '@midnight-ntwrk/midnight-js-types';

import { type ContractProviders } from './contract-providers';
import type { FoundContract } from './find-deployed-contract';
import * as Internal from './internal/bundle';
import {
  type ScopedTransactionOptions,
  type TransactionContext
} from './transaction';

/**
 * The aggregate return value of {@link withMultiContractScopedTransaction}. Mirrors
 * the shape of {@link FinalizedCallTxData} but for a transaction containing more
 * than one contract call. The per-call records carry private data the caller may
 * need to apply additional state updates beyond the wallet's automatic private-state
 * persistence.
 */
export interface BundledFinalizedTxData {
  /**
   * Public on-chain data of the bundled transaction. Status is guaranteed to be
   * `SucceedEntirely` if {@link withMultiContractScopedTransaction} returned
   * normally; non-success statuses are reported via {@link CallTxFailedError}.
   */
  readonly public: FinalizedTxData;

  /**
   * Per-call records in submission order. Each record carries the contract address,
   * private state ID (if any), circuit ID, and the {@link UnsubmittedCallTxData}
   * the SDK produced for that call.
   */
  readonly calls: readonly Internal.InFlightCall[];
}

/**
 * The contract-polymorphic transaction context handed to the
 * {@link withMultiContractScopedTransaction} callback. Structurally a
 * {@link TransactionContext}<{@link Contract.Any}, {@link AnyProvableCircuitId}>
 * so that the SDK's per-call merge protocol accepts it as the outer scope; in
 * addition exposes {@link MultiContractTransactionContext.for} for ergonomic
 * typed widening at each `callTx` invocation.
 */
export interface MultiContractTransactionContext
  extends TransactionContext<Contract.Any, AnyProvableCircuitId> {
  /**
   * Returns this same context typed for `contract`. Required because each
   * `FoundContract`'s circuit-call interface is statically typed at its own
   * `(C, PCK)`, and our context is intentionally type-erased so a single
   * instance may be threaded through calls to heterogeneous contracts.
   *
   * Pure widening: no runtime work is performed; the same instance is returned.
   *
   * @example
   * ```ts
   * await withMultiContractScopedTransaction(providers, async (txCtx) => {
   *   await sender.callTx.send(txCtx.for(sender), ...);
   *   await recipient.callTx.receive(txCtx.for(recipient), ...);
   * });
   * ```
   */
  for<
    C extends Contract.Any,
    PCK extends Contract.ProvableCircuitId<C> = Contract.ProvableCircuitId<C>
  >(contract: FoundContract<C>): TransactionContext<C, PCK>;
}

/**
 * Executes a function within the context of a multi-contract scoped transaction.
 * Calls to `contract.callTx.<circuit>(ctx.for(contract), ...)` made inside `fn` are
 * collected and bundled into a single intent of a single ledger transaction segment
 * that is proved, balanced, and submitted when `fn` resolves. Each participating
 * contract's private state is persisted on success.
 *
 * @param providers The contract providers to use within the transaction.
 * @param fn The function to execute within the transaction context.
 * @param options Optional transaction scope options.
 * @returns A `Promise` that resolves with the finalized public transaction data and
 *   the per-call records produced for all circuit calls made within `fn`.
 *
 * @remarks
 * Joint transcript partitioning across all bundled calls is performed at submission
 * time via the ledger's {@link Transaction.addCalls} API. This is the property that
 * matters for cross-contract value flows: the ledger's effects-check matches a
 * sender's `claimed_unshielded_spends` against the recipient contract's
 * `unshielded_inputs` only when both calls land in the same intent segment AND the
 * same guaranteed/fallible half. Independent per-call partitioning (the alternative
 * to joint partitioning) cannot guarantee that alignment.
 *
 * Where `fn` makes multiple circuit calls to the same contract, the second and
 * subsequent calls observe the in-flight contract state produced by their
 * predecessors. This mirrors the same-identity behaviour of
 * {@link withContractScopedTransaction}.
 *
 * If `fn` throws an error, no submission is attempted and the error is re-thrown
 * wrapped with the scope name. If submission fails, a {@link CallTxFailedError} is
 * thrown with the finalized transaction data and the array of circuit IDs.
 */
export const withMultiContractScopedTransaction: (
  providers: ContractProviders<Contract.Any, AnyProvableCircuitId>,
  fn: (txCtx: MultiContractTransactionContext) => Promise<void>,
  options?: ScopedTransactionOptions
) => Promise<BundledFinalizedTxData> = (providers, fn, options) =>
  Internal.bundleScoped(providers, fn, options);
