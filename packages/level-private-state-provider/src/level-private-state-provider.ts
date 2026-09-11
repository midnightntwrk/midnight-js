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

import type { ContractAddress, SigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
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
import { isValidSigningKey, validatePassword } from '@midnight-ntwrk/midnight-js-utils';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, randomBytes } from '@noble/hashes/utils.js';
import { type AbstractLevel, type AbstractSublevel } from 'abstract-level';
import { Buffer } from 'buffer';
import { Level } from 'level';
import * as superjson from 'superjson';

import type { CryptoBackendType } from './crypto-backend';
import {
  decryptValue,
  getPasswordFromProvider,
  type PrivateStoragePasswordProvider,
  StorageEncryption
} from './storage-encryption';

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
   *
   * The password must satisfy the strength policy enforced by `validatePassword`
   * from `@midnight-ntwrk/midnight-js-utils`:
   * - minimum 16 characters
   * - at least 3 of: uppercase, lowercase, digits, special characters
   * - no more than 3 consecutive identical characters
   * - no sequential patterns of length 4+ (e.g. `1234`, `abcd`)
   *
   * The same policy is applied to custom passwords passed to
   * {@link PrivateStateProvider.exportPrivateStates} / `exportSigningKeys` and
   * their `importPrivateStates` / `importSigningKeys` counterparts. Violations
   * surface as `PasswordValidationError` on storage paths, or wrapped as
   * `PrivateStateExportError` / `SigningKeyExportError` (with `cause`) on
   * export/import paths.
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
  readonly cryptoBackend?: CryptoBackendType;
  readonly levelFactory?: LevelFactory;
}

export type DatabaseLevel = AbstractLevel<string | Buffer | Uint8Array, string, string>;

export type LevelFactory = (dbName: string) => DatabaseLevel;

/**
 * A store as this provider uses it: string keys, string values. Keys that are
 * branded strings, such as `ContractAddress`, widen to `string` on the way in.
 */
type StringSubLevel = AbstractSublevel<DatabaseLevel, string | Uint8Array | Buffer, string, string>;

interface StorageContext {
  readonly dbName: string;
  readonly createLevel: LevelFactory;
  readonly cryptoBackend?: CryptoBackendType;
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
  const data = new TextEncoder().encode(accountId);
  return bytesToHex(sha256(data)).substring(0, ACCOUNT_ID_HASH_LENGTH);
};

const getScopedLevelName = (baseLevelName: string, accountId: string): string => {
  const hashedAccountId = hashAccountId(accountId);
  return `${baseLevelName}:${hashedAccountId}`;
};

// Level extends AbstractLevel but TypeScript can't prove assignability
// due to invariance in AbstractSublevel/AbstractBatchOperation generics.
// The cast is safe: Level<string, string> truly implements DatabaseLevel.
const defaultLevelFactory: LevelFactory = (dbName: string) =>
  new Level(dbName, { createIfMissing: true }) as DatabaseLevel;

/** Tail of the pending operation chain for each database, keyed by database name. */
const dbAccessQueues = new Map<string, Promise<void>>();

/**
 * How long one queued operation may run before it is abandoned.
 *
 * Without a bound, a single operation that never settles - a `levelFactory`
 * whose `open()` hangs, a stalled iterator - would wedge every later operation
 * on that database for the lifetime of the process, with no error to diagnose.
 */
const DB_OPERATION_TIMEOUT_MS = 300000; // 5 minutes

