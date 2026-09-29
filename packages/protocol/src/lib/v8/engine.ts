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
import type { ContractBalance, ContractEntryPointPojo, ContractStatePojo } from '../shared/contract-state';
import { reexpressOperationsForCurrentEra } from '../v9/operations';
import { wrapKeepStateCall, type WrapKeepStateCallOptions } from '../v9/wrap';
import {
  type ConstructorResultPojo,
  type Ledger8SigningKey,
  type RetainedContract,
  runRetainedCircuit,
  type RunRetainedCircuitOptions,
  runRetainedConstructor,
  type RunRetainedConstructorOptions,
  type TranscriptPojo,
  type VerifierKeyReader
} from './executable';

export type {
  ConstructorResultPojo,
  ContractBalance,
  ContractEntryPointPojo,
  ContractStatePojo,
  EncodedStateValue,
  Ledger8SigningKey,
  RetainedContract,
  RunRetainedCircuitOptions,
  RunRetainedConstructorOptions,
  TranscriptPojo,
  VerifierKeyReader,
  WrapKeepStateCallOptions
};

/**
 * The public surface {@link createLedger8Engine} builds: the retained pre-fork
 * EXECUTION capabilities.
 *
 * The two execution members are ASYNCHRONOUS. They used to be synchronous, and
 * the docblock here used to promise it: compact-js builds a circuit call on
 * `Effect.tryPromise`, so `runSync` cannot discharge it and the promise is not
 * satisfiable. Nothing else about the surface changed shape -- every value
 * crossing it is still plain data or an era handle, and no `Effect` reaches a
 * caller.
 *
 * @see {@link EraSeam}
 */
export interface Ledger8Engine {
  /**
   * Runs one circuit against the decoded contract state the chain serves.
   *
   * Takes the state and the balances beside it as ONE value -- see
   * {@link RunRetainedCircuitOptions.contractState} -- because the balances a
   * circuit reads do not live inside the primary state, and two separate
   * options could describe two different blocks. The
   * `downConvertForExecution` member that used to sit beside this one is gone
   * with the hand-maintained execution layer; there is no separate
   * down-convert step any more.
   */
  executeCircuit<C extends RetainedContract, PS>(
    options: RunRetainedCircuitOptions<C, PS>
  ): Promise<TranscriptPojo>;
  executeConstructor<C extends RetainedContract, PS>(
    options: RunRetainedConstructorOptions<C, PS>
  ): Promise<ConstructorResultPojo>;
  wrapKeepStateCall(options: WrapKeepStateCallOptions): ContractCallPrototype;
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
 * Builds a {@link Ledger8Engine}.
 *
 * The retained toolchain is no longer acquired here: compact-js's era-pinned
 * ledger-8 entries own it, and `lib/v8/executable.ts` reaches them. What this
 * function still does is sit behind the dynamic `import('../../engine.js')` in
 * `lib/v8/load-engine.ts`, so importing the package root never pulls the
 * multi-megabyte retained WASM onto the module graph.
 *
 * It no longer runs a dual-instantiation guard either. That guard compared two
 * modules THIS package imported, `onchain-runtime-v3` and the 0.16 glue; with
 * both imports gone there is nothing left to compare. compact-js resolves one
 * copy of each for itself, and `src/test/single-instance.test.ts` is what holds
 * the installed tree to that.
 *
 * @returns The engine surface.
 * @see {@link EraSeam}
 * @see {@link ModuleGraphAndLazyLoading}
 */
export const createLedger8Engine = async (): Promise<Ledger8Engine> =>
  Promise.resolve({
    executeCircuit: runRetainedCircuit,
    executeConstructor: runRetainedConstructor,
    wrapKeepStateCall,
    reexpressOperationsForCurrentEra
  });
