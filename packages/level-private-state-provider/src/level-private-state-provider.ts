/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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
import { type AbstractSublevel } from 'abstract-level';
import { Buffer } from 'buffer';
import { createHash, randomBytes } from 'crypto';
import { Level } from 'level';
import * as superjson from 'superjson';

import { decryptValue, getPasswordFromProvider, type PrivateStoragePasswordProvider, StorageEncryption } from './storage-encryption';

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
  /**
   * Account identifier used to scope storage. This ensures data isolation
   * between different accounts/wallets using the same database.
   *
   * The accountId is hashed (SHA-256, first 32 chars) before being used
   * in storage paths, so any unique identifier can be used (e.g., wallet address).
   *
   * @example
   * ```typescript
   * {
   *   accountId: walletAddress
   * }
   * ```
   */
  readonly accountId: string;
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

const ACCOUNT_ID_HASH_LENGTH = 32;

const hashAccountId = (accountId: string): string => {
  return createHash('sha256').update(accountId).digest('hex').substring(0, ACCOUNT_ID_HASH_LENGTH);
};

const getScopedLevelName = (baseLevelName: string, accountId: string): string => {
  const hashedAccountId = hashAccountId(accountId);
  return `${baseLevelName}:${hashedAccountId}`;
};

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

const DEFAULT_MAX_ROTATION_ENTRIES = 10000;

const encryptionInitPromises = new Map<string, Promise<Buffer>>();

const passwordRotationLocks = new Map<string, Promise<void>>();

export interface PasswordRotationResult {
  readonly entriesMigrated: number;
}

export interface PasswordRotationOptions {
  readonly maxEntries?: number;
}

interface EncryptionCacheEntry {
  readonly encryption: StorageEncryption;
  readonly saltHex: string;
}

/**
 * Module-level cache for StorageEncryption instances, keyed by `${dbName}:${levelName}`.
 * This cache avoids repeated PBKDF2 key derivation (600,000 iterations) on each operation.
 *
 * Note: This cache has no size limit. For typical usage with a small number of
 * database/level combinations, this is acceptable. If using dynamic db/level names,
 * call `invalidateEncryptionCache()` to prevent unbounded growth.
 */
const encryptionCache = new Map<string, EncryptionCacheEntry>();

const getOrCreateSalt = async (dbName: string, levelName: string): Promise<Buffer> => {
  const lockKey = `${dbName}:${levelName}`;

  const existingPromise = encryptionInitPromises.get(lockKey);
  if (existingPromise) {
    return existingPromise;
  }

  const initPromise = withSubLevel<string, string, Buffer>(dbName, levelName, async (subLevel) => {
    try {
      const metadataJson = await subLevel.get(METADATA_KEY);
      if (metadataJson) {
        const metadata = JSON.parse(metadataJson);
        return Buffer.from(metadata.salt, 'hex');
      }
    } catch (error: unknown) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'LEVEL_NOT_FOUND')) {
        throw error;
      }
    }

    const salt = randomBytes(32);
    const metadata = {
      salt: salt.toString('hex'),
      version: 1
    };
    await subLevel.put(METADATA_KEY, JSON.stringify(metadata));
    return salt;
  });

  encryptionInitPromises.set(lockKey, initPromise);

  try {
    return await initPromise;
  } finally {
    encryptionInitPromises.delete(lockKey);
  }
};

const getOrCreateEncryption = async (
  dbName: string,
  levelName: string,
  passwordProvider: PrivateStoragePasswordProvider
): Promise<StorageEncryption> => {
  const cacheKey = `${dbName}:${levelName}`;
  const salt = await getOrCreateSalt(dbName, levelName);
  const saltHex = salt.toString('hex');

  const cached = encryptionCache.get(cacheKey);
  if (cached && cached.saltHex === saltHex) {
    const password = await getPasswordFromProvider(passwordProvider);
    if (cached.encryption.verifyPassword(password)) {
      return cached.encryption;
    }
    const encryption = new StorageEncryption(password, salt);
    encryptionCache.set(cacheKey, { encryption, saltHex });
    return encryption;
  }

  const password = await getPasswordFromProvider(passwordProvider);
  const encryption = new StorageEncryption(password, salt);
  encryptionCache.set(cacheKey, { encryption, saltHex });
  return encryption;
};

