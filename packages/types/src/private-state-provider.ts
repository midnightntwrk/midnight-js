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
 * All metadata is included in the encrypted payload to prevent tampering.
 */
export interface PrivateStateExport {
  /**
   * Format identifier. Must be 'midnight-private-state-export'.
   */
  readonly format: 'midnight-private-state-export';

  /**
   * Encrypted payload containing version, metadata, and serialized private states.
   * Format: base64-encoded AES-256-GCM encrypted JSON.
   */
  readonly encryptedPayload: string;

  /**
   * Salt used for key derivation (hex-encoded, 32 bytes / 64 characters).
   * Required for decryption with the export password.
   */
  readonly salt: string;
}

/**
 * Maximum number of states that can be exported/imported.
 * This limit prevents memory exhaustion attacks.
 */
export const MAX_EXPORT_STATES = 10000;

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

  /**
   * Maximum number of states to export.
   * Defaults to MAX_EXPORT_STATES (10000).
   * Set to a lower value to limit memory usage.
   */
  readonly maxStates?: number;
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

  /**
   * Maximum number of states to import.
   * Defaults to MAX_EXPORT_STATES (10000).
   * Set to a lower value to limit memory usage.
   */
  readonly maxStates?: number;
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
   * Set the contract address for scoping private state operations.
   * Must be called before any get/set/remove operations on private states.
   * This provides namespace isolation between different contracts.
   *
   * @param address The contract address to scope operations to.
   */
  setContractAddress(address: ContractAddress): void;

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
   * @param options Export options including optional custom password and state limit.
   * @returns A JSON-serializable export structure that can be saved or transmitted.
   * @throws {PrivateStateExportError} If no states exist to export or limit exceeded.
   */
  exportPrivateStates(options?: ExportPrivateStatesOptions): Promise<PrivateStateExport>;

  /**
   * Import private states from a previously exported structure.
   *
   * @param exportData The export data structure to import.
   * @param options Import options including password, conflict strategy, and state limit.
   * @returns Result indicating how many states were imported/skipped/overwritten.
   * @throws {ExportDecryptionError} If decryption fails (wrong password or corrupted data).
   * @throws {InvalidExportFormatError} If the export format is invalid or unsupported.
   * @throws {ImportConflictError} If conflictStrategy is 'error' and conflicts exist.
   */
  importPrivateStates(
    exportData: PrivateStateExport,
    options?: ImportPrivateStatesOptions
  ): Promise<ImportPrivateStatesResult>;
}
