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

import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
import type { CoinPublicKey, EncPublicKey } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { ChargedState } from '@midnight-ntwrk/midnight-js-protocol/onchain-runtime';
import { type AnyProvableCircuitId, type PrivateStateId, SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';

import { type CallResult } from '../call';
import { type ContractProviders } from '../contract-providers';
import {
  CallTxFailedError,
  MixedEraScopeError,
  ScopedTransactionIdentityMismatchError,
  ScopedTxEraUnsupportedError
} from '../errors';
import { type ContractStates,type PublicContractStates } from '../get-states';
import { submitTx, type SubmitTxOptions } from '../submit-tx';
import type * as Transaction from '../transaction';
import { type FinalizedCallTxData, type UnsubmittedCallTxData } from '../tx-model';
import { type BreadcrumbSink, emitHeadResolution } from './breadcrumbs';
import { acquireHeadEra, type HeadVersionSource, readHeadEra, type ResolvedOperationEra } from './era';

/** @internal */
export interface CachedStateIdentity {
  readonly contractAddress: string;
  readonly privateStateId?: PrivateStateId;
}

/** @internal */
export interface CachedStatesWithIdentity<PS> {
  readonly identity: CachedStateIdentity;
  readonly states: ContractStates<PS> | PublicContractStates;
  /**
   * The hash of the block the states were read as of. A scoped transaction is a single chain
   * snapshot: the first read pins this block and every subsequent call in the scope reuses it, so
   * the cached `zswapChainState`/`ledgerParameters` and the block used for `parentBlockHash` and
   * cross-contract callee reads all refer to one coherent block.
   */
  readonly blockHash: string;
}

/** @internal The states pinned to a block within a scoped transaction. */
export interface PinnedContractStates<PS> {
  readonly states: ContractStates<PS> | PublicContractStates;
  readonly blockHash: string;
}

/** @internal */
export const TypeId: Transaction.TypeId = Symbol.for('@midnight-ntwrk/midnight-js#Transaction') as Transaction.TypeId;
/** @internal */
export const Submit = Symbol.for('@midnight-ntwrk/midnight-js#Transaction/Submit');
/** @internal */
export const MergeUnsubmittedCallTxData = Symbol.for('@midnight-ntwrk/midnight-js#Transaction/MergeUnsubmittedCallTxData');
/** @internal */
export const CacheStates = Symbol.for('@midnight-ntwrk/midnight-js#Transaction/CacheStates');
/** @internal */
export const GetCurrentStatesForIdentity = Symbol.for('@midnight-ntwrk/midnight-js#Transaction/GetCurrentStatesForIdentity');

const mergeSubmitTxOptions = <PCK extends AnyProvableCircuitId>(
  current: SubmitTxOptions<PCK> | undefined,
  next: SubmitTxOptions<PCK>
): SubmitTxOptions<PCK> => {
  if (!current) {
    return next;
  }
  const circuitIds = new Set([
      ...(Array.isArray(current.circuitId) ? current.circuitId! : [current.circuitId!]),
      ...(Array.isArray(next.circuitId) ? next.circuitId! : [next.circuitId!])
    ]);

  return {
    unprovenTx: current.unprovenTx.merge(next.unprovenTx),
    circuitId: Array.from(circuitIds)
  };
};

/**
 * Resolves the ONE era reading a scope runs under, and refuses a scope the head
 * era cannot express.
 *
 * Read once, when the scope is created, and threaded down as a value. Nothing is
 * cached ACROSS scopes.
 *
 * KEEP THE REFUSAL HERE. It is the earliest point it can be made: before the
 * scope body runs, and before the head era's own runtime is acquired, so a
 * refused scope pays for no era load and its refusal cannot be replaced by one
 * failing.
 *
 * The reading is breadcrumbed BEFORE the refusal below, so a refused scope
 * still says in the log which head it was refused on. No pipeline-selection
 * breadcrumb is written here: a scope does not select a pipeline -- the scope
 * machinery is current-era-only by construction -- so its only era decision is
 * the refusal, which already carries a registered code and remediation text.
 *
 * @internal
 * @param pdp The read surface, for the single head read.
 * @param logger The optional logger the head-resolution breadcrumb is written to.
 * @returns The era facts the scope runs under.
 * @throws ScopedTxEraUnsupportedError if the head era composes only one call
 * per transaction, so has nothing for a scope to batch into.
 * @throws UnknownProtocolVersionError if the head integer is off the era timeline.
 * @see {@link StaleHeadRemediation} for why both properties of this placement
 *      are load-bearing.
 */
export const resolveScopeEra = async (pdp: HeadVersionSource, logger?: BreadcrumbSink): Promise<ResolvedOperationEra> => {
  const reading = await readHeadEra(pdp);
  emitHeadResolution(logger, reading, 'operation-start');
  // REFUSED FROM THE READING ALONE, before any era is acquired. Acquiring first would make every
  // refused scope pay to instantiate a ledger it is about to be refused on -- and would make the
  // refusal depend on that instantiation succeeding, so a current-era-only caller, which is exactly
  // the caller the lazy pre-fork subpath exists for, would be told to acquire the retained runtime
  // instead of being told what to do about its scope.
  if (reading.head !== 'v9') {
    throw new ScopedTxEraUnsupportedError(reading.head);
  }

  return acquireHeadEra(reading);
};

/** @internal */
export class TransactionContextImpl<
  C extends Contract.Any,
  PCK extends Contract.ProvableCircuitId<C>
> implements Transaction.TransactionContext<C, PCK> {
  readonly [TypeId]: Transaction.TypeId = TypeId;
  readonly providers: ContractProviders<any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  readonly options?: Transaction.ScopedTransactionOptions;
  /**
   * The era facts this scope resolved when it was created, or `undefined` for a
   * context built without them.
   *
   * OPTIONAL, and the two cases are genuinely different rather than one being a
   * degraded form of the other. A scope created through
   * `withContractScopedTransaction` always carries a reading, resolved once by
   * {@link resolveScopeEra}. A context built for a SINGLE call outside any
   * scope carries none, because the current-era single-call path resolves no
   * era of its own and reading the head for it would add a network round trip
   * to every call in the framework to answer a question that path does not ask.
   */
  readonly resolvedEra?: ResolvedOperationEra;

  cachedStates: CachedStatesWithIdentity<Contract.PrivateState<C>> | undefined = undefined;
  currentUnsubmittedCall: [callTxData: UnsubmittedCallTxData<C, PCK>, privateStateId?: PrivateStateId] | undefined;
  submitTxOptions: SubmitTxOptions<PCK> | undefined = undefined;

  constructor(
    providers: ContractProviders<C, PCK>,
    options?: Transaction.ScopedTransactionOptions,
    resolvedEra?: ResolvedOperationEra
  ) {
    this.providers = providers;
    this.options = options;
    this.resolvedEra = resolvedEra;
  }

  getAdditionalMappings(): ReadonlyMap<CoinPublicKey, EncPublicKey> | undefined {
    return this.options?.additionalCoinEncPublicKeyMappings;
  }

  /**
   * @deprecated This method bypasses identity validation and may return states from a different
   * contract or private state ID than expected. Use {@link GetCurrentStatesForIdentity} instead
   * for validated access to cached states within scoped transactions.
   */
  getCurrentStates(): ContractStates<Contract.PrivateState<C>> | PublicContractStates | undefined {
    return this.cachedStates?.states;
  }

  [GetCurrentStatesForIdentity](
    identity: CachedStateIdentity
  ): PinnedContractStates<Contract.PrivateState<C>> | undefined {
    if (!this.cachedStates) {
      return undefined;
    }
    const cached = this.cachedStates.identity;
    if (cached.contractAddress !== identity.contractAddress || cached.privateStateId !== identity.privateStateId) {
      throw new ScopedTransactionIdentityMismatchError(
        { contractAddress: cached.contractAddress, privateStateId: cached.privateStateId },
        { contractAddress: identity.contractAddress, privateStateId: identity.privateStateId }
      );
    }
    return { states: this.cachedStates.states, blockHash: this.cachedStates.blockHash };
  }

  getLastUnsubmittedCallTxDataToTransact(): [UnsubmittedCallTxData<C, PCK>, PrivateStateId?] | undefined {
    return this.currentUnsubmittedCall;
  }

  async [Submit](): Promise<FinalizedCallTxData<C, PCK>> {
    const [unprovenCallTxData, privateStateId] = this.getLastUnsubmittedCallTxDataToTransact() ?? [];
    if (!unprovenCallTxData) {
      throw new Error('No calls were submitted.');
    }
    const finalizedTxData = await submitTx(this.providers, this.submitTxOptions!);
    if (finalizedTxData.status !== SucceedEntirely) {
      throw new CallTxFailedError(finalizedTxData, this.submitTxOptions!.circuitId!);
    }
    if (privateStateId) {
      await this.providers.privateStateProvider!.set(privateStateId, unprovenCallTxData.private.nextPrivateState);
    }
    return {
      private: unprovenCallTxData.private,
      public: {
        ...unprovenCallTxData.public,
        ...finalizedTxData
      },
      calls: unprovenCallTxData.calls
    }
  }

  [CacheStates](
    states: ContractStates<Contract.PrivateState<C>> | PublicContractStates,
    identity: CachedStateIdentity,
    blockHash: string
  ): void {
    this.cachedStates = { states, identity, blockHash };
  }

  [MergeUnsubmittedCallTxData](circuitId: PCK, callData: UnsubmittedCallTxData<C, PCK>, privateStateId?: PrivateStateId): void {
    this.currentUnsubmittedCall = [callData, privateStateId];
    this.submitTxOptions = mergeSubmitTxOptions(
      this.submitTxOptions,
      {
        unprovenTx: callData.private.unprovenTx,
        circuitId
       }
    );

    // If there is no currently cached state, then return...
    if (!this.cachedStates) return;

    // ...otherwise apply the changes in `callData` to the cached state, preserving the identity.
    const privateState = callData.private.nextPrivateState;
    const contractState = this.cachedStates.states.contractState;
    const zswapChainState = this.cachedStates.states.zswapChainState; // Preserve the current Zswap chain state.
    const ledgerParameters = this.cachedStates.states.ledgerParameters; // Preserve the current ledger parameters.

    contractState.data = new ChargedState(callData.public.nextContractState);

    // Preserve the pinned block: in-scope calls advance the contract state in memory but the scope
    // stays pinned to the block its states were first read at.
    this[CacheStates](
      { contractState, zswapChainState, ledgerParameters, privateState },
      this.cachedStates.identity,
      this.cachedStates.blockHash
    );
  }
}

/** @internal */
export const mergeUnsubmittedCallTxData = <
  C extends Contract.Any,
  PCK extends Contract.ProvableCircuitId<C>
>(
  txCtx: Transaction.TransactionContext<C, PCK>,
  circuitId: PCK,
  callData: UnsubmittedCallTxData<C, PCK>,
  privateStateId?: PrivateStateId
): void => {
  txCtx[MergeUnsubmittedCallTxData](circuitId, callData, privateStateId);
};

/** @internal */
export const isTransactionContext = (u: unknown): u is Transaction.TransactionContext<Contract.Any> =>
  typeof u === "object" && u != null && TypeId in u;

/**
 * Refuses a retained-era call that was handed a scope to join.
 *
 * Reachable only from JavaScript today — the retained-era `submitCallTx`
 * overload declares no scope parameter — and still checked, because the
 * alternative is what it replaces: the retained arm accepted the scope context
 * and quietly ran outside it.
 *
 * KEEP THE THREE OUTCOMES APART. No third argument is the normal case; a real
 * scope is the mixed-era refusal; anything else is a malformed argument.
 *
 * @internal
 * @param circuitId The circuit whose call was made.
 * @param transactionContext The scope the caller passed, if any. Typed as
 * `unknown` for the same reason `isTransactionContext` is: the era-dispatching
 * implementation signature widens both arms, and a JavaScript caller can pass
 * anything at all here.
 * @throws MixedEraScopeError if a real transaction context was passed.
 * @throws TypeError if a third argument was passed that is not one.
 * @see {@link StaleHeadRemediation} for why a retained-era call cannot join a
 *      scope, and why the malformed-argument arm is a bare `TypeError`.
 */
export const assertScopeAdmitsRetainedEraCall = (circuitId: string, transactionContext: unknown): void => {
  if (transactionContext === undefined) {
    return;
  }
  if (isTransactionContext(transactionContext)) {
    throw new MixedEraScopeError(circuitId);
  }
  throw new TypeError(
    `submitCallTx was passed a third argument that is not a transaction context (received ` +
      `${transactionContext === null ? 'null' : typeof transactionContext}). A transaction context comes ` +
      `from the callback withContractScopedTransaction runs; pass that value, or omit the argument to ` +
      `submit this call as its own transaction.`
  );
};

/**
 * The body every scope runs, with its inputs already separated: the outer
 * context if this is a nested call, the scope options, and the era reading if
 * this scope has one.
 *
 * Split out from {@link scoped} so the two entry points below differ in exactly
 * ONE thing -- whether an era was resolved for the scope -- rather than each
 * re-implementing the execute-then-submit-or-rebuild logic here.
 */
const runScope = async <
  C extends Contract.Any,
  PCK extends Contract.ProvableCircuitId<C>
> (
  providers: ContractProviders<C, PCK>,
  fn: (txCtx: Transaction.TransactionContext<C, PCK>) => Promise<void>,
  outerTxCtx: Transaction.TransactionContext<C, PCK> | undefined,
  txOptions: Transaction.ScopedTransactionOptions | undefined,
  scopeEra: ResolvedOperationEra | undefined
): Promise<any> => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const innerTxCtx = outerTxCtx ?? new TransactionContextImpl<C, PCK>(providers, txOptions, scopeEra);

  try {
    await fn(innerTxCtx);
  } catch (err: unknown) {
    if (outerTxCtx) {
      throw err;
    }
    const execErr = new Error(
      `Unexpected error executing scoped transaction '${txOptions?.scopeName ?? '<unnamed>'}': ${String(err)}`,
      { cause: err }
    );
    providers?.loggerProvider?.error?.call(
      providers.loggerProvider,
      execErr.message
    );
    throw execErr;
  }
  try {
    // Only submit when there is no outer transaction context (i.e., no parent transaction context, meaning
    // that this is the root transaction context).
    if (!outerTxCtx) {
      return await innerTxCtx[Submit]();
    }

    // ...otherwise, return the `CallResult` from the last submitted call within the scope of the transaction context.
    const [unprovenCallTxData] = innerTxCtx.getLastUnsubmittedCallTxDataToTransact() ?? [];
    if (!unprovenCallTxData) {
      //disable-next-line: no-throw-literal
      throw new Error('No calls were submitted.');
    }
    return {
      public: {
        nextContractState: unprovenCallTxData.public.nextContractState,
        partitionedTranscript: unprovenCallTxData.public.partitionedTranscript,
        publicTranscript: unprovenCallTxData.public.publicTranscript,
        logEvents: unprovenCallTxData.public.logEvents
      },
      private: {
        input: unprovenCallTxData.private.input,
        output: unprovenCallTxData.private.output,
        privateTranscriptOutputs: unprovenCallTxData.private.privateTranscriptOutputs,
        result: unprovenCallTxData.private.result,
        nextPrivateState: unprovenCallTxData.private.nextPrivateState,
        nextZswapLocalState: unprovenCallTxData.private.nextZswapLocalState
      }
    } as CallResult<C, PCK>;
  } catch (err: unknown) {
    // Rethrow known call transaction failures and errors occurring within an outer transaction context...
    if (err instanceof CallTxFailedError || outerTxCtx) {
      throw err;
    }
    // ...otherwise, wrap and rethrow errors occurring during submission at the root transaction context.
    const submitErr = new Error(
      `Unexpected error submitting scoped transaction '${txOptions?.scopeName ?? '<unnamed>'}': ${String(err)}`,
      { cause: err }
    );
    providers?.loggerProvider?.error?.call(
      providers.loggerProvider,
      submitErr.message
    );
    throw submitErr;
  }
};

