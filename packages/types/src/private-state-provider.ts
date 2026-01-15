/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
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

import type { ContractAddress,SigningKey } from '@midnight-ntwrk/compact-runtime';

/**
 * A type representing an ID used to store a contract's private state.
 */
export type PrivateStateId = string;

/**
 * Represents the exported private state data structure.
 * The data is always encrypted using the provided export password.
 */
export interface PrivateStateExport {
  /**
   * Version of the export format for backward compatibility.
   */
  readonly version: 1;

  /**
   * ISO 8601 timestamp of when the export was created.
   */
  readonly exportedAt: string;

  /**
   * Number of private state entries in the export.
   */
  readonly stateCount: number;

  /**
   * Encrypted payload containing the serialized private states.
   * Format: base64-encoded AES-256-GCM encrypted JSON.
   */
  readonly encryptedPayload: string;

  /**
   * Salt used for key derivation (hex-encoded).
   * Required for decryption with the export password.
   */
  readonly salt: string;
}

/**
 * Options for exporting private states.
 */
export interface ExportPrivateStatesOptions {
  /**
   * Password used to encrypt the export.
   * Must be at least 16 characters.
   * If not provided, uses the storage password.
   */
  readonly password?: string;
}

/**
 * Options for importing private states.
 */
export interface ImportPrivateStatesOptions {
  /**
   * Password used to decrypt the import.
   * Must match the password used during export.
   * If not provided, uses the storage password.
   */
  readonly password?: string;

  /**
   * How to handle conflicts when a private state ID already exists.
   * - 'skip': Keep existing state, ignore imported state
   * - 'overwrite': Replace existing state with imported state
   * - 'error': Throw an error if any conflict is detected
   * Default: 'error'
   */
  readonly conflictStrategy?: 'skip' | 'overwrite' | 'error';
}

/**
 * Result of an import operation.
 */
export interface ImportPrivateStatesResult {
  /**
   * Number of states successfully imported.
   */
  readonly imported: number;

  /**
   * Number of states skipped due to conflicts (when conflictStrategy is 'skip').
   */
  readonly skipped: number;

  /**
   * Number of states that overwrote existing states (when conflictStrategy is 'overwrite').
   */
  readonly overwritten: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Interface for a typed key-valued store containing contract private states.
 *
 * @typeParam PSI - Parameter indicating the private state ID, sometimes a union of string literals.
 * @typeParam PS - Parameter indicating the private state type stored, sometimes a union of private state types.
 */
export interface PrivateStateProvider<PSI extends PrivateStateId = PrivateStateId, PS = any> {
  /**
   * Store the given private state at the given private state ID.
   *
   * @param privateStateId The private state identifier.
   * @param state The private state to store.
   */
  set(privateStateId: PSI, state: PS): Promise<void>;

  /**
   * Retrieve the private state at the given private state ID.
   *
   * @param privateStateId The private state identifier.
   */
  get(privateStateId: PSI): Promise<PS | null>;

  /**
   * Remove the value at the given private state ID.
   *
   * @param privateStateId The private state identifier.
   */
  remove(privateStateId: PSI): Promise<void>;

  /**
   * Remove all contract private states.
   */
  clear(): Promise<void>;

  /**
   * Store the given signing key at the given address.
   *
   * @param address The address of the contract having the given signing key.
   * @param signingKey The signing key to store.
   */
  setSigningKey(address: ContractAddress, signingKey: SigningKey): Promise<void>;

  /**
   * Retrieve the signing key for a contract.
   *
   * @param address The address of the contract for which to get the signing key.
   */
  getSigningKey(address: ContractAddress): Promise<SigningKey | null>;

  /**
   * Remove the signing key for a contract.
   *
   * @param address The address of the contract for which to delete the signing key.
   */
  removeSigningKey(address: ContractAddress): Promise<void>;

  /**
   * Remove all contract signing keys.
   */
  clearSigningKeys(): Promise<void>;

  /**
   * Export all private states as an encrypted JSON-serializable structure.
   *
   * NOTE: This does NOT export signing keys for security reasons.
   *
   * @param options Export options including optional custom password.
   * @returns A JSON-serializable export structure that can be saved or transmitted.
   * @throws {PrivateStateExportError} If no states exist to export.
   */
  exportPrivateStates(options?: ExportPrivateStatesOptions): Promise<PrivateStateExport>;

  /**
   * Import private states from a previously exported structure.
   *
   * @param exportData The export data structure to import.
   * @param options Import options including password and conflict strategy.
   * @returns Result indicating how many states were imported/skipped/overwritten.
   * @throws {WrongExportPasswordError} If the password is incorrect.
   * @throws {CorruptedExportDataError} If the export data is invalid or corrupted.
   * @throws {UnsupportedExportVersionError} If the export version is not supported.
   * @throws {ImportConflictError} If conflictStrategy is 'error' and state IDs already exist.
   */
  importPrivateStates(
    exportData: PrivateStateExport,
    options?: ImportPrivateStatesOptions
  ): Promise<ImportPrivateStatesResult>;
}