const invalidateEncryptionCacheForDb = (dbName: string, privateStateStoreName: string, signingKeyStoreName: string): void => {
  const privateStateKey = `${dbName}:${privateStateStoreName}`;
  const signingKeyKey = `${dbName}:${signingKeyStoreName}`;
  encryptionCache.delete(privateStateKey);
  encryptionCache.delete(signingKeyKey);
};

const DEFAULT_LOCK_TIMEOUT_MS = 300000; // 5 minutes

const withPasswordRotationLock = async <T>(
  lockKey: string,
  operation: () => Promise<T>,
  timeoutMs: number = DEFAULT_LOCK_TIMEOUT_MS
): Promise<T> => {
  const startWait = Date.now();

  while (passwordRotationLocks.has(lockKey)) {
    if (Date.now() - startWait > timeoutMs) {
      throw new Error(
        `Timed out waiting for password rotation lock on "${lockKey}". ` +
          `Another rotation may be stuck or taking longer than ${timeoutMs}ms.`
      );
    }
    await passwordRotationLocks.get(lockKey);
  }

  let resolve!: () => void;
  const lockPromise = new Promise<void>((r) => {
    resolve = r;
  });
  passwordRotationLocks.set(lockKey, lockPromise);

  try {
    return await operation();
  } finally {
    passwordRotationLocks.delete(lockKey);
    resolve();
  }
};

const waitForRotationLock = async (
  dbName: string,
  levelName: string,
  timeoutMs: number = DEFAULT_LOCK_TIMEOUT_MS
): Promise<void> => {
  const lockKey = `${dbName}:${levelName}`;
  const startWait = Date.now();

  while (passwordRotationLocks.has(lockKey)) {
    if (Date.now() - startWait > timeoutMs) {
      throw new Error(
        `Timed out waiting for password rotation to complete on "${lockKey}". ` +
          `The rotation may be stuck or taking longer than ${timeoutMs}ms.`
      );
    }
    await passwordRotationLocks.get(lockKey);
  }
};

interface RotateStorePasswordParams {
  readonly dbName: string;
  readonly storeName: string;
  readonly oldPasswordProvider: PrivateStoragePasswordProvider;
  readonly newPasswordProvider: PrivateStoragePasswordProvider;
  readonly maxEntries: number;
  readonly shouldProceed?: (key: string) => boolean;
}

const isDecryptionError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('unsupported state') ||
    message.includes('salt mismatch') ||
    message.includes('invalid encrypted data') ||
    message.includes('bad decrypt') ||
    message.includes('unable to authenticate')
  );
};