/**
 * Runs `fn` against a transaction context, WITHOUT resolving an era of its own.
 *
 * This is the single-call entry point, plus the nested form a call inside a
 * user scope takes. It resolves no era deliberately: the current-era
 * single-call path asks no era question, and reading the head here would add a
 * network round trip to every call in the framework. A call nested inside a
 * user scope inherits that scope's reading through `outerTxCtx`, so the scope
 * is still read once and only once.
 *
 * @internal
 */
export const scoped: {
  <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
    providers: ContractProviders<C, PCK>,
    fn: (txCtx: Transaction.TransactionContext<C, PCK>) => Promise<void>,
    options?: Transaction.ScopedTransactionOptions,
  ): Promise<FinalizedCallTxData<C, PCK>>,
  <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
    providers: ContractProviders<C, PCK>,
    fn: (txCtx: Transaction.TransactionContext<C, PCK>) => Promise<void>,
    txCtx: Transaction.TransactionContext<C, PCK>,
    options?: Transaction.ScopedTransactionOptions
  ): Promise<CallResult<C, PCK>>
} = async <
  C extends Contract.Any,
  PCK extends Contract.ProvableCircuitId<C>
> (
  providers: ContractProviders<C, PCK>,
  fn: (txCtx: Transaction.TransactionContext<C, PCK>) => Promise<void>,
  txCtxOrOptions?: Transaction.TransactionContext<C, PCK> | Transaction.ScopedTransactionOptions,
  options?: Transaction.ScopedTransactionOptions
): Promise<any> => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const outerTxCtx = isTransactionContext(txCtxOrOptions) ? txCtxOrOptions : undefined;
  const txOptions = isTransactionContext(txCtxOrOptions)
    ? options
    : txCtxOrOptions as Transaction.ScopedTransactionOptions | undefined;

  return runScope(providers, fn, outerTxCtx, txOptions, undefined);
};

