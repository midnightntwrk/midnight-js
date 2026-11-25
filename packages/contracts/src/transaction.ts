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

import type { CoinPublicKey, ContractAddress, EncPublicKey, ZswapSecretKeys } from '@midnightntwrk/midnight-js-protocol/v9';
import type { Contract } from '@midnightntwrk/midnight-js-protocol/v9/compact-js/effect/Contract';
import { type AnyProvableCircuitId, type PrivateStateId, type PublicStatesRead } from '@midnightntwrk/midnight-js-types';
import { assertNever, assertValidMidnightConfig } from '@midnightntwrk/midnight-js-utils';

import { type Ledger9CallResult } from './call';
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
 *
 * `C` and `PCK` type what the scope returns: the data of its last call, typed by this contract. A
 * call made in the scope is typed by its own contract and circuit, whichever contract the scope is
 * typed by, so one scope takes calls of several circuits and of several contracts without a cast.
 */
export interface Ledger9TransactionContext<
  C extends Contract.Any,
  PCK extends Contract.ProvableCircuitId<C> = Contract.ProvableCircuitId<C>
> {
  readonly [TypeId]: TypeId;
  readonly [Internal.ScopeEra]: 'v9';
  readonly [Internal.Submit]: () => Promise<Ledger9FinalizedCallTxData<C, PCK>>;
  /** @internal Runs one call of the scope and records it; refuses a call that overlaps another. */
  readonly [Internal.RecordCall]: (
    circuitId: AnyProvableCircuitId,
    run: () => Promise<Internal.AnyLedger9ExecutedCall>,
    privateStateTarget?: Internal.PrivateStateTarget
  ) => Promise<void>;
  /** @internal The result of the last call recorded into the scope, read without building a transaction. */
  readonly [Internal.LastCallResult]: () => Ledger9CallResult<C, PCK> | undefined;

  /**
   * Gets the additional scoped {@link CoinPublicKey} to {@link EncPublicKey} mappings.
   *
   * @return A `ReadonlyMap`<{@link CoinPublicKey}, {@link EncPublicKey}> instance, or `undefined` if no additional
   * mappings were specified for the current transaction context.
   */
  getAdditionalMappings(): ReadonlyMap<CoinPublicKey, EncPublicKey> | undefined;

  /**
   * Gets the public states, as bytes, of the contract the scope's last call was made to, or, before
   * any call, of the first contract the scope read. Decode them with your own runtime, as with
   * `getStates`: `states.contractState.deserialize({ v9: ContractState })`.
   *
   * @return The public states, or `undefined` if the scope has read no states yet.
   *
   * @remarks
   * The contract state is the unsubmitted _running_ state of the contract within the transaction context,
   * reflecting any unsubmitted circuit calls made to the contract during the scope of the transaction. The
   * zswap chain state is the one that contract was read with, at the block the scope was first read at. The
   * running private state of the last call is `getLastUnsubmittedCallTxDataToTransact()?.[0].private.nextPrivateState`.
   */
  getCurrentStates(): PublicStatesRead | undefined;

  /**
   * Gets the last unsubmitted call transaction data.
   *
   * @return A tuple containing an {@link Ledger9UnsubmittedCallTxData} instance, and an optional private state
   * ID, or `undefined` if circuit calls are yet to be made.
   *
   * @remarks
   * Its `private.unprovenTx` is the one transaction of every call made so far, in the order they were
   * made, and its `private.newCoins` their new coins in that order: what the scope submits if no
   * further call is made. Both are built when this is called.
   */
  getLastUnsubmittedCallTxDataToTransact(): [Ledger9UnsubmittedCallTxData<C, PCK>, PrivateStateId?] | undefined;
}

/**
 * Encapsulates the context of a contract-scoped transaction on a ledger 8 (pre-fork) network.
 *
 * Every call added with `submitCallTx` or `callTx.<circuit>` is composed against the states the
 * scope's last call ended on, and all of them are submitted as one ledger 8 transaction when the
 * scope's function returns. `createUnprovenCallTx` builds against the same states and adds nothing.
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

/**
 * A {@link Ledger9TransactionContext} as a call made in the scope takes it: the members that are
 * the same whatever contract the scope is typed by, so a scope typed by one contract takes calls of
 * others, each typed by its own contract and circuit.
 */
