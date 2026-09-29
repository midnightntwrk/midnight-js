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

import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
import { ChargedState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  type CoinPublicKey,
  communicationCommitmentRandomness,
  type ContractAddress,
  ContractState as LedgerContractState,
  type EncPublicKey,
  LedgerParameters as LedgerLedgerParameters,
  PrePartitionContractCall,
  PreTranscript,
  QueryContext as LedgerQueryContext,
  type UnprovenTransaction
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  type AnyProvableCircuitId,
  type FinalizedTxData,
  type PrivateStateId,
  SucceedEntirely,
  Transaction
} from '@midnight-ntwrk/midnight-js-types';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';

import type * as BundleApi from '../bundle';
import { type ContractProviders } from '../contract-providers';
import { CallTxFailedError } from '../errors';
import { type ContractStates, type PublicContractStates } from '../get-states';
import { submitTx } from '../submit-tx';
import type * as TransactionApi from '../transaction';
import type { UnsubmittedCallTxData } from '../tx-model';
import {
  type CachedStateIdentity,
  CacheStates,
  GetCurrentStatesForIdentity,
  MergeUnsubmittedCallTxData,
  Submit,
  TypeId
} from './transaction';

/**
 * @internal
 *
 * One contract call captured during a {@link withMultiContractScopedTransaction} scope.
 * The scope handler records the raw inputs the SDK's per-call pipeline produced (input,
 * output, private transcript outputs, public transcript) so the bundler can reconstruct
 * a fresh {@link PrePartitionContractCall} and hand it to {@link Transaction.addCalls}
 * for joint transcript partitioning.
 *
 * `contractStateBytes` and `ledgerParametersBytes` are serialized snapshots taken at
 * merge time, BEFORE any subsequent same-identity state mutation in the scope. The
 * bundler hands these bytes to {@link LedgerContractState.deserialize} and
 * {@link LedgerLedgerParameters.deserialize} so the resulting `ContractOperation`,
 * `ChargedState`, `QueryContext`, and `LedgerParameters` instances are ledger-v8 wasm
 * instances; ledger-v8 APIs validate the wasm class identity of their arguments.
 *
 * `callData.public.publicTranscript` is the PRE-partition program. The
 * `partitionedTranscript` and `unprovenTx` fields on `callData` are artifacts of the
 * SDK's per-call assembly and are intentionally NOT used by the bundler — joint
 * partitioning supersedes the per-call partition.
 */
export interface InFlightCall {
  readonly identity: CachedStateIdentity;
  readonly circuitId: AnyProvableCircuitId;
  readonly contractStateBytes: Uint8Array;
  readonly ledgerParametersBytes: Uint8Array;
  readonly callData: UnsubmittedCallTxData<Contract.Any, AnyProvableCircuitId>;
}

interface CachedStatesEntry {
  readonly identity: CachedStateIdentity;
  states: ContractStates<unknown> | PublicContractStates;
}

/**
 * @internal
 *
 * Builds an {@link UnprovenTransaction} from a list of in-flight calls. Default impl
 * is {@link bundleIntoSingleIntent}; the seam exists so unit tests can stub it without
 * needing to construct round-trippable wasm contract states.
 */
export type Bundler = (calls: readonly InFlightCall[]) => UnprovenTransaction;

const identityKey = (i: CachedStateIdentity): string =>
  `${i.contractAddress} ${i.privateStateId ?? ''}`;

/**
 * @internal
 *
 * Builds a single {@link UnprovenTransaction} carrying every in-flight call in one
 * intent of one randomly-chosen segment, via the documented multi-call API
 * `Transaction.addCalls(segment, calls, params, ttl)`.
 *
 * Joint partitioning (rather than per-call partitioning followed by intent-level
 * splicing) is the property required for cross-contract value flows. With each call
 * partitioned independently, sender's {@link ContractAction} and recipient's
 * {@link ContractAction} can land in different guaranteed/fallible halves of the same
 * intent, in which case the cross-call effects-check at the ledger
 * (`real_unshielded_spends.has_subset(claimed_unshielded_spends)`, keyed at
 * `(intent_seg, is_guaranteed_half)`) refuses to match the sender's
 * `claimed_unshielded_spends` against the recipient's `unshielded_inputs`.
 *
 * For each call we build a fresh {@link ContractCallPrototype} from raw inputs and a
 * freshly-sampled {@link communicationCommitmentRandomness}; the binding nonce can be
 * (re-)sampled at any point before proving for independent actions.
 */
