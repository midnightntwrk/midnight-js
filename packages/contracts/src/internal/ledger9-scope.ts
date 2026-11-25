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

import { InvalidArgumentError } from '@midnightntwrk/midnight-js-protocol/errors';
import { type CoinPublicKey, type EncPublicKey, type LedgerParameters } from '@midnightntwrk/midnight-js-protocol/v9';
import type { Contract } from '@midnightntwrk/midnight-js-protocol/v9/compact-js/effect/Contract';
import {
  type AnyProvableCircuitId,
  LedgerTransaction,
  type MidnightConfig,
  type PrivateStateId,
  type PrivateStateProvider,
  type PublicStatesRead,
  SerializedContractState,
  SerializedZswapChainState
} from '@midnightntwrk/midnight-js-types';

import { type Ledger9CallResult } from '../call';
import { type Ledger9ContractProviders } from '../contract-providers';
import { IncompleteCallTxPrivateStateConfig } from '../errors';
import type * as Transaction from '../transaction';
import { type Ledger9FinalizedCallTxData, type Ledger9UnsubmittedCallTxData } from '../tx-model';
import { type Ledger9ContractStates, type Ledger9PublicStates, type ResolvedOperationEra } from './era';
import { assembleLedger9CallTx, landsWhole } from './ledger9-scope-build';
import { refuseFallibleBalanced } from './ledger9-scope-checks';
import { type OneTimeKeys } from './ledger9-scope-one-time-keys';
import {
  advancePublicStates,
  type AnyLedger9ExecutedCall,
  assertSameProvider,
  type CachedStateIdentity,
  contractAddressKey,
  type Ledger9ExecutedCall,
  type PinnedContractStates,
  privateStateKey,
  type PrivateStateTarget,
  type ScopeContractStates,
  type ScopePrivateState
} from './ledger9-scope-states';
import { submitScopeTransaction } from './ledger9-scope-submit';

/** A call recorded into a ledger 9 scope, with the circuit that made it and where its private state goes. */
interface Ledger9RecordedCall {
  readonly circuitId: AnyProvableCircuitId;
  readonly executed: AnyLedger9ExecutedCall;
  readonly privateStateTarget?: PrivateStateTarget;
}

/** @internal */
export const TypeId: Transaction.TypeId = Symbol.for('@midnight-ntwrk/midnight-js#Transaction') as Transaction.TypeId;
/** @internal */
export const Submit = Symbol.for('@midnight-ntwrk/midnight-js#Transaction/Submit');
/** @internal Runs one call of a scope and records it, refusing a call that overlaps another. */
export const RecordCall = Symbol.for('@midnight-ntwrk/midnight-js#Transaction/RecordCall');
/** @internal The result of the last call recorded into a scope, read without building a transaction. */
export const LastCallResult = Symbol.for('@midnight-ntwrk/midnight-js#Transaction/LastCallResult');
/** @internal */
export const CacheStates = Symbol.for('@midnight-ntwrk/midnight-js#Transaction/CacheStates');
/** @internal The block a scope's states were first read at, once it has read any. */
export const PinnedBlockHash = Symbol.for('@midnight-ntwrk/midnight-js#Transaction/PinnedBlockHash');
/** @internal The public states a scope holds for a contract, read or left by its calls. */
export const PublicStatesOf = Symbol.for('@midnight-ntwrk/midnight-js#Transaction/PublicStatesOf');
/** @internal */
export const GetCurrentStatesForIdentity = Symbol.for('@midnight-ntwrk/midnight-js#Transaction/GetCurrentStatesForIdentity');
/**
 * @internal Whether a scope was given one-time keys, read by its global key so a context made by
 * another installed copy of the package answers too.
 */
export const HoldsOneTimeKeys = Symbol.for('@midnight-ntwrk/midnight-js#Transaction/HoldsOneTimeKeys');
/** @internal The ledger era a scope context composes for. */
export const ScopeEra = Symbol.for('@midnight-ntwrk/midnight-js#Transaction/ScopeEra');

/**
 * @internal The states a scope caches between its calls, decoded by the framework's own runtime.
 */
