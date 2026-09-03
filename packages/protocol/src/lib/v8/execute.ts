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

import type * as OnchainRuntimeV3 from '@midnight-ntwrk/onchain-runtime-v3';
import type { EncodedZswapLocalState, ProofData, ZswapLocalState } from 'compact-runtime-ledger8';

type AlignedValue = OnchainRuntimeV3.AlignedValue;
type ChargedState = OnchainRuntimeV3.ChargedState;
type CostModel = OnchainRuntimeV3.CostModel;
type Op<T> = OnchainRuntimeV3.Op<T>;

import type { PartitionContext } from '../shared/compose-types';
import type { DownConvertedState } from './down-convert';

/**
 * The `QueryContext` slice {@link executeCircuit} reads off a circuit's
 * context: the primary state, ready to be wrapped back into a
 * {@link DownConvertedState}, plus the three members a composition leg needs to
 * partition the call's public transcript against the context it really ran on
 * (see {@link PartitionContext}).
 *
 * A `Pick` of the vendor's own class, not a restatement of it: the member names
 * and their types come from onchain-runtime-v3, so a rename there fails this
 * build instead of leaving a mirror that describes a property the runtime no
 * longer has. It stays a narrowing rather than the whole class because
 * `QueryContext` is a WASM class with dozens of members, and this seam reads
 * four — the narrowing is what lets the execution tests hand `executeCircuit` a
 * plain object double instead of standing up real WASM.
 *
 * @see {@link RetainedEraExecution}
 */
export type Ledger8QueryContext = Pick<
  OnchainRuntimeV3.QueryContext,
  'state' | 'block' | 'effects' | 'comIndices'
>;

/**
 * The circuit-context slice {@link executeCircuit} needs from a pre-fork
 * (`compact-runtime@0.16`) `createCircuitContext` call and a circuit's
 * updated context after it runs.
 *
 * Not the glue's `CircuitContext` itself: that one carries a real
 * `QueryContext`, a WASM class no test double can satisfy, and this seam reads
 * a handful of properties off it. The narrowing is the difference between
 * execution tests that check plumbing with a literal and tests that must stand
 * up WASM to do it — see {@link Ledger8QueryContext}, which derives those
 * properties from the vendor's class so the narrowing cannot drift from it.
 *
 * @see {@link RetainedEraExecution}
 */
export interface Ledger8CircuitContext {
  readonly currentQueryContext: Ledger8QueryContext;
  readonly currentPrivateState: unknown;
  readonly currentZswapLocalState: EncodedZswapLocalState;
}

/**
 * The proof-data slice of a pre-fork {@link Ledger8CircuitResult}.
 *
 * The vendor's own `ProofData`, not a copy of its four members: it is already
 * plain data with no WASM handle in it, so there was nothing for a mirror to
 * narrow — only a shape to drift out of sync. `Readonly` is this package's own
 * addition, and the only one.
 *
 * @see {@link EraSeam}
 */
export type Ledger8ProofData = Readonly<ProofData>;

/**
 * What a pre-fork `impureCircuits[id](ctx, ...args)` call returns.
 *
 * Tracks the glue's `CircuitResults` but is not derived from it: `context` is
 * the narrowed {@link Ledger8CircuitContext} for the reason given there, and
 * `proofData` IS the vendor's own type — see {@link Ledger8ProofData}.
 *
 * @see {@link RetainedEraExecution}
 */
export interface Ledger8CircuitResult {
  readonly result: unknown;
  readonly proofData: Ledger8ProofData;
  readonly context: Ledger8CircuitContext;
}

/** One callable entry point on a compiled pre-fork contract's `impureCircuits` map. */
export type Ledger8ImpureCircuit = (ctx: Ledger8CircuitContext, ...args: readonly unknown[]) => Ledger8CircuitResult;

/**
 * The subset of a compiled pre-fork (`compact-runtime@0.16`) contract module
 * {@link executeCircuit} needs: only `impureCircuits`, the map every
 * generated contract exposes its callable entry points under.
 *
 * @see {@link RetainedEraExecution}
 */
export interface Ledger8ContractLike {
  readonly impureCircuits: Readonly<Record<string, Ledger8ImpureCircuit>>;
}

/**
 * The subset of the pre-fork `compact-runtime@0.16` glue {@link executeCircuit}
 * needs to build a circuit context, injected rather than imported.
 *
 * @see {@link RetainedEraExecution}
 */
export interface Ledger8ExecutionRuntime {
  /** The glue's own encoded -> decoded conversion for a Zswap local state. */
  readonly decodeZswapLocalState: (state: EncodedZswapLocalState) => ZswapLocalState;
  /**
   * Narrowed rather than derived, and so returns
   * {@link Ledger8CircuitContext} rather than the glue's own `CircuitContext`.
   *
   * @see {@link RetainedEraExecution} for what the narrowing buys
   */
  readonly createCircuitContext: (
    contractAddress: string,
    coinPublicKey: string,
    contractState: ChargedState,
    privateState: unknown,
    gasLimit: undefined,
    costModel: CostModel
  ) => Ledger8CircuitContext;
  /** A `Pick` of the vendor's class: `initialCostModel` is the only static this seam calls. */
  readonly CostModel: Pick<typeof OnchainRuntimeV3.CostModel, 'initialCostModel'>;
}

