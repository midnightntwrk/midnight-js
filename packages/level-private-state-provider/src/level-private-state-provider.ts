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

import type { ContractAddress, SigningKey } from '@midnight-ntwrk/compact-runtime';
import {
  ExportDecryptionError,
  type ExportPrivateStatesOptions,
  ImportConflictError,
  type ImportPrivateStatesOptions,
  type ImportPrivateStatesResult,
  InvalidExportFormatError,
  MAX_EXPORT_STATES,
  type PrivateStateExport,
  PrivateStateExportError,
  type PrivateStateId,
  type PrivateStateProvider
} from '@midnight-ntwrk/midnight-js-types';
import { type AbstractSublevel } from 'abstract-level';
import { Buffer } from 'buffer';
import { Level } from 'level';
import _ from 'lodash';
import * as superjson from 'superjson';

import { getPasswordFromProvider, type PrivateStoragePasswordProvider, StorageEncryption } from './storage-encryption';

/**
 * The default name of the indexedDB database for Midnight.
 */
export const MN_LDB_DEFAULT_DB_NAME = 'midnight-level-db';

/**
 * The default name of the private state store.
 */
export const MN_LDB_DEFAULT_PRIS_STORE_NAME = 'private-states';

/**
 * The default name of the signing key store.
 */
export const MN_LDB_DEFAULT_KEY_STORE_NAME = 'signing-keys';

/**
 * Configuration properties for the LevelDB based private state provider.
 */
export interface LevelPrivateStateProviderConfig {
  /**
   * The name of the LevelDB database used to store all Midnight related data.
   */
  readonly midnightDbName: string;
  /**
   * The name of the object store containing private states.
   */
  readonly privateStateStoreName: string;
  /**
   * The name of the object store containing signing keys.
   */
  readonly signingKeyStoreName: string;
  /**
   * Provider function that returns the password used for encrypting private state.
   * The password must be at least 16 characters long.
   *
   * SECURITY: Use a strong, secret password. Never use public key material
   * or other non-secret values as the password source.
   *
   * @example
   * ```typescript
   * {
   *   privateStoragePasswordProvider: async () => await getSecretPassword()
   * }
   * ```
   */
  readonly privateStoragePasswordProvider: PrivateStoragePasswordProvider;
}

/**
 * The default configuration for the level database.
 */
export const DEFAULT_CONFIG = {
  /**
   * The name of the database.
   */
  midnightDbName: MN_LDB_DEFAULT_DB_NAME,
  /**
   * The name of the "level" on which to store private state.
   */
  privateStateStoreName: MN_LDB_DEFAULT_PRIS_STORE_NAME,
  /**
   * The name of the "level" on which to store signing keys.
   */
  signingKeyStoreName: MN_LDB_DEFAULT_KEY_STORE_NAME
};

superjson.registerCustom<Buffer, string>(
  {
    isApplicable: (v): v is Buffer => v instanceof Buffer,
    serialize: (v) => v.toString('hex'),
    deserialize: (v) => Buffer.from(v, 'hex')
  },
  'buffer'
);

const withSubLevel = async <K, V, A>(
  dbName: string,
  levelName: string,
  thunk: (subLevel: AbstractSublevel<Level, string | Uint8Array | Buffer, K, V>) => Promise<A>
): Promise<A> => {
  const level = new Level(dbName, {
    createIfMissing: true
  });
  const subLevel = level.sublevel<K, V>(levelName, {
    valueEncoding: 'utf-8'
  });
  try {
    await level.open();
    await subLevel.open();
    return await thunk(subLevel);
  } finally {
    await subLevel.close();
    await level.close();
  }
};

const METADATA_KEY = '__midnight_encryption_metadata__';

const getOrCreateEncryption = async (
  dbName: string,
  levelName: string,
  passwordProvider: PrivateStoragePasswordProvider
): Promise<StorageEncryption> => {
  const password = await getPasswordFromProvider(passwordProvider);

  return withSubLevel<string, string, StorageEncryption>(dbName, levelName, async (subLevel) => {
    try {
      const metadataJson = await subLevel.get(METADATA_KEY);
      if (!metadataJson) {
        throw new Error('Metadata not found');
      }
      const metadata = JSON.parse(metadataJson);
      const salt = Buffer.from(metadata.salt, 'hex');
      return new StorageEncryption(password, salt);
    } catch {
      const encryption = new StorageEncryption(password);
      const metadata = {
        salt: encryption.getSalt().toString('hex'),
        version: 1
      };
      await subLevel.put(METADATA_KEY, JSON.stringify(metadata));
      return encryption;
    }
  });
};