/**
 * Runs `fn` as a USER scope: one head read up front, and a refusal if the head
 * era cannot express a scope at all.
 *
 * The era read happens BEFORE the context exists, so a scope on an era that
 * cannot batch is refused before any circuit runs -- see
 * {@link resolveScopeEra}. Every call merged into the scope afterwards inherits
 * that one reading, which is what makes the head read once per scope rather
 * than once per call.
 *
 * @internal
 */
export const scopedTransaction = async <
  C extends Contract.Any,
  PCK extends Contract.ProvableCircuitId<C>
> (
  providers: ContractProviders<C, PCK>,
  fn: (txCtx: Transaction.TransactionContext<C, PCK>) => Promise<void>,
  txCtxOrOptions?: Transaction.TransactionContext<C, PCK> | Transaction.ScopedTransactionOptions
): Promise<FinalizedCallTxData<C, PCK>> => {
  // The third argument is DISCRIMINATED, not assumed to be options, and the
  // guard is not decorative: this parameter is declared as options on the
  // public entry point, so a JavaScript caller passing a transaction context
  // here -- which the entry point accepted before these era rules, by nesting
  // into it -- would otherwise have it read as an options bag. A fresh scope
  // would be created and the transaction the caller believed was nested would
  // be submitted on its own. That is the same "silently ran outside the scope
  // it was handed" failure `MixedEraScopeError` exists to stop, one arm over.
  const outerTxCtx = isTransactionContext(txCtxOrOptions) ? txCtxOrOptions : undefined;
  if (outerTxCtx !== undefined) {
    // Nested: no head read of its own. The scope this joins already made one,
    // which is what keeps it at one read per scope, and the outer scope is the
    // one that submits -- so this returns that scope's `CallResult`, exactly as
    // it did before.
    return runScope(providers, fn, outerTxCtx, undefined, undefined);
  }

  const options = txCtxOrOptions as Transaction.ScopedTransactionOptions | undefined;
  const scopeEra = await resolveScopeEra(providers.publicDataProvider, providers.loggerProvider);

  return runScope(providers, fn, undefined, options, scopeEra);
};
