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
import { type HeadVersionSource, type ResolvedOperationEra, resolveOperationEra } from './era';

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
 * Read once, when the scope is created, and threaded down as a value — the same
 * discipline the scope already applies to the block it pins: a scope is a
 * single chain snapshot, and a second head reading could answer differently
 * mid-scope and leave the batched transaction composed half against each era.
 * Nothing is cached ACROSS scopes, deliberately
 * (`docs/adr/0008-never-latch-the-network-head-version.md`).
 *
 * The refusal is here rather than deeper because this is the earliest point it
 * can be made: before the scope body runs, so nothing is executed and no
 * private state is touched on a batch that could never be submitted.
 *
 * @internal
 * @param pdp The read surface, for the single head read.
 * @returns The era facts the scope runs under.
 * @throws ScopedTxEraUnsupportedError if the head era composes only one call
 * per transaction, so has nothing for a scope to batch into.
 * @throws UnknownProtocolVersionError if the head integer is off the era timeline.
 */
export const resolveScopeEra = async (pdp: HeadVersionSource): Promise<ResolvedOperationEra> => {
  const resolved = await resolveOperationEra(pdp);
  if (resolved.head !== 'v9') {
    throw new ScopedTxEraUnsupportedError(resolved.head);
  }
  return resolved;
};

/**
 * Refuses a retained-era call that was handed a scope to join.
 *
 * The scope's merge is `unprovenTx.merge(...)` on live CURRENT-era
 * transactions, and a retained-era call never produces one: it is composed
 * against whichever era the head is on and crosses the provider seams as its
 * own transaction, in that era's own form. So there is nothing to merge it
 * into, at either head.
 *
 * Reachable only from JavaScript today — the retained-era `submitCallTx`
 * overload declares no scope parameter, so a TypeScript caller cannot pass one
 * — and it is still checked, because the alternative is what this replaces: the
 * retained arm accepted the scope context and quietly ran outside it, returning
 * a transaction the caller believed had been batched with the rest.
 *
 * @internal
 * @param circuitId The circuit whose call was made.
 * @param transactionContext The scope the caller passed, if any. Typed as
 * `unknown` for the same reason `isTransactionContext` is: the era-dispatching
 * implementation signature widens both arms, and the only thing this asks is
 * whether a scope was passed at all.
 * @throws MixedEraScopeError if a scope was passed.
 */
export const assertScopeAdmitsRetainedEraCall = (circuitId: string, transactionContext: unknown): void => {
  if (transactionContext === undefined) {
    return;
  }
  throw new MixedEraScopeError(circuitId);
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
  options?: Transaction.ScopedTransactionOptions
): Promise<FinalizedCallTxData<C, PCK>> => {
  const scopeEra = await resolveScopeEra(providers.publicDataProvider);

  return runScope(providers, fn, undefined, options, scopeEra);
};
