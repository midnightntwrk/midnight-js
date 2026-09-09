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

import type { EncodedStateValue } from '../era/envelope';
import type { ContractEntryPointPojo } from '../shared/contract-state';
import { reexpressOperationsForCurrentEra } from '../v9/operations';
import { wrapKeepStateCall, type WrapKeepStateCallOptions } from '../v9/wrap';
import {
  type ConstructorResultPojo,
  executeConstructor,
  type ExecuteConstructorOptions,
  type Ledger8ConstructorRuntime,
  type Ledger8DeployableContractState
} from './deploy';
import { type DownConvertedState, downConvertForExecution, type Ledger8CompactRuntime } from './down-convert';
import { executeCircuit, type ExecuteCircuitOptions, type Ledger8ExecutionRuntime, type TranscriptPojo } from './execute';
import { assertSharedLedger8Instance } from './instance-guard';

export type {
  ConstructorResultPojo,
  ContractEntryPointPojo,
  DownConvertedState,
  EncodedStateValue,
  ExecuteCircuitOptions,
  ExecuteConstructorOptions,
  Ledger8DeployableContractState,
  TranscriptPojo,
  WrapKeepStateCallOptions
};

/**
 * The public surface {@link createLedger8Engine} builds: the retained pre-fork
 * EXECUTION capabilities, with the 0.16 runtime instance already captured in
 * closure — no method here takes a runtime or module parameter.
 *
 * Every method is synchronous: this object is handed over only after the
 * retained toolchain has been acquired.
 *
 * @see {@link EraSeam}
 */
export interface Ledger8Engine {
  downConvertForExecution(state: EncodedStateValue): DownConvertedState;
  executeCircuit(options: ExecuteCircuitOptions): TranscriptPojo;
  wrapKeepStateCall(options: WrapKeepStateCallOptions): ContractCallPrototype;
  executeConstructor(options: ExecuteConstructorOptions): ConstructorResultPojo;
  /**
   * Re-expresses a retained-era contract's entry points as a current-era contract state, so a
   * keep-state call has an operation registry the current composer can read.
   *
   * Fork-crossing work, which is why it sits here rather than on either era facade: the input is
   * what the retained decoder read off the chain, and the output is for the current ledger.
   */
  reexpressOperationsForCurrentEra(entryPoints: readonly ContractEntryPointPojo[]): Uint8Array;
}

/**
 * Acquires the retained pre-fork toolchain — the `compact-runtime@0.16` glue
 * and `@midnight-ntwrk/onchain-runtime-v3` — and builds a {@link Ledger8Engine}
 * bound to it.
 *
 * Runs {@link assertSharedLedger8Instance} exactly once, on the
 * `onchain-runtime-v3` axis. Any acquisition failure surfaces through the
 * facade (`lib/v8/load-engine.ts`) as `Ledger8RuntimeMissingError`
 * (`../../errors.ts`).
 *
 * Does NOT acquire the v8 ledger module: a consumer that only executes
 * circuits and binds them onto v9 never instantiates the multi-megabyte v8
 * WASM, and never hard-depends on ledger-v8 resolving.
 *
 * @returns The engine surface, with the acquired runtime captured in closure.
 * @throws Ledger8InstanceMismatchError If `onchain-runtime-v3` resolved to two
 *   physically distinct copies in this process.
 * @see {@link EraSeam}
 * @see {@link DualInstantiationGuard}
 * @see {@link ModuleGraphAndLazyLoading}
 */
export const createLedger8Engine = async (): Promise<Ledger8Engine> => {
  const [glue, ocrt3] = await Promise.all([
    import('compact-runtime-ledger8'),
    import('@midnight-ntwrk/onchain-runtime-v3')
  ]);

  assertSharedLedger8Instance('onchain-runtime-v3', ocrt3.ChargedState, glue.ChargedState);

  // `ContractState` from ocrt3, the other two from the glue: sound only because
  // of the assertion above -- see DualInstantiationGuard. The member is what
  // pins this object to the pre-fork era -- see `Ledger8CompactRuntime`.
  const ledger8CompactRuntime: Ledger8CompactRuntime = {
    ContractState: ocrt3.ContractState,
    StateValue: glue.StateValue,
    ChargedState: glue.ChargedState
  };
  const ledger8ExecutionRuntime: Ledger8ExecutionRuntime = {
    decodeZswapLocalState: glue.decodeZswapLocalState,
    createCircuitContext: glue.createCircuitContext,
    CostModel: glue.CostModel
  };
  const ledger8ConstructorRuntime: Ledger8ConstructorRuntime = {
    createConstructorContext: glue.createConstructorContext,
    decodeZswapLocalState: glue.decodeZswapLocalState
  };

  return {
    downConvertForExecution: (state) => downConvertForExecution(state, ledger8CompactRuntime),
    executeCircuit: (options) => executeCircuit(options, ledger8ExecutionRuntime),
    wrapKeepStateCall,
    reexpressOperationsForCurrentEra,
    executeConstructor: (options) => executeConstructor(options, ledger8ConstructorRuntime)
  };
};
