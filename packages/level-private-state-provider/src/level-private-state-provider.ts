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
  CorruptedExportDataError,
  type ExportPrivateStatesOptions,
  ImportConflictError,
  type ImportPrivateStatesOptions,
  type ImportPrivateStatesResult,
  type PrivateStateExport,
  PrivateStateExportError,
  type PrivateStateId,
  type PrivateStateProvider,
  UnsupportedExportVersionError,
  type WalletProvider,
  WrongExportPasswordError
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
 * Optional properties for the indexedDB based private state provider configuration.
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
   * Wallet provider used to get the encryption public key for password derivation.
   * If privateStoragePasswordProvider is not provided, the wallet's encryption public key
   * will be used as the password.
   */
  readonly walletProvider?: WalletProvider;
  /**
   * Provider function that returns the password used for encrypting private state.
   * The password must be at least 16 characters long.
   *
   * If not provided, defaults to using walletProvider.getEncryptionPublicKey().
   *
   * @example
   * ```typescript
   * // Using default (wallet's encryption public key)
   * { walletProvider: wallet }
   *
   * // Using custom password provider
   * {
   *   walletProvider: wallet,
   *   privateStoragePasswordProvider: async () => await getUserPassword()
   * }
   * ```
   */
  readonly privateStoragePasswordProvider?: PrivateStoragePasswordProvider;
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
 */
interface PrivateStatePayload<PSI extends PrivateStateId = PrivateStateId> {
  readonly states: Record<PSI, string>;
}

const SUPPORTED_EXPORT_VERSIONS = [1];

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Constructs an instance of {@link PrivateStateProvider} based on {@link Level} database.
 *
 * @param config Database configuration options.
 */
export const levelPrivateStateProvider = <PSI extends PrivateStateId, PS = any>(
  config: Partial<LevelPrivateStateProviderConfig>
): PrivateStateProvider<PSI, PS> => {
  const fullConfig = _.defaults(config, DEFAULT_CONFIG);

  if (config.privateStoragePasswordProvider && config.walletProvider) {
    throw new Error(
      'Cannot provide both privateStoragePasswordProvider and walletProvider.\n' +
      'Provide only one: walletProvider for default behavior, or privateStoragePasswordProvider for custom password.'
    );
  }

  if (!config.privateStoragePasswordProvider && !config.walletProvider) {
    throw new Error(
      'Either privateStoragePasswordProvider or walletProvider must be provided.\n' +
      'Provide walletProvider to use wallet encryption key, or privateStoragePasswordProvider for custom password.'
    );
  }

  const passwordProvider: PrivateStoragePasswordProvider = config.privateStoragePasswordProvider ||
    (() => config.walletProvider!.getEncryptionPublicKey());

  return {
    get(privateStateId: PSI): Promise<PS | null> {
      return subLevelMaybeGet<PSI, PS>(
        fullConfig.midnightDbName,
        fullConfig.privateStateStoreName,
        privateStateId,
        passwordProvider
      );
    },
    remove(privateStateId: PSI): Promise<void> {
      return withSubLevel<PSI, string, void>(fullConfig.midnightDbName, fullConfig.privateStateStoreName, (subLevel) =>
        subLevel.del(privateStateId)
      );
    },
    async set(privateStateId: PSI, state: PS): Promise<void> {
      const encryption = await getOrCreateEncryption(
        fullConfig.midnightDbName,
        fullConfig.privateStateStoreName,
        passwordProvider
      );
      const serialized = superjson.stringify(state);
      const encrypted = encryption.encrypt(serialized);

      return withSubLevel<PSI, string, void>(fullConfig.midnightDbName, fullConfig.privateStateStoreName, (subLevel) =>
        subLevel.put(privateStateId, encrypted)
      );
    },
    clear(): Promise<void> {
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
      // Determine export password - use provided password or storage password
      const exportPassword = options?.password ?? await getPasswordFromProvider(passwordProvider);

      // Get all private states (not signing keys)
      const states = await getAllEntries<PSI, PS>(
        fullConfig.midnightDbName,
        fullConfig.privateStateStoreName,
        passwordProvider
      );

      if (states.size === 0) {
        throw new PrivateStateExportError('No private states to export');
      }

      // Serialize states using superjson (to preserve types like BigInt, Buffer, etc.)
      const payload: PrivateStatePayload<PSI> = {
        states: Object.fromEntries(
          Array.from(states.entries()).map(([key, value]) => [key, superjson.stringify(value)])
        ) as Record<PSI, string>
      };

      // Create new encryption instance for export (different salt from storage)
      const exportEncryption = new StorageEncryption(exportPassword);
      const encryptedPayload = exportEncryption.encrypt(JSON.stringify(payload));

      return {
        version: 1,
        exportedAt: new Date().toISOString(),
        stateCount: states.size,
        encryptedPayload,
        salt: exportEncryption.getSalt().toString('hex')
      };
    },

    async importPrivateStates(
      exportData: PrivateStateExport,
      options?: ImportPrivateStatesOptions
    ): Promise<ImportPrivateStatesResult> {
      const conflictStrategy = options?.conflictStrategy ?? 'error';

      // Validate version
      if (!SUPPORTED_EXPORT_VERSIONS.includes(exportData.version)) {
        throw new UnsupportedExportVersionError(exportData.version, SUPPORTED_EXPORT_VERSIONS);
      }

      // Validate structure
      if (!exportData.encryptedPayload || !exportData.salt) {
        throw new CorruptedExportDataError('Missing required fields');
      }

      // Determine import password - use provided password or storage password
      const importPassword = options?.password ?? await getPasswordFromProvider(passwordProvider);

      // Decrypt the payload
      let payload: PrivateStatePayload<PSI>;
      try {
        const salt = Buffer.from(exportData.salt, 'hex');
        const importEncryption = new StorageEncryption(importPassword, salt);
        const decryptedJson = importEncryption.decrypt(exportData.encryptedPayload);
        payload = JSON.parse(decryptedJson);
      } catch (error) {
        // Distinguish between wrong password and corrupted data
        // Authentication failures indicate wrong password (wrong key derived from wrong password)
        if (error instanceof Error) {
          const message = error.message.toLowerCase();
          if (
            message.includes('salt mismatch') ||
            message.includes('unable to authenticate') ||
            message.includes('unsupported state')
          ) {
            throw new WrongExportPasswordError();
          }
        }
        throw new CorruptedExportDataError(
          error instanceof Error ? error.message : 'Decryption failed'
        );
      }

      // Validate payload structure
      if (!payload.states || typeof payload.states !== 'object') {
        throw new CorruptedExportDataError('Invalid payload structure');
      }

      const stateIds = Object.keys(payload.states) as PSI[];

      // Check for conflicts if strategy is 'error'
      if (conflictStrategy === 'error') {
        const existingStates = await getAllEntries<PSI, PS>(
          fullConfig.midnightDbName,
          fullConfig.privateStateStoreName,
          passwordProvider
        );

        const conflicts = stateIds.filter((id) => existingStates.has(id));
        if (conflicts.length > 0) {
          throw new ImportConflictError(conflicts);
        }
      }

      // Import states
      let imported = 0;
      let skipped = 0;
      let overwritten = 0;

      for (const stateId of stateIds) {
        const serializedState = payload.states[stateId];
        try {
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
        } catch (error) {
          throw new CorruptedExportDataError(
            `Failed to import state '${stateId}': ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      return { imported, skipped, overwritten };
    }
  };
};