/**
 * The result of one impure circuit's invocation on a pre-fork
 * (`compact-runtime@0.16`) contract instance: the primary result plus every
 * artifact {@link wrapKeepStateCall} (`../v9/wrap.ts`) needs to assemble a
 * v9-native `ContractCallPrototype`.
 *
 * `preContractState`/`postContractState` are {@link DownConvertedState}s, not
 * full pre-fork `ContractState`s: they carry only `.data`.
 *
 * `partitionContext` is the query-context state the call ran with, which the
 * carried state bytes do not hold — see {@link PartitionContext}. A composition
 * leg needs it to partition the call's transcript.
 *
 * `zswapLocalState` is the post-call Zswap local state, DECODED into the
 * runtime's public shape: the coins the circuit spent and produced. A caller
 * turns it into the transaction's segmented Zswap offer
 * (`zswapStateToSegmentedOffer`, `packages/contracts/src/utils/zswap-utils.ts`)
 * and hands that offer to whichever composition leg it targets.
 *
 * @see {@link RetainedEraExecution}
 */
export interface TranscriptPojo {
  readonly circuitId: string;
  readonly result: unknown;
  readonly input: AlignedValue;
  readonly output: AlignedValue;
  readonly publicTranscript: Op<AlignedValue>[];
  readonly privateTranscriptOutputs: AlignedValue[];
  readonly preContractState: DownConvertedState;
  readonly postContractState: DownConvertedState;
  readonly privateStateAfter: unknown;
  readonly partitionContext: PartitionContext;
  readonly zswapLocalState: ZswapLocalState;
}

/** Everything {@link executeCircuit} needs to run one impure circuit call. */
export interface ExecuteCircuitOptions {
  readonly contract: Ledger8ContractLike;
  readonly circuitId: string;
  readonly args: readonly unknown[];
  readonly state: DownConvertedState;
  readonly address: string;
  readonly coinPk: string;
  readonly privateState: unknown;
}

/**
 * Runs one impure circuit on a pre-fork (`compact-runtime@0.16`) contract
 * instance and packages every artifact {@link wrapKeepStateCall} needs into a
 * {@link TranscriptPojo}.
 *
 * A circuit that moved coins runs like any other: its post-call Zswap local
 * state leaves on {@link TranscriptPojo}, decoded through the injected runtime,
 * for the caller to turn into the transaction's Zswap offer.
 *
 * @param options The contract module, circuit id, arguments, down-converted
 *   state, contract address, coin public key and private state.
 * @param ledger8Runtime The injected pre-fork glue slice.
 * @returns Every artifact a v9-native call prototype needs.
 * @throws Error A plain `Error` — not a {@link PROTOCOL_ERROR_CODES}-carrying
 *   class — when `circuitId` names no entry point on
 *   `contract.impureCircuits`.
 * @see {@link RetainedEraExecution}
 */
export const executeCircuit = (options: ExecuteCircuitOptions, ledger8Runtime: Ledger8ExecutionRuntime): TranscriptPojo => {
  const { contract, circuitId, args, state, address, coinPk, privateState } = options;
  const circuit = Object.hasOwn(contract.impureCircuits, circuitId) ? contract.impureCircuits[circuitId] : undefined;
  if (typeof circuit !== 'function') {
    throw new Error(
      `No impure circuit named '${circuitId}' on this pre-fork contract instance. ` +
        `Available circuits: ${Object.keys(contract.impureCircuits).join(', ') || '(none)'}.`
    );
  }

  const ctx = ledger8Runtime.createCircuitContext(
    address,
    coinPk,
    state.data,
    privateState,
    undefined,
    ledger8Runtime.CostModel.initialCostModel()
  );
  // Read BEFORE the circuit runs. The glue swaps `currentQueryContext` for a
  // new context on every coin it registers, so after the call this object no
  // longer answers for the context the call started from.
  const preCallBlock = ctx.currentQueryContext.block;
  const preCallEffects = ctx.currentQueryContext.effects;
  const res = circuit(ctx, ...args);

  return {
    circuitId,
    result: res.result,
    input: res.proofData.input,
    output: res.proofData.output,
    publicTranscript: res.proofData.publicTranscript,
    privateTranscriptOutputs: res.proofData.privateTranscriptOutputs,
    preContractState: state,
    postContractState: { data: res.context.currentQueryContext.state },
    privateStateAfter: res.context.currentPrivateState,
    partitionContext: {
      block: preCallBlock,
      effects: preCallEffects,
      comIndices: res.context.currentQueryContext.comIndices
    },
    zswapLocalState: ledger8Runtime.decodeZswapLocalState(res.context.currentZswapLocalState)
  };
};