const subLevelMaybeGet = async <K, V>(
  dbName: string,
  levelName: string,
  key: K,
  passwordProvider: PrivateStoragePasswordProvider
): Promise<V | null> => {
  const encryption = await getOrCreateEncryption(dbName, levelName, passwordProvider);

  return withSubLevel<K, string, V | null>(dbName, levelName, async (subLevel) => {
    try {
      const encryptedValue = await subLevel.get(key);

      if (encryptedValue === undefined) {
        return null;
      }

      let decryptedValue: string;

      if (StorageEncryption.isEncrypted(encryptedValue)) {
        decryptedValue = encryption.decrypt(encryptedValue);
      } else {
        decryptedValue = encryptedValue;
        const reEncrypted = encryption.encrypt(encryptedValue);
        await subLevel.put(key, reEncrypted);
      }

      const value = superjson.parse<V>(decryptedValue);

      if (value === undefined) {
        return null;
      }

      return value;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  });
};

/**
 * Iterate all key-value pairs in a sublevel, excluding metadata keys.
 */
const getAllEntries = async <K extends string, V>(
  dbName: string,
  levelName: string,
  passwordProvider: PrivateStoragePasswordProvider
): Promise<Map<K, V>> => {
  const encryption = await getOrCreateEncryption(dbName, levelName, passwordProvider);

  return withSubLevel<K, string, Map<K, V>>(dbName, levelName, async (subLevel) => {
    const entries = new Map<K, V>();

    for await (const [key, encryptedValue] of subLevel.iterator()) {
      // Skip metadata key
      if (key === METADATA_KEY) {
        continue;
      }

      let decryptedValue: string;

      if (StorageEncryption.isEncrypted(encryptedValue)) {
        decryptedValue = encryption.decrypt(encryptedValue);
      } else {
        // Legacy unencrypted data
        decryptedValue = encryptedValue;
      }

      const value = superjson.parse<V>(decryptedValue);
      entries.set(key as K, value);
    }

    return entries;
  });
};

/**
 * Internal structure of the decrypted export payload.
 * Includes metadata to ensure it's authenticated by the encryption.
 */
interface PrivateStatePayload<PSI extends PrivateStateId = PrivateStateId> {
  readonly version: number;
  readonly exportedAt: string;
  readonly stateCount: number;
  readonly states: Record<PSI, string>;
}

const CURRENT_EXPORT_VERSION = 1;
const SUPPORTED_EXPORT_VERSIONS = [1];
const EXPECTED_SALT_LENGTH = 64; // 32 bytes as hex
const MIN_PASSWORD_LENGTH = 16;

/**
 * Validates a custom password meets minimum requirements.
 */
const validateExportPassword = (password: string): void => {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new PrivateStateExportError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
    );
  }
};

/**
 * Validates the salt format and length.
 */
const validateSalt = (salt: string): void => {
  if (salt.length !== EXPECTED_SALT_LENGTH) {
    throw new InvalidExportFormatError('Invalid salt length');
  }
  if (!/^[0-9a-fA-F]+$/.test(salt)) {
    throw new InvalidExportFormatError('Invalid salt format');
  }
};

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Constructs an instance of {@link PrivateStateProvider} based on {@link Level} database.
 *
 * ⚠️ WARNING
 *
 * RISK: This provider lacks a recovery mechanism.
 * Clearing browser cache or deleting local files permanently destroys the private state (contract state/keys).
 * For assets with real-world value, this may result in irreversible financial loss.
 * DO NOT use for production applications requiring data persistence.
 *
 * @param config Database configuration options.
 */