const rotateStorePassword = async (
  params: RotateStorePasswordParams
): Promise<PasswordRotationResult> => {
  const { dbName, storeName, oldPasswordProvider, newPasswordProvider, maxEntries, shouldProceed } = params;

  const oldPassword = await getPasswordFromProvider(oldPasswordProvider);
  const newPassword = await getPasswordFromProvider(newPasswordProvider);

  const salt = await getOrCreateSalt(dbName, storeName);
  const oldEncryption = new StorageEncryption(oldPassword, salt);
  const newEncryption = new StorageEncryption(newPassword);
  const newSalt = newEncryption.getSalt();

  return withSubLevel<string, string, PasswordRotationResult>(
    dbName,
    storeName,
    async (subLevel) => {
      const entriesToMigrate: { key: string; decryptedValue: string }[] = [];
      let hasMatchingData = false;
      let firstEntryValidated = false;

      for await (const [key, encryptedValue] of subLevel.iterator()) {
        if (key === METADATA_KEY) continue;

        if (entriesToMigrate.length >= maxEntries) {
          throw new Error(
            `Entry count exceeds maximum allowed (${maxEntries}). ` +
            `Use the maxEntries option to increase the limit if needed.`
          );
        }

        if (shouldProceed && shouldProceed(key)) {
          hasMatchingData = true;
        }

        if (!firstEntryValidated) {
          try {
            decryptValue(encryptedValue, oldEncryption, oldPassword);
          } catch (error: unknown) {
            if (isDecryptionError(error)) {
              throw new Error('Old password is incorrect: failed to decrypt existing data', { cause: error });
            }
            throw error;
          }
          firstEntryValidated = true;
        }

        try {
          const decryptedValue = decryptValue(encryptedValue, oldEncryption, oldPassword);
          entriesToMigrate.push({ key, decryptedValue });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(
            `Failed to decrypt entry "${key}": ${errorMessage}. ` +
            `Successfully processed ${entriesToMigrate.length} entries before failure.`,
            { cause: error }
          );
        }
      }

      if (entriesToMigrate.length === 0) {
        return { entriesMigrated: 0 };
      }

      if (shouldProceed && !hasMatchingData) {
        return { entriesMigrated: 0 };
      }

      const operations: { type: 'put'; key: string; value: string }[] = [];
      for (const { key, decryptedValue } of entriesToMigrate) {
        try {
          const encryptedValue = newEncryption.encrypt(decryptedValue);
          operations.push({ type: 'put', key, value: encryptedValue });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(
            `Failed to re-encrypt entry "${key}": ${errorMessage}. ` +
            `Original data is still encrypted with old password.`,
            { cause: error }
          );
        }
      }

      const metadata = {
        salt: newSalt.toString('hex'),
        version: 1
      };
      operations.push({ type: 'put', key: METADATA_KEY, value: JSON.stringify(metadata) });

      try {
        await subLevel.batch(operations);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(
          `Failed to write re-encrypted data: ${errorMessage}. ` +
          `Your data may be in an inconsistent state. ` +
          `Keep both old and new passwords until you can verify data integrity.`,
          { cause: error }
        );
      }

      return { entriesMigrated: entriesToMigrate.length };
    }
  );
};