export type AnyLedger9TransactionContext = Pick<
  Ledger9TransactionContext<Contract.Any, AnyProvableCircuitId>,
  | typeof TypeId
  | typeof Internal.ScopeEra
  | typeof Internal.RecordCall
  | 'getAdditionalMappings'
>;

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

  /**
   * Awaited once the wallet has balanced a ledger 9 scope's transaction and the scope's checks passed,
   * and before the transaction is handed to the midnight provider's `submitTx`, with every identifier
   * of the transaction and every private state the scope's calls left, which the scope stores only once
   * the transaction succeeds entirely. It is for a caller that must keep those states whatever follows,
   * a process or a page that stops while `submitTx` runs included: write them where they survive a
   * restart, keyed by every identifier, and match them against the transaction's outcome later: keep
   * them as the private states only once the transaction is recorded `SucceedEntirely`, since on any
   * other outcome its calls did not all land (in the fallible section, none did). The transaction may
   * still not be submitted, and once submitted may not land.
   *
   * A midnight provider's `submitTx` returns one of these identifiers, and which one differs by
   * provider (the DApp-connector providers return the first, the wallet SDK the last); the scope's
   * result and its errors name the one `submitTx` returned. Any of them finds the transaction once it
   * lands. A balanced transaction with no identifier is refused with an `InvalidArgumentError`, and
   * nothing is submitted.
   *
   * The scope awaits it, without a time limit: one that never settles holds the scope, which then
   * submits nothing. If it throws or rejects, nothing is submitted and its error is thrown as it is,
   * carrying nothing to revert the wallet's bookings with: the coins the wallet booked while balancing
   * stay booked until the transaction's time to live passes, and its Dust until the Dust spend's grace
   * period ends.
   *
   * If `submitTx` then rejects, its `ProviderFailedError` also carries the private states on
   * `pendingPrivateStates` and every identifier of the transaction on `txIds`, both hidden. A coded
   * error a midnight provider raised is passed on as itself and carries neither, so keep the states
   * here. If the wait for the chain's answer fails once `submitTx` has returned, the
   * `Ledger9SubmittedTxUnconfirmedError` carries them.
   *
   * Only the scope that submits calls it: it is refused, with an `InvalidArgumentError` before any
   * call runs, when given to a nested scope or to a scope that runs on a ledger 8 network.
   *
   * @param txIds Every identifier of the transaction, in the order the ledger lists them.
   * @param pendingPrivateStates Every private state a call of the scope left, one per contract and
   * private state id, in the order the scope first reached each.
   */
  readonly beforeSubmit?: (
    txIds: readonly string[],
    pendingPrivateStates: readonly Ledger9PendingPrivateState[]
  ) => void | Promise<void>;

  /**
   * One-time keys made for this transaction alone. Every coin a call of the scope makes for their
   * coin public key is spent again inside the same transaction, as a transient: the coin is made
   * and spent in one transaction, so it is never left unspent at that key, though the chain still
   * records its commitment and nullifier, and its value can balance what a later call of the scope
   * takes in. This holds for a scope of one call as for many.
   *
   * Never give a wallet's keys. The scope maps their coin public key to their own encryption public
   * key, keeps them only while it runs, and never puts them, or any key of theirs, in an error or a
   * log. Their coin secret key does leave the scope inside the transaction: proving a transient needs
   * it, so it goes to the proof provider with the unproven transaction, and it is in the scope
   * result's `private.unprovenTx`. Give keys made for this transaction alone, which never receive a
   * coin outside it.
   *
   * A call built as a transaction of its own (`createLedger9UnprovenCallTx`, `createUnprovenCallTx`)
   * with a scope given these keys is refused, before its circuit runs: submit the call through the
   * scope instead.
   *
   * Refused with an `InvalidArgumentError`, before any proof is made:
   * - keys whose coin public key is the coin public key of the scope's wallet or of the wallet of any
   *   of its calls, each read from hex or Bech32m;
   * - keys that spend no coin the scope's calls make;
   * - keys given to a nested scope, which builds nothing: give them to the outermost scope;
   * - keys given to a scope that runs on a ledger 8 network, whose scope does not apply them.
   *
   * A mapping in `additionalCoinEncPublicKeyMappings`, of the scope or of a call, that maps their
   * coin public key to another encryption public key is refused with a
   * `ZswapOutputResolutionError`, before any proof is made.
   */
  readonly spentHere?: ZswapSecretKeys;

  /**
   * Places the calls of a ledger 9 scope together in the fallible section of its one intent, in the
   * order they were made, so the scope lands whole or fails whole. Off by default.
   *
   * By default a scope of two or more calls lands whole in the guaranteed section, and when it cannot
   * land it costs nothing: a call the ledger placed wholly in the fallible section is moved into the
   * guaranteed section, where it counts in full against the time to dismiss, whatever is left fallible
   * is refused before proving, and a transaction that would fail on the chain is refused by the node,
   * with no fee paid. A call the ledger places in the fallible section for its cost then fits only
   * beside calls that leave spare allowance, so the default refuses such a scope and its calls go as
   * separate transactions. In the fallible section applying the calls does not count against the
   * time to dismiss, so such a scope lands in one transaction. Choose this for calls that must take
   * effect together and that the default cannot fit in one transaction, knowing that a failure on the
   * chain is whole and paid for.
   *
   * The ledger applies the fallible section whole or not at all. A transaction it fails is recorded
   * `FailFallible`: its fee is paid, and nothing of the calls is kept, not their state, coins or
   * payments. The scope then stores no private state and throws a `TxFailedError` whose message says
   * so and whose `pendingPrivateStates` hold the states the calls left: do not keep them, since nothing
   * of the calls landed. What the wallet spends to pay into the calls is placed in the same segment's
   * fallible section, and the ledger holds that segment to its own balance, so it is spent with the
   * calls or not at all; the wallet's Dust spend, which pays the fee, is in the guaranteed section. A
   * refusal before proving costs nothing.
   *
   * Applies to a scope of any number of calls, a lone call included. A scope of two or more calls is
   * priced against the time to dismiss before proving, as by default; a lone call is not, as by
   * default, since in the fallible section it costs no more to dismiss than made alone. A call the
   * ledger split at a checkpoint into a guaranteed and a fallible part is refused with a
   * `Ledger9ScopeFalliblePartError` before proving, a lone call included: its guaranteed part would be
   * kept when the rest fails. The transaction the wallet balanced is not checked for fallible parts.
   * Refused with an `InvalidArgumentError`, before any call runs, whenever it is given, `false`
   * included, to a nested scope, whose calls the scope it joins places, or to a scope that runs on a
   * ledger 8 network.
   */
  readonly inFallibleSection?: boolean;
}