const withOperationTimeout = async <A>(dbName: string, operation: () => Promise<A>): Promise<A> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error(
              `Timed out after ${DB_OPERATION_TIMEOUT_MS}ms operating on private state database "${dbName}". ` +
              `The database handle appears stuck. Operations queued behind it have been released, so the ` +
              `next one may fail to open until that handle is released.`
            )
          );
        }, DB_OPERATION_TIMEOUT_MS);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Serializes access to one database, so that overlapping callers queue instead
 * of colliding.
 *
 * Every operation opens its own database handle and closes it again. On the
 * Node.js path (`classic-level`) LevelDB grants the database directory to a
 * single holder, so a second `open()` - or an `open()` racing another
 * operation's `close()` - fails with `LEVEL_DATABASE_NOT_OPEN`. The browser
 * path (`browser-level`, IndexedDB) takes no such lock, but serializing there
 * is still what makes a read-modify-write sequence deterministic. The cost is
 * that throughput is one operation per database at a time.
 *
 * The queue slot is claimed synchronously, before this function's first `await`.
 * That is what makes queue order equal call order, so `set(k, v)` followed by
 * `remove(k)` applies in that order even when neither is awaited. Callers must
 * therefore reach this function without awaiting anything first - work that
 * needs the database, such as resolving an encryption key from the stored salt,
 * belongs inside `operation`, which runs on the already-open handle.
 *
 * The map is module-level because the resource it guards is process-wide: a
 * per-provider map could not see a second provider opening the same database.
 * Each caller deletes only its own tail, so an earlier operation's cleanup
 * cannot drop a later one's entry.
 *
 * Two limitations. Keying is by the configured name verbatim, so two configs
 * naming one directory differently (`'db'` and `'./db'`) are not serialized
 * against each other. And access from separate processes cannot be serialized
 * at all - it still contends on the operating system lock.
 *
 * Not reentrant: entering the lock for a database that already holds it
 * deadlocks. Each operation is bounded by {@link DB_OPERATION_TIMEOUT_MS}, so a
 * stuck operation surfaces as an error instead of hanging the queue forever.
 */
const withDbLock = async <A>(dbName: string, operation: () => Promise<A>): Promise<A> => {
  const bounded = (): Promise<A> => withOperationTimeout(dbName, operation);
  const pending = dbAccessQueues.get(dbName);
  const current = pending === undefined ? bounded() : pending.then(bounded);
  // The stored tail must never reject, because a rejected tail would reject
  // every operation chained behind it. The caller still receives the real
  // outcome through `current`.
  const settled = current.then(
    () => undefined,
    () => undefined
  );
  dbAccessQueues.set(dbName, settled);

  try {
    return await current;
  } finally {
    if (dbAccessQueues.get(dbName) === settled) {
      dbAccessQueues.delete(dbName);
    }
  }
};

const describeOpenFailure = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return 'Unknown error';
  }
  // abstract-level reports every open failure as the same
  // `LEVEL_DATABASE_NOT_OPEN` error, so the reason is one level down.
  return error.cause instanceof Error ? error.cause.message : error.message;
};

const openDatabase = async (ctx: StorageContext): Promise<DatabaseLevel> => {
  const level = ctx.createLevel(ctx.dbName);
  try {
    await level.open();
    return level;
  } catch (error: unknown) {
    throw new Error(
      `Failed to open private state database "${ctx.dbName}": ${describeOpenFailure(error)}. ` +
      `Possible causes: another process holds the database, ` +
      `insufficient file permissions, or a corrupted store.`,
      { cause: error }
    );
  }
};

const closeDatabase = async (
  subLevel: { close(): Promise<void> },
  level: DatabaseLevel
): Promise<void> => {
  // `level.close()` has to run even when closing the sublevel fails: an
  // unclosed handle keeps the database locked for the rest of the process.
  try {
    await subLevel.close();
  } finally {
    await level.close();
  }
};

const withSubLevel = <A>(
  ctx: StorageContext,
  levelName: string,
  thunk: (subLevel: StringSubLevel) => Promise<A>,
): Promise<A> =>
  withDbLock(ctx.dbName, async () => {
    const level = await openDatabase(ctx);
    const subLevel = level.sublevel<string, string>(levelName, {
      valueEncoding: 'utf-8'
    });

    let result: A;
    try {
      await subLevel.open();
      result = await thunk(subLevel);
    } catch (error: unknown) {
      const closeError = await closeDatabase(subLevel, level).then(
        () => undefined,
        (failure: unknown) => failure
      );
      if (closeError !== undefined) {
        // Both failures matter: the operation error explains what the caller asked for,
        // and the close error means the handle still holds the database.
        throw new AggregateError(
          [error, closeError],
          `Operation on private state database "${ctx.dbName}" failed, and the database handle ` +
          `could not be closed afterwards. The database stays locked for the rest of this process.`,
          { cause: error }
        );
      }
      throw error;
    }

    // On the success path a close failure is reported rather than ignored:
    // it can mean the write never reached disk.
    await closeDatabase(subLevel, level);
    return result;
  });

const METADATA_KEY = '__midnight_encryption_metadata__';