export interface ScopeStateCache {
  readonly [CacheStates]: (
    states: Ledger9ContractStates<unknown> | Ledger9PublicStates,
    read: PublicStatesRead,
    identity: CachedStateIdentity,
    blockHash: string,
    privateStateProvider?: PrivateStateProvider
  ) => void;
  readonly [GetCurrentStatesForIdentity]: (
    identity: CachedStateIdentity,
    privateStateProvider?: PrivateStateProvider
  ) => PinnedContractStates<unknown> | undefined;
  readonly [PinnedBlockHash]: () => string | undefined;
  readonly [PublicStatesOf]: (contractAddress: string) => ScopeContractStates | undefined;
}

const hasScopeStateCache = (context: object): context is ScopeStateCache =>
  [CacheStates, GetCurrentStatesForIdentity, PinnedBlockHash, PublicStatesOf].every(
    (key) => typeof Reflect.get(context, key) === 'function'
  );

/**
 * @internal The state cache of a transaction context, or `undefined` when there is no context.
 *
 * @throws InvalidArgumentError if the context was not made by a scoped transaction.
 */
export const scopeStateCacheOf = (context: Transaction.AnyLedger9TransactionContext | undefined): ScopeStateCache | undefined => {
  if (context === undefined) {
    return undefined;
  }
  if (!hasScopeStateCache(context)) {
    throw new InvalidArgumentError(
      'The transaction context was not made by withContractScopedTransaction, so it holds no scope states. ' +
        'Pass the context the scope handed to your function.'
    );
  }
  return context;
};

/**
 * @internal A call's result with the transaction of that call alone, as a call made outside a scope
 * returns it.
 */
export const withOwnTransaction = <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  executed: Ledger9ExecutedCall<C, PCK>,
  config: MidnightConfig
): Ledger9UnsubmittedCallTxData<C, PCK> => ({
  ...executed.result,
  private: {
    ...executed.result.private,
    unprovenTx: LedgerTransaction.seal('v9', 'Unproven', assembleLedger9CallTx([executed.assembly], config)),
    newCoins: executed.newCoins
  }
});

/** The circuits a scope's submission and its failure name: its one circuit, or every distinct one. */
const circuitIdsOf = (calls: readonly Ledger9RecordedCall[]): AnyProvableCircuitId | AnyProvableCircuitId[] => (calls.length === 1 ? calls[0].circuitId : Array.from(new Set(calls.map(({ circuitId }) => circuitId))));

/**
 * The ledger 9 scope. It records its calls in the order they were made and submits them as ONE
 * transaction of one intent, which the ledger applies in that order (see {@link assembleLedger9CallTx}).
 *
 * Each call runs on the public states the scope's earlier calls left: after a call, every contract
 * its call tree reached holds the state that call left it in, its data and its balance. Contract
 * addresses are keyed in one form ({@link contractAddressKey}). The calls of a scope are therefore
 * made one after another, each awaited before the next starts; a call started while another call
 * of the scope is still running is refused.
 *
 * @internal
 */
export class TransactionContextImpl<
  C extends Contract.Any,
  PCK extends Contract.ProvableCircuitId<C>