/** A private state a scoped transaction's calls left, which it stores once the transaction succeeds entirely. */
export interface Ledger9PendingPrivateState {
  /** The contract the private state belongs to. */
  readonly contractAddress: ContractAddress;
  /** The private state id the state is stored under. */
  readonly privateStateId: PrivateStateId;
  /** The private state the calls left. */
  readonly privateState: unknown;
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

type Ledger9ScopeBody<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>> = (
  txCtx: Ledger9TransactionContext<C, PCK>
) => Promise<void>;

type Ledger8ScopeBody = (txCtx: AnyLedger8TransactionContext) => Promise<void>;

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
 * On a ledger 9 network the calls are applied in the order `fn` makes them. Each call runs on the
 * public states, data and balance, the calls before it left, and builds no transaction of its own;
 * when `fn` returns, the scope builds one transaction of one intent from all of them, which the ledger
 * applies as it applies any intent: circuits in the order of the scope, each circuit's calls together,
 * a caller before the callees it claims, each on the state the one before it left. The result describes the last
 * call; its `private.unprovenTx` is the transaction the scope submitted, and its `private.newCoins`
 * the new coins of every call, in the order they were made. Only the ledger 9 scope keeps this
 * order: the ledger 8 scope merges one transaction per call.
 *
 * A ledger 9 scope of two or more calls lands whole or not at all: its transaction has no fallible
 * half. A call whose whole call tree the ledger's partitioner placed in the fallible half is moved
 * whole into the guaranteed half before anything is proven; a call whose transcript is split at a
 * checkpoint, and coins or an unshielded offer a call places in the fallible half, are refused with a
 * `Ledger9ScopeFalliblePartError`, and nothing is submitted. So is a fallible part in the transaction the
 * wallet balanced: a wallet adds one only to balance a fallible part the transaction already has,
 * and this check covers one that adds it otherwise. That refusal carries the balanced transaction:
 * the coins the wallet booked for it stay booked until its time to live passes, and its Dust until
 * the Dust spend's grace period ends, unless the wallet reverts it. A scope of one call is built,
 * checked and submitted exactly as that call made alone. To place the calls, of any number, in the
 * fallible section instead, where they land whole or fail whole on the chain, pass `inFallibleSection`
 * in `options` ({@link ScopedTransactionOptions.inFallibleSection}).
 *
 * Before any proof is made, a scope of two or more calls is priced against the ledger's time to
 * dismiss, with the ledger's own cost function under the ledger parameters of the block the scope
 * read its states at, and refused with a `Ledger9ScopeOutsideTimeToDismissError` if it costs more than its
 * size allows. The figure is an estimate: the transaction has no Dust spend yet and each proof is
 * priced at the ledger's estimated size, so a transaction close to the limit can be refused though
 * the one the wallet balances would fit. The balanced transaction is not priced again: the node
 * refuses one over its time to dismiss at no fee, and the wallet then releases what it booked. The
 * ledger charges a verifier key's read in whole 4,096-byte blocks; the check assumes each key fits
 * one block, where the node reads its real size, so the node can be stricter only for a verifier key
 * over 4,096 bytes. A call moved out of the fallible half counts in full against the time to dismiss:
 * the partitioner placed it there because even its part before the first checkpoint costs more than
 * the guaranteed half allows it, so it fits only beside calls whose size leaves spare allowance. The
 * refusal names each call moved; send such a call in a transaction of its own, where it keeps its
 * fallible placement. A scope that a release before this one landed in one transaction with a
 * fallible part, possibly in part, can therefore be refused.
 *
 * Make the calls of a ledger 9 scope one after another, awaiting each before the next: a call
 * started while another call of the scope is still running is refused with an
 * `InvalidArgumentError`, since both would start from the same states. A call still running when `fn`
 * returns, or made once the scope has begun to submit, is refused with an `InvalidArgumentError`
 * too: the transaction holds the calls recorded when `fn` returns, and only their private states are
 * stored.
 *
 * A ledger 9 scope takes calls to several contracts, each with the providers of its own contract.
 * Every state is read at the block of the scope's first read, and a contract address is one contract
 * in either case. A contract's public state is shared by every private state id of it, and a callee
 * the scope holds is given the state the scope's earlier calls left it in. Each private state id
 * chains from call to call, through the private state provider it was first read through: a call
 * that reaches it through another provider, as a second wallet using the same id would, is refused
 * with an `InvalidArgumentError`. When the transaction succeeds entirely, the state each id was left
 * in is stored through that provider; every state is tried, and those a provider refuses are thrown
 * together in one `Ledger9PrivateStatesNotStoredError`. To keep the states should the process stop
 * before the chain answers, pass `beforeSubmit` in `options`. Each call is typed by its own contract
 * and circuit. `C` and `PCK` type the scope's result, the data of its last call: type the scope by the
 * contract and circuit of its last call, since they are not checked against it, or read only the
 * result's transaction-level fields (`public`, `private.unprovenTx`, `private.newCoins`). The
 * coins the calls create are encrypted with the wallet keys of every call and the coin key mappings
 * of the scope and of every call, merged; a coin key mapped to two encryption keys, a wallet's own
 * included, is refused. Proving the one transaction needs the keys of
 * every contract its calls reach: give the scope a proof provider that resolves them all, for example
 * `httpClientProofProvider` over a `ZKConfigRegistry` of each contract's keys. To spend again, in the
 * same transaction, the coins the calls make for keys made for this transaction alone, pass
 * `spentHere` in `options` ({@link ScopedTransactionOptions.spentHere}).
 *
 * One transaction links everything its calls state publicly. A wrap of unshielded tokens into
 * shielded ones states its amount; merged with a deposit into a contract that keeps its holdings
 * private, or with any other receiver meant to stay private, it puts that amount, the token and the
 * receiver together on chain, where the deposit of an already-shielded coin sent as a transaction of
 * its own states no amount. Merge a wrap with what follows it only where the receiver is not
 * private, a coin spent again through `spentHere` included. See ADR-0027.
 *
 * The ledger era this scope runs against is read ONCE, before `fn` runs, and every call made in
 * the scope shares that one reading. Before the hard fork the scope takes calls against contracts
 * produced by the ledger 8 Compact toolchain; type `fn`'s parameter as {@link Ledger8TransactionContext}
 * to call them. After the fork it takes calls against contracts produced by the ledger 9 toolchain, and a
 * ledger 8 contract's calls are submitted individually with `submitCallTx`.
 *
 * A JavaScript caller that passes a running scope's context in place of `options` runs `fn` inside that
 * scope. Nothing is submitted then, and the result is the execution data of the scope's last call, not
 * a finalized transaction.
 */
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
  // with. A function typed for the other era is refused when it hands that context to a call.
  const ledger9Body = fn as Ledger9ScopeBody<C, PCK>;
  const ledger8Body = fn as Ledger8ScopeBody;
  assertValidMidnightConfig(providers.config);
  const outerEra = Internal.readScopeEra(options);
  switch (outerEra) {
    case 'v8':
      return Ledger8Scope.nestLedger8Scope(ledger8Body, Ledger8Scope.requireLedger8Scope(options, 'withContractScopedTransaction'));
    case 'v9':
      return Internal.scopedTransaction(providers, ledger9Body, options);
    case 'unrecognised':
      throw Internal.unrecognisedScopeContext('withContractScopedTransaction');
    case undefined:
      break;
    default:
      return assertNever(outerEra, 'withContractScopedTransaction');
  }
  const reading = await Internal.readScopeHead(providers.publicDataProvider, providers.loggerProvider);
  switch (reading.head) {
    case 'v9':
      return Internal.scopedTransaction(providers, ledger9Body, options, { ...reading, head: reading.head });
    case 'v8':
      Internal.assertSubmitOptionsHonoured(options, 'ledger8');
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
 *
 * @remarks
 * A JavaScript caller that passes a running ledger 8 scope's context in place of `options` runs `fn`
 * inside that scope. Nothing is submitted then, and the result is the execution data of the scope's
 * last call, not a finalized transaction.
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
  const outerEra = Internal.readScopeEra(options);
  switch (outerEra) {
    case 'v8':
      return Ledger8Scope.nestLedger8Scope(fn, Ledger8Scope.requireLedger8Scope(options, 'withLedger8ContractScopedTransaction'));
    case 'v9':
      throw Internal.scopeEraMismatch('withLedger8ContractScopedTransaction', 'v9');
    case 'unrecognised':
      throw Internal.unrecognisedScopeContext('withLedger8ContractScopedTransaction');
    case undefined:
      break;
    default:
      return assertNever(outerEra, 'withLedger8ContractScopedTransaction');
  }
  Internal.assertSubmitOptionsHonoured(options, 'ledger8');
  const reading = await Internal.readScopeHead(providers.publicDataProvider, providers.loggerProvider);
  // eslint-disable-next-line no-restricted-syntax -- fail-closed guard: a ledger 8 path refuses every other era
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
