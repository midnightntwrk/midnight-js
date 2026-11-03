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
import { reexpressOperationsForLedger9 } from '../v9/operations';
import { wrapKeepStateCall, type WrapKeepStateCallOptions } from '../v9/wrap';
import {
  type ConstructorResultPojo,
  type Ledger8CircuitOptions,
  type Ledger8ConstructorOptions,
  type Ledger8EngineContract,
  type Ledger8SigningKey,
  runLedger8Circuit,
  runLedger8Constructor,
  type TranscriptPojo,
  type VerifierKeyReader
} from './executable';
import {
  composeLedger8MaintenanceTx,
  type Ledger8MaintenanceRequest,
  type Ledger8MaintenanceUpdateRequest
} from './maintenance';

export type {
  ConstructorResultPojo,
  ContractBalance,
  ContractEntryPointPojo,
  ContractStatePojo,
  EncodedStateValue,
  Ledger8CircuitOptions,
  Ledger8ConstructorOptions,
  Ledger8EngineContract,
  Ledger8MaintenanceRequest,
  Ledger8MaintenanceUpdateRequest,
  Ledger8SigningKey,
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
 * @see {@link EraBoundary}
 */
export interface Ledger8Engine {
  /**
   * Runs one circuit against the decoded contract state the chain serves.
   *
   * Takes the state and the balances beside it as ONE value -- see
   * {@link Ledger8CircuitOptions.contractState} -- because the balances a
   * circuit reads do not live inside the primary state, and two separate
   * options could describe two different blocks.
   *
   * @throws StateConversionFailedError At stage `'state conversion'` when the
   *   state cannot be decoded, does not re-encode to its source, or carries a
   *   balance the retained runtime cannot read.
   * @throws InvalidArgumentError When the contract declares no circuit of that name.
   */
  executeCircuit<C extends Ledger8EngineContract, PS>(
    options: Ledger8CircuitOptions<C, PS>
  ): Promise<TranscriptPojo>;
  /**
   * Runs one retained-era constructor and returns the state it built.
   *
   * ASYNCHRONOUS for the same reason {@link Ledger8Engine.executeCircuit} is.
   * Stricter than the leg it replaced: compact-js registers a verifier key
   * against every declared entry point and refuses a missing one, where the
   * hand-written constructor left every slot blank.
   *
   * @throws ComposeOptionError Naming option `'signingKey'` when a supplied key
   *   is not the 32 bytes of hex the retained runtime reads.
   * @throws ComposeFailedError At stage `'deploy-verifier-key-blob'` when the
   *   ledger refuses the bytes served for a circuit.
   */
  executeConstructor<C extends Ledger8EngineContract, PS>(
    options: Ledger8ConstructorOptions<C, PS>
  ): Promise<ConstructorResultPojo>;
  wrapKeepStateCall(options: WrapKeepStateCallOptions): ContractCallPrototype;
  /**
   * Composes an UNPROVEN v8 transaction carrying one maintenance update --
   * insert a verifier key, remove one, or replace the maintenance authority --
   * built and signed by compact-js's ledger 8 `ContractExecutable`.
   *
   * ASYNCHRONOUS for the same reason {@link Ledger8Engine.executeCircuit} is.
   * Reads the FULL state off the bytes the chain holds, and refuses a signing
   * key other than the committee's first member before anything is signed.
   *
   * @throws ComposeOptionError Naming `'networkId'`, `'ttl'`, `'signingKey'`,
   *   `'newSigningKey'` or `'contractStateBytes'` when that option is unusable.
   * @throws MaintenanceAuthorityMismatchError When the signing key is not the
   *   committee's first member.
   * @throws ComposeFailedError At stage `'maintenance-update'` when compact-js
   *   refuses to build or sign the update.
   */
  composeMaintenanceTx(request: Ledger8MaintenanceRequest): Promise<Uint8Array>;
  /**
   * Re-expresses a ledger 8 contract's entry points as a ledger 9 contract state, so a
   * keep-state call has an operation registry the ledger 9 composer can read.
   *
   * Fork-crossing work, which is why it sits here rather than on either era facade: the input is
   * what the ledger 8 decoder read off the chain, and the output is for ledger 9.
   */
  reexpressOperationsForLedger9(entryPoints: readonly ContractEntryPointPojo[]): Uint8Array;
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
 * It no longer runs a dual-instantiation guard either. That guard compared
 * `onchain-runtime-v3` against the 0.16 glue at construction time. Both
 * acquisition paths are still live — `lib/v8/executable.ts` imports the glue
 * directly, and compact-js resolves the same specifier for itself — so the axis
 * did not go away; only the runtime check did. The invariant is held at install
 * time instead, by `src/test/single-instance.test.ts`, which pins one resolved
 * copy of `onchain-runtime-v3` and of each compact-runtime era line. That is a
 * check on THIS repo's lockfile, not on a consumer's process.
 *
 * @returns The engine surface.
 * @see {@link EraBoundary}
 * @see {@link ModuleGraphAndLazyLoading}
 */
export const createLedger8Engine = async (): Promise<Ledger8Engine> =>
  Promise.resolve({
    executeCircuit: runLedger8Circuit,
    executeConstructor: runLedger8Constructor,
    composeMaintenanceTx: composeLedger8MaintenanceTx,
    wrapKeepStateCall,
    reexpressOperationsForLedger9
  });