> implements Transaction.Ledger9TransactionContext<C, PCK>, ScopeStateCache {
  readonly [TypeId]: Transaction.TypeId = TypeId;
  readonly [ScopeEra] = 'v9';
  readonly [HoldsOneTimeKeys]: boolean;
  readonly providers: Ledger9ContractProviders<any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  readonly options?: Transaction.ScopedTransactionOptions;
  /**
   * The era facts this scope resolved when it was created, or `undefined` for a
   * context built without them.
   *
   * OPTIONAL, and the two cases are genuinely different rather than one being a
   * degraded form of the other. A scope created through
   * `withContractScopedTransaction` always carries a reading, resolved once by
   * `readScopeHead`. A context built for a SINGLE call outside any
   * scope carries none, because the current-era single-call path resolves no
   * era of its own and reading the head for it would add a network round trip
   * to every call in the framework to answer a question that path does not ask.
   */
  readonly resolvedEra?: ResolvedOperationEra;

  /**
   * The block the scope's first read was made at, the ledger parameters read with it, and that read's
   * protocol version and ledger parameters as bytes: every later read is made at the same block.
   */
  private pinned:
    | {
        readonly blockHash: string;
        readonly ledgerParameters: Ledger9PublicStates['ledgerParameters'];
        readonly read: Pick<PublicStatesRead, 'protocolVersion' | 'ledgerParameters'>;
      }
    | undefined;
  /** The public states of every contract the scope has read or its calls have reached, keyed by address. */
  private readonly publicStates = new Map<string, ScopeContractStates>();
  /** The private states the scope holds, per contract and private state id, in the order it first reached each. */
  private readonly privateStates = new Map<string, ScopePrivateState>();
  /** The calls of the scope, in the order they were made. */
  private readonly recordedCalls: Ledger9RecordedCall[] = [];
  /** Whether a call of the scope is running: from before it reads the scope's states until it is recorded or fails. */
  private callRunning = false;
  /** Whether the scope has begun to submit, after which it takes no further call. */
  private submitting = false;

  constructor(
    providers: Ledger9ContractProviders<C, PCK>,
    options?: Transaction.ScopedTransactionOptions,
    resolvedEra?: ResolvedOperationEra
  ) {
    this.providers = providers;
    // One frozen copy, read by the build and every refusal: keys set on the caller's object later change nothing.
    this.options = options === undefined ? undefined : Object.freeze({ ...options });
    this[HoldsOneTimeKeys] = this.options?.spentHere !== undefined;
    this.resolvedEra = resolvedEra;
  }

  getAdditionalMappings(): ReadonlyMap<CoinPublicKey, EncPublicKey> | undefined {
    return this.options?.additionalCoinEncPublicKeyMappings;
  }

  [PublicStatesOf](contractAddress: string): ScopeContractStates | undefined {
    return this.publicStates.get(contractAddressKey(contractAddress));
  }

  [PinnedBlockHash](): string | undefined {
    return this.pinned?.blockHash;
  }

  /** The scope's one-time keys with its wallet's coin public key, or `undefined` if it was given none. */
  private oneTimeKeys(): OneTimeKeys | undefined {
    const keys = this.options?.spentHere;
    return keys === undefined ? undefined : { keys, scopeWalletCoinPublicKey: this.providers.walletProvider.getCoinPublicKey() };
  }

  private lastRecordedCall(): Ledger9RecordedCall | undefined {
    return this.recordedCalls[this.recordedCalls.length - 1];
  }

  /**
   * The contract states as the scope holds them, as bytes: those of the contract the scope's last
   * call was made to, or, before any call, of the first contract the scope read.
   *
   * @deprecated A scope can hold the states of several contracts. Use {@link GetCurrentStatesForIdentity}
   * for the states of one contract and private state id.
   */
  getCurrentStates(): PublicStatesRead | undefined {
    const lastCalls = this.lastRecordedCall()?.executed.assembly.calls;
    const address =
      lastCalls === undefined || lastCalls.length === 0
        ? this.publicStates.keys().next().value
        : contractAddressKey(lastCalls[lastCalls.length - 1].contractAddress);
    const publicStates = address === undefined ? undefined : this.publicStates.get(address);
    if (this.pinned === undefined || publicStates === undefined) {
      return undefined;
    }
    return {
      ...this.pinned.read,
      contractState: SerializedContractState.fromBytes('v9', publicStates.contractState.serialize()),
      zswapChainState: SerializedZswapChainState.fromBytes('v9', publicStates.zswapChainState.serialize())
    };
  }

  /**
   * The states the scope holds for a contract and private state id: the contract's public states,
   * shared by every private state id of that contract, and the private state of that id. `undefined`
   * when the scope holds either not yet.
   *
   * @param privateStateProvider The provider the asking call reads private states through.
   * @throws InvalidArgumentError if the scope read that private state through another provider: a
   *         scope holds one private state per contract and private state id, which two wallets
   *         cannot share.
   */
  [GetCurrentStatesForIdentity](
    identity: CachedStateIdentity,
    privateStateProvider?: PrivateStateProvider
  ): PinnedContractStates<unknown> | undefined {
    const publicStates = this.publicStates.get(contractAddressKey(identity.contractAddress));
    if (this.pinned === undefined || publicStates === undefined) {
      return undefined;
    }
    const held =
      identity.privateStateId === undefined
        ? undefined
        : this.privateStates.get(privateStateKey(identity.contractAddress, identity.privateStateId));
    if (identity.privateStateId !== undefined && held === undefined) {
      return undefined;
    }
    if (held !== undefined) {
      assertSameProvider(held, privateStateProvider);
    }
    return {
      states: { ...publicStates, ledgerParameters: this.pinned.ledgerParameters, privateState: held?.privateState },
      blockHash: this.pinned.blockHash
    };
  }

  /**
   * The transaction of every call recorded so far, in the order they were made, which is what the
   * scope submits if no further call is made, with the new coins of all those calls in that order.
   *
   * @param ledgerParameters The ledger parameters a scope of two or more calls is priced under
   *        before proving; with none, it is not priced.
   */
  private scopeTransaction(
    ledgerParameters?: LedgerParameters
  ): Pick<Ledger9UnsubmittedCallTxData<C, PCK>['private'], 'unprovenTx' | 'newCoins'> {
    const tx = assembleLedger9CallTx(
      this.recordedCalls.map(({ executed }) => executed.assembly),
      this.providers.config,
      this.options?.additionalCoinEncPublicKeyMappings,
      this.oneTimeKeys(),
      ledgerParameters
    );
    return {
      unprovenTx: LedgerTransaction.seal('v9', 'Unproven', tx),
      newCoins: this.recordedCalls.flatMap(({ executed }) => executed.newCoins)
    };
  }

  /**
   * The last call's data, with the transaction of every call recorded so far as its
   * `private.unprovenTx` and their new coins as its `private.newCoins`, built when this is called.
   * It is typed by the scope's contract; in a scope of several contracts, the last call may be of
   * another.
   *
   * @throws ZswapOutputResolutionError if the calls recorded so far do not make a transaction, for
   *         example when a coin one of them sends to a contract is claimed by no call yet, or if a
   *         mapping maps the coin public key of the scope's one-time keys to another encryption key.
   * @throws InvalidArgumentError if the scope's one-time keys are a wallet's own, or spend no coin the
   *         calls recorded so far make (as before the call that makes their coin).
   */
  getLastUnsubmittedCallTxDataToTransact(): [Ledger9UnsubmittedCallTxData<C, PCK>, PrivateStateId?] | undefined {
    const last = this[LastCallResult]();
    if (last === undefined) {
      return undefined;
    }
    return [{ ...last, private: { ...last.private, ...this.scopeTransaction() } }, this.lastRecordedCall()?.privateStateTarget?.privateStateId];
  }

  /**
   * The last call's result, typed by the scope's contract: in a scope of several contracts, the last
   * call may be of another, whose result the caller types as its own.
   */
  [LastCallResult](): Ledger9CallResult<C, PCK> | undefined {
    return this.lastRecordedCall()?.executed.result as Ledger9CallResult<C, PCK> | undefined;
  }

  /**
   * Refuses a call once the scope has begun to submit: its transaction holds only the calls recorded
   * before, and only their private states are stored.
   *
   * @throws InvalidArgumentError once the scope has begun to submit.
   */
  private assertNotSubmitting(circuitId: AnyProvableCircuitId): void {
    if (this.submitting) {
      throw new InvalidArgumentError(
        `Circuit '${circuitId}' was called after its scoped transaction began to submit, so it is in no ` +
          "transaction. A scope submits the calls recorded when its function returns: await every call inside it."
      );
    }
  }

  /**
   * The provider a call's next private state is stored through: the one the scope read that private
   * state through, else the call's, else the scope's.
   *
   * @throws IncompleteCallTxPrivateStateConfig if there is none.
   */
  private storeThrough(target: PrivateStateTarget): PrivateStateProvider {
    const provider =
      this.privateStates.get(privateStateKey(target.contractAddress, target.privateStateId))?.privateStateProvider ??
      target.privateStateProvider ??
      this.providers.privateStateProvider;
    if (provider === undefined) {
      throw new IncompleteCallTxPrivateStateConfig();
    }
    return provider;
  }

  /**
   * The ledger parameters a scope of two or more calls is priced under before proving: those of the
   * block it read its states at. A scope of one call is not priced: it is submitted as that call made
   * alone is.
   *
   * @throws InvalidArgumentError if a scope of two or more calls read no states, so holds no ledger
   *         parameters to price its transaction under.
   */
  private pricedUnder(): LedgerParameters | undefined {
    if (!landsWhole(this.recordedCalls.length)) {
      return undefined;
    }
    if (this.pinned === undefined) {
      throw new InvalidArgumentError(
        'The scoped transaction read no states, so it holds no ledger parameters to check its time to dismiss ' +
          'against: its calls were recorded without reading their states through it. Make each call with ' +
          'submitCallTx or callTx inside the scope.'
      );
    }
    return this.pinned.ledgerParameters;
  }

  /**
   * Builds the scope's ONE transaction over every recorded call, in the order the calls were made,
   * with the checks of a scope of two or more calls before proving ({@link assembleLedger9CallTx},
   * priced under {@link pricedUnder}) and its fallible-part check on the transaction the wallet
   * balanced, awaits the scope's `beforeSubmit` (what it throws is thrown, and nothing is submitted),
   * submits the transaction, waits for it, and once it succeeded entirely stores the private state each
   * of its private state ids was left in, through the provider it was read through (for a state the
   * scope never read, the call's or the scope's), in the order the scope first reached each. Every
   * state is tried; those not stored are thrown together, after the rest are stored. The private
   * states handed to `beforeSubmit` and stored are one snapshot, taken before submitting; from the
   * moment the scope begins to submit it takes no call.
   *
   * @throws InvalidArgumentError if a call of the scope is still running, before anything is built,
   *         if a scope of two or more calls read no states, so holds no ledger parameters to price
   *         its transaction, or if the scope's one-time keys are a wallet's own or spend no coin its
   *         calls make; all before anything is proven.
   * @throws ZswapOutputResolutionError if a mapping maps the coin public key of the scope's one-time
   *         keys to another encryption key, before anything is proven.
   * @throws Ledger9ScopeFalliblePartError if a scope of two or more calls has a fallible part, before proving
   *         or as the wallet balanced it; nothing is submitted.
   * @throws Ledger9ScopeOutsideTimeToDismissError if a scope of two or more calls costs more to dismiss than
   *         its size allows, before proving; nothing is proven or submitted.
   * @throws ProviderFailedError if `submitTx` rejects, carrying the private states left and the identifiers.
   * @throws Ledger9SubmittedTxUnconfirmedError if the wait for the submitted transaction fails.
   * @throws TxFailedError if the transaction did not succeed entirely, with the private states left.
   *
   * The result describes the last call, typed by the scope's contract; its `private.unprovenTx` is
   * the transaction the scope submitted, and its `private.newCoins` the new coins of every call, in
   * the order they were made.
   */
  async [Submit](): Promise<Ledger9FinalizedCallTxData<C, PCK>> {
    this.submitting = true;
    if (this.callRunning) {
      throw new InvalidArgumentError(
        "The scoped transaction's function returned while one of its calls was still running, so nothing was " +
          'submitted. Await every call inside the function the scope runs.'
      );
    }
    const last = this.lastRecordedCall();
    const lastResult = this[LastCallResult]();
    if (last === undefined || lastResult === undefined) {
      throw new InvalidArgumentError('No calls were submitted.');
    }
    const { unprovenTx, newCoins } = this.scopeTransaction(this.pricedUnder());
    const circuitId = circuitIdsOf(this.recordedCalls);
    // One snapshot of the private states: what beforeSubmit is handed and what is stored.
    const held = Array.from(this.privateStates.values());
    const finalizedTxData = await submitScopeTransaction(
      this.providers,
      this.options,
      { unprovenTx, circuitId },
      held,
      landsWhole(this.recordedCalls.length) ? refuseFallibleBalanced : undefined
    );
    return {
      era: 'v9',
      circuitId: last.circuitId as Contract.ProvableCircuitId<C>,
      private: { ...lastResult.private, unprovenTx, newCoins },
      public: {
        ...lastResult.public,
        ...finalizedTxData
      },
      calls: lastResult.calls
    }
  }

  /**
   * Holds the states a call read for the scope: the contract's public states unless the scope holds
   * them already, and the private state of the identity's id, with the provider it was read through.
   * The first read pins the scope's block and ledger parameters.
   */
  [CacheStates](
    states: Ledger9ContractStates<unknown> | Ledger9PublicStates,
    read: PublicStatesRead,
    identity: CachedStateIdentity,
    blockHash: string,
    privateStateProvider?: PrivateStateProvider
  ): void {
    const { contractState, zswapChainState, ledgerParameters } = states;
    this.pinned ??= {
      blockHash,
      ledgerParameters,
      read: { protocolVersion: read.protocolVersion, ledgerParameters: read.ledgerParameters }
    };
    const address = contractAddressKey(identity.contractAddress);
    if (!this.publicStates.has(address)) {
      this.publicStates.set(address, { contractState, zswapChainState });
    }
    const { contractAddress, privateStateId } = identity;
    if (privateStateId !== undefined && 'privateState' in states) {
      const key = privateStateKey(contractAddress, privateStateId);
      const held = this.privateStates.get(key);
      if (held === undefined) {
        this.privateStates.set(key, { contractAddress, privateStateId, privateState: states.privateState, privateStateProvider, recorded: false });
      } else {
        assertSameProvider(held, privateStateProvider);
      }
    }
  }

  /**
   * Runs one call of the scope with `run`, which reads the scope's states and executes the circuit,
   * and records the call it returns. A call started while another call of the scope is running is
   * refused: both would start from the same states, and the scope would keep only what the one
   * recorded last left. A call that fails is not recorded and leaves the scope as it was.
   *
   * @throws InvalidArgumentError if another call of the scope is still running.
   * @throws IncompleteCallTxPrivateStateConfig if the call names a private state id and there is no
   *         private state provider to store its next private state through, before it runs.
   */
  async [RecordCall](
    circuitId: AnyProvableCircuitId,
    run: () => Promise<AnyLedger9ExecutedCall>,
    privateStateTarget?: PrivateStateTarget
  ): Promise<void> {
    this.assertNotSubmitting(circuitId);
    if (this.callRunning) {
      throw new InvalidArgumentError(
        `Circuit '${circuitId}' was called while another call of the same scoped transaction was still running. ` +
          'The calls of a scope run one after another, each on the states the one before it left: await each call ' +
          'before making the next.'
      );
    }
    if (privateStateTarget !== undefined) {
      this.storeThrough(privateStateTarget);
    }
    this.callRunning = true;
    try {
      this.record(circuitId, await run(), privateStateTarget);
    } finally {
      this.callRunning = false;
    }
  }

  /**
   * Records a call, after the calls already recorded. Every contract the call's tree reached then
   * holds, in the scope, the state the call left it in: a new state object, so the states the call
   * was built against are left as they were. The private state the call left is held for its
   * contract and private state id, for the next call to that id and to be stored when the scope
   * succeeds, through the provider it was read through, else the call's, else the scope's.
   *
   * @throws InvalidArgumentError if the scope began to submit while the call ran.
   * @throws IncompleteCallTxPrivateStateConfig if the call names a private state id and there is no
   *         private state provider to store its next private state through.
   */
  private record(
    circuitId: AnyProvableCircuitId,
    executed: AnyLedger9ExecutedCall,
    privateStateTarget?: PrivateStateTarget
  ): void {
    this.assertNotSubmitting(circuitId);
    // Resolved before the call is recorded, so a call refused here leaves the scope as it was.
    const privateStateProvider = privateStateTarget === undefined ? undefined : this.storeThrough(privateStateTarget);
    this.recordedCalls.push({ circuitId, executed, privateStateTarget });

    advancePublicStates(this.publicStates, executed.assembly);

    if (privateStateTarget !== undefined && privateStateProvider !== undefined) {
      const { contractAddress, privateStateId } = privateStateTarget;
      const key = privateStateKey(contractAddress, privateStateId);
      this.privateStates.set(key, {
        contractAddress: this.privateStates.get(key)?.contractAddress ?? contractAddress,
        privateStateId,
        privateState: executed.result.private.nextPrivateState,
        privateStateProvider,
        recorded: true
      });
    }
  }
}

