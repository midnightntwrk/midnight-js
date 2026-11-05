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
import * as Ledger8Scope from './internal/ledger8-scope';
import * as Internal from './internal/transaction';
import type {
  AnyLedger8FinalizedCallTxData,
  AnyLedger8UnsubmittedCallTxData,
  Ledger8CircuitId,
  Ledger8Contract,
  Ledger8ContractProviders,
  Ledger8FinalizedCallTxData,
  Ledger8UnsubmittedCallTxData
} from './ledger8-contract';
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
  readonly [Internal.ScopeEra]: 'v9';
  readonly [Internal.Submit]: () => Promise<Ledger9FinalizedCallTxData<C, PCK>>;
  readonly [Internal.MergeUnsubmittedCallTxData]: (
    circuitId: PCK,
    callData: Ledger9UnsubmittedCallTxData<C, PCK>,
    privateStateTarget?: Internal.PrivateStateTarget
  ) => void;

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
 * Encapsulates the context of a contract-scoped transaction on a ledger 8 (pre-fork) network.
 *
 * Every call made with it is composed against the states the call before it ended on, and all of them
 * are submitted as one ledger 8 transaction when the scope's function returns.
 */
export interface Ledger8TransactionContext<
  C extends Ledger8Contract,
  PCK extends Ledger8CircuitId<C> = Ledger8CircuitId<C>
> {
  readonly [TypeId]: TypeId;
  readonly [Internal.ScopeEra]: 'v8';

  /**
   * Gets the additional scoped {@link CoinPublicKey} to {@link EncPublicKey} mappings.
   *
   * @return A `ReadonlyMap`<{@link CoinPublicKey}, {@link EncPublicKey}> instance, or `undefined` if no additional
   * mappings were specified for the current transaction context.
   */
  getAdditionalMappings(): ReadonlyMap<CoinPublicKey, EncPublicKey> | undefined;

  /**
   * Gets the last unsubmitted call transaction data.
   *
   * @return A tuple containing an {@link Ledger8UnsubmittedCallTxData} instance, and an optional private state
   * ID, or `undefined` if circuit calls are yet to be made. The running private state is
   * `getLastUnsubmittedCallTxDataToTransact()?.[0].private.nextPrivateState`.
   */
  getLastUnsubmittedCallTxDataToTransact(): [Ledger8UnsubmittedCallTxData<C, PCK>, PrivateStateId?] | undefined;
}

/** A {@link Ledger8TransactionContext} of any ledger 8 contract. */
export type AnyLedger8TransactionContext = Ledger8TransactionContext<Ledger8Contract, Ledger8CircuitId<Ledger8Contract>>;

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
  Internal.isLedger9ScopeContext;

/**
 * Type guard to determine if a value is a Ledger8TransactionContext.
 *
 * @param u The value to check.
 * @returns `true` if `u` is a {@link Ledger8TransactionContext}, otherwise `false`.
 */
export const isLedger8TransactionContext: (u: unknown) => u is AnyLedger8TransactionContext =
  Ledger8Scope.isLedger8ScopeContext;

/**
 * Executes a function within the context of a contract-scoped transaction, on the ledger era the
 * network head is on: a ledger 8 head runs {@link withLedger8ContractScopedTransaction}, a ledger 9 head
 * {@link withLedger9ContractScopedTransaction}.
 *
 * @param providers The contract providers to use within the transaction.
 * @param fn The function to execute within the transaction context.
 * @param options Optional transaction scope options.
 * @returns A `Promise` that resolves with the finalized transaction data of the single transaction
 * created for all circuit calls made within `fn`.
 *
 * @remarks
 * Where `fn` makes circuit calls, these are batched together and submitted as a single transaction when
 * the function completes successfully. If `fn` throws an error, any unsubmitted circuit calls are discarded.
 *
 * The ledger era this scope runs against is read ONCE, before `fn` runs, and every call merged into
 * the scope shares that one reading. Before the hard fork the scope takes calls against contracts
 * produced by the ledger 8 Compact toolchain; type `fn`'s parameter as {@link Ledger8TransactionContext}
 * to call them. After the fork it takes calls against contracts produced by the ledger 9 toolchain, and a
 * ledger 8 contract's calls are submitted individually with `submitCallTx`.
 */
type Ledger9ScopeBody<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>> = (
  txCtx: Ledger9TransactionContext<C, PCK>
) => Promise<void>;

