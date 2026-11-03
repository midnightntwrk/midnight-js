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

import type { CoinPublicKey, EncPublicKey } from '@midnight-ntwrk/midnight-js-protocol/v9';
import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js/effect/Contract';
import { type PrivateStateId, type PublicStatesRead } from '@midnight-ntwrk/midnight-js-types';
import { assertNever, assertValidMidnightConfig } from '@midnight-ntwrk/midnight-js-utils';

import { type Ledger9ContractProviders } from './contract-providers';
import type { Ledger9ContractStates, Ledger9PublicStates } from './internal/era';
import * as Internal from './internal/transaction';
import type { Ledger9FinalizedCallTxData, Ledger9UnsubmittedCallTxData } from './tx-model';

export const TypeId: unique symbol = Internal.TypeId;
export type TypeId = typeof TypeId;

/**
 * Encapsulates the context for managing a scoped contract transaction.
 */
export interface Ledger9TransactionContext<
  C extends Contract.Any,
  PCK extends Contract.ProvableCircuitId<C> = Contract.ProvableCircuitId<C>
> {
  readonly [TypeId]: TypeId;
  readonly [Internal.Submit]: () => Promise<Ledger9FinalizedCallTxData<C, PCK>>;
  readonly [Internal.MergeUnsubmittedCallTxData]: (
    circuitId: PCK,
    callData: Ledger9UnsubmittedCallTxData<C, PCK>,
    privateStateId?: PrivateStateId
  ) => void;
  readonly [Internal.CacheStates]: (
    states: Ledger9ContractStates<Contract.PrivateState<C>> | Ledger9PublicStates,
    read: PublicStatesRead,
    identity: Internal.CachedStateIdentity,
    blockHash: string
  ) => void;
  readonly [Internal.GetCurrentStatesForIdentity]: (
    identity: Internal.CachedStateIdentity
  ) => Internal.PinnedContractStates<Contract.PrivateState<C>> | undefined;

  /**
   * Gets the additional scoped {@link CoinPublicKey} to {@link EncPublicKey} mappings.
   *
   * @return A `ReadonlyMap`<{@link CoinPublicKey}, {@link EncPublicKey}> instance, or `undefined` if no additional
   * mappings were specified for the current transaction context.
   */
  getAdditionalMappings(): ReadonlyMap<CoinPublicKey, EncPublicKey> | undefined;

  /**
   * Gets the public states of the contract within the transaction context, as bytes. Decode them with
   * your own runtime, as with `getStates`: `states.contractState.deserialize({ v9: ContractState })`.
   *
   * @return The public states, or `undefined` if circuit calls are yet to be made.
   *
   * @remarks
   * The contract state is the unsubmitted _running_ state of the contract within the transaction context,
   * reflecting any unsubmitted circuit calls made to the contract during the scope of the transaction. The
   * ledger parameters and the zswap chain state are those of the block the scope was first read at. The
   * running private state is `getLastUnsubmittedCallTxDataToTransact()?.[0].private.nextPrivateState`.
   */
  getCurrentStates(): PublicStatesRead | undefined;

  /**
   * Gets the last unsubmitted call transaction data.
   *
   * @return A tuple containing an {@link Ledger9UnsubmittedCallTxData} instance, and an optional private state
   * ID, or `undefined` if circuit calls are yet to be made.
   */
  getLastUnsubmittedCallTxDataToTransact(): [Ledger9UnsubmittedCallTxData<C, PCK>, PrivateStateId?] | undefined;
}

/**
 * Options for use when creating scoped transactions.
 */
export interface ScopedTransactionOptions {
  /**
   * An optional name for the transaction scope.
   */
  readonly scopeName?: string;

  /**
   * An optional mapping of {@link CoinPublicKey} to {@link EncPublicKey} that can be used to resolve encryption
   * keys for coins created during circuit execution.
   */
  readonly additionalCoinEncPublicKeyMappings?: ReadonlyMap<CoinPublicKey, EncPublicKey>;
}