/**
 * Refuses to build a call's own transaction with a scope that was given one-time keys: that
 * transaction would not spend again the coins the call makes for them, which would then rest at a
 * key nobody keeps. Names the option, never a key.
 *
 * @internal
 * @throws InvalidArgumentError if `context` is a scope given `spentHere`.
 */
export const assertNoOneTimeKeys = (context: Transaction.AnyLedger9TransactionContext | undefined): void => {
  if (context !== undefined && Reflect.get(context, HoldsOneTimeKeys) === true) {
    throw new InvalidArgumentError(
      "A call was built as a transaction of its own with a scoped transaction given one-time keys ('spentHere'). " +
        'That transaction would not spend again the coins the call makes for them. Submit the call through the ' +
        'scope instead, with submitCallTx or callTx, so the scope builds the one transaction that spends them.'
    );
  }
};

/**
 * @internal Runs one call of a scope with `run` and records it into the scope.
 *
 * @throws InvalidArgumentError if another call of the scope is still running.
 */
export const recordScopedCall = (
  txCtx: Transaction.AnyLedger9TransactionContext,
  circuitId: AnyProvableCircuitId,
  run: () => Promise<AnyLedger9ExecutedCall>,
  privateStateTarget?: PrivateStateTarget
): Promise<void> => txCtx[RecordCall](circuitId, run, privateStateTarget);
