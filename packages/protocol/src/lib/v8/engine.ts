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
 * The pre-fork ledger 8 execution capabilities {@link createLedger8Engine}
 * builds. Every value crossing it is plain data or an era handle; no `Effect`
 * reaches a caller.
 *
 * @see {@link EraBoundary}
 */
export interface Ledger8Engine {
  /**
   * Runs one circuit against the decoded contract state the chain serves,
   * with the balances on the same value ({@link Ledger8CircuitOptions.contractState}).
   *
   * @throws StateConversionFailedError At stage `'state conversion'` when the
   *   state cannot be decoded, does not re-encode to its source, or carries a
   *   balance the ledger 8 runtime cannot read.
   * @throws InvalidArgumentError When the contract declares no circuit of that name.
   */
  executeCircuit<C extends Ledger8EngineContract, PS>(
    options: Ledger8CircuitOptions<C, PS>
  ): Promise<TranscriptPojo>;
  /**
   * Runs one ledger 8 constructor and returns the state it built, with a
   * verifier key registered for every declared entry point.
   *
   * @throws ComposeOptionError Naming option `'signingKey'` when a supplied key
   *   is not the 32 bytes of hex the ledger 8 runtime reads.
   * @throws ComposeFailedError At stage `'deploy-verifier-key-blob'` when the
   *   ledger refuses the bytes served for a circuit.
   * @throws ContractExecutionError When the key reader serves no key for a
   *   declared entry point; compact-js's refusal is on `cause`.
   */
  executeConstructor<C extends Ledger8EngineContract, PS>(
    options: Ledger8ConstructorOptions<C, PS>
  ): Promise<ConstructorResultPojo>;
  /**
   * Wraps a ledger 8 transcript into a v9 call prototype against the migrated
   * v9 contract state, which must already register the circuit's operation.
   *
   * @throws ComposeFailedError At stage `'wrap-call'` when the state registers
   *   no operation for the circuit, or `'call-verifier-key'` when that
   *   operation has no verifier key.
   */
  wrapKeepStateCall(options: WrapKeepStateCallOptions): ContractCallPrototype;
  /**
   * Composes an UNPROVEN v8 transaction carrying one maintenance update
   * (insert a verifier key, remove one, or replace the authority). Does not
   * check whether the targeted key slot is occupied.
   *
   * @throws ComposeOptionError Naming `'networkId'`, `'ttl'`, `'signingKey'`,
   *   `'newSigningKey'` or `'contractStateBytes'` when that option is unusable.
   * @throws MaintenanceAuthorityMismatchError When the signing key is not the
   *   committee's first member.
   * @throws ComposeFailedError At stage `'maintenance-update'` when compact-js
   *   refuses to build or sign the update; a coded cause is rethrown as itself.
   * @throws InvalidArgumentError When an untyped caller names an unknown update kind.
   */
  composeMaintenanceTx(request: Ledger8MaintenanceRequest): Promise<Uint8Array>;
  /**
   * Re-expresses a ledger 8 contract's entry points as a ledger 9 contract state, so a
   * keep-state call has an operation registry the ledger 9 composer can read.
   *
   * @throws ComposeOptionError Naming `'contractStateBytes'` when no entry point carries a key.
   * @see {@link CrossEraOperationRegistry}
   */
  reexpressOperationsForLedger9(entryPoints: readonly ContractEntryPointPojo[]): Uint8Array;
}

/**
 * Builds a {@link Ledger8Engine}. Acquires nothing; reach it through
 * `loadLedger8Engine` so the ledger 8 WASM stays off the root module graph.
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
