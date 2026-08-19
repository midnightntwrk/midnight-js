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

import type { LedgerVersion } from '../version';
import { type DownConvertedState, downConvertForExecution, type Ledger8CompactRuntime } from './down-convert';
import { type EncodedStateValue, extractEncodedStateValue } from './envelope';
import { executeCircuit, type ExecuteCircuitOptions, type Ledger8ExecutionRuntime, type TranscriptPojo } from './execute';
import { assertSharedLedger8Instance } from './instance-guard';
import { wrapKeepStateCall, type WrapKeepStateCallOptions } from './wrap-v9';

export type {
  DownConvertedState,
  EncodedStateValue,
  ExecuteCircuitOptions,
  TranscriptPojo,
  WrapKeepStateCallOptions
};

/**
 * The public surface {@link createLedger8Engine} builds: every retained-v8
 * (pre-fork execution, v9-native keep-state binding, v8-native composition
 * and deploy) capability, with the 0.16 runtime instance and the v8 ledger
 * module already captured in closure — no method here takes a runtime or
 * module parameter.
 */
export interface Ledger8Engine {
  extractState(raw: Uint8Array, version: LedgerVersion): EncodedStateValue;
  downConvertForExecution(state: EncodedStateValue): DownConvertedState;
  executeCircuit(options: ExecuteCircuitOptions): TranscriptPojo;
  wrapKeepStateCall(options: WrapKeepStateCallOptions): ContractCallPrototype;
}

/**
 * Acquires the retained pre-fork toolchain — the `compact-runtime@0.16` glue
 * and `@midnight-ntwrk/onchain-runtime-v3` — and builds a {@link Ledger8Engine}
 * bound to it.
 *
 * This module is its own rollup entry (`dist/engine.mjs`/`.cjs`), reachable
 * only through the package's `./engine` self-reference subpath (see
 * `engine/load-engine.ts`). Evaluating it — which is what pulls in the glue
 * and `onchain-runtime-v3` WASM — happens only when that subpath is
 * dynamically imported, never as a side effect of loading the package root.
 *
 * Runs {@link assertSharedLedger8Instance} exactly once, on the
 * `onchain-runtime-v3` axis: it compares this package's own copy against the
 * copy the 0.16 glue resolves for its own dependency (a genuine second
 * acquisition path — a duplicate install would resolve these differently),
 * so a dual-instantiation fails loudly before any contract execution can
 * silently corrupt on a physical-instance mismatch. No other WASM package
 * this module acquires has a comparable second acquisition path, so no other
 * axis is asserted. Any acquisition failure surfaces through the facade
 * (`engine/load-engine.ts`) as {@link Ledger8RuntimeMissingError}.
 */
export const createLedger8Engine = async (): Promise<Ledger8Engine> => {
  const [glue, ocrt3] = await Promise.all([
    import('compact-runtime-ledger8'),
    import('@midnight-ntwrk/onchain-runtime-v3')
  ]);

  assertSharedLedger8Instance('onchain-runtime-v3', ocrt3.ChargedState, glue.ChargedState);

  const ledger8CompactRuntime: Ledger8CompactRuntime = {
    StateValue: glue.StateValue,
    ChargedState: glue.ChargedState
  };
  const ledger8ExecutionRuntime: Ledger8ExecutionRuntime = {
    createCircuitContext: glue.createCircuitContext,
    CostModel: glue.CostModel
  };

  return {
    extractState: (raw, version) => extractEncodedStateValue(raw, version),
    downConvertForExecution: (state) => downConvertForExecution(state, ledger8CompactRuntime),
    executeCircuit: (options) => executeCircuit(options, ledger8ExecutionRuntime),
    wrapKeepStateCall: (options) => wrapKeepStateCall(options)
  };
};