export const bundleIntoSingleIntent: Bundler = (calls) => {
  if (calls.length === 0) {
    throw new Error('Cannot bundle: in-flight call list is empty.');
  }

  // All calls in a scope are made against the same chain, so the first call's
  // ledgerParameters are representative of the whole bundle. Round-trip through
  // ledger-v8 to ensure the wasm-class identity matches what `addCalls` expects.
  const ledgerParams = LedgerLedgerParameters.deserialize(calls[0].ledgerParametersBytes);

  const prePartitionCalls = calls.map((call): PrePartitionContractCall => {
    // Bridge cross-package wasm class identity by deserializing through ledger-v8.
    // `compact-runtime` and `ledger-v8` each ship their OWN wasm class for
    // ContractState / ContractOperation / ChargedState / QueryContext under the
    // same TypeScript names; the ledger-v8 APIs reject non-ledger-v8 instances.
    const ledgerState = LedgerContractState.deserialize(call.contractStateBytes);
    const op = ledgerState.operation(call.circuitId);
    if (!op) {
      throw new Error(
        `Operation '${String(call.circuitId)}' is undefined for the cached state of contract ${
          call.identity.contractAddress
        }.`
      );
    }
    const queryContext = new LedgerQueryContext(
      ledgerState.data,
      call.identity.contractAddress as ContractAddress
    );
    const preTranscript = new PreTranscript(queryContext, call.callData.public.publicTranscript);

    return new PrePartitionContractCall(
      call.identity.contractAddress as ContractAddress,
      call.circuitId,
      op,
      preTranscript,
      call.callData.private.privateTranscriptOutputs,
      call.callData.private.input,
      call.callData.private.output,
      communicationCommitmentRandomness(),
      String(call.circuitId)
    );
  });

  // For our contract-only bundles we never have Zswap inputs/outputs/transients; if a
  // future caller wants those routed through the bundler the empty array arguments
  // here are the place to thread them through.
  const empty = Transaction.fromParts(getNetworkId());
  return empty.addCalls(
    { tag: 'random' },
    prePartitionCalls,
    ledgerParams,
    ttlOneHour()
  );
};

/**
 * @internal
 *
 * Implementation of {@link BundleApi.MultiContractTransactionContext}. The runtime
 * shape is structurally a {@link TransactionApi.TransactionContext}<Contract.Any>:
 * each per-contract `callTx.<circuitId>(ctx, ...)` invocation goes through the SDK's
 * normal `submitCallTx → Transaction.scoped → mergeUnsubmittedCallTxData` path with
 * this object as the outer `txCtx`, then we collect the raw call data and assemble
 * one merged transaction at submission time.
 */