type Ledger8ScopeBody = (txCtx: AnyLedger8TransactionContext) => Promise<void>;

export function withContractScopedTransaction<
  C extends Contract.Any,
  PCK extends Contract.ProvableCircuitId<C> = Contract.ProvableCircuitId<C>
>(
  providers: Ledger9ContractProviders<C, PCK>,
  fn: (txCtx: Ledger9TransactionContext<C, PCK>) => Promise<void>,
  options?: ScopedTransactionOptions
): Promise<Ledger9FinalizedCallTxData<C, PCK>>;

/**
 * Executes a function within a contract-scoped transaction on a ledger 8 (pre-fork) network. The rules
 * are those of the overload above.
 */
export function withContractScopedTransaction<C extends Ledger8Contract, PCK extends Ledger8CircuitId<C>>(
  providers: Ledger8ContractProviders<C, PCK>,
  fn: (txCtx: Ledger8TransactionContext<C, PCK>) => Promise<void>,
  options?: ScopedTransactionOptions
): Promise<Ledger8FinalizedCallTxData<C, PCK>>;

export async function withContractScopedTransaction<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: Ledger9ContractProviders<C, PCK>,
  fn: Ledger9ScopeBody<C, PCK> | Ledger8ScopeBody,
  options?: ScopedTransactionOptions
): Promise<Ledger9FinalizedCallTxData<C, PCK> | AnyLedger8FinalizedCallTxData | AnyLedger8UnsubmittedCallTxData> {
  // The overload the caller chose types `fn` for one era; the head decides which context it is called
  // with. A function typed for the other era is refused at its first call, which names the mismatch.
  const ledger9Body = fn as Ledger9ScopeBody<C, PCK>;
  const ledger8Body = fn as Ledger8ScopeBody;
  assertValidMidnightConfig(providers.config);
  if (Ledger8Scope.isLedger8ScopeContext(options)) {
    return Ledger8Scope.nestLedger8Scope(ledger8Body, options);
  }
  if (Internal.isTransactionContext<C, PCK>(options)) {
    return Internal.scopedTransaction(providers, ledger9Body, options);
  }
  const reading = await Internal.readScopeHead(providers.publicDataProvider, providers.loggerProvider);
  switch (reading.head) {
    case 'v9':
      return Internal.scopedTransaction(providers, ledger9Body, options, { ...reading, head: reading.head });
    case 'v8':
      return Ledger8Scope.runLedger8Scope(providers, ledger8Body, options, reading);
    default:
      return assertNever(reading.head, 'withContractScopedTransaction');
  }
}

/**
 * Executes a function within a contract-scoped transaction on a ledger 8 (pre-fork) head. The rules are
 * those of {@link withContractScopedTransaction}.
 *
 * @throws {EraMismatchError} with reason `'scope-era-mismatch'` when the network is not on ledger 8.
 *         Raised before `fn` runs, and before the ledger 8 runtime is loaded.
 */
export function withLedger8ContractScopedTransaction<C extends Ledger8Contract, PCK extends Ledger8CircuitId<C>>(
  providers: Ledger8ContractProviders<C, PCK>,
  fn: (txCtx: Ledger8TransactionContext<C, PCK>) => Promise<void>,
  options?: ScopedTransactionOptions
): Promise<Ledger8FinalizedCallTxData<C, PCK>>;

export async function withLedger8ContractScopedTransaction(
  providers: Ledger8ContractProviders<Ledger8Contract, string>,
  fn: Ledger8ScopeBody,
  options?: ScopedTransactionOptions
): Promise<AnyLedger8FinalizedCallTxData | AnyLedger8UnsubmittedCallTxData> {
  assertValidMidnightConfig(providers.config);
  if (Ledger8Scope.isLedger8ScopeContext(options)) {
    return Ledger8Scope.nestLedger8Scope(fn, options);
  }
  const reading = await Internal.readScopeHead(providers.publicDataProvider, providers.loggerProvider);
  if (reading.head !== 'v8') {
    throw Internal.scopeEraMismatch('withLedger8ContractScopedTransaction', reading.head);
  }
  return Ledger8Scope.runLedger8Scope(providers, fn, options, reading);
}

/**
 * Executes a function within a contract-scoped transaction on a ledger 9 head. The rules are those of
 * {@link withContractScopedTransaction}.
 *
 * @throws {EraMismatchError} with reason `'scope-era-mismatch'` when the network is not on ledger 9.
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
