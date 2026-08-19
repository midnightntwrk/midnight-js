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

import { ChargedState as LedgerV9ChargedState, type ContractCallPrototype } from '@midnightntwrk/ledger-v9';

import { loadLedger8 } from '../load-v8';
import type { LedgerVersion } from '../version';
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
import { assertLedger8RuntimePresent, assertSharedLedger8Instances } from './instance-guard';
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
 * and deploy) capability, with the 0.16 runtime instance and the v8 ledger
 * module already captured in closure — no method here takes a runtime or
 * module parameter.
 */
export interface Ledger8Engine {
  extractState(raw: Uint8Array, version: LedgerVersion): EncodedStateValue;
  downConvertForExecution(state: EncodedStateValue): DownConvertedState;
  executeCircuit(options: ExecuteCircuitOptions): TranscriptPojo;
  wrapKeepStateCall(options: WrapKeepStateCallOptions): ContractCallPrototype;
  composeCallTx(options: ComposeV8CallOptions): Uint8Array;
  executeConstructor(options: ExecuteConstructorOptions): ConstructorResultPojo;
  composeDeployTx(options: ComposeV8DeployOptions): Uint8Array;
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
 * Runs {@link assertLedger8RuntimePresent} first (the same retained-toolchain
 * canary `loadLedger8` backs) so a broken or partial install fails fast with
 * {@link Ledger8RuntimeMissingError}, before any WASM acquisition here even
 * starts. Then runs {@link assertSharedLedger8Instances} exactly once: the
 * `onchain-runtime-v3` axis compares this package's own copy against the
 * copy the 0.16 glue resolves for its own dependency (a genuine second
 * acquisition path — a duplicate install would resolve these differently),
 * so a dual-instantiation there fails loudly before any contract execution
 * can silently corrupt on a physical-instance mismatch. The `ledger-v9` axis
 * has no comparable second acquisition path inside this package — `engine/wrap-v9.ts`
 * imports the same `@midnightntwrk/ledger-v9` specifier this module does —
 * so the same reference is passed on both sides of that axis, matching the
 * happy-path shape `engine-instance-guard.test.ts` already exercises.
 *
 * Also resolves the v8 ledger module via {@link loadLedger8} — the same
 * memoised loader {@link assertLedger8RuntimePresent} already awaited above,
 * so this second call resolves immediately from cache rather than re-running
 * the dynamic import — and closes over it for {@link composeV8CallTx}
 * (`engine/compose-v8.ts`) and {@link composeV8DeployTx} (`engine/deploy-v8.ts`),
 * so neither takes a module parameter on the public facade.
 */
export const createLedger8Engine = async (): Promise<Ledger8Engine> => {
  await assertLedger8RuntimePresent();

  const [glue, ocrt3, v8] = await Promise.all([
    import('compact-runtime-ledger8'),
    import('@midnight-ntwrk/onchain-runtime-v3'),
    loadLedger8()
  ]);

  assertSharedLedger8Instances(ocrt3.ChargedState, glue.ChargedState, LedgerV9ChargedState, LedgerV9ChargedState);

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
    extractState: (raw, version) => extractEncodedStateValue(raw, version),
    downConvertForExecution: (state) => downConvertForExecution(state, ledger8CompactRuntime),
    executeCircuit: (options) => executeCircuit(options, ledger8ExecutionRuntime),
    wrapKeepStateCall: (options) => wrapKeepStateCall(options),
    composeCallTx: (options) => composeV8CallTx(options, v8),
    executeConstructor: (options) => executeConstructor(options, ledger8ConstructorRuntime),
    composeDeployTx: (options) => composeV8DeployTx(options, v8)
  };
};