export const levelPrivateStateProvider = <PSI extends PrivateStateId, PS = any>(
  config: Partial<LevelPrivateStateProviderConfig> & Pick<LevelPrivateStateProviderConfig, 'privateStoragePasswordProvider'>
): PrivateStateProvider<PSI, PS> => {
  const fullConfig = _.defaults(config, DEFAULT_CONFIG);

  if (!config.privateStoragePasswordProvider) {
    throw new Error(
      'privateStoragePasswordProvider is required.\n' +
      'Provide a function that returns a strong, secret password (minimum 16 characters).'
    );
  }

  const passwordProvider: PrivateStoragePasswordProvider = config.privateStoragePasswordProvider;

  let contractAddress: ContractAddress | null = null;

  const getScopedKey = (privateStateId: PSI): string => {
    if (contractAddress === null) {
      throw new Error('Contract address not set. Call setContractAddress() before accessing private state.');
    }
    return `${contractAddress}:${privateStateId}`;
  };

  return {
    setContractAddress(address: ContractAddress): void {
      contractAddress = address;
    },
    async get(privateStateId: PSI): Promise<PS | null> {
      const scopedKey = getScopedKey(privateStateId);
      return subLevelMaybeGet<string, PS>(
        fullConfig.midnightDbName,
        fullConfig.privateStateStoreName,
        scopedKey,
        passwordProvider
      );
    },
    async remove(privateStateId: PSI): Promise<void> {
      const scopedKey = getScopedKey(privateStateId);
      return withSubLevel<string, string, void>(fullConfig.midnightDbName, fullConfig.privateStateStoreName, (subLevel) =>
        subLevel.del(scopedKey)
      );
    },
    async set(privateStateId: PSI, state: PS): Promise<void> {
      const scopedKey = getScopedKey(privateStateId);
      const encryption = await getOrCreateEncryption(
        fullConfig.midnightDbName,
        fullConfig.privateStateStoreName,
        passwordProvider
      );
      const serialized = superjson.stringify(state);
      const encrypted = encryption.encrypt(serialized);

      return withSubLevel<string, string, void>(fullConfig.midnightDbName, fullConfig.privateStateStoreName, (subLevel) =>
        subLevel.put(scopedKey, encrypted)
      );
    },
    async clear(): Promise<void> {
      if (contractAddress === null) {
        throw new Error('Contract address not set. Call setContractAddress() before accessing private state.');
      }
      return withSubLevel(fullConfig.midnightDbName, fullConfig.privateStateStoreName, (subLevel) => subLevel.clear());
    },
    getSigningKey(address: ContractAddress): Promise<SigningKey | null> {
      return subLevelMaybeGet<ContractAddress, SigningKey>(
        fullConfig.midnightDbName,
        fullConfig.signingKeyStoreName,
        address,
        passwordProvider
      );
    },
    removeSigningKey(address: ContractAddress): Promise<void> {
      return withSubLevel<ContractAddress, string, void>(
        fullConfig.midnightDbName,
        fullConfig.signingKeyStoreName,
        (subLevel) => subLevel.del(address)
      );
    },
    async setSigningKey(address: ContractAddress, signingKey: SigningKey): Promise<void> {
      const encryption = await getOrCreateEncryption(
        fullConfig.midnightDbName,
        fullConfig.signingKeyStoreName,
        passwordProvider
      );
      const serialized = superjson.stringify(signingKey);
      const encrypted = encryption.encrypt(serialized);

      return withSubLevel<ContractAddress, string, void>(
        fullConfig.midnightDbName,
        fullConfig.signingKeyStoreName,
        (subLevel) => subLevel.put(address, encrypted)
      );
    },
    clearSigningKeys(): Promise<void> {
      return withSubLevel(fullConfig.midnightDbName, fullConfig.signingKeyStoreName, (subLevel) => subLevel.clear());
    },

    async exportPrivateStates(options?: ExportPrivateStatesOptions): Promise<PrivateStateExport> {
      if (contractAddress === null) {
        throw new Error('Contract address not set. Call setContractAddress() before exporting private states.');
      }

      const maxStates = options?.maxStates ?? MAX_EXPORT_STATES;

      // Validate custom password if provided
      if (options?.password !== undefined) {
        validateExportPassword(options.password);
      }

      // Determine export password - use provided password or storage password
      const exportPassword = options?.password ?? await getPasswordFromProvider(passwordProvider);

      // Get all private states (not signing keys)
      const allStates = await getAllEntries<string, PS>(
        fullConfig.midnightDbName,
        fullConfig.privateStateStoreName,
        passwordProvider
      );

      // Filter and extract only states for the current contract address
      const prefix = `${contractAddress}:`;
      const states = new Map<PSI, PS>();
      for (const [scopedKey, value] of allStates.entries()) {
        if (scopedKey.startsWith(prefix)) {
          const rawStateId = scopedKey.slice(prefix.length) as PSI;
          states.set(rawStateId, value);
        }
      }

      if (states.size === 0) {
        throw new PrivateStateExportError('No private states to export');
      }

      if (states.size > maxStates) {
        throw new PrivateStateExportError(
          `Too many states to export (${states.size}). Maximum allowed: ${maxStates}`
        );
      }

      // Serialize states using superjson (to preserve types like BigInt, Buffer, etc.)
      // Include metadata in the encrypted payload to ensure it's authenticated
      const payload: PrivateStatePayload<PSI> = {
        version: CURRENT_EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        stateCount: states.size,
        states: Object.fromEntries(
          Array.from(states.entries()).map(([key, value]) => [key, superjson.stringify(value)])
        ) as Record<PSI, string>
      };

      // Create new encryption instance for export (different salt from storage)
      const exportEncryption = new StorageEncryption(exportPassword);
      const encryptedPayload = exportEncryption.encrypt(JSON.stringify(payload));

      return {
        format: 'midnight-private-state-export',
        encryptedPayload,
        salt: exportEncryption.getSalt().toString('hex')
      };
    },

    async importPrivateStates(
      exportData: PrivateStateExport,
      options?: ImportPrivateStatesOptions
    ): Promise<ImportPrivateStatesResult> {
      if (contractAddress === null) {
        throw new Error('Contract address not set. Call setContractAddress() before importing private states.');
      }

      const conflictStrategy = options?.conflictStrategy ?? 'error';
      const maxStates = options?.maxStates ?? MAX_EXPORT_STATES;

      // Validate format identifier
      if (exportData.format !== 'midnight-private-state-export') {
        throw new InvalidExportFormatError('Unrecognized export format');
      }

      // Validate structure
      if (!exportData.encryptedPayload || !exportData.salt) {
        throw new InvalidExportFormatError('Missing required fields');
      }

      // Validate salt format
      validateSalt(exportData.salt);

      // Validate custom password if provided
      if (options?.password !== undefined) {
        validateExportPassword(options.password);
      }

      // Determine import password - use provided password or storage password
      const importPassword = options?.password ?? await getPasswordFromProvider(passwordProvider);

      // Decrypt the payload - use single generic error to prevent oracle attacks
      let payload: PrivateStatePayload<PSI>;
      try {
        const salt = Buffer.from(exportData.salt, 'hex');
        const importEncryption = new StorageEncryption(importPassword, salt);
        const decryptedJson = importEncryption.decrypt(exportData.encryptedPayload);
        payload = JSON.parse(decryptedJson);
      } catch {
        // Single generic error - don't reveal whether password was wrong or data was corrupted
        throw new ExportDecryptionError();
      }

      // Validate payload structure (metadata is now inside encrypted payload)
      if (
        !payload.states ||
        typeof payload.states !== 'object' ||
        typeof payload.version !== 'number' ||
        typeof payload.stateCount !== 'number'
      ) {
        throw new ExportDecryptionError();
      }

      // Validate version from authenticated payload
      if (!SUPPORTED_EXPORT_VERSIONS.includes(payload.version)) {
        throw new InvalidExportFormatError(
          `Export version ${payload.version} is not supported. Supported versions: ${SUPPORTED_EXPORT_VERSIONS.join(', ')}`
        );
      }

      // stateIds are raw state IDs (not scoped with contract address)
      const stateIds = Object.keys(payload.states) as PSI[];

      // Validate state count matches and is within limits
      if (stateIds.length !== payload.stateCount) {
        throw new ExportDecryptionError();
      }

      if (stateIds.length > maxStates) {
        throw new InvalidExportFormatError(
          `Too many states in export (${stateIds.length}). Maximum allowed: ${maxStates}`
        );
      }

      // Check for conflicts if strategy is 'error'
      // Use this.get() which properly scopes the state IDs
      if (conflictStrategy === 'error') {
        let conflictCount = 0;
        for (const stateId of stateIds) {
          const existing = await this.get(stateId);
          if (existing !== null) {
            conflictCount++;
          }
        }
        if (conflictCount > 0) {
          throw new ImportConflictError(conflictCount);
        }
      }

      // Import states
      let imported = 0;
      let skipped = 0;
      let overwritten = 0;

      for (const stateId of stateIds) {
        const serializedState = payload.states[stateId];
        const existingState = await this.get(stateId);

        if (existingState !== null) {
          if (conflictStrategy === 'skip') {
            skipped++;
            continue;
          } else if (conflictStrategy === 'overwrite') {
            overwritten++;
          }
        }

        // Deserialize and store the state
        const state = superjson.parse<PS>(serializedState);
        await this.set(stateId, state);

        if (existingState === null) {
          imported++;
        }
      }

      return { imported, skipped, overwritten };
    }
  };
};