/**
 * Type guard to determine if a value is a Ledger9TransactionContext.
 *
 * @param u The value to check.
 * @returns `true` if `u` is a {@link Ledger9TransactionContext}, otherwise `false`.
 */
export const isLedger9TransactionContext: (u: unknown) => u is Ledger9TransactionContext<Contract.Any> =
  Internal.isTransactionContext;

/**
 * Executes a function within the context of a contract-scoped transaction, on the ledger era the
 * network head is on. A ledger 9 head runs {@link withLedger9ContractScopedTransaction}.
 *
 * @param providers The contract providers to use within the transaction.
 * @param fn The function to execute within the transaction context.
 * @param options Optional transaction scope options.
 * @returns A `Promise` that resolves with the finalized transaction data of the single transaction
 * created for all circuit calls made within `fn`.
 *
 * @throws {EraMismatchError} with reason `'scope-on-ledger8-network'` when the network is on a ledger
 *         era that composes only one call per transaction, so has nothing for a scope to batch into.
 *         Raised before `fn` runs, so no circuit is executed and no private state is touched.
 *
 * @remarks
 * Where `fn` makes circuit calls, these are batched together and submitted as a single transaction when
 * the function completes successfully. If `fn` throws an error, any unsubmitted circuit calls are discarded.
 *
 * The ledger era this scope runs against is read ONCE, before `fn` runs, and every call merged into
 * the scope shares that one reading — the same single-snapshot discipline the scope already applies
 * to the block it pins. A contract produced by the retained Compact toolchain cannot join a scope at
 * all; submit those calls individually with `submitCallTx`.
 */
export const withContractScopedTransaction: <
  C extends Contract.Any,
  PCK extends Contract.ProvableCircuitId<C> = Contract.ProvableCircuitId<C>
>(
  providers: Ledger9ContractProviders<C, PCK>,
  fn: (txCtx: Ledger9TransactionContext<C, PCK>) => Promise<void>,
  options?: ScopedTransactionOptions
) => Promise<Ledger9FinalizedCallTxData<C, PCK>> =
  async <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
    providers: Ledger9ContractProviders<C, PCK>,
    fn: (txCtx: Ledger9TransactionContext<C, PCK>) => Promise<void>,
    options?: ScopedTransactionOptions
  ): Promise<Ledger9FinalizedCallTxData<C, PCK>> => {
    assertValidMidnightConfig(providers.config);
    if (Internal.isTransactionContext<C, PCK>(options)) {
      return Internal.scopedTransaction(providers, fn, options);
    }
    const reading = await Internal.readScopeHead(providers.publicDataProvider, providers.loggerProvider);
    switch (reading.head) {
      case 'v9':
        return Internal.scopedTransaction(providers, fn, options, { ...reading, head: reading.head });
      case 'v8':
        throw Internal.scopeRefusal(reading.head);
      default:
        return assertNever(reading.head, 'withContractScopedTransaction');
    }
  };

/**
 * Executes a function within a contract-scoped transaction on a ledger 9 head. The rules are those of
 * {@link withContractScopedTransaction}.
 *
 * @throws {EraMismatchError} with reason `'scope-on-ledger8-network'` when the network is not on ledger 9.
 *         Raised before `fn` runs.
 */
export const withLedger9ContractScopedTransaction: <
  C extends Contract.Any,
  PCK extends Contract.ProvableCircuitId<C> = Contract.ProvableCircuitId<C>
>(
  providers: Ledger9ContractProviders<C, PCK>,
  fn: (txCtx: Ledger9TransactionContext<C, PCK>) => Promise<void>,
  options?: ScopedTransactionOptions
) => Promise<Ledger9FinalizedCallTxData<C, PCK>> =
  async (providers, fn, options?) => {
    assertValidMidnightConfig(providers.config);
    return Internal.scopedTransaction(providers, fn, options);
  };
