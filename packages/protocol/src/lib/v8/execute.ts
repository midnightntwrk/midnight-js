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
import type { ProofData } from 'compact-runtime-ledger8';

type AlignedValue = OnchainRuntimeV3.AlignedValue;
type ChargedState = OnchainRuntimeV3.ChargedState;
type CostModel = OnchainRuntimeV3.CostModel;
type Op<T> = OnchainRuntimeV3.Op<T>;

import { Ledger8ZswapUnsupportedError } from '../../errors';
import type { DownConvertedState } from './down-convert';

/**
 * The `QueryContext` slice {@link executeCircuit} reads off a circuit's
 * post-call context: the resulting primary state, ready to be wrapped back
 * into a {@link DownConvertedState}.
 *
 * A `Pick` of the vendor's own class, not a restatement of it: the member name
 * and its type come from onchain-runtime-v3, so a rename there fails this build
 * instead of leaving a mirror that describes a property the runtime no longer
 * has. It stays a narrowing rather than the whole class because `QueryContext`
 * is a WASM class with dozens of members, and this seam reads exactly one — the
 * narrowing is what lets the execution tests hand `executeCircuit` a
 * one-property double instead of standing up real WASM.
 */
export type Ledger8QueryContext = Pick<OnchainRuntimeV3.QueryContext, 'state'>;

/**
 * The Zswap coin movements a pre-fork circuit recorded, as the 0.16 runtime
 * tracks them on its `CircuitContext`. Only the two collections are declared:
 * {@link executeCircuit} inspects them to decide whether the call moved coins
 * at all, and never reads an individual entry.
 */
export interface Ledger8ZswapLocalState {
  readonly inputs: readonly unknown[];
  readonly outputs: readonly unknown[];
}

/**
 * The circuit-context slice {@link executeCircuit} needs from a pre-fork
 * (`compact-runtime@0.16`) `createCircuitContext` call and a circuit's
 * updated context after it runs.
 *
 * Not the glue's `CircuitContext` itself: that one carries a real
 * `QueryContext`, a WASM class no test double can satisfy, and this seam reads
 * a single property off it. The narrowing is the difference between execution
 * tests that check plumbing with a literal and tests that must stand up WASM to
 * do it — see {@link Ledger8QueryContext}, which derives that one property from
 * the vendor's class so the narrowing cannot drift from it.
 */
export interface Ledger8CircuitContext {
  readonly currentQueryContext: Ledger8QueryContext;
  readonly currentPrivateState: unknown;
  readonly currentZswapLocalState: Ledger8ZswapLocalState;
}

/**
 * The proof-data slice of a pre-fork {@link Ledger8CircuitResult}.
 *
 * The vendor's own `ProofData`, not a copy of its four members: it is already
 * plain data with no WASM handle in it, so there was nothing for a mirror to
 * narrow — only a shape to drift out of sync. `Readonly` is this package's own
 * addition, and the only one.
 */
export type Ledger8ProofData = Readonly<ProofData>;

/**
 * What a pre-fork `impureCircuits[id](ctx, ...args)` call returns.
 *
 * Tracks the glue's `CircuitResults` but is not derived from it: `context` is
 * the narrowed {@link Ledger8CircuitContext} for the reason given there, and
 * `gasCost` is absent because nothing here reads it. `proofData` IS the
 * vendor's own type — see {@link Ledger8ProofData}.
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
 * generated contract exposes its callable entry points under. The other own
 * properties a real compiled contract carries (`witnesses`, `circuits`,
 * `provableCircuits`, `initialState`) are never read here — execution only
 * ever dispatches through `impureCircuits`.
 */
export interface Ledger8ContractLike {
  readonly impureCircuits: Readonly<Record<string, Ledger8ImpureCircuit>>;
}

