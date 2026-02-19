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

import type { Contract } from '@midnight-ntwrk/compact-js';
import type { SigningKey } from '@midnight-ntwrk/compact-runtime';
import type { ContractAddress } from '@midnight-ntwrk/ledger-v7';
import {
  ExportDecryptionError,
  type ExportPrivateStatesOptions,
  type ExportSigningKeysOptions,
  ImportConflictError,
  type ImportPrivateStatesOptions,
  type ImportPrivateStatesResult,
  type ImportSigningKeysOptions,
  type ImportSigningKeysResult,
  InvalidExportFormatError,
  MAX_EXPORT_SIGNING_KEYS,
  MAX_EXPORT_STATES,
  type PrivateStateExport,
  PrivateStateExportError,
  type PrivateStateId,
  type PrivateStateProvider,
  type SigningKeyExport,
  SigningKeyExportError
} from '@midnight-ntwrk/midnight-js-types';
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;
const ENCRYPTION_VERSION = 1;
const MIN_PASSWORD_LENGTH = 16;
const EXPECTED_SALT_LENGTH = 64;

const CURRENT_EXPORT_VERSION = 1;
const SUPPORTED_EXPORT_VERSIONS = [1];

interface PrivateStatePayload<PSI extends PrivateStateId = PrivateStateId> {
  readonly version: number;
  readonly exportedAt: string;
  readonly stateCount: number;
  readonly states: Record<PSI, string>;
}

interface SigningKeyPayload {
  readonly version: number;
  readonly exportedAt: string;
  readonly keyCount: number;
  readonly keys: Record<ContractAddress, SigningKey>;
}

const deriveKey = (password: string, salt: Buffer): Buffer => {
  return pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
};

const encrypt = (data: string, password: string, salt: Buffer): string => {
  const key = deriveKey(password, salt);
  const plaintext = Buffer.from(data, 'utf-8');
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const version = Buffer.from([ENCRYPTION_VERSION]);
  const result = Buffer.concat([version, salt, iv, authTag, encrypted]);

  return result.toString('base64');
};

