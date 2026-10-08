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

import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { COMMON_ERROR_CODES, ConfigurationError, InvalidArgumentError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import {
  PrivateStateDecryptionError,
  PrivateStateLimitExceededError,
  PrivateStateStorageError
} from '@midnight-ntwrk/midnight-js-types';
import { Level } from 'level';
import * as superjson from 'superjson';
import { vi } from 'vitest';

import { type DatabaseLevel, levelPrivateStateProvider, migrateToAccountScoped } from '../index';
import { StorageEncryption } from '../storage-encryption';

type ErrorClass = abstract new (...args: never[]) => Error;
type SubLevel = ReturnType<DatabaseLevel['sublevel']>;

const captureError = async (action: () => unknown): Promise<unknown> => {
  try {
    await action();
  } catch (error) {
    return error;
  }
  return undefined;
};

const expectThrownAs = (error: unknown, errorClass: ErrorClass, message: string): Error => {
  expect(error).toBeInstanceOf(errorClass);
  if (!(error instanceof Error)) {
    throw error;
  }
  expect(error.message).toBe(message);
  return error;
};

const PASSWORD = 'Test-Storage-Pass8!';
const OLD_PASSWORD = 'Old-Password-Test8!';
const NEW_PASSWORD = 'New-Password-Test8!';
const ACCOUNT_ID = 'errors-test-account';
const CONTRACT_ADDRESS = 'errors-test-contract' as ContractAddress;
const DB_NAME = 'midnight-errors-test-db';
const METADATA_KEY = '__midnight_encryption_metadata__';

const scopedName = (store: string): string =>
  `${store}:${createHash('sha256').update(ACCOUNT_ID).digest('hex').substring(0, 32)}`;

const config = {
  midnightDbName: DB_NAME,
  privateStoragePasswordProvider: () => OLD_PASSWORD,
  accountId: ACCOUNT_ID
};

const createLevel = (dbName: string): DatabaseLevel => new Level(dbName, { createIfMissing: true }) as DatabaseLevel;

const factoryFaultingSublevel =
  (fault: (sublevel: SubLevel, name: string, callIndex: number) => void) =>
  (dbName: string): DatabaseLevel => {
    const level = createLevel(dbName);
    const original = level.sublevel.bind(level);
    let calls = 0;
    level.sublevel = ((name: string, options: Parameters<typeof original>[1]) => {
      const sublevel = original(name, options);
      fault(sublevel, name, calls++);
      return sublevel;
    }) as typeof level.sublevel;
    return level;
  };

const putDirectly = async (sublevelName: string, entries: Record<string, string>): Promise<void> => {
  const level = new Level(DB_NAME, { createIfMissing: true });
  const sublevel = level.sublevel<string, string>(sublevelName, { valueEncoding: 'utf-8' });
  await level.open();
  await sublevel.open();
  try {
    for (const [key, value] of Object.entries(entries)) {
      await sublevel.put(key, value);
    }
  } finally {
    await sublevel.close();
    await level.close();
  }
};

const tamperDirectly = async (sublevelName: string, key: string): Promise<void> => {
  const level = new Level(DB_NAME, { createIfMissing: true });
  const sublevel = level.sublevel<string, string>(sublevelName, { valueEncoding: 'utf-8' });
  await level.open();
  await sublevel.open();
  try {
    const stored = Buffer.from(await sublevel.get(key) ?? '', 'base64');
    stored[stored.length - 1] ^= 0xff;
    await sublevel.put(key, stored.toString('base64'));
  } finally {
    await sublevel.close();
    await level.close();
  }
};

const seedUnscopedPrivateState = async (): Promise<void> => {
  const encryption = await StorageEncryption.create(PASSWORD);
  await putDirectly('private-states', {
    [METADATA_KEY]: JSON.stringify({ salt: encryption.getSalt().toString('hex'), version: 2 }),
    [`${CONTRACT_ADDRESS}:key`]: await encryption.encrypt(superjson.stringify('value'))
  });
};

describe('level-private-state-provider error classes', () => {
  beforeEach(async () => {
    await fs.rm(path.join('.', DB_NAME), { recursive: true, force: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await fs.rm(path.join('.', DB_NAME), { recursive: true, force: true });
  });

  describe('ConfigurationError', () => {
    test('refuses a missing privateStoragePasswordProvider', () => {
      const act = () =>
        // @ts-expect-error - intentionally testing missing required field
        levelPrivateStateProvider({ accountId: ACCOUNT_ID });

      let error: unknown;
      try {
        act();
      } catch (caught) {
        error = caught;
      }

      expectThrownAs(
        error,
        ConfigurationError,
        'privateStoragePasswordProvider is required.\n' +
          'Provide a function that returns a strong, secret password (minimum 16 characters).'
      );
    });

    test('refuses a blank accountId', () => {
      let error: unknown;
      try {
        levelPrivateStateProvider({ privateStoragePasswordProvider: () => PASSWORD, accountId: '  ' });
      } catch (caught) {
        error = caught;
      }

      expectThrownAs(
        error,
        ConfigurationError,
        'accountId is required.\n' +
          'Provide an account identifier (e.g., wallet address) to scope storage and prevent cross-account data access.'
      );
    });

    test.each([
      [
        'get',
        (db: ReturnType<typeof levelPrivateStateProvider<string, string>>) => db.get('id'),
        'Contract address not set. Call setContractAddress() before accessing private state.'
      ],
      [
        'clear',
        (db: ReturnType<typeof levelPrivateStateProvider<string, string>>) => db.clear(),
        'Contract address not set. Call setContractAddress() before accessing private state.'
      ],
      [
        'exportPrivateStates',
        (db: ReturnType<typeof levelPrivateStateProvider<string, string>>) => db.exportPrivateStates(),
        'Contract address not set. Call setContractAddress() before exporting private states.'
      ],
      [
        'importPrivateStates',
        (db: ReturnType<typeof levelPrivateStateProvider<string, string>>) =>
          db.importPrivateStates({ format: 'midnight-private-state-export', encryptedPayload: '', salt: '' }),
        'Contract address not set. Call setContractAddress() before importing private states.'
      ],
      [
        'changePassword',
        (db: ReturnType<typeof levelPrivateStateProvider<string, string>>) =>
          db.changePassword(() => OLD_PASSWORD, () => NEW_PASSWORD),
        'Contract address not set. Call setContractAddress() before changing password.'
      ]
    ])('%s refuses to run before setContractAddress', async (_method, call, message) => {
      const db = levelPrivateStateProvider<string, string>(config);

      const error = await captureError(() => call(db));

      expectThrownAs(error, ConfigurationError, message);
    });

    test('migrateToAccountScoped refuses a blank accountId', async () => {
      const error = await captureError(() => migrateToAccountScoped({ midnightDbName: DB_NAME, accountId: '' }));

      expectThrownAs(error, ConfigurationError, 'accountId is required for migration');
    });
  });

  describe('PrivateStateStorageError', () => {
    test('reports a database that fails to open and keeps the cause', async () => {
      const provider = levelPrivateStateProvider<string, string>({
        ...config,
        levelFactory: (dbName: string): DatabaseLevel => {
          const level = createLevel(dbName);
          level.open = () =>
            Promise.reject(new Error('Database failed to open', { cause: new Error('disk on fire') }));
          return level;
        }
      });
      provider.setContractAddress(CONTRACT_ADDRESS);

      const error = await captureError(() => provider.set('id', 'value'));

      const thrown = expectThrownAs(
        error,
        PrivateStateStorageError,
        `Failed to open private state database "${DB_NAME}": disk on fire. ` +
          'Possible causes: another process holds the database, ' +
          'insufficient file permissions, or a corrupted store.'
      );
      expect(thrown.cause).toBeInstanceOf(Error);
    });

    test('reports a re-encryption failure during password rotation', async () => {
      const db = levelPrivateStateProvider<string, string>(config);
      db.setContractAddress(CONTRACT_ADDRESS);
      await db.set('key1', 'value1');
      vi.spyOn(StorageEncryption.prototype, 'encrypt').mockRejectedValue(new Error('encrypt boom'));

      const error = await captureError(() => db.changePassword(() => OLD_PASSWORD, () => NEW_PASSWORD));

      const thrown = expectThrownAs(
        error,
        PrivateStateStorageError,
        `Failed to re-encrypt entry "${CONTRACT_ADDRESS}:key1": encrypt boom. ` +
          'Original data is still encrypted with old password.'
      );
      expect(thrown.cause).toBeInstanceOf(Error);
    });

    test('reports a failed write of re-encrypted data during password rotation', async () => {
      const db = levelPrivateStateProvider<string, string>({
        ...config,
        levelFactory: factoryFaultingSublevel((sublevel) => {
          vi.spyOn(sublevel, 'batch').mockRejectedValue(new Error('batch boom'));
        })
      });
      db.setContractAddress(CONTRACT_ADDRESS);
      await db.set('key1', 'value1');

      const error = await captureError(() => db.changePassword(() => OLD_PASSWORD, () => NEW_PASSWORD));

      const thrown = expectThrownAs(
        error,
        PrivateStateStorageError,
        'Failed to write re-encrypted data: batch boom. ' +
          'Your data may be in an inconsistent state. ' +
          'Keep both old and new passwords until you can verify data integrity.'
      );
      expect(thrown.cause).toBeInstanceOf(Error);
    });

    describe('migration', () => {
      const privateStatesTarget = scopedName('private-states');

      test('wraps a failure to open the source sublevel', async () => {
        const error = await captureError(() =>
          migrateToAccountScoped({
            ...config,
            levelFactory: factoryFaultingSublevel((sublevel, name) => {
              if (name === 'private-states') {
                sublevel.open = () => Promise.reject(new Error('open boom'));
              }
            })
          })
        );

        const outer = expectThrownAs(
          error,
          PrivateStateStorageError,
          'Migration failed during private states copy: Failed to open source sublevel "private-states": ' +
            'open boom. Ensure no other process is accessing the database.. ' +
            'No data has been migrated. Source data is unchanged.'
        );
        expectThrownAs(
          outer.cause,
          PrivateStateStorageError,
          'Failed to open source sublevel "private-states": open boom. ' +
            'Ensure no other process is accessing the database.'
        );
      });

      test('wraps a failure to open the target sublevel', async () => {
        const error = await captureError(() =>
          migrateToAccountScoped({
            ...config,
            levelFactory: factoryFaultingSublevel((sublevel, name) => {
              if (name === privateStatesTarget) {
                sublevel.open = () => Promise.reject(new Error('open boom'));
              }
            })
          })
        );

        if (!(error instanceof Error)) {
          throw error;
        }
        expectThrownAs(
          error.cause,
          PrivateStateStorageError,
          `Failed to open target sublevel "${privateStatesTarget}": open boom. ` +
            'Ensure no other process is accessing the database.'
        );
      });

      test('wraps a failure to read the source sublevel', async () => {
        const error = await captureError(() =>
          migrateToAccountScoped({
            ...config,
            levelFactory: factoryFaultingSublevel((sublevel, name) => {
              if (name === 'private-states') {
                sublevel.iterator = () => {
                  throw new Error('read boom');
                };
              }
            })
          })
        );

        if (!(error instanceof Error)) {
          throw error;
        }
        expectThrownAs(
          error.cause,
          PrivateStateStorageError,
          'Failed to read data from source sublevel "private-states" after 0 entries: read boom. ' +
            'Migration incomplete. Source data is unchanged.'
        );
      });

      test('wraps a failure to write the target sublevel', async () => {
        await seedUnscopedPrivateState();

        const error = await captureError(() =>
          migrateToAccountScoped({
            ...config,
            levelFactory: factoryFaultingSublevel((sublevel, name) => {
              if (name === privateStatesTarget) {
                vi.spyOn(sublevel, 'batch').mockRejectedValue(new Error('batch boom'));
              }
            })
          })
        );

        if (!(error instanceof Error)) {
          throw error;
        }
        expectThrownAs(
          error.cause,
          PrivateStateStorageError,
          `Failed to write 2 entries to target sublevel "${privateStatesTarget}": batch boom. ` +
            'Migration incomplete. Target sublevel may contain partial data. ' +
            'Source data at "private-states" is unchanged.'
        );
      });

      test('reports a failed private states copy', async () => {
        const error = await captureError(() =>
          migrateToAccountScoped({
            ...config,
            levelFactory: factoryFaultingSublevel((sublevel, name) => {
              if (name === 'private-states') {
                sublevel.iterator = () => {
                  throw new Error('read boom');
                };
              }
            })
          })
        );

        expectThrownAs(
          error,
          PrivateStateStorageError,
          'Migration failed during private states copy: Failed to read data from source sublevel ' +
            '"private-states" after 0 entries: read boom. Migration incomplete. Source data is unchanged.. ' +
            'No data has been migrated. Source data is unchanged.'
        );
      });

      test('reports a failed signing keys copy and how many private states already moved', async () => {
        const error = await captureError(() =>
          migrateToAccountScoped({
            ...config,
            levelFactory: factoryFaultingSublevel((sublevel, name) => {
              if (name === 'signing-keys') {
                sublevel.iterator = () => {
                  throw new Error('read boom');
                };
              }
            })
          })
        );

        expectThrownAs(
          error,
          PrivateStateStorageError,
          'Migration failed during signing keys copy: Failed to read data from source sublevel ' +
            '"signing-keys" after 0 entries: read boom. Migration incomplete. Source data is unchanged.. ' +
            'WARNING: 0 private states were already migrated to scoped location. ' +
            'Signing keys remain at original location. Manual intervention may be required.'
        );
      });
    });
  });

  describe('PrivateStateLimitExceededError', () => {
    test('refuses a rotation over maxEntries', async () => {
      const db = levelPrivateStateProvider<string, string>(config);
      db.setContractAddress(CONTRACT_ADDRESS);
      for (const key of ['a', 'b', 'c', 'd']) {
        await db.set(key, key);
      }

      const error = await captureError(() =>
        db.changePassword(() => OLD_PASSWORD, () => NEW_PASSWORD, { maxEntries: 3 })
      );

      expectThrownAs(
        error,
        PrivateStateLimitExceededError,
        'Entry count exceeds maximum allowed (3). Use the maxEntries option to increase the limit if needed.'
      );
    });
  });

  describe('a wrong old password', () => {
    test('is reported as InvalidArgumentError (USAGE) and keeps the decryption failure as cause', async () => {
      const db = levelPrivateStateProvider<string, string>(config);
      db.setContractAddress(CONTRACT_ADDRESS);
      await db.set('key1', 'value1');

      const error = await captureError(() => db.changePassword(() => 'Wrong-Password-88!', () => NEW_PASSWORD));

      const thrown = expectThrownAs(
        error,
        InvalidArgumentError,
        'Old password is incorrect: failed to decrypt existing data'
      );
      expect(thrown).toMatchObject({ code: COMMON_ERROR_CODES.INVALID_ARGUMENT, category: 'USAGE' });
      expect(thrown.cause).toBeInstanceOf(Error);
    });
  });

  describe('PrivateStateDecryptionError', () => {
    test('reports a stored value that fails its authentication check', async () => {
      // Arrange
      const db = levelPrivateStateProvider<string, string>(config);
      db.setContractAddress(CONTRACT_ADDRESS);
      await db.set('key1', 'value1');
      await tamperDirectly(scopedName('private-states'), `${CONTRACT_ADDRESS}:key1`);

      // Act
      const error = await captureError(() => db.get('key1'));

      // Assert
      const thrown = expectThrownAs(
        error,
        PrivateStateDecryptionError,
        'Decryption failed: the data was encrypted with a different key or was modified'
      );
      expect(thrown).toMatchObject({ reason: 'wrong-key', category: 'INTEGRITY' });
    });

    test('reports a corrupt first entry during rotation as corrupt data, not as a wrong old password', async () => {
      // Arrange
      const db = levelPrivateStateProvider<string, string>(config);
      db.setContractAddress(CONTRACT_ADDRESS);
      await db.set('key1', 'value1');
      await putDirectly(scopedName('private-states'), {
        [`${CONTRACT_ADDRESS}:key1`]: Buffer.concat([Buffer.from([2]), Buffer.alloc(40)]).toString('base64')
      });

      // Act
      const error = await captureError(() => db.changePassword(() => OLD_PASSWORD, () => NEW_PASSWORD));

      // Assert
      expect(error).toBeInstanceOf(PrivateStateDecryptionError);
      expect(error).not.toBeInstanceOf(InvalidArgumentError);
    });

    test('reports an entry that cannot be decrypted after the first one', async () => {
      const db = levelPrivateStateProvider<string, string>(config);
      db.setContractAddress(CONTRACT_ADDRESS);
      await db.set('key1', 'value1');
      await putDirectly(scopedName('private-states'), { [`${CONTRACT_ADDRESS}:plaintext`]: 'not-encrypted' });

      const error = await captureError(() => db.changePassword(() => OLD_PASSWORD, () => NEW_PASSWORD));

      const thrown = expectThrownAs(
        error,
        PrivateStateDecryptionError,
        `Failed to decrypt entry "${CONTRACT_ADDRESS}:plaintext": ` +
          'Unrecognized or unencrypted data encountered during decryption. ' +
          'Successfully processed 1 entries before failure.'
      );
      expect(thrown.cause).toBeInstanceOf(PrivateStateDecryptionError);
    });
  });
});