const DEFAULT_MAX_ROTATION_ENTRIES = 10000;

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

/**
 * Reads the stored salt, creating and persisting one when the store has none.
 *
 * Takes an already-open sublevel rather than a {@link StorageContext}, so that
 * it runs on the handle its caller has open instead of queueing a second
 * open/close cycle of its own. That is what lets a caller claim its queue slot
 * before doing any database work - see {@link withDbLock}.
 */
const readOrCreateSalt = async (subLevel: StringSubLevel): Promise<Buffer> => {
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

  const salt = Buffer.from(randomBytes(32));
  const metadata = {
    salt: salt.toString('hex'),
    version: 1
  };
  await subLevel.put(METADATA_KEY, JSON.stringify(metadata));
  return salt;
};

/**
 * Resolves the encryption for a store from the salt it currently holds.
 *
 * Runs inside the caller's database lock, so the salt it reads cannot change
 * between here and the write that uses the resulting key. That is what keeps a
 * password rotation from landing between the two.
 */
const resolveEncryption = async (
  subLevel: StringSubLevel,
  cacheKey: string,
  passwordProvider: PrivateStoragePasswordProvider,
  cryptoBackend?: CryptoBackendType,
): Promise<StorageEncryption> => {
  const salt = await readOrCreateSalt(subLevel);
  const saltHex = salt.toString('hex');

  const cached = encryptionCache.get(cacheKey);
  if (cached && cached.saltHex === saltHex) {
    const password = await getPasswordFromProvider(passwordProvider);
    if (await cached.encryption.verifyPassword(password)) {
      return cached.encryption;
    }
    const encryption = await StorageEncryption.create(password, { existingSalt: salt, cryptoBackend });
    encryptionCache.set(cacheKey, { encryption, saltHex });
    return encryption;
  }

  const password = await getPasswordFromProvider(passwordProvider);
  const encryption = await StorageEncryption.create(password, { existingSalt: salt, cryptoBackend });
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

interface RotateStorePasswordParams {
  readonly ctx: StorageContext;
  readonly storeName: string;
  readonly oldPasswordProvider: PrivateStoragePasswordProvider;
  readonly newPasswordProvider: PrivateStoragePasswordProvider;
  readonly maxEntries: number;
  readonly shouldProceed?: (key: string) => boolean;
}

const isDecryptionError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;

  if ('name' in error && error.name === 'OperationError') {
    return true;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('unsupported state') ||
    message.includes('salt mismatch') ||
    message.includes('invalid encrypted data') ||
    message.includes('bad decrypt') ||
    message.includes('invalid tag') ||
    message.includes('unable to authenticate')
  );
};

const rotateStorePassword = async (
  params: RotateStorePasswordParams
): Promise<PasswordRotationResult> => {
  const { ctx, storeName, oldPasswordProvider, newPasswordProvider, maxEntries, shouldProceed } = params;

  return withSubLevel<PasswordRotationResult>(
    ctx,
    storeName,
    async (subLevel) => {
      // Resolved inside the lock, on the salt this store holds right now, so a
      // concurrent write cannot slip in between reading the salt and rewriting it.
      const oldPassword = await getPasswordFromProvider(oldPasswordProvider);
      const newPassword = await getPasswordFromProvider(newPasswordProvider);

      const salt = await readOrCreateSalt(subLevel);
      const oldEncryption = await StorageEncryption.create(oldPassword, { existingSalt: salt, cryptoBackend: ctx.cryptoBackend });
      const newEncryption = await StorageEncryption.create(newPassword, { cryptoBackend: ctx.cryptoBackend });
      const newSalt = newEncryption.getSalt();

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
            await decryptValue(encryptedValue, oldEncryption, oldPassword);
          } catch (error: unknown) {
            if (isDecryptionError(error)) {
              throw new Error('Old password is incorrect: failed to decrypt existing data', { cause: error });
            }
            throw error;
          }
          firstEntryValidated = true;
        }

        try {
          const decryptedValue = await decryptValue(encryptedValue, oldEncryption, oldPassword);
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
          const encryptedValue = await newEncryption.encrypt(decryptedValue);
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
    },
  );
};