const decrypt = (encryptedData: string, password: string, expectedSalt: Buffer): string => {
  const data = Buffer.from(encryptedData, 'base64');
  const headerLength = 1 + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH;

  if (data.length < headerLength) {
    throw new Error('Invalid encrypted data: too short');
  }

  const version = data[0];
  if (version !== ENCRYPTION_VERSION) {
    throw new Error(`Unsupported encryption version: ${version}`);
  }

  const salt = data.subarray(1, 1 + SALT_LENGTH);
  const iv = data.subarray(1 + SALT_LENGTH, 1 + SALT_LENGTH + IV_LENGTH);
  const authTag = data.subarray(1 + SALT_LENGTH + IV_LENGTH, 1 + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(headerLength);

  if (!expectedSalt.equals(salt)) {
    throw new Error('Salt mismatch');
  }

  const key = deriveKey(password, salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf-8');
};

const validateExportPassword = (password: string): void => {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new PrivateStateExportError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
};

const validateSigningKeyExportPassword = (password: string): void => {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new SigningKeyExportError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
};

const validateSalt = (salt: string): void => {
  if (salt.length !== EXPECTED_SALT_LENGTH) {
    throw new InvalidExportFormatError('Invalid salt length');
  }
  if (!/^[0-9a-fA-F]+$/.test(salt)) {
    throw new InvalidExportFormatError('Invalid salt format');
  }
};

/**
 * A simple in-memory implementation of private state provider. Makes it easy to capture and rewrite private state from deploy.
 *
 * Note: Unlike `levelPrivateStateProvider`, this provider has no storage password configured.
 * Therefore, export/import operations always require an explicit password in the options.
 *
 * @template PSI - Type of the private state identifier.
 * @template PS - Type of the private state.
 * @returns {PrivateStateProvider<PSI, PS>} An in-memory private state provider.
 */
export const inMemoryPrivateStateProvider = <
  PSI extends PrivateStateId,
  PS extends Contract.PrivateState<Contract.Any>
>(): PrivateStateProvider<PSI, PS> => {
  const record = new Map<string, PS>();
  const signingKeys = {} as Record<ContractAddress, SigningKey>;
  let contractAddress: ContractAddress | null = null;

  const getScopedKey = (key: PSI): string => {
    if (contractAddress === null) {
      throw new Error('Contract address not set. Call setContractAddress() before accessing private state.');
    }
    return `${contractAddress}:${key}`;
  };

  return {
    /**
     * Sets the contract address for scoping private state operations.
     * @param {ContractAddress} address - The contract address to scope operations to.
     */
    setContractAddress(address: ContractAddress): void {
      contractAddress = address;
    },
    /**
     * Sets the private state for a given key.
     * @param {PSI} key - The key for the private state.
     * @param {PS} state - The private state to set.
     * @returns {Promise<void>} A promise that resolves when the state is set.
     */
    set(key: PSI, state: PS): Promise<void> {
      record.set(getScopedKey(key), state);
      return Promise.resolve();
    },
    /**
     * Gets the private state for a given key.
     * @param {PSI} key - The key for the private state.
     * @returns {Promise<PS | null>} A promise that resolves to the private state or null if not found.
     */
    get(key: PSI): Promise<PS | null> {
      const value = record.get(getScopedKey(key)) ?? null;
      return Promise.resolve(value);
    },
    /**
     * Removes the private state for a given key.
     * @param {PSI} key - The key for the private state.
     * @returns {Promise<void>} A promise that resolves when the state is removed.
     */
    remove(key: PSI): Promise<void> {
      record.delete(getScopedKey(key));
      return Promise.resolve();
    },
    /**
     * Clears all private states.
     * @returns {Promise<void>} A promise that resolves when all states are cleared.
     */
    clear(): Promise<void> {
      if (contractAddress === null) {
        throw new Error('Contract address not set. Call setContractAddress() before accessing private state.');
      }
      record.clear();
      return Promise.resolve();
    },
    /**
     * Sets the signing key for a given contract address.
     * @param {ContractAddress} address - The contract address.
     * @param {SigningKey} signingKey - The signing key to set.
     * @returns {Promise<void>} A promise that resolves when the signing key is set.
     */
    setSigningKey(address: ContractAddress, signingKey: SigningKey): Promise<void> {
      signingKeys[address] = signingKey;
      return Promise.resolve();
    },
    /**
     * Gets the signing key for a given contract address.
     * @param {ContractAddress} address - The contract address.
     * @returns {Promise<SigningKey | null>} A promise that resolves to the signing key or null if not found.
     */
    getSigningKey(address: ContractAddress): Promise<SigningKey | null> {
      const value = signingKeys[address] ?? null;
      return Promise.resolve(value);
    },
    /**
     * Removes the signing key for a given contract address.
     * @param {ContractAddress} address - The contract address.
     * @returns {Promise<void>} A promise that resolves when the signing key is removed.
     */
    removeSigningKey(address: ContractAddress): Promise<void> {
      delete signingKeys[address];
      return Promise.resolve();
    },
    /**
     * Clears all signing keys.
     * @returns {Promise<void>} A promise that resolves when all signing keys are cleared.
     */
    clearSigningKeys(): Promise<void> {
      Object.keys(signingKeys).forEach((addr) => {
        delete signingKeys[addr];
      });
      return Promise.resolve();
    },
    /**
     * Exports all private states as an encrypted JSON-serializable structure.
     * @param {ExportPrivateStatesOptions} options - Export options including password.
     * @returns {Promise<PrivateStateExport>} A promise that resolves to the export structure.
     */
    async exportPrivateStates(options?: ExportPrivateStatesOptions): Promise<PrivateStateExport> {
      const maxStates = options?.maxStates ?? MAX_EXPORT_STATES;

      if (!options?.password) {
        throw new PrivateStateExportError('Password is required for in-memory provider export');
      }

      validateExportPassword(options.password);

      if (record.size === 0) {
        throw new PrivateStateExportError('No private states to export');
      }

      if (record.size > maxStates) {
        throw new PrivateStateExportError(
          `Too many states to export (${record.size}). Maximum allowed: ${maxStates}`
        );
      }

      const payload: PrivateStatePayload<PSI> = {
        version: CURRENT_EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        stateCount: record.size,
        states: Object.fromEntries(
          Array.from(record.entries()).map(([key, value]) => [key, JSON.stringify(value)])
        ) as Record<PSI, string>
      };

      const salt = randomBytes(SALT_LENGTH);
      const encryptedPayload = encrypt(JSON.stringify(payload), options.password, salt);

      return {
        format: 'midnight-private-state-export',
        encryptedPayload,
        salt: salt.toString('hex')
      };
    },
    /**
     * Imports private states from a previously exported structure.
     * @param {PrivateStateExport} exportData - The export data structure to import.
     * @param {ImportPrivateStatesOptions} options - Import options including password and conflict strategy.
     * @returns {Promise<ImportPrivateStatesResult>} A promise that resolves to the import result.
     */
    async importPrivateStates(
      exportData: PrivateStateExport,
      options?: ImportPrivateStatesOptions
    ): Promise<ImportPrivateStatesResult> {
      const conflictStrategy = options?.conflictStrategy ?? 'error';
      const maxStates = options?.maxStates ?? MAX_EXPORT_STATES;

      if (exportData.format !== 'midnight-private-state-export') {
        throw new InvalidExportFormatError('Unrecognized export format');
      }

      if (!exportData.encryptedPayload || !exportData.salt) {
        throw new InvalidExportFormatError('Missing required fields');
      }

      validateSalt(exportData.salt);

      if (!options?.password) {
        throw new InvalidExportFormatError('Password is required for in-memory provider import');
      }

      validateExportPassword(options.password);

      let payload: PrivateStatePayload<PSI>;
      try {
        const salt = Buffer.from(exportData.salt, 'hex');
        const decryptedJson = decrypt(exportData.encryptedPayload, options.password, salt);
        payload = JSON.parse(decryptedJson);
      } catch {
        throw new ExportDecryptionError();
      }

      if (
        !payload.states ||
        typeof payload.states !== 'object' ||
        typeof payload.version !== 'number' ||
        typeof payload.stateCount !== 'number'
      ) {
        throw new ExportDecryptionError();
      }

      if (!SUPPORTED_EXPORT_VERSIONS.includes(payload.version)) {
        throw new InvalidExportFormatError(
          `Export version ${payload.version} is not supported. Supported versions: ${SUPPORTED_EXPORT_VERSIONS.join(', ')}`
        );
      }

      const stateIds = Object.keys(payload.states) as PSI[];

      if (stateIds.length !== payload.stateCount) {
        throw new ExportDecryptionError();
      }

      if (stateIds.length > maxStates) {
        throw new InvalidExportFormatError(
          `Too many states in export (${stateIds.length}). Maximum allowed: ${maxStates}`
        );
      }

      if (conflictStrategy === 'error') {
        const conflictCount = stateIds.filter((id) => record.has(id as string)).length;
        if (conflictCount > 0) {
          throw new ImportConflictError(conflictCount);
        }
      }

      let imported = 0;
      let skipped = 0;
      let overwritten = 0;

      for (const stateId of stateIds) {
        const serializedState = payload.states[stateId];
        const existingState = record.get(stateId as string);

        if (existingState !== undefined) {
          if (conflictStrategy === 'skip') {
            skipped++;
            continue;
          } else if (conflictStrategy === 'overwrite') {
            overwritten++;
          }
        }

        const state = JSON.parse(serializedState) as PS;
        record.set(stateId as string, state);

        if (existingState === undefined) {
          imported++;
        }
      }

      return { imported, skipped, overwritten };
    },
    /**
     * Exports all signing keys as an encrypted JSON-serializable structure.
     * @param {ExportSigningKeysOptions} options - Export options including password.
     * @returns {Promise<SigningKeyExport>} A promise that resolves to the export structure.
     */
    async exportSigningKeys(options?: ExportSigningKeysOptions): Promise<SigningKeyExport> {
      const maxKeys = options?.maxKeys ?? MAX_EXPORT_SIGNING_KEYS;

      if (!options?.password) {
        throw new SigningKeyExportError('Password is required for in-memory provider export');
      }

      validateSigningKeyExportPassword(options.password);

      const keyCount = Object.keys(signingKeys).length;

      if (keyCount === 0) {
        throw new SigningKeyExportError('No signing keys to export');
      }

      if (keyCount > maxKeys) {
        throw new SigningKeyExportError(
          `Too many keys to export (${keyCount}). Maximum allowed: ${maxKeys}`
        );
      }

      const payload: SigningKeyPayload = {
        version: CURRENT_EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        keyCount,
        keys: { ...signingKeys }
      };

      const salt = randomBytes(SALT_LENGTH);
      const encryptedPayload = encrypt(JSON.stringify(payload), options.password, salt);

      return {
        format: 'midnight-signing-key-export',
        encryptedPayload,
        salt: salt.toString('hex')
      };
    },
    /**
     * Imports signing keys from a previously exported structure.
     * @param {SigningKeyExport} exportData - The export data structure to import.
     * @param {ImportSigningKeysOptions} options - Import options including password and conflict strategy.
     * @returns {Promise<ImportSigningKeysResult>} A promise that resolves to the import result.
     */
    async importSigningKeys(
      exportData: SigningKeyExport,
      options?: ImportSigningKeysOptions
    ): Promise<ImportSigningKeysResult> {
      const conflictStrategy = options?.conflictStrategy ?? 'error';
      const maxKeys = options?.maxKeys ?? MAX_EXPORT_SIGNING_KEYS;

      if (exportData.format !== 'midnight-signing-key-export') {
        throw new InvalidExportFormatError('Unrecognized export format');
      }

      if (!exportData.encryptedPayload || !exportData.salt) {
        throw new InvalidExportFormatError('Missing required fields');
      }

      validateSalt(exportData.salt);

      if (!options?.password) {
        throw new InvalidExportFormatError('Password is required for in-memory provider import');
      }

      validateSigningKeyExportPassword(options.password);

      let payload: SigningKeyPayload;
      try {
        const salt = Buffer.from(exportData.salt, 'hex');
        const decryptedJson = decrypt(exportData.encryptedPayload, options.password, salt);
        payload = JSON.parse(decryptedJson);
      } catch {
        throw new ExportDecryptionError();
      }

      if (
        !payload.keys ||
        typeof payload.keys !== 'object' ||
        typeof payload.version !== 'number' ||
        typeof payload.keyCount !== 'number'
      ) {
        throw new ExportDecryptionError();
      }

      if (!SUPPORTED_EXPORT_VERSIONS.includes(payload.version)) {
        throw new InvalidExportFormatError(
          `Export version ${payload.version} is not supported. Supported versions: ${SUPPORTED_EXPORT_VERSIONS.join(', ')}`
        );
      }

      const addresses = Object.keys(payload.keys) as ContractAddress[];

      if (addresses.length !== payload.keyCount) {
        throw new ExportDecryptionError();
      }

      if (addresses.length > maxKeys) {
        throw new InvalidExportFormatError(
          `Too many keys in export (${addresses.length}). Maximum allowed: ${maxKeys}`
        );
      }

      if (conflictStrategy === 'error') {
        const conflictCount = addresses.filter((addr) => signingKeys[addr] !== undefined).length;
        if (conflictCount > 0) {
          throw new ImportConflictError(conflictCount, 'signing key');
        }
      }

      let imported = 0;
      let skipped = 0;
      let overwritten = 0;

      for (const address of addresses) {
        const signingKey = payload.keys[address];
        const existingKey = signingKeys[address];

        if (existingKey !== undefined) {
          if (conflictStrategy === 'skip') {
            skipped++;
            continue;
          } else if (conflictStrategy === 'overwrite') {
            overwritten++;
          }
        }

        signingKeys[address] = signingKey;

        if (existingKey === undefined) {
          imported++;
        }
      }

      return { imported, skipped, overwritten };
    }
  };
};