export class BundleContextImpl
  implements TransactionApi.TransactionContext<Contract.Any, AnyProvableCircuitId>
{
  readonly [TypeId]: TransactionApi.TypeId = TypeId;

  private readonly providers: ContractProviders<Contract.Any, AnyProvableCircuitId>;
  private readonly options?: TransactionApi.ScopedTransactionOptions;
  private readonly bundler: Bundler;

  private readonly cachedStatesByIdentity = new Map<string, CachedStatesEntry>();
  private readonly inFlightCalls: InFlightCall[] = [];

  private lastUnsubmittedCall:
    | [UnsubmittedCallTxData<Contract.Any, AnyProvableCircuitId>, PrivateStateId?]
    | undefined = undefined;

  constructor(
    providers: ContractProviders<Contract.Any, AnyProvableCircuitId>,
    options?: TransactionApi.ScopedTransactionOptions,
    bundler: Bundler = bundleIntoSingleIntent
  ) {
    this.providers = providers;
    this.options = options;
    this.bundler = bundler;
  }

  // ── TransactionContext protocol surface ─────────────────────────────────

  getAdditionalMappings(): ReadonlyMap<CoinPublicKey, EncPublicKey> | undefined {
    return this.options?.additionalCoinEncPublicKeyMappings;
  }

  /**
   * @deprecated Mirrors {@link TransactionApi.TransactionContext.getCurrentStates}'s
   * single-identity semantics by returning the most recently touched identity's states.
   * Multi-contract callers should not rely on it; use the identity-validating reader.
   */
  getCurrentStates(): ContractStates<unknown> | PublicContractStates | undefined {
    if (this.inFlightCalls.length === 0) return undefined;
    const lastIdentity = this.inFlightCalls[this.inFlightCalls.length - 1]!.identity;
    return this.cachedStatesByIdentity.get(identityKey(lastIdentity))?.states;
  }

  getLastUnsubmittedCallTxDataToTransact():
    | [UnsubmittedCallTxData<Contract.Any, AnyProvableCircuitId>, PrivateStateId?]
    | undefined {
    return this.lastUnsubmittedCall;
  }

  [GetCurrentStatesForIdentity](
    identity: CachedStateIdentity
  ): ContractStates<unknown> | PublicContractStates | undefined {
    return this.cachedStatesByIdentity.get(identityKey(identity))?.states;
  }

  [CacheStates](
    states: ContractStates<unknown> | PublicContractStates,
    identity: CachedStateIdentity
  ): void {
    this.cachedStatesByIdentity.set(identityKey(identity), { identity, states });
  }

  [MergeUnsubmittedCallTxData](
    circuitId: AnyProvableCircuitId,
    callData: UnsubmittedCallTxData<Contract.Any, AnyProvableCircuitId>,
    privateStateId?: PrivateStateId
  ): void {
    const identity = this.identityForCall(privateStateId);

    const cached = this.cachedStatesByIdentity.get(identityKey(identity));
    if (!cached) {
      throw new Error(
        `No cached state for identity ${identityKey(identity)} at merge time. ` +
          'The SDK populates the cache via [CacheStates] before [MergeUnsubmittedCallTxData]; ' +
          'this invariant is violated.'
      );
    }
    // Capture the raw bytes BEFORE the post-call mutation below. The bundler treats
    // this snapshot as the pre-call state when constructing PreTranscript / op for
    // the call.
    const contractStateBytes: Uint8Array = cached.states.contractState.serialize();
    const ledgerParametersBytes: Uint8Array = (
      cached.states.ledgerParameters as { serialize(): Uint8Array }
    ).serialize();

    this.inFlightCalls.push({
      identity,
      circuitId,
      contractStateBytes,
      ledgerParametersBytes,
      callData
    });
    this.lastUnsubmittedCall = [callData, privateStateId];

    // Mirror the SDK's in-place state-update behaviour so subsequent same-identity
    // calls in the scope read the post-call ledger state, preserving the original
    // zswapChainState and ledgerParameters.
    const nextContractState = cached.states.contractState;
    nextContractState.data = new ChargedState(callData.public.nextContractState);
    const nextStates: ContractStates<unknown> | PublicContractStates =
      'privateState' in cached.states
        ? {
            contractState: nextContractState,
            zswapChainState: cached.states.zswapChainState,
            ledgerParameters: cached.states.ledgerParameters,
            privateState: callData.private.nextPrivateState
          }
        : {
            contractState: nextContractState,
            zswapChainState: cached.states.zswapChainState,
            ledgerParameters: cached.states.ledgerParameters
          };
    this.cachedStatesByIdentity.set(identityKey(identity), { identity, states: nextStates });
  }

  /**
   * Provided for protocol compatibility. The SDK's root `scoped(...)` only calls
   * `[Submit]` when no outer `txCtx` is supplied; in our usage we ARE the outer ctx,
   * so the SDK never invokes this. We expose it so a {@link BundleContextImpl} is
   * structurally a {@link TransactionApi.TransactionContext}.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async [Submit](): Promise<any> {
    return this.submit();
  }

  // ── Bundler-specific surface ────────────────────────────────────────────

  /**
   * Pure widening: returns this same context typed for `_contract`. Required because
   * each {@link BundleApi.MultiContractTransactionContext.for} caller's
   * `FoundContract` is statically typed at its own `(C, PCK)`, while the bundle
   * context is intentionally type-erased so it can thread through calls to
   * heterogeneous contracts.
   */
  for<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
    _contract: unknown
  ): TransactionApi.TransactionContext<C, PCK> {
    return this as unknown as TransactionApi.TransactionContext<C, PCK>;
  }

  /**
   * Bundles the in-flight calls into a single-intent transaction, submits it, and
   * persists each participating private state. Returns the finalized public tx data
   * plus the per-call records.
   */
  async submit(): Promise<BundleApi.BundledFinalizedTxData> {
    if (this.inFlightCalls.length === 0) {
      throw new Error('No calls were submitted within the multi-contract scope.');
    }

    const mergedTx = this.bundler(this.inFlightCalls);
    const circuitIds = this.inFlightCalls.map((c) => c.circuitId);

    const finalizedTxData: FinalizedTxData = await submitTx(this.providers, {
      unprovenTx: mergedTx,
      circuitId: circuitIds
    });

    if (finalizedTxData.status !== SucceedEntirely) {
      throw new CallTxFailedError(finalizedTxData, circuitIds);
    }

    // Persist the latest nextPrivateState for each participating privateStateId.
    // Walking in insertion order means later same-PSID calls override earlier ones.
    const latestByPsId = new Map<PrivateStateId, InFlightCall>();
    for (const c of this.inFlightCalls) {
      if (c.identity.privateStateId !== undefined) {
        latestByPsId.set(c.identity.privateStateId, c);
      }
    }
    if (latestByPsId.size > 0) {
      const psp = this.providers.privateStateProvider;
      if (!psp) {
        throw new Error(
          'In-flight calls referenced privateStateIds but providers.privateStateProvider is undefined.'
        );
      }
      for (const [psId, call] of latestByPsId) {
        await psp.set(psId, call.callData.private.nextPrivateState);
      }
    }

    return {
      public: finalizedTxData,
      calls: this.inFlightCalls
    };
  }

  // ── Internal helpers ────────────────────────────────────────────────────

  /**
   * Recovers the identity for a merge call from its `privateStateId` argument. The
   * SDK's `[MergeUnsubmittedCallTxData]` protocol does not directly thread
   * `contractAddress`, so we identify the matching cached identity by `privateStateId`
   * (the unique identity key for a given contract within a scope).
   *
   * Pathological pipelines where multiple distinct contract addresses share the same
   * `privateStateId` (or all share `undefined`) cannot be reliably distinguished
   * here; the most recently cached identity for that `privateStateId` wins.
   */
  private identityForCall(privateStateId: PrivateStateId | undefined): CachedStateIdentity {
    let candidate: CachedStateIdentity | undefined;
    for (const entry of this.cachedStatesByIdentity.values()) {
      if (entry.identity.privateStateId === privateStateId) {
        candidate = entry.identity;
      }
    }
    if (!candidate) {
      throw new Error(
        `Cannot recover identity for in-flight call: no cached states match privateStateId=${String(
          privateStateId
        )}.`
      );
    }
    return candidate;
  }

  /** @internal Test-only accessor. */
  getInFlightCalls(): readonly InFlightCall[] {
    return this.inFlightCalls;
  }
}