const subLevelMaybeGet = <K extends string, V>(
  ctx: StorageContext,
  levelName: string,
  key: K,
  passwordProvider: PrivateStoragePasswordProvider,
): Promise<V | null> =>
  withSubLevel<V | null>(ctx, levelName, async (subLevel) => {
    const encryption = await resolveEncryption(
      subLevel,
      `${ctx.dbName}:${levelName}`,
      passwordProvider,
      ctx.cryptoBackend
    );

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
          decryptedValue = await encryption.decryptWithPassword(encryptedValue, password);
          const reEncrypted = await encryption.encrypt(decryptedValue);
          await subLevel.put(key, reEncrypted);
        } else {
          decryptedValue = await encryption.decrypt(encryptedValue);
        }
      } else {
        decryptedValue = encryptedValue;
        const reEncrypted = await encryption.encrypt(encryptedValue);
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

/**
 * Iterate all key-value pairs in a sublevel, excluding metadata keys.
 */
const getAllEntries = <K extends string, V>(
  ctx: StorageContext,
  levelName: string,
  passwordProvider: PrivateStoragePasswordProvider,
): Promise<Map<K, V>> =>
  withSubLevel<Map<K, V>>(ctx, levelName, async (subLevel) => {
    const encryption = await resolveEncryption(
      subLevel,
      `${ctx.dbName}:${levelName}`,
      passwordProvider,
      ctx.cryptoBackend
    );
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
          decryptedValue = await encryption.decryptWithPassword(encryptedValue, password);
          needsReEncryption = true;
        } else {
          decryptedValue = await encryption.decrypt(encryptedValue);
        }
      } else {
        decryptedValue = encryptedValue;
        needsReEncryption = true;
      }

      if (needsReEncryption) {
        const reEncrypted = await encryption.encrypt(decryptedValue);
        await subLevel.put(key, reEncrypted);
      }

      const value = superjson.parse<V>(decryptedValue);
      entries.set(key as K, value);
    }

    return entries;
  });

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

const validateExportPassword = (password: string): void => {
  try {
    validatePassword(password);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid export password';
    throw new PrivateStateExportError(message, { cause: error });
  }
};

