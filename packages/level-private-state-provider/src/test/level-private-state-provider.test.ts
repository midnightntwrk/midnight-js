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

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { type ContractAddress, sampleSigningKey } from '@midnight-ntwrk/compact-runtime';
import { type UnprovenTransaction } from '@midnight-ntwrk/ledger-v7';
import {
  CorruptedExportDataError,
  ImportConflictError,
  type PrivateStateExport,
  PrivateStateExportError,
  UnsupportedExportVersionError,
  WrongExportPasswordError
} from '@midnight-ntwrk/midnight-js-types';
import * as crypto from 'crypto';

import { levelPrivateStateProvider } from '../index';

describe('Level Private State Provider', (): void => {
  const TEST_PASSWORD = 'test-storage-password-for-unit-tests-only';
  const testConfig = {
    privateStoragePasswordProvider: () => TEST_PASSWORD
  };

  afterAll(async () => {
    await fs.rm(path.join('.', 'midnight-level-db'), { recursive: true, force: true });
  });

  // tests adapted from https://github.com/solydhq/typed-local-store

  const uint8Array0 = new Uint8Array(crypto.randomBytes(32));
  const uint8Array1 = new Uint8Array(crypto.randomBytes(32));
  const buffer0 = Buffer.from(crypto.randomBytes(32));
  const buffer1 = Buffer.from(crypto.randomBytes(32));

  const objectValue = {
    stringValue: 'innerValue',
    numberValue: 2,
    booleanValue: false,
    stringArrayValue: ['D', 'E', 'F'],
    numberArrayValue: [3, 4, 5],
    booleanArrayValue: [false, true, false],
    uint8ArrayValue: uint8Array0,
    uint8ArrayArrayValue: [uint8Array0, uint8Array1],
    bufferValue: buffer0,
    bufferArrayValue: [buffer0, buffer1]
  };

  const testStates = {
    stringValue: 'value',
    numberValue: 1,
    booleanValue: true,
    objectValue,
    uint8ArrayValue: uint8Array0,
    bufferValue: buffer0,
    stringArrayValue: ['A', 'B', 'C'],
    numberArrayValue: [0, 1, 2],
    booleanArrayValue: [true, false, true],
    objectValues: [objectValue, objectValue, objectValue],
    uint8ArrayArrayValue: [uint8Array0, uint8Array1],
    bufferArrayValue: [buffer0, buffer1]
  };

  type PID = keyof typeof testStates;
  type PS = (typeof testStates)[PID];

  test("'get' returns null if key does not exist", async () => {
    const db = levelPrivateStateProvider<PID, PS>(testConfig);
    const value = await db.get('stringValue');
    expect(value).toBeNull();
  });

  test("'getSigningKey' returns null if the signing key does not exist", async () => {
    const db = levelPrivateStateProvider<PID, PS>(testConfig);
    const value = await db.getSigningKey('booleanValue');
    expect(value).toBeNull();
  });

  async function testSetGet<K extends PID>(key: K): Promise<void> {
    const stateRepo = levelPrivateStateProvider<PID, PS>(testConfig);
    await stateRepo.set(key, testStates[key]);
    const value = await stateRepo.get(key);
    expect(value).toEqual(testStates[key]);
  }

  test("'get' functions do not interfere", async () => {
    await testSetGet('booleanArrayValue');
    const db = levelPrivateStateProvider<PID, PS>(testConfig);
    const value = await db.getSigningKey('booleanArrayValue');
    expect(value).toBeNull();
  });

  async function testSetGetSigningKey<K extends PID>(key: K): Promise<void> {
    const stateRepo = levelPrivateStateProvider<PID, PS>(testConfig);
    const signingKey = sampleSigningKey();
    await stateRepo.setSigningKey(key, signingKey);
    const value = await stateRepo.getSigningKey(key);
    expect(value).toEqual(signingKey);
  }

  describe("LevelDB PrivateStateProvider 'get' then 'set' returns original value", () => {
    test('for booleans', () => {
      return testSetGet('booleanValue');
    });
    test('for boolean arrays', () => {
      return testSetGet('booleanArrayValue');
    });
    test('for strings', () => {
      return testSetGet('stringValue');
    });
    test('for string arrays', () => {
      return testSetGet('stringArrayValue');
    });
    test('for numbers', () => {
      return testSetGet('numberValue');
    });
    test('for number arrays', () => {
      return testSetGet('numberArrayValue');
    });
    test('for objects', () => {
      return testSetGet('objectValue');
    });
    test('for object arrays', async () => {
      return testSetGet('objectValues');
    });
    test('for Uint8 arrays', async () => {
      return testSetGet('uint8ArrayValue');
    });
    test('for Uint8 array arrays', async () => {
      return testSetGet('uint8ArrayArrayValue');
    });
    test('for buffers', async () => {
      return testSetGet('bufferValue');
    });
    test('for buffer arrays', async () => {
      return testSetGet('bufferArrayValue');
    });
    test('for signing keys', async () => {
      return testSetGetSigningKey('bufferArrayValue');
    });
  });

  test("'set' functions do not interfere", async () => {
    await testSetGet('booleanArrayValue');
    const db = levelPrivateStateProvider<PID, PS>(testConfig);
    await db.setSigningKey('booleanArrayValue', sampleSigningKey());
    const value = await db.get('booleanValue');
    expect(value).toEqual(testStates.booleanValue);
  });

  test("'remove' deletes private states", async () => {
    await testSetGet('stringValue');
    const db = levelPrivateStateProvider<PID, PS>(testConfig);
    await db.remove('stringValue');
    const value = await db.get('stringValue');
    expect(value).toBeNull();
  });

  test("'removeSigningKey' deletes signing keys", async () => {
    await testSetGetSigningKey('stringValue');
    const db = levelPrivateStateProvider<PID, PS>(testConfig);
    await db.removeSigningKey('stringValue');
    const value = await db.getSigningKey('stringValue');
    expect(value).toBeNull();
  });

  test("'remove' functions do not interfere", async () => {
    await testSetGet('stringValue');
    await testSetGetSigningKey('stringValue');
    const db = levelPrivateStateProvider<PID, PS>(testConfig);
    await db.removeSigningKey('stringValue');
    const value = await db.get('stringValue');
    expect(value).toEqual(testStates.stringValue);
  });

  test("'clear' deletes private states", async () => {
    await testSetGet('stringValue');
    await testSetGet('objectValue');
    const db = levelPrivateStateProvider<PID, PS>(testConfig);
    await db.clear();
    const value0 = await db.get('stringValue');
    expect(value0).toBeNull();
    const value2 = await db.get('objectValue');
    expect(value2).toBeNull();
  });

  test("'clearSigningKeys' deletes signing keys", async () => {
    await testSetGetSigningKey('stringValue');
    await testSetGetSigningKey('bufferArrayValue');
    const db = levelPrivateStateProvider<PID, PS>(testConfig);
    await db.clearSigningKeys();
    const value0 = await db.getSigningKey('stringValue');
    expect(value0).toBeNull();
    const value2 = await db.getSigningKey('bufferArrayValue');
    expect(value2).toBeNull();
  });

  test("'clear' functions do not interfere", async () => {
    await testSetGet('stringValue');
    await testSetGet('objectValue');
    await testSetGetSigningKey('stringValue');
    await testSetGetSigningKey('objectValue');
    const db = levelPrivateStateProvider<PID, PS>(testConfig);
    await db.clearSigningKeys();
    const value0 = await db.get('stringValue');
    expect(value0).toEqual(testStates.stringValue);
    const value2 = await db.get('objectValue');
    expect(value2).toEqual(testStates.objectValue);
  });

  test("'get' throws error on non-'LEVEL_NOT_FOUND_ERROR' codes", () => {
    expect.assertions(1);
    return levelPrivateStateProvider<PID, PS>(testConfig)
      .get(null as unknown as PID)
      .catch((e) => expect(e.code).toMatch('LEVEL_INVALID_KEY'));
  });

  test("'getSigningKey' throws error on non-'LEVEL_NOT_FOUND_ERROR' codes", () => {
    expect.assertions(1);
    return levelPrivateStateProvider<PID, PS>(testConfig)
      .getSigningKey(null as unknown as ContractAddress)
      .catch((e) => expect(e.code).toMatch('LEVEL_INVALID_KEY'));
  });

  describe('Password provider configuration', () => {
    test('uses wallet encryption public key when only walletProvider is provided', async () => {
      const mockWallet = {
        getEncryptionPublicKey: () => TEST_PASSWORD,
        getCoinPublicKey: () => 'mock-coin-public-key',
        balanceTx: async () => ({ type: 'NothingToProve' as const, transaction: {} as unknown as UnprovenTransaction })
      };

      const db = levelPrivateStateProvider<PID, PS>({ walletProvider: mockWallet });
      await db.set('stringValue', testStates.stringValue);
      const value = await db.get('stringValue');
      expect(value).toEqual(testStates.stringValue);
    });

    test('throws error when neither walletProvider nor privateStoragePasswordProvider is provided', () => {
      expect(() => {
        levelPrivateStateProvider<PID, PS>({});
      }).toThrow('Either privateStoragePasswordProvider or walletProvider must be provided');
    });

    test('throws error when both privateStoragePasswordProvider and walletProvider are provided', () => {
      const mockWallet = {
        getEncryptionPublicKey: () => TEST_PASSWORD,
        getCoinPublicKey: () => 'mock-coin-public-key',
        balanceTx: async () => ({ type: 'NothingToProve' as const, transaction: {} as unknown as UnprovenTransaction})
      };

      expect(() => {
        levelPrivateStateProvider<PID, PS>({
          walletProvider: mockWallet,
          privateStoragePasswordProvider: () => TEST_PASSWORD
        });
      }).toThrow('Cannot provide both privateStoragePasswordProvider and walletProvider');
    });
  });

  describe('Export/Import', () => {
    const EXPORT_PASSWORD = 'export-test-password-1234';

    beforeEach(async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      await db.clear();
      await db.clearSigningKeys();
    });

    test('exports and imports private states correctly', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      await db.set('stringValue', testStates.stringValue);
      await db.set('objectValue', testStates.objectValue);

      const exportData = await db.exportPrivateStates();

      expect(exportData.version).toBe(1);
      expect(exportData.stateCount).toBe(2);
      expect(typeof exportData.encryptedPayload).toBe('string');
      expect(typeof exportData.salt).toBe('string');
      expect(exportData.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Clear and reimport
      await db.clear();
      const result = await db.importPrivateStates(exportData);

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.overwritten).toBe(0);

      expect(await db.get('stringValue')).toEqual(testStates.stringValue);
      expect(await db.get('objectValue')).toEqual(testStates.objectValue);
    });

    test('exports with custom password and imports with same password', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      await db.set('stringValue', testStates.stringValue);

      const exportData = await db.exportPrivateStates({ password: EXPORT_PASSWORD });
      await db.clear();

      const result = await db.importPrivateStates(exportData, { password: EXPORT_PASSWORD });
      expect(result.imported).toBe(1);
      expect(await db.get('stringValue')).toEqual(testStates.stringValue);
    });

    test('throws WrongExportPasswordError on wrong password', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      await db.set('stringValue', testStates.stringValue);

      const exportData = await db.exportPrivateStates({ password: EXPORT_PASSWORD });
      await db.clear();

      await expect(
        db.importPrivateStates(exportData, { password: 'wrong-password-12345' })
      ).rejects.toThrow(WrongExportPasswordError);
    });

    test('throws PrivateStateExportError when no states to export', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);

      await expect(db.exportPrivateStates()).rejects.toThrow(PrivateStateExportError);
    });

    test('throws ImportConflictError when conflict strategy is error (default)', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      await db.set('stringValue', testStates.stringValue);

      const exportData = await db.exportPrivateStates();

      await expect(db.importPrivateStates(exportData)).rejects.toThrow(ImportConflictError);
    });

    test('skips conflicts when strategy is skip', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      await db.set('stringValue', testStates.stringValue);

      const exportData = await db.exportPrivateStates();

      // Modify the state
      await db.set('stringValue', 'modified');

      const result = await db.importPrivateStates(exportData, { conflictStrategy: 'skip' });

      expect(result.skipped).toBe(1);
      expect(result.imported).toBe(0);
      expect(result.overwritten).toBe(0);
      expect(await db.get('stringValue')).toBe('modified');
    });

    test('overwrites conflicts when strategy is overwrite', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      await db.set('stringValue', testStates.stringValue);

      const exportData = await db.exportPrivateStates();

      // Modify the state
      await db.set('stringValue', 'modified');

      const result = await db.importPrivateStates(exportData, { conflictStrategy: 'overwrite' });

      expect(result.overwritten).toBe(1);
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(0);
      expect(await db.get('stringValue')).toEqual(testStates.stringValue);
    });

    test('throws UnsupportedExportVersionError for unknown version', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);

      const badExport = {
        version: 99,
        exportedAt: new Date().toISOString(),
        stateCount: 1,
        encryptedPayload: 'invalid',
        salt: 'abc123'
      };

      await expect(
        db.importPrivateStates(badExport as unknown as PrivateStateExport)
      ).rejects.toThrow(UnsupportedExportVersionError);
    });

    test('throws CorruptedExportDataError for missing fields', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);

      const badExport = {
        version: 1,
        exportedAt: new Date().toISOString(),
        stateCount: 1
        // missing encryptedPayload and salt
      };

      await expect(
        db.importPrivateStates(badExport as unknown as PrivateStateExport)
      ).rejects.toThrow(CorruptedExportDataError);
    });

    test('does NOT export signing keys', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      await db.set('stringValue', testStates.stringValue);
      const signingKey = sampleSigningKey();
      await db.setSigningKey('stringValue' as unknown as ContractAddress, signingKey);

      const exportData = await db.exportPrivateStates();

      // Verify export only has 1 state (the private state, not signing key)
      expect(exportData.stateCount).toBe(1);

      // Create new db instance, import, and verify signing key is NOT present
      await db.clear();
      await db.clearSigningKeys();

      await db.importPrivateStates(exportData);

      expect(await db.get('stringValue')).toEqual(testStates.stringValue);
      expect(await db.getSigningKey('stringValue' as unknown as ContractAddress)).toBeNull();
    });

    test('preserves complex types (Buffer, Uint8Array) through export/import', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      await db.set('bufferValue', testStates.bufferValue);
      await db.set('uint8ArrayValue', testStates.uint8ArrayValue);
      await db.set('objectValue', testStates.objectValue);

      const exportData = await db.exportPrivateStates();
      await db.clear();
      await db.importPrivateStates(exportData);

      expect(await db.get('bufferValue')).toEqual(testStates.bufferValue);
      expect(await db.get('uint8ArrayValue')).toEqual(testStates.uint8ArrayValue);
      expect(await db.get('objectValue')).toEqual(testStates.objectValue);
    });

    test('handles mixed import scenarios correctly', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      await db.set('stringValue', testStates.stringValue);
      await db.set('numberValue', testStates.numberValue);

      const exportData = await db.exportPrivateStates();

      // Remove one, keep one, add one new
      await db.remove('stringValue');
      await db.set('booleanValue', testStates.booleanValue);

      const result = await db.importPrivateStates(exportData, { conflictStrategy: 'skip' });

      // stringValue should be imported (was removed)
      // numberValue should be skipped (still exists)
      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.overwritten).toBe(0);

      expect(await db.get('stringValue')).toEqual(testStates.stringValue);
      expect(await db.get('numberValue')).toEqual(testStates.numberValue);
      expect(await db.get('booleanValue')).toEqual(testStates.booleanValue);
    });
  });
});