/**
 * @internal
 *
 * Test-only options for {@link bundleScoped}. Public callers should use
 * {@link BundleApi.withMultiContractScopedTransaction}, which does not expose the
 * test seam.
 */
export interface BundleScopedInternalOptions {
  /**
   * Override the bundling step. Used by unit tests that don't have access to
   * round-trippable {@link LedgerContractState} bytes.
   */
  readonly bundler?: Bundler;
}

/**
 * @internal
 *
 * Entry point used by {@link BundleApi.withMultiContractScopedTransaction}. The
 * `internalOptions` parameter is intended only for unit tests and is omitted from
 * the public API.
 */
export const bundleScoped = async (
  providers: ContractProviders<Contract.Any, AnyProvableCircuitId>,
  fn: (txCtx: BundleApi.MultiContractTransactionContext) => Promise<void>,
  options?: TransactionApi.ScopedTransactionOptions,
  internalOptions?: BundleScopedInternalOptions
): Promise<BundleApi.BundledFinalizedTxData> => {
  const ctx = new BundleContextImpl(providers, options, internalOptions?.bundler);

  try {
    await fn(ctx as unknown as BundleApi.MultiContractTransactionContext);
  } catch (err: unknown) {
    const wrapped = new Error(
      `Unexpected error executing multi-contract scoped transaction '${
        options?.scopeName ?? '<unnamed>'
      }': ${String(err)}`,
      { cause: err }
    );
    providers?.loggerProvider?.error?.call(providers.loggerProvider, wrapped.message);
    throw wrapped;
  }

  try {
    return await ctx.submit();
  } catch (err: unknown) {
    if (err instanceof CallTxFailedError) {
      throw err;
    }
    const wrapped = new Error(
      `Unexpected error submitting multi-contract scoped transaction '${
        options?.scopeName ?? '<unnamed>'
      }': ${String(err)}`,
      { cause: err }
    );
    providers?.loggerProvider?.error?.call(providers.loggerProvider, wrapped.message);
    throw wrapped;
  }
};

