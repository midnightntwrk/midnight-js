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

import type { ContractCallPrototype } from '@midnightntwrk/ledger-v9';

import {
  type ConstructorResultPojo,
  executeConstructor,
  type ExecuteConstructorOptions,
  type Ledger8ConstructorRuntime
} from './deploy-v8';
import { type DownConvertedState, downConvertForExecution, type Ledger8CompactRuntime } from './down-convert';
import type { EncodedStateValue } from './envelope';
import { executeCircuit, type ExecuteCircuitOptions, type Ledger8ExecutionRuntime, type TranscriptPojo } from './execute';
import { assertSharedLedger8Instance } from './instance-guard';
import { wrapKeepStateCall, type WrapKeepStateCallOptions } from './wrap-v9';

export type {
  ConstructorResultPojo,
  DownConvertedState,
  EncodedStateValue,
  ExecuteCircuitOptions,
  ExecuteConstructorOptions,
  TranscriptPojo,
  WrapKeepStateCallOptions
};

/**
 * The public surface {@link createLedger8Engine} builds: the retained pre-fork
 * EXECUTION capabilities, with the 0.16 runtime instance already captured in
 * closure — no method here takes a runtime or module parameter.
 *
 * Deliberately narrower than it once was. Reading a contract state and
 * composing a call or a deploy are era-symmetric operations: both eras do them,
 * with the same inputs and the same result shape, so they belong on the era
 * facade (`../era/era.ts`) where a caller can reach them without knowing which
 * era it holds. What is left here is what only the retained era can do —
 * down-convert a post-fork state for pre-fork execution, run a pre-fork circuit
 * or constructor, and bind a pre-fork transcript natively onto v9.
 *
 * Every method is synchronous: this object is handed over only after the
 * retained toolchain has been acquired, so there is nothing left to await.
 */
export interface Ledger8Engine {
  downConvertForExecution(state: EncodedStateValue): DownConvertedState;
  executeCircuit(options: ExecuteCircuitOptions): TranscriptPojo;
  wrapKeepStateCall(options: WrapKeepStateCallOptions): ContractCallPrototype;
  executeConstructor(options: ExecuteConstructorOptions): ConstructorResultPojo;
}

/**
 * Acquires the retained pre-fork toolchain — the `compact-runtime@0.16` glue
 * and `@midnight-ntwrk/onchain-runtime-v3` — and builds a {@link Ledger8Engine}
 * bound to it.
 *
 * `../../engine.ts` re-exports this module as the `./engine` build entry
 * (`dist/engine.js`), reached only by the dynamic import in
 * `lib/engine/load-engine.ts`. Evaluating it — which is what pulls in the glue
 * and `onchain-runtime-v3` WASM — happens only on that import, never as a side
 * effect of loading the package root.
 *
 * Runs {@link assertSharedLedger8Instance} exactly once, on the
 * `onchain-runtime-v3` axis: it compares this package's own copy against the
 * copy the 0.16 glue resolves for its own dependency (a genuine second
 * acquisition path — a duplicate install would resolve these differently),
 * so a dual-instantiation fails loudly before any contract execution can
 * silently corrupt on a physical-instance mismatch. No other WASM package
 * this module acquires has a comparable second acquisition path, so no other
 * axis is asserted. Any acquisition failure surfaces through the facade
 * (`lib/engine/load-engine.ts`) as `Ledger8RuntimeMissingError` (`../../errors.ts`).
 *
 * Deliberately does NOT acquire the v8 ledger module. Nothing on this surface
 * needs it: the two legs that did — call and deploy composition — now live on
 * the era facade (`../era/era.ts`), which acquires the module itself when a
 * caller asks for the v8 era. A consumer that only executes circuits and binds
 * them onto v9 therefore never instantiates the multi-megabyte v8 WASM, and
 * never hard-depends on ledger-v8 resolving.
 */
export const createLedger8Engine = async (): Promise<Ledger8Engine> => {
  const [glue, ocrt3] = await Promise.all([
    import('compact-runtime-ledger8'),
    import('@midnight-ntwrk/onchain-runtime-v3')
  ]);

  assertSharedLedger8Instance('onchain-runtime-v3', ocrt3.ChargedState, glue.ChargedState);

  // `ContractState` comes from ocrt3 while the other two come from the glue.
  // That is sound only because the assertion above has already established the
  // two are one physical copy: had they been distinct, it would have thrown
  // rather than let a mixed runtime be assembled here. The member is what pins
  // this object to the pre-fork era -- see `Ledger8CompactRuntime`.
  const ledger8CompactRuntime: Ledger8CompactRuntime = {
    ContractState: ocrt3.ContractState,
    StateValue: glue.StateValue,
    ChargedState: glue.ChargedState
  };
  const ledger8ExecutionRuntime: Ledger8ExecutionRuntime = {
    createCircuitContext: glue.createCircuitContext,
    CostModel: glue.CostModel
  };
  const ledger8ConstructorRuntime: Ledger8ConstructorRuntime = {
    createConstructorContext: glue.createConstructorContext
  };

  return {
    downConvertForExecution: (state) => downConvertForExecution(state, ledger8CompactRuntime),
    executeCircuit: (options) => executeCircuit(options, ledger8ExecutionRuntime),
    wrapKeepStateCall,
    executeConstructor: (options) => executeConstructor(options, ledger8ConstructorRuntime)
  };
};
