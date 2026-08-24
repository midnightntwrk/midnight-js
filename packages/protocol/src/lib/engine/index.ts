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

import type { LedgerVersion } from '../../version';
import { loadLedger8 } from '../load-v8';
import { type ComposeV8CallOptions, composeV8CallTx } from './compose-v8';
import {
  type ComposeV8DeployOptions,
  composeV8DeployTx,
  type ConstructorResultPojo,
  executeConstructor,
  type ExecuteConstructorOptions,
  type Ledger8ConstructorRuntime
} from './deploy-v8';
import { type DownConvertedState, downConvertForExecution, type Ledger8CompactRuntime } from './down-convert';
import { type EncodedStateValue, extractEncodedStateValue } from './envelope';
import { executeCircuit, type ExecuteCircuitOptions, type Ledger8ExecutionRuntime, type TranscriptPojo } from './execute';
import { assertSharedLedger8Instance } from './instance-guard';
import { wrapKeepStateCall, type WrapKeepStateCallOptions } from './wrap-v9';

export type {
  ComposeV8CallOptions,
  ComposeV8DeployOptions,
  ConstructorResultPojo,
  DownConvertedState,
  EncodedStateValue,
  ExecuteCircuitOptions,
  ExecuteConstructorOptions,
  TranscriptPojo,
  WrapKeepStateCallOptions
};

/**
 * The public surface {@link createLedger8Engine} builds: every retained-v8
 * (pre-fork execution, v9-native keep-state binding, v8-native composition
 * and deploy) capability, with the 0.16 runtime instance already captured in
 * closure — no method here takes a runtime or module parameter.
 *
 * The two composition methods are async and the other five are not, because
 * only those two need the v8 ledger module: they acquire it on first use via
 * `loadLedger8` (`../load-v8.ts`), which is memoised, so the multi-megabyte v8
 * WASM is never instantiated for a consumer that only executes circuits and
 * binds them onto v9. See {@link createLedger8Engine} for why that load is not
 * hoisted into construction.
 */
export interface Ledger8Engine {
  extractState(raw: Uint8Array, version: LedgerVersion): EncodedStateValue;
  downConvertForExecution(state: EncodedStateValue): DownConvertedState;
  executeCircuit(options: ExecuteCircuitOptions): TranscriptPojo;
  wrapKeepStateCall(options: WrapKeepStateCallOptions): ContractCallPrototype;
  composeCallTx(options: ComposeV8CallOptions): Promise<Uint8Array>;
  executeConstructor(options: ExecuteConstructorOptions): ConstructorResultPojo;
  composeDeployTx(options: ComposeV8DeployOptions): Promise<Uint8Array>;
}

/**
 * Acquires the retained pre-fork toolchain — the `compact-runtime@0.16` glue
 * and `@midnight-ntwrk/onchain-runtime-v3` — and builds a {@link Ledger8Engine}
 * bound to it.
 *
 * `../../engine.ts` re-exports this module as the `./engine` build entry
 * (`dist/engine.mjs`/`.cjs`), reached only by the dynamic import in
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
 * Deliberately does NOT acquire the v8 ledger module here. Only the two
 * composition legs need it, so hoisting the load into construction would make
 * every consumer — including the keep-state path, which never touches the v8
 * axis — instantiate multi-megabyte WASM and hard-depend on ledger-v8
 * resolving. `composeCallTx`/`composeDeployTx` therefore await
 * {@link loadLedger8} per call instead; it memoises, so the module loads at most
 * once, and its rejection is already a `Ledger8RuntimeMissingError` (see
 * `../load-v8.ts`). Keeping it out of the `Promise.all` also orders
 * {@link assertSharedLedger8Instance} ahead of any v8 acquisition, so a
 * dual-instantiation can no longer lose the race and be reported as a missing
 * runtime instead.
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
  const ledger8ConstructorRuntime: Ledger8ConstructorRuntime = {
    createConstructorContext: glue.createConstructorContext
  };

  return {
    extractState: (raw, version) => extractEncodedStateValue(raw, version, ocrt3.ContractState),
    downConvertForExecution: (state) => downConvertForExecution(state, ledger8CompactRuntime),
    executeCircuit: (options) => executeCircuit(options, ledger8ExecutionRuntime),
    wrapKeepStateCall: (options) => wrapKeepStateCall(options),
    composeCallTx: async (options) => composeV8CallTx(options, await loadLedger8()),
    executeConstructor: (options) => executeConstructor(options, ledger8ConstructorRuntime),
    composeDeployTx: async (options) => composeV8DeployTx(options, await loadLedger8())
  };
};