const validateSigningKeyExportPassword = (password: string): void => {
  try {
    validatePassword(password);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid export password';
    throw new SigningKeyExportError(message, { cause: error });
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

const validateSigningKeyValue = (value: unknown): void => {
  if (!isValidSigningKey(value)) {
    throw new InvalidExportFormatError('Invalid signing key value');
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
  invalidateEncryptionCache(): Promise<void>;
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
  const ctx: StorageContext = {
    dbName: fullConfig.midnightDbName,
    createLevel: fullConfig.levelFactory ?? defaultLevelFactory,
    cryptoBackend: config.cryptoBackend,
  };

  const scopedNames = {
    privateState: getScopedLevelName(fullConfig.privateStateStoreName, config.accountId),
    signingKey: getScopedLevelName(fullConfig.signingKeyStoreName, config.accountId),
  };

  showBrowserWarning();

  let contractAddress: ContractAddress | null = null;

  const getScopedKey = (privateStateId: PSI): string => {
    if (contractAddress === null) {
      throw new Error('Contract address not set. Call setContractAddress() before accessing private state.');
    }
    return `${contractAddress}:${privateStateId}`;
  };

  return {
    /** {@inheritDoc PrivateStateProvider.setContractAddress} */
    setContractAddress(address: ContractAddress): void {
      contractAddress = address;
    },
    /** {@inheritDoc PrivateStateProvider.get} */
    async get(privateStateId: PSI): Promise<PS | null> {
      const { privateState } = scopedNames;
      const scopedKey = getScopedKey(privateStateId);
      return subLevelMaybeGet<string, PS>(ctx, privateState, scopedKey, passwordProvider);
    },
    /** {@inheritDoc PrivateStateProvider.remove} */
    async remove(privateStateId: PSI): Promise<void> {
      const { privateState } = scopedNames;
      const scopedKey = getScopedKey(privateStateId);
      return withSubLevel<void>(ctx, privateState, (subLevel) =>
        subLevel.del(scopedKey),
      );
    },
    /** {@inheritDoc PrivateStateProvider.set} */
    async set(privateStateId: PSI, state: PS): Promise<void> {
      const { privateState } = scopedNames;
      const scopedKey = getScopedKey(privateStateId);
      const serialized = superjson.stringify(state);

      return withSubLevel<void>(ctx, privateState, async (subLevel) => {
        const encryption = await resolveEncryption(
          subLevel,
          `${ctx.dbName}:${privateState}`,
          passwordProvider,
          ctx.cryptoBackend
        );
        await subLevel.put(scopedKey, await encryption.encrypt(serialized));
      });
    },
    /** {@inheritDoc PrivateStateProvider.clear} */
    async clear(): Promise<void> {
      if (contractAddress === null) {
        throw new Error('Contract address not set. Call setContractAddress() before accessing private state.');
      }
      const { privateState } = scopedNames;
      return withSubLevel(ctx, privateState, (subLevel) => subLevel.clear());
    },
    /** {@inheritDoc PrivateStateProvider.getSigningKey} */
    async getSigningKey(address: ContractAddress): Promise<SigningKey | null> {
      const { signingKey } = scopedNames;
      return subLevelMaybeGet<ContractAddress, SigningKey>(ctx, signingKey, address, passwordProvider);
    },
    /** {@inheritDoc PrivateStateProvider.removeSigningKey} */
    async removeSigningKey(address: ContractAddress): Promise<void> {
      const { signingKey } = scopedNames;
      return withSubLevel<void>(ctx, signingKey, (subLevel) =>
        subLevel.del(address),
      );
    },
    /** {@inheritDoc PrivateStateProvider.setSigningKey} */
    async setSigningKey(address: ContractAddress, signingKey: SigningKey): Promise<void> {
      const { signingKey: signingKeyLevelName } = scopedNames;
      const serialized = superjson.stringify(signingKey);

      return withSubLevel<void>(ctx, signingKeyLevelName, async (subLevel) => {
        const encryption = await resolveEncryption(
          subLevel,
          `${ctx.dbName}:${signingKeyLevelName}`,
          passwordProvider,
          ctx.cryptoBackend
        );
        await subLevel.put(address, await encryption.encrypt(serialized));
      });
    },
    /** {@inheritDoc PrivateStateProvider.clearSigningKeys} */
    async clearSigningKeys(): Promise<void> {
      const { signingKey } = scopedNames;
      return withSubLevel(ctx, signingKey, (subLevel) => subLevel.clear());
    },

    /** {@inheritDoc PrivateStateProvider.exportPrivateStates} */
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
      const { privateState } = scopedNames;
      const allStates = await getAllEntries<string, PS>(ctx, privateState, passwordProvider);

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
      const exportEncryption = await StorageEncryption.create(exportPassword, { cryptoBackend: ctx.cryptoBackend });
      const encryptedPayload = await exportEncryption.encrypt(JSON.stringify(payload));

      return {
        format: 'midnight-private-state-export',
        encryptedPayload,
        salt: exportEncryption.getSalt().toString('hex')
      };
    },

    /** {@inheritDoc PrivateStateProvider.importPrivateStates} */
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
        const importEncryption = await StorageEncryption.create(importPassword, { existingSalt: salt, cryptoBackend: ctx.cryptoBackend });
        const decryptedJson = await importEncryption.decrypt(exportData.encryptedPayload);
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

    /** {@inheritDoc PrivateStateProvider.exportSigningKeys} */
    async exportSigningKeys(options?: ExportSigningKeysOptions): Promise<SigningKeyExport> {
      const maxKeys = options?.maxKeys ?? MAX_EXPORT_SIGNING_KEYS;

      if (options?.password !== undefined) {
        validateSigningKeyExportPassword(options.password);
      }

      const exportPassword = options?.password ?? await getPasswordFromProvider(passwordProvider);

      const { signingKey: scopedSigningKey } = scopedNames;
      const allKeys = await getAllEntries<ContractAddress, SigningKey>(ctx, scopedSigningKey, passwordProvider);

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

      const exportEncryption = await StorageEncryption.create(exportPassword, { cryptoBackend: ctx.cryptoBackend });
      const encryptedPayload = await exportEncryption.encrypt(JSON.stringify(payload));

      return {
        format: 'midnight-signing-key-export',
        encryptedPayload,
        salt: exportEncryption.getSalt().toString('hex')
      };
    },

    /** {@inheritDoc PrivateStateProvider.importSigningKeys} */
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
        const importEncryption = await StorageEncryption.create(importPassword, { existingSalt: salt, cryptoBackend: ctx.cryptoBackend });
        const decryptedJson = await importEncryption.decrypt(exportData.encryptedPayload);
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

      for (const address of addresses) {
        validateSigningKeyValue(payload.keys[address]);
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

      const { privateState, signingKey } = scopedNames;
      const lockKey = `${ctx.dbName}:${privateState}`;
      const prefix = `${contractAddress}:`;

      return withPasswordRotationLock(lockKey, async () => {
        const result = await rotateStorePassword({
          ctx,
          storeName: privateState,
          oldPasswordProvider,
          newPasswordProvider,
          maxEntries: options?.maxEntries ?? DEFAULT_MAX_ROTATION_ENTRIES,
          shouldProceed: (key) => key.startsWith(prefix),
        });

        invalidateEncryptionCacheForDb(ctx.dbName, privateState, signingKey);

        return result;
      });
    },

    async changeSigningKeysPassword(
      oldPasswordProvider: PrivateStoragePasswordProvider,
      newPasswordProvider: PrivateStoragePasswordProvider,
      options?: PasswordRotationOptions
    ): Promise<PasswordRotationResult> {
      const { privateState, signingKey } = scopedNames;
      const lockKey = `${ctx.dbName}:${signingKey}`;

      return withPasswordRotationLock(lockKey, async () => {
        const result = await rotateStorePassword({
          ctx,
          storeName: signingKey,
          oldPasswordProvider,
          newPasswordProvider,
          maxEntries: options?.maxEntries ?? DEFAULT_MAX_ROTATION_ENTRIES,
        });

        invalidateEncryptionCacheForDb(ctx.dbName, privateState, signingKey);

        return result;
      });
    },

    /**
     * Clears the cached encryption key from process memory.
     *
     * @remarks
     * This method is only available on the object returned by
     * {@link levelPrivateStateProvider}; it is not part of the
     * {@link PrivateStateProvider} interface contract. Code that needs to
     * call it must hold a reference to the level-provider value rather than
     * to the interface.
     *
     * The provider caches the PBKDF2-derived AES key in memory after the first
     * read or write, because re-deriving it on every operation (600,000
     * iterations) would be prohibitively slow. Call this method when the
     * application reaches a logical security boundary — for example:
     *
     * - user logout
     * - session timeout
     * - app lock / screen lock
     * - before producing any in-process snapshot that could capture
     *   heap contents (e.g., a debug heap dump or core dump)
     *
     * This method does **not** protect on-disk backups of the LevelDB store:
     * the encrypted store is already on disk, the in-memory key is not part
     * of the backup, and clearing the cache before copying the database
     * files changes nothing about the resulting backup. To produce a
     * portable, separately-passworded backup, use
     * {@link PrivateStateProvider.exportPrivateStates} instead.
     *
     * Subsequent operations will request the password from the configured
     * provider and re-derive the key on first access.
     *
     * **Limitations.** JavaScript does not guarantee immediate erasure of
     * memory due to immutable strings, non-deterministic garbage collection,
     * and V8 runtime internals (string interning, JIT artifacts, function
     * call stack copies). This method removes the application-level cache
     * reference, but residual copies of key material may remain in runtime
     * memory until reclaimed by GC. For threat models requiring cryptographic
     * memory hygiene at the OS level, use a hardware-backed key store outside
     * the JavaScript runtime.
     */
    async invalidateEncryptionCache(): Promise<void> {
      const { privateState, signingKey } = scopedNames;
      invalidateEncryptionCacheForDb(ctx.dbName, privateState, signingKey);
    }
  };
};

export interface MigrationResult {
  readonly privateStatesMigrated: number;
  readonly signingKeysMigrated: number;
}

const migrateSublevel = (
  ctx: StorageContext,
  oldLevelName: string,
  newLevelName: string,
): Promise<number> =>
  withDbLock(ctx.dbName, async () => {
    const level = await openDatabase(ctx);

    try {
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
  });

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
  const ctx: StorageContext = {
    dbName: fullConfig.midnightDbName,
    createLevel: fullConfig.levelFactory ?? defaultLevelFactory,
  };

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
    privateStatesMigrated = await migrateSublevel(ctx, fullConfig.privateStateStoreName, scopedPrivateStateLevelName);
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
    signingKeysMigrated = await migrateSublevel(ctx, fullConfig.signingKeyStoreName, scopedSigningKeyLevelName);
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
