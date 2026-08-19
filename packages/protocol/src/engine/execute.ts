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

import type { AlignedValue, ChargedState, CostModel, Op } from '@midnight-ntwrk/onchain-runtime-v3';

import type { DownConvertedState } from './down-convert';

/**
 * The `QueryContext` slice {@link executeCircuit} reads off a circuit's
 * post-call context: the resulting primary state, ready to be wrapped back
 * into a {@link DownConvertedState}.
 */
export interface Ledger8QueryContext {
  readonly state: ChargedState;
}

/**
 * The circuit-context slice {@link executeCircuit} needs from a pre-fork
 * (`compact-runtime@0.16`) `createCircuitContext` call and a circuit's
 * updated context after it runs.
 */
export interface Ledger8CircuitContext {
  readonly currentQueryContext: Ledger8QueryContext;
  readonly currentPrivateState: unknown;
}

/** The proof-data slice of a pre-fork {@link Ledger8CircuitResult}. */
export interface Ledger8ProofData {
  readonly input: AlignedValue;
  readonly output: AlignedValue;
  readonly publicTranscript: Op<AlignedValue>[];
  readonly privateTranscriptOutputs: AlignedValue[];
}

/** What a pre-fork `impureCircuits[id](ctx, ...args)` call returns. */
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
 * in `engine/down-convert.ts` — so callers target a specific WASM-backed
 * instance and tests can substitute a controlled fake.
 */
export interface Ledger8ExecutionRuntime {
  readonly createCircuitContext: (
    contractAddress: string,
    coinPublicKey: string,
    contractState: ChargedState,
    privateState: unknown,
    gasLimit: undefined,
    costModel: CostModel
  ) => Ledger8CircuitContext;
  readonly CostModel: {
    readonly initialCostModel: () => CostModel;
  };
}

/**
 * The result of one impure circuit's invocation on a pre-fork
 * (`compact-runtime@0.16`) contract instance: the primary result plus every
 * artifact {@link wrapKeepStateCall} (`engine/wrap-v9.ts`) needs to assemble a
 * v9-native `ContractCallPrototype`.
 *
 * `preContractState`/`postContractState` are {@link DownConvertedState}s —
 * the same execution-only state shape `downConvertForExecution` already
 * produces — not full pre-fork `ContractState`s: this transcript never
 * carries `.operations`, `.maintenanceAuthority`, or `.balance`.
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
 * the analogous "operation missing on contract state" case.
 */
export const executeCircuit = (options: ExecuteCircuitOptions, ledger8Runtime: Ledger8ExecutionRuntime): TranscriptPojo => {
  const { contract, circuitId, args, state, address, coinPk, privateState } = options;
  const circuit = contract.impureCircuits[circuitId];
  if (circuit === undefined) {
    throw new Error(`No impure circuit named '${circuitId}' on this pre-fork contract instance.`);
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