/**
 * The subset of the pre-fork `compact-runtime@0.16` glue {@link executeCircuit}
 * needs to build a circuit context. Injected — like {@link Ledger8CompactRuntime}
 * in `./down-convert.ts` — so callers target a specific WASM-backed
 * instance and tests can substitute a controlled fake.
 */
export interface Ledger8ExecutionRuntime {
  /**
   * Narrowed rather than derived, unlike its sibling below. The glue's own
   * `createCircuitContext` is generic in the private state and returns a
   * `CircuitContext` carrying a real `QueryContext` — a WASM class no test
   * double can satisfy — so deriving it would make every execution test stand
   * up real WASM to check plumbing. The narrowing returns
   * {@link Ledger8CircuitContext} instead, and `v8-load-engine.test.ts` pins
   * that the real glue still satisfies it.
   */
  readonly createCircuitContext: (
    contractAddress: string,
    coinPublicKey: string,
    contractState: ChargedState,
    privateState: unknown,
    gasLimit: undefined,
    costModel: CostModel
  ) => Ledger8CircuitContext;
  /**
   * A `Pick` of the vendor's class: `initialCostModel` is the only static this
   * seam calls, and the narrowing is what lets a test inject a stub cost model.
   */
  readonly CostModel: Pick<typeof OnchainRuntimeV3.CostModel, 'initialCostModel'>;
}

/**
 * The result of one impure circuit's invocation on a pre-fork
 * (`compact-runtime@0.16`) contract instance: the primary result plus every
 * artifact {@link wrapKeepStateCall} (`../v9/wrap.ts`) needs to assemble a
 * v9-native `ContractCallPrototype`.
 *
 * `preContractState`/`postContractState` are {@link DownConvertedState}s —
 * the same execution-only state shape `downConvertForExecution` already
 * produces — not full pre-fork `ContractState`s: they carry only `.data`, so a
 * consumer cannot reach `.operations`, `.maintenanceAuthority` or `.balance`
 * through them.
 *
 * The transcript also carries no Zswap local state, which is why
 * {@link executeCircuit} refuses a call that produced coin movements rather
 * than returning a transcript that silently omits them.
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
 * instance, following the exact `createCircuitContext` /
 * `impureCircuits[id](ctx, ...args)` sequence the retained toolchain expects
 * (the spike's `runCircuit`), and packages every artifact
 * {@link wrapKeepStateCall} needs into a {@link TranscriptPojo}.
 *
 * Throws a plain `Error` — not a {@link PROTOCOL_ERROR_CODES}-carrying class —
 * when `circuitId` names no entry point on `contract.impureCircuits`. This is
 * a caller-programming-error case (an unknown circuit name passed by the
 * caller), not one of the decode/runtime-instance failure modes this engine
 * wraps elsewhere; it mirrors the plain `Error` the spike itself throws for
 * the analogous "operation missing on contract state" case. The lookup is an
 * own-property one: `impureCircuits` is a plain object literal on every
 * compiled contract, so a bare index would resolve `toString` or `constructor`
 * off the prototype chain and dispatch into it.
 *
 * Throws {@link Ledger8ZswapUnsupportedError} when the circuit recorded Zswap
 * inputs or outputs. {@link TranscriptPojo} does not carry the post-call Zswap
 * local state, so such a call could only be composed into an unbalanced
 * transaction — this fails at the point of execution instead.
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
  const res = circuit(ctx, ...args);
  const zswap = res.context.currentZswapLocalState;
  if (zswap.inputs.length > 0 || zswap.outputs.length > 0) {
    throw new Ledger8ZswapUnsupportedError(circuitId);
  }

  return {
    circuitId,
    result: res.result,
    input: res.proofData.input,
    output: res.proofData.output,
    publicTranscript: res.proofData.publicTranscript,
    privateTranscriptOutputs: res.proofData.privateTranscriptOutputs,
    preContractState: state,
    postContractState: { data: res.context.currentQueryContext.state },
    privateStateAfter: res.context.currentPrivateState
  };
};