const subLevelMaybeGet = async <K, V>(
  dbName: string,
  levelName: string,
  key: K,
  passwordProvider: PrivateStoragePasswordProvider
): Promise<V | null> => {
  await waitForRotationLock(dbName, levelName);
  const encryption = await getOrCreateEncryption(dbName, levelName, passwordProvider);

  return withSubLevel<K, string, V | null>(dbName, levelName, async (subLevel) => {
    try {
      const encryptedValue = await subLevel.get(key);

      if (encryptedValue === undefined) {
        return null;
      }

      let decryptedValue: string;

      if (StorageEncryption.isEncrypted(encryptedValue)) {
        const version = StorageEncryption.getVersion(encryptedValue);
        if (version === 1) {
          const password = await getPasswordFromProvider(passwordProvider);
          decryptedValue = encryption.decryptWithPassword(encryptedValue, password);
          const reEncrypted = encryption.encrypt(decryptedValue);
          await subLevel.put(key, reEncrypted);
        } else {
          decryptedValue = encryption.decrypt(encryptedValue);
        }
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
  await waitForRotationLock(dbName, levelName);
  const encryption = await getOrCreateEncryption(dbName, levelName, passwordProvider);

  return withSubLevel<K, string, Map<K, V>>(dbName, levelName, async (subLevel) => {
    const entries = new Map<K, V>();
    let password: string | null = null;

    for await (const [key, encryptedValue] of subLevel.iterator()) {
      if (key === METADATA_KEY) {
        continue;
      }

      let decryptedValue: string;
      let needsReEncryption = false;

      if (StorageEncryption.isEncrypted(encryptedValue)) {
        const version = StorageEncryption.getVersion(encryptedValue);
        if (version === 1) {
          if (password === null) {
            password = await getPasswordFromProvider(passwordProvider);
          }
          decryptedValue = encryption.decryptWithPassword(encryptedValue, password);
          needsReEncryption = true;
        } else {
          decryptedValue = encryption.decrypt(encryptedValue);
        }
      } else {
        decryptedValue = encryptedValue;
        needsReEncryption = true;
      }

      if (needsReEncryption) {
        const reEncrypted = encryption.encrypt(decryptedValue);
        await subLevel.put(key, reEncrypted);
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

/**
 * Internal structure of the decrypted signing key export payload.
 * Includes metadata to ensure it's authenticated by the encryption.
 */
interface SigningKeyPayload {
  readonly version: number;
  readonly exportedAt: string;
  readonly keyCount: number;
  readonly keys: Record<ContractAddress, SigningKey>;
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

/**
 * Validates a custom signing key export password meets minimum requirements.
 */
const validateSigningKeyExportPassword = (password: string): void => {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new SigningKeyExportError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
    );
  }
};

const BROWSER_WARNING_KEY = '__midnight_browser_warning_shown__';

const isBrowserEnvironment = (): boolean => {
  const global = globalThis as Record<string, unknown>;
  return typeof globalThis !== 'undefined' &&
    'window' in globalThis &&
    global.window !== undefined &&
    'document' in globalThis &&
    global.document !== undefined;
};

const getSessionStorage = (): Storage | undefined => {
  if (typeof globalThis !== 'undefined' && 'sessionStorage' in globalThis) {
    return (globalThis as Record<string, unknown>).sessionStorage as Storage | undefined;
  }
  return undefined;
};

/**
 * Shows a warning about browser storage risks.
 * Only shows once per session using sessionStorage.
 */
const showBrowserWarning = (): void => {
  if (!isBrowserEnvironment()) {
    return;
  }

  try {
    const storage = getSessionStorage();
    if (storage) {
      if (storage.getItem(BROWSER_WARNING_KEY)) {
        return;
      }
      storage.setItem(BROWSER_WARNING_KEY, 'true');
    }
  } catch (error: unknown) {
    console.debug(
      'MIDNIGHT: Could not access sessionStorage for warning deduplication:',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }

  console.warn(
    `⚠️ MIDNIGHT: Private state and signing keys are stored in browser storage.\n` +
    `Clearing browser cache or storage will permanently destroy this data.\n` +
    `For assets with real-world value, this may result in irreversible financial loss.\n` +
    `Use exportPrivateStates() and exportSigningKeys() to create backups.`
  );
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
  config: Partial<LevelPrivateStateProviderConfig> & Pick<LevelPrivateStateProviderConfig, 'privateStoragePasswordProvider' | 'accountId'>
): PrivateStateProvider<PSI, PS> & {
  invalidateEncryptionCache(): void;
  changePassword(
    oldPasswordProvider: PrivateStoragePasswordProvider,
    newPasswordProvider: PrivateStoragePasswordProvider,
    options?: PasswordRotationOptions
  ): Promise<PasswordRotationResult>;
  changeSigningKeysPassword(
    oldPasswordProvider: PrivateStoragePasswordProvider,
    newPasswordProvider: PrivateStoragePasswordProvider,
    options?: PasswordRotationOptions
  ): Promise<PasswordRotationResult>;
} => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  if (!config.privateStoragePasswordProvider) {
    throw new Error(
      'privateStoragePasswordProvider is required.\n' +
      'Provide a function that returns a strong, secret password (minimum 16 characters).'
    );
  }

  if (!config.accountId || config.accountId.trim().length === 0) {
    throw new Error(
      'accountId is required.\n' +
      'Provide an account identifier (e.g., wallet address) to scope storage and prevent cross-account data access.'
    );
  }

  const passwordProvider: PrivateStoragePasswordProvider = config.privateStoragePasswordProvider;

  const scopedPrivateStateLevelName = getScopedLevelName(fullConfig.privateStateStoreName, config.accountId);
  const scopedSigningKeyLevelName = getScopedLevelName(fullConfig.signingKeyStoreName, config.accountId);

  showBrowserWarning();

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
        scopedPrivateStateLevelName,
        scopedKey,
        passwordProvider
      );
    },
    async remove(privateStateId: PSI): Promise<void> {
      await waitForRotationLock(fullConfig.midnightDbName, scopedPrivateStateLevelName);
      const scopedKey = getScopedKey(privateStateId);
      return withSubLevel<string, string, void>(fullConfig.midnightDbName, scopedPrivateStateLevelName, (subLevel) =>
        subLevel.del(scopedKey)
      );
    },
    async set(privateStateId: PSI, state: PS): Promise<void> {
      await waitForRotationLock(fullConfig.midnightDbName, scopedPrivateStateLevelName);
      const scopedKey = getScopedKey(privateStateId);
      const encryption = await getOrCreateEncryption(
        fullConfig.midnightDbName,
        scopedPrivateStateLevelName,
        passwordProvider
      );
      const serialized = superjson.stringify(state);
      const encrypted = encryption.encrypt(serialized);

      return withSubLevel<string, string, void>(fullConfig.midnightDbName, scopedPrivateStateLevelName, (subLevel) =>
        subLevel.put(scopedKey, encrypted)
      );
    },
    async clear(): Promise<void> {
      if (contractAddress === null) {
        throw new Error('Contract address not set. Call setContractAddress() before accessing private state.');
      }
      return withSubLevel(fullConfig.midnightDbName, scopedPrivateStateLevelName, (subLevel) => subLevel.clear());
    },
    getSigningKey(address: ContractAddress): Promise<SigningKey | null> {
      return subLevelMaybeGet<ContractAddress, SigningKey>(
        fullConfig.midnightDbName,
        scopedSigningKeyLevelName,
        address,
        passwordProvider
      );
    },
    async removeSigningKey(address: ContractAddress): Promise<void> {
      await waitForRotationLock(fullConfig.midnightDbName, scopedSigningKeyLevelName);
      return withSubLevel<ContractAddress, string, void>(
        fullConfig.midnightDbName,
        scopedSigningKeyLevelName,
        (subLevel) => subLevel.del(address)
      );
    },
    async setSigningKey(address: ContractAddress, signingKey: SigningKey): Promise<void> {
      await waitForRotationLock(fullConfig.midnightDbName, scopedSigningKeyLevelName);
      const encryption = await getOrCreateEncryption(
        fullConfig.midnightDbName,
        scopedSigningKeyLevelName,
        passwordProvider
      );
      const serialized = superjson.stringify(signingKey);
      const encrypted = encryption.encrypt(serialized);

      return withSubLevel<ContractAddress, string, void>(
        fullConfig.midnightDbName,
        scopedSigningKeyLevelName,
        (subLevel) => subLevel.put(address, encrypted)
      );
    },
    clearSigningKeys(): Promise<void> {
      return withSubLevel(fullConfig.midnightDbName, scopedSigningKeyLevelName, (subLevel) => subLevel.clear());
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
        scopedPrivateStateLevelName,
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
    },

    async exportSigningKeys(options?: ExportSigningKeysOptions): Promise<SigningKeyExport> {
      const maxKeys = options?.maxKeys ?? MAX_EXPORT_SIGNING_KEYS;

      if (options?.password !== undefined) {
        validateSigningKeyExportPassword(options.password);
      }

      const exportPassword = options?.password ?? await getPasswordFromProvider(passwordProvider);

      const allKeys = await getAllEntries<ContractAddress, SigningKey>(
        fullConfig.midnightDbName,
        scopedSigningKeyLevelName,
        passwordProvider
      );

      if (allKeys.size === 0) {
        throw new SigningKeyExportError('No signing keys to export');
      }

      if (allKeys.size > maxKeys) {
        throw new SigningKeyExportError(
          `Too many keys to export (${allKeys.size}). Maximum allowed: ${maxKeys}`
        );
      }

      const payload: SigningKeyPayload = {
        version: CURRENT_EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        keyCount: allKeys.size,
        keys: Object.fromEntries(allKeys.entries()) as Record<ContractAddress, SigningKey>
      };

      const exportEncryption = new StorageEncryption(exportPassword);
      const encryptedPayload = exportEncryption.encrypt(JSON.stringify(payload));

      return {
        format: 'midnight-signing-key-export',
        encryptedPayload,
        salt: exportEncryption.getSalt().toString('hex')
      };
    },

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

      if (options?.password !== undefined) {
        validateSigningKeyExportPassword(options.password);
      }

      const importPassword = options?.password ?? await getPasswordFromProvider(passwordProvider);

      let payload: SigningKeyPayload;
      try {
        const salt = Buffer.from(exportData.salt, 'hex');
        const importEncryption = new StorageEncryption(importPassword, salt);
        const decryptedJson = importEncryption.decrypt(exportData.encryptedPayload);
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
        let conflictCount = 0;
        for (const address of addresses) {
          const existing = await this.getSigningKey(address);
          if (existing !== null) {
            conflictCount++;
          }
        }
        if (conflictCount > 0) {
          throw new ImportConflictError(conflictCount, 'signing key');
        }
      }

      let imported = 0;
      let skipped = 0;
      let overwritten = 0;

      for (const address of addresses) {
        const signingKey = payload.keys[address];
        const existingKey = await this.getSigningKey(address);

        if (existingKey !== null) {
          if (conflictStrategy === 'skip') {
            skipped++;
            continue;
          } else if (conflictStrategy === 'overwrite') {
            overwritten++;
          }
        }

        await this.setSigningKey(address, signingKey);

        if (existingKey === null) {
          imported++;
        }
      }

      return { imported, skipped, overwritten };
    },

    async changePassword(
      oldPasswordProvider: PrivateStoragePasswordProvider,
      newPasswordProvider: PrivateStoragePasswordProvider,
      options?: PasswordRotationOptions
    ): Promise<PasswordRotationResult> {
      if (contractAddress === null) {
        throw new Error('Contract address not set. Call setContractAddress() before changing password.');
      }

      const lockKey = `${fullConfig.midnightDbName}:${scopedPrivateStateLevelName}`;
      const prefix = `${contractAddress}:`;

      return withPasswordRotationLock(lockKey, async () => {
        const result = await rotateStorePassword({
          dbName: fullConfig.midnightDbName,
          storeName: scopedPrivateStateLevelName,
          oldPasswordProvider,
          newPasswordProvider,
          maxEntries: options?.maxEntries ?? DEFAULT_MAX_ROTATION_ENTRIES,
          shouldProceed: (key) => key.startsWith(prefix)
        });

        invalidateEncryptionCacheForDb(
          fullConfig.midnightDbName,
          scopedPrivateStateLevelName,
          scopedSigningKeyLevelName
        );

        return result;
      });
    },

    async changeSigningKeysPassword(
      oldPasswordProvider: PrivateStoragePasswordProvider,
      newPasswordProvider: PrivateStoragePasswordProvider,
      options?: PasswordRotationOptions
    ): Promise<PasswordRotationResult> {
      const lockKey = `${fullConfig.midnightDbName}:${scopedSigningKeyLevelName}`;

      return withPasswordRotationLock(lockKey, async () => {
        const result = await rotateStorePassword({
          dbName: fullConfig.midnightDbName,
          storeName: scopedSigningKeyLevelName,
          oldPasswordProvider,
          newPasswordProvider,
          maxEntries: options?.maxEntries ?? DEFAULT_MAX_ROTATION_ENTRIES
        });

        invalidateEncryptionCacheForDb(
          fullConfig.midnightDbName,
          scopedPrivateStateLevelName,
          scopedSigningKeyLevelName
        );

        return result;
      });
    },

    invalidateEncryptionCache(): void {
      invalidateEncryptionCacheForDb(
        fullConfig.midnightDbName,
        scopedPrivateStateLevelName,
        scopedSigningKeyLevelName
      );
    }
  };
};

export interface MigrationResult {
  readonly privateStatesMigrated: number;
  readonly signingKeysMigrated: number;
}

const migrateSublevel = async (
  dbName: string,
  oldLevelName: string,
  newLevelName: string
): Promise<number> => {
  const level = new Level(dbName, { createIfMissing: true });

  try {
    await level.open();

    const oldSubLevel = level.sublevel<string, string>(oldLevelName, {
      valueEncoding: 'utf-8'
    });
    const newSubLevel = level.sublevel<string, string>(newLevelName, {
      valueEncoding: 'utf-8'
    });

    try {
      await oldSubLevel.open();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to open source sublevel "${oldLevelName}": ${errorMessage}. ` +
        `Ensure no other process is accessing the database.`,
        { cause: error }
      );
    }

    try {
      await newSubLevel.open();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to open target sublevel "${newLevelName}": ${errorMessage}. ` +
        `Ensure no other process is accessing the database.`,
        { cause: error }
      );
    }

    let count = 0;
    const operations: { type: 'put'; key: string; value: string }[] = [];

    try {
      for await (const [key, value] of oldSubLevel.iterator()) {
        operations.push({ type: 'put', key, value });
        count++;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to read data from source sublevel "${oldLevelName}" after ${count} entries: ${errorMessage}. ` +
        `Migration incomplete. Source data is unchanged.`,
        { cause: error }
      );
    }

    if (operations.length > 0) {
      try {
        await newSubLevel.batch(operations);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(
          `Failed to write ${operations.length} entries to target sublevel "${newLevelName}": ${errorMessage}. ` +
          `Migration incomplete. Target sublevel may contain partial data. ` +
          `Source data at "${oldLevelName}" is unchanged.`,
          { cause: error }
        );
      }
    }

    await newSubLevel.close();
    await oldSubLevel.close();

    return count;
  } finally {
    try {
      await level.close();
    } catch {
      // Don't mask the original error - just ignore the close failure
    }
  }
};

/**
 * Migrates existing unscoped private state and signing key data to account-scoped sublevels.
 *
 * This function copies data from the legacy unscoped locations to the new account-scoped
 * locations. The original data is preserved (not deleted) to allow for safe rollback if needed.
 * To remove old data after successful migration, manually clear the unscoped sublevels.
 *
 * Note: Running this function multiple times is safe but will re-copy all data, overwriting
 * any changes made in the scoped location since the last migration.
 */
export const migrateToAccountScoped = async (
  config: Partial<LevelPrivateStateProviderConfig> & Pick<LevelPrivateStateProviderConfig, 'accountId'>
): Promise<MigrationResult> => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  if (!config.accountId || config.accountId.trim().length === 0) {
    throw new Error('accountId is required for migration');
  }

  const scopedPrivateStateLevelName = getScopedLevelName(
    fullConfig.privateStateStoreName,
    config.accountId
  );
  const scopedSigningKeyLevelName = getScopedLevelName(
    fullConfig.signingKeyStoreName,
    config.accountId
  );

  let privateStatesMigrated: number;

  try {
    privateStatesMigrated = await migrateSublevel(
      fullConfig.midnightDbName,
      fullConfig.privateStateStoreName,
      scopedPrivateStateLevelName
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      `Migration failed during private states copy: ${errorMessage}. ` +
      `No data has been migrated. Source data is unchanged.`,
      { cause: error }
    );
  }

  let signingKeysMigrated: number;

  try {
    signingKeysMigrated = await migrateSublevel(
      fullConfig.midnightDbName,
      fullConfig.signingKeyStoreName,
      scopedSigningKeyLevelName
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      `Migration failed during signing keys copy: ${errorMessage}. ` +
      `WARNING: ${privateStatesMigrated} private states were already migrated to scoped location. ` +
      `Signing keys remain at original location. Manual intervention may be required.`,
      { cause: error }
    );
  }

  return { privateStatesMigrated, signingKeysMigrated };
};
