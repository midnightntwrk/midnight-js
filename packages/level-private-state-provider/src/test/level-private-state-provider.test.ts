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

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { type ContractAddress, sampleSigningKey } from '@midnight-ntwrk/compact-runtime';
import {
  ExportDecryptionError,
  ImportConflictError,
  InvalidExportFormatError,
  type PrivateStateExport,
  PrivateStateExportError,
  type SigningKeyExport,
  SigningKeyExportError
} from '@midnight-ntwrk/midnight-js-types';
import * as crypto from 'crypto';
import { Level } from 'level';
import * as superjson from 'superjson';
import { vi } from 'vitest';

import { levelPrivateStateProvider, migrateToAccountScoped } from '../index';
import { StorageEncryption } from '../storage-encryption';

describe('Level Private State Provider', (): void => {
  const TEST_PASSWORD = 'Test-Storage-Pass8!';
  const TEST_CONTRACT_ADDRESS = 'test-contract-address' as ContractAddress;
  const TEST_ACCOUNT_ID = 'test-wallet-address-123';
  const testConfig = {
    privateStoragePasswordProvider: () => TEST_PASSWORD,
    accountId: TEST_ACCOUNT_ID
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
    db.setContractAddress(TEST_CONTRACT_ADDRESS);
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
    stateRepo.setContractAddress(TEST_CONTRACT_ADDRESS);
    await stateRepo.set(key, testStates[key]);
    const value = await stateRepo.get(key);
    expect(value).toEqual(testStates[key]);
  }

  test("'get' functions do not interfere", async () => {
    await testSetGet('booleanArrayValue');
    const db = levelPrivateStateProvider<PID, PS>(testConfig);
    db.setContractAddress(TEST_CONTRACT_ADDRESS);
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
    db.setContractAddress(TEST_CONTRACT_ADDRESS);
    await db.setSigningKey('booleanArrayValue', sampleSigningKey());
    const value = await db.get('booleanValue');
    expect(value).toEqual(testStates.booleanValue);
  });

  test("'remove' deletes private states", async () => {
    await testSetGet('stringValue');
    const db = levelPrivateStateProvider<PID, PS>(testConfig);
    db.setContractAddress(TEST_CONTRACT_ADDRESS);
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
    db.setContractAddress(TEST_CONTRACT_ADDRESS);
    await db.removeSigningKey('stringValue');
    const value = await db.get('stringValue');
    expect(value).toEqual(testStates.stringValue);
  });

  test("'clear' deletes private states", async () => {
    await testSetGet('stringValue');
    await testSetGet('objectValue');
    const db = levelPrivateStateProvider<PID, PS>(testConfig);
    db.setContractAddress(TEST_CONTRACT_ADDRESS);
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
    db.setContractAddress(TEST_CONTRACT_ADDRESS);
    await db.clearSigningKeys();
    const value0 = await db.get('stringValue');
    expect(value0).toEqual(testStates.stringValue);
    const value2 = await db.get('objectValue');
    expect(value2).toEqual(testStates.objectValue);
  });

  test("'get' returns null for non-existent scoped key", async () => {
    const db = levelPrivateStateProvider<PID, PS>(testConfig);
    db.setContractAddress(TEST_CONTRACT_ADDRESS);
    const value = await db.get('nonExistentKey' as PID);
    expect(value).toBeNull();
  });

  test("'getSigningKey' throws error on non-'LEVEL_NOT_FOUND_ERROR' codes", () => {
    expect.assertions(1);
    return levelPrivateStateProvider<PID, PS>(testConfig)
      .getSigningKey(null as unknown as ContractAddress)
      .catch((e) => expect(e.code).toMatch('LEVEL_INVALID_KEY'));
  });

  describe('Password provider configuration', () => {
    test('throws error when privateStoragePasswordProvider is not provided', () => {
      expect(() => {
        // @ts-expect-error - intentionally testing missing required field
        levelPrivateStateProvider<PID, PS>({});
      }).toThrow('privateStoragePasswordProvider is required');
    });

    test('works correctly when privateStoragePasswordProvider is provided', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      db.setContractAddress(TEST_CONTRACT_ADDRESS);
      await db.set('stringValue', testStates.stringValue);
      const value = await db.get('stringValue');
      expect(value).toEqual(testStates.stringValue);
    });
  });

  describe('Contract address scoping', () => {
    const CONTRACT_ADDRESS_A = 'contract-address-a' as ContractAddress;
    const CONTRACT_ADDRESS_B = 'contract-address-b' as ContractAddress;

    test('throws error when get is called without setContractAddress', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      await expect(db.get('stringValue')).rejects.toThrow(
        'Contract address not set. Call setContractAddress() before accessing private state.'
      );
    });

    test('throws error when set is called without setContractAddress', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      await expect(db.set('stringValue', testStates.stringValue)).rejects.toThrow(
        'Contract address not set. Call setContractAddress() before accessing private state.'
      );
    });

    test('throws error when remove is called without setContractAddress', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      await expect(db.remove('stringValue')).rejects.toThrow(
        'Contract address not set. Call setContractAddress() before accessing private state.'
      );
    });

    test('throws error when clear is called without setContractAddress', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      await expect(db.clear()).rejects.toThrow(
        'Contract address not set. Call setContractAddress() before accessing private state.'
      );
    });

    test('allows operations after setContractAddress is called', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      db.setContractAddress(CONTRACT_ADDRESS_A);
      await db.set('stringValue', testStates.stringValue);
      const value = await db.get('stringValue');
      expect(value).toEqual(testStates.stringValue);
    });

    test('provides namespace isolation between different contract addresses', async () => {
      const dbA = levelPrivateStateProvider<PID, PS>(testConfig);
      dbA.setContractAddress(CONTRACT_ADDRESS_A);
      await dbA.set('stringValue', 'value-from-contract-a');

      const dbB = levelPrivateStateProvider<PID, PS>(testConfig);
      dbB.setContractAddress(CONTRACT_ADDRESS_B);
      await dbB.set('stringValue', 'value-from-contract-b');

      const valueA = await dbA.get('stringValue');
      const valueB = await dbB.get('stringValue');

      expect(valueA).toEqual('value-from-contract-a');
      expect(valueB).toEqual('value-from-contract-b');
    });

    test('same stateId with different contract addresses are independent', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);

      db.setContractAddress(CONTRACT_ADDRESS_A);
      await db.set('numberValue', 100);

      db.setContractAddress(CONTRACT_ADDRESS_B);
      const valueBeforeSet = await db.get('numberValue');
      expect(valueBeforeSet).toBeNull();

      await db.set('numberValue', 200);

      db.setContractAddress(CONTRACT_ADDRESS_A);
      const valueA = await db.get('numberValue');
      expect(valueA).toEqual(100);

      db.setContractAddress(CONTRACT_ADDRESS_B);
      const valueB = await db.get('numberValue');
      expect(valueB).toEqual(200);
    });

    test('remove only affects the current contract address scope', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);

      db.setContractAddress(CONTRACT_ADDRESS_A);
      await db.set('booleanValue', true);

      db.setContractAddress(CONTRACT_ADDRESS_B);
      await db.set('booleanValue', false);

      db.setContractAddress(CONTRACT_ADDRESS_A);
      await db.remove('booleanValue');

      const valueA = await db.get('booleanValue');
      expect(valueA).toBeNull();

      db.setContractAddress(CONTRACT_ADDRESS_B);
      const valueB = await db.get('booleanValue');
      expect(valueB).toEqual(false);
    });

    test('signing key operations do not require setContractAddress', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      const signingKey = sampleSigningKey();
      await db.setSigningKey(CONTRACT_ADDRESS_A, signingKey);
      const value = await db.getSigningKey(CONTRACT_ADDRESS_A);
      expect(value).toEqual(signingKey);
    });
  });

  describe('Export/Import', () => {
    const EXPORT_PASSWORD = 'Export-Test-Pass8!';

    beforeEach(async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      db.setContractAddress(TEST_CONTRACT_ADDRESS);
      await db.clear();
      await db.clearSigningKeys();
    });

    test('exports and imports private states correctly', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      db.setContractAddress(TEST_CONTRACT_ADDRESS);
      await db.set('stringValue', testStates.stringValue);
      await db.set('objectValue', testStates.objectValue);

      const exportData = await db.exportPrivateStates();

      expect(exportData.format).toBe('midnight-private-state-export');
      expect(typeof exportData.encryptedPayload).toBe('string');
      expect(typeof exportData.salt).toBe('string');
      expect(exportData.salt).toHaveLength(64); // 32 bytes as hex

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
      db.setContractAddress(TEST_CONTRACT_ADDRESS);
      await db.set('stringValue', testStates.stringValue);

      const exportData = await db.exportPrivateStates({ password: EXPORT_PASSWORD });
      await db.clear();

      const result = await db.importPrivateStates(exportData, { password: EXPORT_PASSWORD });
      expect(result.imported).toBe(1);
      expect(await db.get('stringValue')).toEqual(testStates.stringValue);
    });

    test('throws ExportDecryptionError on wrong password', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      db.setContractAddress(TEST_CONTRACT_ADDRESS);
      await db.set('stringValue', testStates.stringValue);

      const exportData = await db.exportPrivateStates({ password: EXPORT_PASSWORD });
      await db.clear();

      await expect(
        db.importPrivateStates(exportData, { password: 'Wrong-Pass8-Test!!' })
      ).rejects.toThrow(ExportDecryptionError);
    });

    test('throws PrivateStateExportError when no states to export', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      db.setContractAddress(TEST_CONTRACT_ADDRESS);

      await expect(db.exportPrivateStates()).rejects.toThrow(PrivateStateExportError);
    });

    test('throws PrivateStateExportError for short custom password', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      db.setContractAddress(TEST_CONTRACT_ADDRESS);
      await db.set('stringValue', testStates.stringValue);

      await expect(
        db.exportPrivateStates({ password: 'short' })
      ).rejects.toThrow(PrivateStateExportError);
    });

    test('throws PrivateStateExportError for short import password', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      db.setContractAddress(TEST_CONTRACT_ADDRESS);
      await db.set('stringValue', testStates.stringValue);

      const exportData = await db.exportPrivateStates({ password: EXPORT_PASSWORD });
      await db.clear();

      await expect(
        db.importPrivateStates(exportData, { password: 'short' })
      ).rejects.toThrow(PrivateStateExportError);
    });

    test('throws ImportConflictError when conflict strategy is error (default)', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      db.setContractAddress(TEST_CONTRACT_ADDRESS);
      await db.set('stringValue', testStates.stringValue);

      const exportData = await db.exportPrivateStates();

      await expect(db.importPrivateStates(exportData)).rejects.toThrow(ImportConflictError);
    });

    test('ImportConflictError contains count but not state IDs', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      db.setContractAddress(TEST_CONTRACT_ADDRESS);
      await db.set('stringValue', testStates.stringValue);
      await db.set('numberValue', testStates.numberValue);

      const exportData = await db.exportPrivateStates();

      try {
        await db.importPrivateStates(exportData);
        expect.fail('Should have thrown ImportConflictError');
      } catch (error) {
        expect(error).toBeInstanceOf(ImportConflictError);
        const conflictError = error as ImportConflictError;
        expect(conflictError.conflictCount).toBe(2);
        // Verify the error message does NOT contain state IDs
        expect(conflictError.message).not.toContain('stringValue');
        expect(conflictError.message).not.toContain('numberValue');
      }
    });

    test('skips conflicts when strategy is skip', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      db.setContractAddress(TEST_CONTRACT_ADDRESS);
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
      db.setContractAddress(TEST_CONTRACT_ADDRESS);
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

    test('throws InvalidExportFormatError for wrong format identifier', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      db.setContractAddress(TEST_CONTRACT_ADDRESS);

      const badExport = {
        format: 'wrong-format',
        encryptedPayload: 'invalid',
        salt: '0'.repeat(64)
      };

      await expect(
        db.importPrivateStates(badExport as unknown as PrivateStateExport)
      ).rejects.toThrow(InvalidExportFormatError);
    });

    test('throws InvalidExportFormatError for missing fields', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      db.setContractAddress(TEST_CONTRACT_ADDRESS);

      const badExport = {
        format: 'midnight-private-state-export'
        // missing encryptedPayload and salt
      };

      await expect(
        db.importPrivateStates(badExport as unknown as PrivateStateExport)
      ).rejects.toThrow(InvalidExportFormatError);
    });

    test('throws InvalidExportFormatError for invalid salt length', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      db.setContractAddress(TEST_CONTRACT_ADDRESS);

      const badExport = {
        format: 'midnight-private-state-export',
        encryptedPayload: 'invalid',
        salt: 'abc123' // too short
      };

      await expect(
        db.importPrivateStates(badExport as unknown as PrivateStateExport)
      ).rejects.toThrow(InvalidExportFormatError);
    });

    test('throws InvalidExportFormatError for invalid salt characters', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      db.setContractAddress(TEST_CONTRACT_ADDRESS);

      const badExport = {
        format: 'midnight-private-state-export',
        encryptedPayload: 'invalid',
        salt: 'g'.repeat(64) // invalid hex
      };

      await expect(
        db.importPrivateStates(badExport as unknown as PrivateStateExport)
      ).rejects.toThrow(InvalidExportFormatError);
    });

    test('does NOT export signing keys', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      db.setContractAddress(TEST_CONTRACT_ADDRESS);
      await db.set('stringValue', testStates.stringValue);
      const signingKey = sampleSigningKey();
      await db.setSigningKey('stringValue' as unknown as ContractAddress, signingKey);

      const exportData = await db.exportPrivateStates();

      // Create new db instance, import, and verify signing key is NOT present
      await db.clear();
      await db.clearSigningKeys();

      const result = await db.importPrivateStates(exportData);
      expect(result.imported).toBe(1);

      expect(await db.get('stringValue')).toEqual(testStates.stringValue);
      expect(await db.getSigningKey('stringValue' as unknown as ContractAddress)).toBeNull();
    });

    test('preserves complex types (Buffer, Uint8Array) through export/import', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      db.setContractAddress(TEST_CONTRACT_ADDRESS);
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
      db.setContractAddress(TEST_CONTRACT_ADDRESS);
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

    test('enforces maxStates limit on export', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      db.setContractAddress(TEST_CONTRACT_ADDRESS);
      await db.set('stringValue', testStates.stringValue);
      await db.set('numberValue', testStates.numberValue);

      await expect(
        db.exportPrivateStates({ maxStates: 1 })
      ).rejects.toThrow(PrivateStateExportError);
    });

    test('enforces maxStates limit on import', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      db.setContractAddress(TEST_CONTRACT_ADDRESS);
      await db.set('stringValue', testStates.stringValue);
      await db.set('numberValue', testStates.numberValue);

      const exportData = await db.exportPrivateStates();
      await db.clear();

      await expect(
        db.importPrivateStates(exportData, { maxStates: 1 })
      ).rejects.toThrow(InvalidExportFormatError);
    });

    describe('malformed data edge cases', () => {
      const VALID_PASSWORD = 'Valid-Pass8-Test!';

      test('throws ExportDecryptionError for garbage base64 payload', async () => {
        const db = levelPrivateStateProvider<PID, PS>(testConfig);
        db.setContractAddress(TEST_CONTRACT_ADDRESS);

        const badExport: PrivateStateExport = {
          format: 'midnight-private-state-export',
          encryptedPayload: 'dGhpcyBpcyBub3QgdmFsaWQgZW5jcnlwdGVkIGRhdGE=', // "this is not valid encrypted data"
          salt: '0'.repeat(64)
        };

        await expect(
          db.importPrivateStates(badExport, { password: VALID_PASSWORD })
        ).rejects.toThrow(ExportDecryptionError);
      });

      test('throws ExportDecryptionError for payload that decrypts to invalid JSON', async () => {
        const db = levelPrivateStateProvider<PID, PS>(testConfig);
        db.setContractAddress(TEST_CONTRACT_ADDRESS);

        // Create encryption with a known salt and encrypt non-JSON data
        const salt = Buffer.from('0'.repeat(64), 'hex');
        const encryption = new StorageEncryption(VALID_PASSWORD, salt);
        const notJson = encryption.encrypt('this is not JSON');

        const badExport: PrivateStateExport = {
          format: 'midnight-private-state-export',
          encryptedPayload: notJson,
          salt: salt.toString('hex')
        };

        await expect(
          db.importPrivateStates(badExport, { password: VALID_PASSWORD })
        ).rejects.toThrow(ExportDecryptionError);
      });

      test('throws ExportDecryptionError for payload with invalid structure (missing states)', async () => {
        const db = levelPrivateStateProvider<PID, PS>(testConfig);
        db.setContractAddress(TEST_CONTRACT_ADDRESS);

        const salt = Buffer.from('0'.repeat(64), 'hex');
        const encryption = new StorageEncryption(VALID_PASSWORD, salt);
        // Valid JSON but missing required 'states' field
        const invalidPayload = encryption.encrypt(JSON.stringify({
          version: 1,
          exportedAt: new Date().toISOString(),
          stateCount: 0
          // missing 'states' field
        }));

        const badExport: PrivateStateExport = {
          format: 'midnight-private-state-export',
          encryptedPayload: invalidPayload,
          salt: salt.toString('hex')
        };

        await expect(
          db.importPrivateStates(badExport, { password: VALID_PASSWORD })
        ).rejects.toThrow(ExportDecryptionError);
      });

      test('throws ExportDecryptionError for payload with invalid structure (missing version)', async () => {
        const db = levelPrivateStateProvider<PID, PS>(testConfig);
        db.setContractAddress(TEST_CONTRACT_ADDRESS);

        const salt = Buffer.from('0'.repeat(64), 'hex');
        const encryption = new StorageEncryption(VALID_PASSWORD, salt);
        // Valid JSON but missing required 'version' field
        const invalidPayload = encryption.encrypt(JSON.stringify({
          exportedAt: new Date().toISOString(),
          stateCount: 0,
          states: {}
        }));

        const badExport: PrivateStateExport = {
          format: 'midnight-private-state-export',
          encryptedPayload: invalidPayload,
          salt: salt.toString('hex')
        };

        await expect(
          db.importPrivateStates(badExport, { password: VALID_PASSWORD })
        ).rejects.toThrow(ExportDecryptionError);
      });

      test('throws ExportDecryptionError for stateCount mismatch', async () => {
        const db = levelPrivateStateProvider<PID, PS>(testConfig);
        db.setContractAddress(TEST_CONTRACT_ADDRESS);

        const salt = Buffer.from('0'.repeat(64), 'hex');
        const encryption = new StorageEncryption(VALID_PASSWORD, salt);
        // stateCount says 5 but only 1 state present
        const mismatchedPayload = encryption.encrypt(JSON.stringify({
          version: 1,
          exportedAt: new Date().toISOString(),
          stateCount: 5,
          states: {
            'test-id': '{"json":"value"}'
          }
        }));

        const badExport: PrivateStateExport = {
          format: 'midnight-private-state-export',
          encryptedPayload: mismatchedPayload,
          salt: salt.toString('hex')
        };

        await expect(
          db.importPrivateStates(badExport, { password: VALID_PASSWORD })
        ).rejects.toThrow(ExportDecryptionError);
      });

      test('throws InvalidExportFormatError for unsupported version', async () => {
        const db = levelPrivateStateProvider<PID, PS>(testConfig);
        db.setContractAddress(TEST_CONTRACT_ADDRESS);

        const salt = Buffer.from('0'.repeat(64), 'hex');
        const encryption = new StorageEncryption(VALID_PASSWORD, salt);
        const unsupportedVersionPayload = encryption.encrypt(JSON.stringify({
          version: 999,
          exportedAt: new Date().toISOString(),
          stateCount: 0,
          states: {}
        }));

        const badExport: PrivateStateExport = {
          format: 'midnight-private-state-export',
          encryptedPayload: unsupportedVersionPayload,
          salt: salt.toString('hex')
        };

        await expect(
          db.importPrivateStates(badExport, { password: VALID_PASSWORD })
        ).rejects.toThrow(InvalidExportFormatError);
      });

      test('throws error for state values that fail superjson.parse', async () => {
        const db = levelPrivateStateProvider<PID, PS>(testConfig);
        db.setContractAddress(TEST_CONTRACT_ADDRESS);

        const salt = Buffer.from('0'.repeat(64), 'hex');
        const encryption = new StorageEncryption(VALID_PASSWORD, salt);
        // State value is not valid superjson
        const invalidStatePayload = encryption.encrypt(JSON.stringify({
          version: 1,
          exportedAt: new Date().toISOString(),
          stateCount: 1,
          states: {
            'test-id': 'not valid superjson {{{' // Invalid superjson
          }
        }));

        const badExport: PrivateStateExport = {
          format: 'midnight-private-state-export',
          encryptedPayload: invalidStatePayload,
          salt: salt.toString('hex')
        };

        await expect(
          db.importPrivateStates(badExport, { password: VALID_PASSWORD })
        ).rejects.toThrow();
      });

      test('throws ExportDecryptionError for tampered encrypted payload', async () => {
        const db = levelPrivateStateProvider<PID, PS>(testConfig);
        db.setContractAddress(TEST_CONTRACT_ADDRESS);
        await db.set('stringValue', testStates.stringValue);

        const exportData = await db.exportPrivateStates();

        // Tamper with the encrypted payload (flip some bits)
        const tamperedPayload = Buffer.from(exportData.encryptedPayload, 'base64');
        tamperedPayload[tamperedPayload.length - 10] ^= 0xff;

        const tamperedExport: PrivateStateExport = {
          format: 'midnight-private-state-export',
          encryptedPayload: tamperedPayload.toString('base64'),
          salt: exportData.salt
        };

        await expect(db.importPrivateStates(tamperedExport)).rejects.toThrow(ExportDecryptionError);
      });

      test('throws InvalidExportFormatError for empty salt', async () => {
        const db = levelPrivateStateProvider<PID, PS>(testConfig);
        db.setContractAddress(TEST_CONTRACT_ADDRESS);

        const badExport: PrivateStateExport = {
          format: 'midnight-private-state-export',
          encryptedPayload: 'somebase64data',
          salt: ''
        };

        await expect(
          db.importPrivateStates(badExport, { password: VALID_PASSWORD })
        ).rejects.toThrow(InvalidExportFormatError);
      });

      test('throws InvalidExportFormatError for salt with uppercase hex (validates exact format)', async () => {
        const db = levelPrivateStateProvider<PID, PS>(testConfig);
        db.setContractAddress(TEST_CONTRACT_ADDRESS);

        // Uppercase hex should still be valid (the regex allows both cases)
        const uppercaseSalt = 'A'.repeat(64);
        const salt = Buffer.from(uppercaseSalt, 'hex');
        const encryption = new StorageEncryption(VALID_PASSWORD, salt);
        const validPayload = encryption.encrypt(JSON.stringify({
          version: 1,
          exportedAt: new Date().toISOString(),
          stateCount: 0,
          states: {}
        }));

        const exportWithUppercase: PrivateStateExport = {
          format: 'midnight-private-state-export',
          encryptedPayload: validPayload,
          salt: uppercaseSalt
        };

        // Should NOT throw for uppercase hex - it's valid
        await expect(
          db.importPrivateStates(exportWithUppercase, { password: VALID_PASSWORD })
        ).resolves.toEqual({ imported: 0, skipped: 0, overwritten: 0 });
      });
    });
  });

  describe('Signing Key Export/Import', () => {
    const EXPORT_PASSWORD = 'export-test-password-1234';
    const CONTRACT_ADDRESS_1 = 'contract-address-1' as ContractAddress;
    const CONTRACT_ADDRESS_2 = 'contract-address-2' as ContractAddress;

    beforeEach(async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      db.setContractAddress(TEST_CONTRACT_ADDRESS);
      await db.clear();
      await db.clearSigningKeys();
    });

    test('exports and imports signing keys correctly', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      const signingKey1 = sampleSigningKey();
      const signingKey2 = sampleSigningKey();
      await db.setSigningKey(CONTRACT_ADDRESS_1, signingKey1);
      await db.setSigningKey(CONTRACT_ADDRESS_2, signingKey2);

      const exportData = await db.exportSigningKeys();

      expect(exportData.format).toBe('midnight-signing-key-export');
      expect(typeof exportData.encryptedPayload).toBe('string');
      expect(typeof exportData.salt).toBe('string');
      expect(exportData.salt).toHaveLength(64);

      await db.clearSigningKeys();
      const result = await db.importSigningKeys(exportData);

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.overwritten).toBe(0);

      expect(await db.getSigningKey(CONTRACT_ADDRESS_1)).toEqual(signingKey1);
      expect(await db.getSigningKey(CONTRACT_ADDRESS_2)).toEqual(signingKey2);
    });

    test('exports with custom password and imports with same password', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      const signingKey = sampleSigningKey();
      await db.setSigningKey(CONTRACT_ADDRESS_1, signingKey);

      const exportData = await db.exportSigningKeys({ password: EXPORT_PASSWORD });
      await db.clearSigningKeys();

      const result = await db.importSigningKeys(exportData, { password: EXPORT_PASSWORD });
      expect(result.imported).toBe(1);
      expect(await db.getSigningKey(CONTRACT_ADDRESS_1)).toEqual(signingKey);
    });

    test('throws ExportDecryptionError on wrong password', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      const signingKey = sampleSigningKey();
      await db.setSigningKey(CONTRACT_ADDRESS_1, signingKey);

      const exportData = await db.exportSigningKeys({ password: EXPORT_PASSWORD });
      await db.clearSigningKeys();

      await expect(
        db.importSigningKeys(exportData, { password: 'wrong-password-12345' })
      ).rejects.toThrow(ExportDecryptionError);
    });

    test('throws SigningKeyExportError when no keys to export', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);

      await expect(db.exportSigningKeys()).rejects.toThrow(SigningKeyExportError);
    });

    test('throws SigningKeyExportError for short custom password', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      const signingKey = sampleSigningKey();
      await db.setSigningKey(CONTRACT_ADDRESS_1, signingKey);

      await expect(
        db.exportSigningKeys({ password: 'short' })
      ).rejects.toThrow(SigningKeyExportError);
    });

    test('throws SigningKeyExportError for short import password', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      const signingKey = sampleSigningKey();
      await db.setSigningKey(CONTRACT_ADDRESS_1, signingKey);

      const exportData = await db.exportSigningKeys({ password: EXPORT_PASSWORD });
      await db.clearSigningKeys();

      await expect(
        db.importSigningKeys(exportData, { password: 'short' })
      ).rejects.toThrow(SigningKeyExportError);
    });

    test('throws ImportConflictError when conflict strategy is error (default)', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      const signingKey = sampleSigningKey();
      await db.setSigningKey(CONTRACT_ADDRESS_1, signingKey);

      const exportData = await db.exportSigningKeys();

      await expect(db.importSigningKeys(exportData)).rejects.toThrow(ImportConflictError);
    });

    test('ImportConflictError contains count but not addresses', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      await db.setSigningKey(CONTRACT_ADDRESS_1, sampleSigningKey());
      await db.setSigningKey(CONTRACT_ADDRESS_2, sampleSigningKey());

      const exportData = await db.exportSigningKeys();

      try {
        await db.importSigningKeys(exportData);
        expect.fail('Should have thrown ImportConflictError');
      } catch (error) {
        expect(error).toBeInstanceOf(ImportConflictError);
        const conflictError = error as ImportConflictError;
        expect(conflictError.conflictCount).toBe(2);
        expect(conflictError.message).not.toContain('contract-address-1');
        expect(conflictError.message).not.toContain('contract-address-2');
      }
    });

    test('skips conflicts when strategy is skip', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      const originalKey = sampleSigningKey();
      await db.setSigningKey(CONTRACT_ADDRESS_1, originalKey);

      const exportData = await db.exportSigningKeys();

      const newKey = sampleSigningKey();
      await db.removeSigningKey(CONTRACT_ADDRESS_1);
      await db.setSigningKey(CONTRACT_ADDRESS_1, newKey);

      const result = await db.importSigningKeys(exportData, { conflictStrategy: 'skip' });

      expect(result.skipped).toBe(1);
      expect(result.imported).toBe(0);
      expect(result.overwritten).toBe(0);
      expect(await db.getSigningKey(CONTRACT_ADDRESS_1)).toEqual(newKey);
    });

    test('overwrites conflicts when strategy is overwrite', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      const originalKey = sampleSigningKey();
      await db.setSigningKey(CONTRACT_ADDRESS_1, originalKey);

      const exportData = await db.exportSigningKeys();

      const newKey = sampleSigningKey();
      await db.removeSigningKey(CONTRACT_ADDRESS_1);
      await db.setSigningKey(CONTRACT_ADDRESS_1, newKey);

      const result = await db.importSigningKeys(exportData, { conflictStrategy: 'overwrite' });

      expect(result.overwritten).toBe(1);
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(0);
      expect(await db.getSigningKey(CONTRACT_ADDRESS_1)).toEqual(originalKey);
    });

    test('throws InvalidExportFormatError for wrong format identifier', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);

      const badExport = {
        format: 'wrong-format',
        encryptedPayload: 'invalid',
        salt: '0'.repeat(64)
      };

      await expect(
        db.importSigningKeys(badExport as unknown as SigningKeyExport)
      ).rejects.toThrow(InvalidExportFormatError);
    });

    test('throws InvalidExportFormatError for missing fields', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);

      const badExport = {
        format: 'midnight-signing-key-export'
      };

      await expect(
        db.importSigningKeys(badExport as unknown as SigningKeyExport)
      ).rejects.toThrow(InvalidExportFormatError);
    });

    test('throws InvalidExportFormatError for invalid salt length', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);

      const badExport = {
        format: 'midnight-signing-key-export',
        encryptedPayload: 'invalid',
        salt: 'abc123'
      };

      await expect(
        db.importSigningKeys(badExport as unknown as SigningKeyExport)
      ).rejects.toThrow(InvalidExportFormatError);
    });

    test('throws InvalidExportFormatError for invalid salt characters', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);

      const badExport = {
        format: 'midnight-signing-key-export',
        encryptedPayload: 'invalid',
        salt: 'g'.repeat(64)
      };

      await expect(
        db.importSigningKeys(badExport as unknown as SigningKeyExport)
      ).rejects.toThrow(InvalidExportFormatError);
    });

    test('enforces maxKeys limit on export', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      await db.setSigningKey(CONTRACT_ADDRESS_1, sampleSigningKey());
      await db.setSigningKey(CONTRACT_ADDRESS_2, sampleSigningKey());

      await expect(
        db.exportSigningKeys({ maxKeys: 1 })
      ).rejects.toThrow(SigningKeyExportError);
    });

    test('enforces maxKeys limit on import', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      await db.setSigningKey(CONTRACT_ADDRESS_1, sampleSigningKey());
      await db.setSigningKey(CONTRACT_ADDRESS_2, sampleSigningKey());

      const exportData = await db.exportSigningKeys();
      await db.clearSigningKeys();

      await expect(
        db.importSigningKeys(exportData, { maxKeys: 1 })
      ).rejects.toThrow(InvalidExportFormatError);
    });

    test('handles mixed import scenarios correctly', async () => {
      const db = levelPrivateStateProvider<PID, PS>(testConfig);
      const key1 = sampleSigningKey();
      const key2 = sampleSigningKey();
      await db.setSigningKey(CONTRACT_ADDRESS_1, key1);
      await db.setSigningKey(CONTRACT_ADDRESS_2, key2);

      const exportData = await db.exportSigningKeys();

      await db.removeSigningKey(CONTRACT_ADDRESS_1);
      const key3 = sampleSigningKey();
      const CONTRACT_ADDRESS_3 = 'contract-address-3' as ContractAddress;
      await db.setSigningKey(CONTRACT_ADDRESS_3, key3);

      const result = await db.importSigningKeys(exportData, { conflictStrategy: 'skip' });

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.overwritten).toBe(0);

      expect(await db.getSigningKey(CONTRACT_ADDRESS_1)).toEqual(key1);
      expect(await db.getSigningKey(CONTRACT_ADDRESS_2)).toEqual(key2);
      expect(await db.getSigningKey(CONTRACT_ADDRESS_3)).toEqual(key3);
    });

    describe('malformed data edge cases', () => {
      const VALID_PASSWORD = 'valid-password-for-test';

      test('throws ExportDecryptionError for garbage base64 payload', async () => {
        const db = levelPrivateStateProvider<PID, PS>(testConfig);

        const badExport: SigningKeyExport = {
          format: 'midnight-signing-key-export',
          encryptedPayload: 'dGhpcyBpcyBub3QgdmFsaWQgZW5jcnlwdGVkIGRhdGE=',
          salt: '0'.repeat(64)
        };

        await expect(
          db.importSigningKeys(badExport, { password: VALID_PASSWORD })
        ).rejects.toThrow(ExportDecryptionError);
      });

      test('throws ExportDecryptionError for payload that decrypts to invalid JSON', async () => {
        const db = levelPrivateStateProvider<PID, PS>(testConfig);

        const salt = Buffer.from('0'.repeat(64), 'hex');
        const encryption = new StorageEncryption(VALID_PASSWORD, salt);
        const notJson = encryption.encrypt('this is not JSON');

        const badExport: SigningKeyExport = {
          format: 'midnight-signing-key-export',
          encryptedPayload: notJson,
          salt: salt.toString('hex')
        };

        await expect(
          db.importSigningKeys(badExport, { password: VALID_PASSWORD })
        ).rejects.toThrow(ExportDecryptionError);
      });

      test('throws ExportDecryptionError for payload with invalid structure (missing keys)', async () => {
        const db = levelPrivateStateProvider<PID, PS>(testConfig);

        const salt = Buffer.from('0'.repeat(64), 'hex');
        const encryption = new StorageEncryption(VALID_PASSWORD, salt);
        const invalidPayload = encryption.encrypt(JSON.stringify({
          version: 1,
          exportedAt: new Date().toISOString(),
          keyCount: 0
        }));

        const badExport: SigningKeyExport = {
          format: 'midnight-signing-key-export',
          encryptedPayload: invalidPayload,
          salt: salt.toString('hex')
        };

        await expect(
          db.importSigningKeys(badExport, { password: VALID_PASSWORD })
        ).rejects.toThrow(ExportDecryptionError);
      });

      test('throws ExportDecryptionError for payload with invalid structure (missing version)', async () => {
        const db = levelPrivateStateProvider<PID, PS>(testConfig);

        const salt = Buffer.from('0'.repeat(64), 'hex');
        const encryption = new StorageEncryption(VALID_PASSWORD, salt);
        const invalidPayload = encryption.encrypt(JSON.stringify({
          exportedAt: new Date().toISOString(),
          keyCount: 0,
          keys: {}
        }));

        const badExport: SigningKeyExport = {
          format: 'midnight-signing-key-export',
          encryptedPayload: invalidPayload,
          salt: salt.toString('hex')
        };

        await expect(
          db.importSigningKeys(badExport, { password: VALID_PASSWORD })
        ).rejects.toThrow(ExportDecryptionError);
      });

      test('throws ExportDecryptionError for keyCount mismatch', async () => {
        const db = levelPrivateStateProvider<PID, PS>(testConfig);

        const salt = Buffer.from('0'.repeat(64), 'hex');
        const encryption = new StorageEncryption(VALID_PASSWORD, salt);
        const mismatchedPayload = encryption.encrypt(JSON.stringify({
          version: 1,
          exportedAt: new Date().toISOString(),
          keyCount: 5,
          keys: {
            'test-address': { sk: 'test' }
          }
        }));

        const badExport: SigningKeyExport = {
          format: 'midnight-signing-key-export',
          encryptedPayload: mismatchedPayload,
          salt: salt.toString('hex')
        };

        await expect(
          db.importSigningKeys(badExport, { password: VALID_PASSWORD })
        ).rejects.toThrow(ExportDecryptionError);
      });

      test('throws InvalidExportFormatError for unsupported version', async () => {
        const db = levelPrivateStateProvider<PID, PS>(testConfig);

        const salt = Buffer.from('0'.repeat(64), 'hex');
        const encryption = new StorageEncryption(VALID_PASSWORD, salt);
        const unsupportedVersionPayload = encryption.encrypt(JSON.stringify({
          version: 999,
          exportedAt: new Date().toISOString(),
          keyCount: 0,
          keys: {}
        }));

        const badExport: SigningKeyExport = {
          format: 'midnight-signing-key-export',
          encryptedPayload: unsupportedVersionPayload,
          salt: salt.toString('hex')
        };

        await expect(
          db.importSigningKeys(badExport, { password: VALID_PASSWORD })
        ).rejects.toThrow(InvalidExportFormatError);
      });

      test('throws ExportDecryptionError for tampered encrypted payload', async () => {
        const db = levelPrivateStateProvider<PID, PS>(testConfig);
        const signingKey = sampleSigningKey();
        await db.setSigningKey(CONTRACT_ADDRESS_1, signingKey);

        const exportData = await db.exportSigningKeys();

        const tamperedPayload = Buffer.from(exportData.encryptedPayload, 'base64');
        tamperedPayload[tamperedPayload.length - 10] ^= 0xff;

        const tamperedExport: SigningKeyExport = {
          format: 'midnight-signing-key-export',
          encryptedPayload: tamperedPayload.toString('base64'),
          salt: exportData.salt
        };

        await expect(db.importSigningKeys(tamperedExport)).rejects.toThrow(ExportDecryptionError);
      });
    });
  });

  describe('Browser Warning', () => {
    const globalRecord = globalThis as Record<string, unknown>;
    let originalWindow: unknown;
    let originalDocument: unknown;
    let originalSessionStorage: unknown;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      originalWindow = globalRecord.window;
      originalDocument = globalRecord.document;
      originalSessionStorage = globalRecord.sessionStorage;
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn());
    });

    afterEach(() => {
      globalRecord.window = originalWindow;
      globalRecord.document = originalDocument;
      globalRecord.sessionStorage = originalSessionStorage;
      consoleWarnSpy.mockRestore();
    });

    test('shows warning in browser environment', () => {
      const mockSessionStorage = {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn()
      };
      globalRecord.window = {};
      globalRecord.document = {};
      globalRecord.sessionStorage = mockSessionStorage;

      levelPrivateStateProvider<PID, PS>(testConfig);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('MIDNIGHT: Private state and signing keys')
      );
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        '__midnight_browser_warning_shown__',
        'true'
      );
    });

    test('does not show warning in Node.js environment', () => {
      delete globalRecord.window;
      delete globalRecord.document;

      levelPrivateStateProvider<PID, PS>(testConfig);

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    test('does not show warning when only window exists (e.g., jsdom)', () => {
      globalRecord.window = {};
      delete globalRecord.document;

      levelPrivateStateProvider<PID, PS>(testConfig);

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    test('shows warning only once per session', () => {
      const mockSessionStorage = {
        getItem: vi.fn().mockReturnValue('true'),
        setItem: vi.fn()
      };
      globalRecord.window = {};
      globalRecord.document = {};
      globalRecord.sessionStorage = mockSessionStorage;

      levelPrivateStateProvider<PID, PS>(testConfig);

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    test('handles sessionStorage errors gracefully', () => {
      const mockSessionStorage = {
        getItem: vi.fn().mockImplementation(() => {
          throw new Error('Storage error');
        }),
        setItem: vi.fn()
      };
      globalRecord.window = {};
      globalRecord.document = {};
      globalRecord.sessionStorage = mockSessionStorage;

      expect(() => levelPrivateStateProvider<PID, PS>(testConfig)).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('Salt Consistency (Race Condition Prevention)', () => {
    const SALT_TEST_DB = 'midnight-salt-test-db';
    const SALT_CONTRACT_ADDRESS = 'salt-test-contract' as ContractAddress;

    afterEach(async () => {
      await fs.rm(path.join('.', SALT_TEST_DB), { recursive: true, force: true });
    });

    test('multiple sequential operations maintain consistent salt for private states', async () => {
      const config = {
        midnightDbName: SALT_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId: TEST_ACCOUNT_ID
      };

      for (let i = 0; i < 5; i++) {
        const db = levelPrivateStateProvider<string, string>(config);
        db.setContractAddress(SALT_CONTRACT_ADDRESS);
        await db.set(`key-${i}`, `value-${i}`);
      }

      const verifyDb = levelPrivateStateProvider<string, string>(config);
      verifyDb.setContractAddress(SALT_CONTRACT_ADDRESS);
      for (let i = 0; i < 5; i++) {
        const value = await verifyDb.get(`key-${i}`);
        expect(value).toBe(`value-${i}`);
      }
    });

    test('multiple sequential operations maintain consistent salt for signing keys', async () => {
      const config = {
        midnightDbName: SALT_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId: TEST_ACCOUNT_ID
      };

      const signingKeys = Array.from({ length: 5 }, () => sampleSigningKey());

      for (let i = 0; i < 5; i++) {
        const db = levelPrivateStateProvider<string, string>(config);
        await db.setSigningKey(`address-${i}` as ContractAddress, signingKeys[i]);
      }

      const verifyDb = levelPrivateStateProvider<string, string>(config);
      for (let i = 0; i < 5; i++) {
        const key = await verifyDb.getSigningKey(`address-${i}` as ContractAddress);
        expect(key).toEqual(signingKeys[i]);
      }
    });

    test('operations after clear() create new consistent salt', async () => {
      const config = {
        midnightDbName: SALT_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId: TEST_ACCOUNT_ID
      };

      const db = levelPrivateStateProvider<string, string>(config);
      db.setContractAddress(SALT_CONTRACT_ADDRESS);
      await db.set('initial-key', 'initial-value');

      await db.clear();

      for (let i = 0; i < 3; i++) {
        const freshDb = levelPrivateStateProvider<string, string>(config);
        freshDb.setContractAddress(SALT_CONTRACT_ADDRESS);
        await freshDb.set(`post-clear-${i}`, `value-${i}`);
      }

      const verifyDb = levelPrivateStateProvider<string, string>(config);
      verifyDb.setContractAddress(SALT_CONTRACT_ADDRESS);
      for (let i = 0; i < 3; i++) {
        const value = await verifyDb.get(`post-clear-${i}`);
        expect(value).toBe(`value-${i}`);
      }
    });

    test('mixed operations on private states and signing keys use separate consistent salts', async () => {
      const config = {
        midnightDbName: SALT_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId: TEST_ACCOUNT_ID
      };

      const signingKey = sampleSigningKey();

      const db1 = levelPrivateStateProvider<string, string>(config);
      db1.setContractAddress(SALT_CONTRACT_ADDRESS);
      await db1.set('state-1', 'value-1');

      const db2 = levelPrivateStateProvider<string, string>(config);
      await db2.setSigningKey('key-address-1' as ContractAddress, signingKey);

      const db3 = levelPrivateStateProvider<string, string>(config);
      db3.setContractAddress(SALT_CONTRACT_ADDRESS);
      await db3.set('state-2', 'value-2');

      const db4 = levelPrivateStateProvider<string, string>(config);
      await db4.setSigningKey('key-address-2' as ContractAddress, signingKey);

      const verifyDb = levelPrivateStateProvider<string, string>(config);
      verifyDb.setContractAddress(SALT_CONTRACT_ADDRESS);

      expect(await verifyDb.get('state-1')).toBe('value-1');
      expect(await verifyDb.get('state-2')).toBe('value-2');
      expect(await verifyDb.getSigningKey('key-address-1' as ContractAddress)).toEqual(signingKey);
      expect(await verifyDb.getSigningKey('key-address-2' as ContractAddress)).toEqual(signingKey);
    });

    test('operations after clearSigningKeys() create new consistent salt for signing keys', async () => {
      const config = {
        midnightDbName: SALT_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId: TEST_ACCOUNT_ID
      };

      const signingKey1 = sampleSigningKey();
      const db = levelPrivateStateProvider<string, string>(config);
      await db.setSigningKey('initial-address' as ContractAddress, signingKey1);

      await db.clearSigningKeys();

      const signingKeys = Array.from({ length: 3 }, () => sampleSigningKey());
      for (let i = 0; i < 3; i++) {
        const freshDb = levelPrivateStateProvider<string, string>(config);
        await freshDb.setSigningKey(`post-clear-${i}` as ContractAddress, signingKeys[i]);
      }

      const verifyDb = levelPrivateStateProvider<string, string>(config);
      for (let i = 0; i < 3; i++) {
        const key = await verifyDb.getSigningKey(`post-clear-${i}` as ContractAddress);
        expect(key).toEqual(signingKeys[i]);
      }
    });
  });

  describe('Encryption Cache', () => {
    const CACHE_TEST_DB = 'midnight-cache-test-db';
    const CACHE_CONTRACT_ADDRESS = 'cache-test-contract' as ContractAddress;

    afterEach(async () => {
      await fs.rm(path.join('.', CACHE_TEST_DB), { recursive: true, force: true });
    });

    test('invalidateEncryptionCache method exists on provider', () => {
      const db = levelPrivateStateProvider<string, string>({
        midnightDbName: CACHE_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId: TEST_ACCOUNT_ID
      });

      expect(typeof db.invalidateEncryptionCache).toBe('function');
    });

    test('encryption instance is reused for multiple operations (caching works)', async () => {
      const verifyPasswordSpy = vi.spyOn(StorageEncryption.prototype, 'verifyPassword');
      const config = {
        midnightDbName: CACHE_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId: TEST_ACCOUNT_ID
      };

      const db = levelPrivateStateProvider<string, string>(config);
      db.setContractAddress(CACHE_CONTRACT_ADDRESS);

      await db.set('key-0', 'value-0');
      expect(verifyPasswordSpy).not.toHaveBeenCalled();

      await db.set('key-1', 'value-1');
      expect(verifyPasswordSpy).toHaveBeenCalledTimes(1);
      expect(verifyPasswordSpy).toHaveLastReturnedWith(true);

      await db.set('key-2', 'value-2');
      expect(verifyPasswordSpy).toHaveBeenCalledTimes(2);
      expect(verifyPasswordSpy).toHaveLastReturnedWith(true);

      verifyPasswordSpy.mockRestore();
    });

    test('cache is invalidated when password changes', async () => {
      let currentPassword = TEST_PASSWORD;
      const config = {
        midnightDbName: CACHE_TEST_DB,
        privateStoragePasswordProvider: () => currentPassword,
        accountId: TEST_ACCOUNT_ID
      };

      const db = levelPrivateStateProvider<string, string>(config);
      db.setContractAddress(CACHE_CONTRACT_ADDRESS);
      await db.set('test-key', 'test-value');

      const value1 = await db.get('test-key');
      expect(value1).toBe('test-value');

      currentPassword = 'Different-Pass-88!';

      await expect(db.get('test-key')).rejects.toThrow();
    });

    test('invalidateEncryptionCache clears cache and forces re-derivation', async () => {
      const config = {
        midnightDbName: CACHE_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId: TEST_ACCOUNT_ID
      };

      const db = levelPrivateStateProvider<string, string>(config);
      db.setContractAddress(CACHE_CONTRACT_ADDRESS);
      await db.set('test-key', 'test-value');

      db.invalidateEncryptionCache();

      const value = await db.get('test-key');
      expect(value).toBe('test-value');
    });

    test('private states and signing keys have separate cache entries', async () => {
      const config = {
        midnightDbName: CACHE_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId: TEST_ACCOUNT_ID
      };

      const db = levelPrivateStateProvider<string, string>(config);
      db.setContractAddress(CACHE_CONTRACT_ADDRESS);

      await db.set('state-key', 'state-value');
      const signingKey = sampleSigningKey();
      await db.setSigningKey('key-address' as ContractAddress, signingKey);

      expect(await db.get('state-key')).toBe('state-value');
      expect(await db.getSigningKey('key-address' as ContractAddress)).toEqual(signingKey);
    });

    test('cache survives multiple provider instances with same config', async () => {
      const config = {
        midnightDbName: CACHE_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId: TEST_ACCOUNT_ID
      };

      const db1 = levelPrivateStateProvider<string, string>(config);
      db1.setContractAddress(CACHE_CONTRACT_ADDRESS);
      await db1.set('shared-key', 'shared-value');

      const db2 = levelPrivateStateProvider<string, string>(config);
      db2.setContractAddress(CACHE_CONTRACT_ADDRESS);
      const value = await db2.get('shared-key');

      expect(value).toBe('shared-value');
    });
  });

  describe('Password Rotation', () => {
    const ROTATION_TEST_DB = 'midnight-rotation-test-db';
    const ROTATION_CONTRACT_ADDRESS = 'rotation-test-contract' as ContractAddress;
    const OLD_PASSWORD = 'Old-Password-Test8!';
    const NEW_PASSWORD = 'New-Password-Test8!';

    afterEach(async () => {
      await fs.rm(path.join('.', ROTATION_TEST_DB), { recursive: true, force: true });
    });

    describe('changePassword', () => {
      test('changePassword method exists on provider', () => {
        const db = levelPrivateStateProvider<string, string>({
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => OLD_PASSWORD,
          accountId: TEST_ACCOUNT_ID
        });

        expect(typeof db.changePassword).toBe('function');
      });

      test('throws error when contract address not set', async () => {
        const db = levelPrivateStateProvider<string, string>({
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => OLD_PASSWORD,
          accountId: TEST_ACCOUNT_ID
        });

        await expect(
          db.changePassword(() => OLD_PASSWORD, () => NEW_PASSWORD)
        ).rejects.toThrow('Contract address not set');
      });

      test('successfully rotates password for private states', async () => {
        let currentPassword = OLD_PASSWORD;
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => currentPassword,
          accountId: TEST_ACCOUNT_ID
        };

        const db = levelPrivateStateProvider<string, string>(config);
        db.setContractAddress(ROTATION_CONTRACT_ADDRESS);
        await db.set('key1', 'value1');
        await db.set('key2', 'value2');

        await db.changePassword(() => OLD_PASSWORD, () => NEW_PASSWORD);

        currentPassword = NEW_PASSWORD;

        const value1 = await db.get('key1');
        const value2 = await db.get('key2');
        expect(value1).toBe('value1');
        expect(value2).toBe('value2');
      });

      test('throws error when old password is incorrect', async () => {
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => OLD_PASSWORD,
          accountId: TEST_ACCOUNT_ID
        };

        const db = levelPrivateStateProvider<string, string>(config);
        db.setContractAddress(ROTATION_CONTRACT_ADDRESS);
        await db.set('key1', 'value1');

        await expect(
          db.changePassword(() => 'Wrong-Password-88!', () => NEW_PASSWORD)
        ).rejects.toThrow();

        const value = await db.get('key1');
        expect(value).toBe('value1');
      });

      test('handles empty database gracefully', async () => {
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => OLD_PASSWORD,
          accountId: TEST_ACCOUNT_ID
        };

        const db = levelPrivateStateProvider<string, string>(config);
        db.setContractAddress(ROTATION_CONTRACT_ADDRESS);

        await expect(
          db.changePassword(() => OLD_PASSWORD, () => NEW_PASSWORD)
        ).resolves.not.toThrow();
      });

      test('re-encrypts all contracts data in sublevel to prevent data loss', async () => {
        const OTHER_CONTRACT = 'other-contract' as ContractAddress;
        let currentPassword = OLD_PASSWORD;
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => currentPassword,
          accountId: TEST_ACCOUNT_ID
        };

        const db = levelPrivateStateProvider<string, string>(config);

        db.setContractAddress(ROTATION_CONTRACT_ADDRESS);
        await db.set('key1', 'value1');

        db.setContractAddress(OTHER_CONTRACT);
        await db.set('other-key', 'other-value');

        db.setContractAddress(ROTATION_CONTRACT_ADDRESS);
        await db.changePassword(() => OLD_PASSWORD, () => NEW_PASSWORD);

        currentPassword = NEW_PASSWORD;
        const value1 = await db.get('key1');
        expect(value1).toBe('value1');

        db.setContractAddress(OTHER_CONTRACT);
        const otherValue = await db.get('other-key');
        expect(otherValue).toBe('other-value');
      });

      test('invalidates encryption cache after rotation', async () => {
        let currentPassword = OLD_PASSWORD;
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => currentPassword,
          accountId: TEST_ACCOUNT_ID
        };

        const db = levelPrivateStateProvider<string, string>(config);
        db.setContractAddress(ROTATION_CONTRACT_ADDRESS);
        await db.set('key1', 'value1');

        await db.changePassword(() => OLD_PASSWORD, () => NEW_PASSWORD);
        currentPassword = NEW_PASSWORD;

        const freshDb = levelPrivateStateProvider<string, string>(config);
        freshDb.setContractAddress(ROTATION_CONTRACT_ADDRESS);
        const value = await freshDb.get('key1');
        expect(value).toBe('value1');
      });

      test('validates new password meets requirements', async () => {
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => OLD_PASSWORD,
          accountId: TEST_ACCOUNT_ID
        };

        const db = levelPrivateStateProvider<string, string>(config);
        db.setContractAddress(ROTATION_CONTRACT_ADDRESS);
        await db.set('key1', 'value1');

        await expect(
          db.changePassword(() => OLD_PASSWORD, () => 'short')
        ).rejects.toThrow();
      });

      test('migrates V1-encrypted data to V2 during rotation', async () => {
        const V1_MIGRATION_DB = 'midnight-v1-migration-test-db';
        const PRIVATE_STATE_STORE = 'private-states';
        const METADATA_KEY = '__midnight_encryption_metadata__';
        const hashedAccountId = crypto.createHash('sha256').update(TEST_ACCOUNT_ID).digest('hex').substring(0, 32);
        const SCOPED_PRIVATE_STATE_STORE = `${PRIVATE_STATE_STORE}:${hashedAccountId}`;

        await fs.rm(path.join('.', V1_MIGRATION_DB), { recursive: true, force: true });

        const salt = crypto.randomBytes(32);
        const iv = crypto.randomBytes(12);
        const testValue = superjson.stringify('v1-test-value');

        const key = crypto.pbkdf2Sync(OLD_PASSWORD, salt, 100000, 32, 'sha256');
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        const encrypted = Buffer.concat([cipher.update(testValue, 'utf-8'), cipher.final()]);
        const authTag = cipher.getAuthTag();

        const version = Buffer.from([1]);
        const v1EncryptedData = Buffer.concat([version, salt, iv, authTag, encrypted]).toString('base64');

        const level = new Level(V1_MIGRATION_DB, { createIfMissing: true });
        const subLevel = level.sublevel(SCOPED_PRIVATE_STATE_STORE, { valueEncoding: 'utf-8' });

        try {
          await level.open();
          await subLevel.open();

          const metadata = { salt: salt.toString('hex'), version: 1 };
          await subLevel.put(METADATA_KEY, JSON.stringify(metadata));
          await subLevel.put(`${ROTATION_CONTRACT_ADDRESS}:v1-key`, v1EncryptedData);
        } finally {
          await subLevel.close();
          await level.close();
        }

        let currentPassword = OLD_PASSWORD;
        const config = {
          midnightDbName: V1_MIGRATION_DB,
          privateStoragePasswordProvider: () => currentPassword,
          accountId: TEST_ACCOUNT_ID
        };

        const db = levelPrivateStateProvider<string, string>(config);
        db.setContractAddress(ROTATION_CONTRACT_ADDRESS);

        const valueBefore = await db.get('v1-key');
        expect(valueBefore).toBe('v1-test-value');

        await db.changePassword(() => OLD_PASSWORD, () => NEW_PASSWORD);
        currentPassword = NEW_PASSWORD;

        const valueAfter = await db.get('v1-key');
        expect(valueAfter).toBe('v1-test-value');

        const levelAfter = new Level(V1_MIGRATION_DB, { createIfMissing: false });
        const subLevelAfter = levelAfter.sublevel(SCOPED_PRIVATE_STATE_STORE, { valueEncoding: 'utf-8' });

        try {
          await levelAfter.open();
          await subLevelAfter.open();

          const encryptedAfter = await subLevelAfter.get(`${ROTATION_CONTRACT_ADDRESS}:v1-key`);
          expect(encryptedAfter).toBeDefined();
          const bufferAfter = Buffer.from(encryptedAfter as string, 'base64');
          expect(bufferAfter[0]).toBe(2);
        } finally {
          await subLevelAfter.close();
          await levelAfter.close();
        }

        await fs.rm(path.join('.', V1_MIGRATION_DB), { recursive: true, force: true });
      });
    });

    describe('changeSigningKeysPassword', () => {
      test('changeSigningKeysPassword method exists on provider', () => {
        const db = levelPrivateStateProvider<string, string>({
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => OLD_PASSWORD,
          accountId: TEST_ACCOUNT_ID
        });

        expect(typeof db.changeSigningKeysPassword).toBe('function');
      });

      test('successfully rotates password for signing keys', async () => {
        let currentPassword = OLD_PASSWORD;
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => currentPassword,
          accountId: TEST_ACCOUNT_ID
        };

        const signingKey1 = sampleSigningKey();
        const signingKey2 = sampleSigningKey();

        const db = levelPrivateStateProvider<string, string>(config);
        await db.setSigningKey('address1' as ContractAddress, signingKey1);
        await db.setSigningKey('address2' as ContractAddress, signingKey2);

        await db.changeSigningKeysPassword(() => OLD_PASSWORD, () => NEW_PASSWORD);

        currentPassword = NEW_PASSWORD;

        const key1 = await db.getSigningKey('address1' as ContractAddress);
        const key2 = await db.getSigningKey('address2' as ContractAddress);
        expect(key1).toEqual(signingKey1);
        expect(key2).toEqual(signingKey2);
      });

      test('throws error when old password is incorrect', async () => {
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => OLD_PASSWORD,
          accountId: TEST_ACCOUNT_ID
        };

        const signingKey = sampleSigningKey();
        const db = levelPrivateStateProvider<string, string>(config);
        await db.setSigningKey('address1' as ContractAddress, signingKey);

        await expect(
          db.changeSigningKeysPassword(() => 'Wrong-Password-88!', () => NEW_PASSWORD)
        ).rejects.toThrow();

        const key = await db.getSigningKey('address1' as ContractAddress);
        expect(key).toEqual(signingKey);
      });

      test('handles empty signing keys gracefully', async () => {
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => OLD_PASSWORD,
          accountId: TEST_ACCOUNT_ID
        };

        const db = levelPrivateStateProvider<string, string>(config);

        await expect(
          db.changeSigningKeysPassword(() => OLD_PASSWORD, () => NEW_PASSWORD)
        ).resolves.not.toThrow();
      });

      test('does not require contract address to be set', async () => {
        let currentPassword = OLD_PASSWORD;
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => currentPassword,
          accountId: TEST_ACCOUNT_ID
        };

        const signingKey = sampleSigningKey();
        const db = levelPrivateStateProvider<string, string>(config);
        await db.setSigningKey('address1' as ContractAddress, signingKey);

        await db.changeSigningKeysPassword(() => OLD_PASSWORD, () => NEW_PASSWORD);
        currentPassword = NEW_PASSWORD;

        const key = await db.getSigningKey('address1' as ContractAddress);
        expect(key).toEqual(signingKey);
      });

      test('invalidates encryption cache after rotation', async () => {
        let currentPassword = OLD_PASSWORD;
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => currentPassword,
          accountId: TEST_ACCOUNT_ID
        };

        const signingKey = sampleSigningKey();
        const db = levelPrivateStateProvider<string, string>(config);
        await db.setSigningKey('address1' as ContractAddress, signingKey);

        await db.changeSigningKeysPassword(() => OLD_PASSWORD, () => NEW_PASSWORD);
        currentPassword = NEW_PASSWORD;

        const freshDb = levelPrivateStateProvider<string, string>(config);
        const key = await freshDb.getSigningKey('address1' as ContractAddress);
        expect(key).toEqual(signingKey);
      });
    });

    describe('Rotation Result', () => {
      test('changePassword returns entriesMigrated count', async () => {
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => OLD_PASSWORD,
          accountId: TEST_ACCOUNT_ID
        };

        const db = levelPrivateStateProvider<string, string>(config);
        db.setContractAddress(ROTATION_CONTRACT_ADDRESS);
        await db.set('key1', 'value1');
        await db.set('key2', 'value2');
        await db.set('key3', 'value3');

        const result = await db.changePassword(() => OLD_PASSWORD, () => NEW_PASSWORD);

        expect(result.entriesMigrated).toBe(3);
      });

      test('changePassword returns zero for empty database', async () => {
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => OLD_PASSWORD,
          accountId: TEST_ACCOUNT_ID
        };

        const db = levelPrivateStateProvider<string, string>(config);
        db.setContractAddress(ROTATION_CONTRACT_ADDRESS);

        const result = await db.changePassword(() => OLD_PASSWORD, () => NEW_PASSWORD);

        expect(result.entriesMigrated).toBe(0);
      });

      test('changeSigningKeysPassword returns entriesMigrated count', async () => {
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => OLD_PASSWORD,
          accountId: TEST_ACCOUNT_ID
        };

        const db = levelPrivateStateProvider<string, string>(config);
        await db.setSigningKey('addr1' as ContractAddress, sampleSigningKey());
        await db.setSigningKey('addr2' as ContractAddress, sampleSigningKey());

        const result = await db.changeSigningKeysPassword(() => OLD_PASSWORD, () => NEW_PASSWORD);

        expect(result.entriesMigrated).toBe(2);
      });
    });

    describe('Concurrent Access', () => {
      test('concurrent rotations are serialized correctly', async () => {
        let currentPassword = OLD_PASSWORD;
        const SECOND_PASSWORD = 'Second-Password-99!';
        const THIRD_PASSWORD = 'Third-Password-100!';
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => currentPassword,
          accountId: TEST_ACCOUNT_ID
        };

        const db = levelPrivateStateProvider<string, string>(config);
        db.setContractAddress(ROTATION_CONTRACT_ADDRESS);
        await db.set('key1', 'value1');

        const rotation1 = db.changePassword(() => OLD_PASSWORD, () => SECOND_PASSWORD);
        const rotation2 = db.changePassword(() => SECOND_PASSWORD, () => THIRD_PASSWORD);

        await rotation1;
        await rotation2;

        currentPassword = THIRD_PASSWORD;
        const value = await db.get('key1');
        expect(value).toBe('value1');
      });

      test('remove waits for rotation lock before executing', async () => {
        let currentPassword = OLD_PASSWORD;
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => currentPassword,
          accountId: TEST_ACCOUNT_ID
        };

        const db = levelPrivateStateProvider<string, string>(config);
        db.setContractAddress(ROTATION_CONTRACT_ADDRESS);
        await db.set('key1', 'value1');
        await db.set('key2', 'value2');

        const rotationPromise = db.changePassword(() => OLD_PASSWORD, () => NEW_PASSWORD);
        const removePromise = db.remove('key1');

        await rotationPromise;
        await removePromise;

        currentPassword = NEW_PASSWORD;
        const value1 = await db.get('key1');
        const value2 = await db.get('key2');

        expect(value1).toBeNull();
        expect(value2).toBe('value2');
      });

      test('removeSigningKey waits for rotation lock before executing', async () => {
        let currentPassword = OLD_PASSWORD;
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => currentPassword,
          accountId: TEST_ACCOUNT_ID
        };

        const signingKey1 = sampleSigningKey();
        const signingKey2 = sampleSigningKey();

        const db = levelPrivateStateProvider<string, string>(config);
        await db.setSigningKey('addr1' as ContractAddress, signingKey1);
        await db.setSigningKey('addr2' as ContractAddress, signingKey2);

        const rotationPromise = db.changeSigningKeysPassword(() => OLD_PASSWORD, () => NEW_PASSWORD);
        const removePromise = db.removeSigningKey('addr1' as ContractAddress);

        await rotationPromise;
        await removePromise;

        currentPassword = NEW_PASSWORD;
        const key1 = await db.getSigningKey('addr1' as ContractAddress);
        const key2 = await db.getSigningKey('addr2' as ContractAddress);

        expect(key1).toBeNull();
        expect(key2).toEqual(signingKey2);
      });

      test('get waits for rotation lock before executing', async () => {
        let currentPassword = OLD_PASSWORD;
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => currentPassword,
          accountId: TEST_ACCOUNT_ID
        };

        const db = levelPrivateStateProvider<string, string>(config);
        db.setContractAddress(ROTATION_CONTRACT_ADDRESS);
        await db.set('key1', 'value1');

        const rotationPromise = db.changePassword(() => OLD_PASSWORD, () => NEW_PASSWORD);
        currentPassword = NEW_PASSWORD;
        const getPromise = db.get('key1');

        await rotationPromise;
        const value = await getPromise;

        expect(value).toBe('value1');
      });

      test('set waits for rotation lock before executing', async () => {
        let currentPassword = OLD_PASSWORD;
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => currentPassword,
          accountId: TEST_ACCOUNT_ID
        };

        const db = levelPrivateStateProvider<string, string>(config);
        db.setContractAddress(ROTATION_CONTRACT_ADDRESS);
        await db.set('key1', 'value1');

        const rotationPromise = db.changePassword(() => OLD_PASSWORD, () => NEW_PASSWORD);
        currentPassword = NEW_PASSWORD;
        const setPromise = db.set('key2', 'value2');

        await rotationPromise;
        await setPromise;

        const value1 = await db.get('key1');
        const value2 = await db.get('key2');

        expect(value1).toBe('value1');
        expect(value2).toBe('value2');
      });

      test('getSigningKey waits for rotation lock before executing', async () => {
        let currentPassword = OLD_PASSWORD;
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => currentPassword,
          accountId: TEST_ACCOUNT_ID
        };

        const signingKey = sampleSigningKey();

        const db = levelPrivateStateProvider<string, string>(config);
        await db.setSigningKey('addr1' as ContractAddress, signingKey);

        const rotationPromise = db.changeSigningKeysPassword(() => OLD_PASSWORD, () => NEW_PASSWORD);
        currentPassword = NEW_PASSWORD;
        const getPromise = db.getSigningKey('addr1' as ContractAddress);

        await rotationPromise;
        const key = await getPromise;

        expect(key).toEqual(signingKey);
      });

      test('setSigningKey waits for rotation lock before executing', async () => {
        let currentPassword = OLD_PASSWORD;
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => currentPassword,
          accountId: TEST_ACCOUNT_ID
        };

        const signingKey1 = sampleSigningKey();
        const signingKey2 = sampleSigningKey();

        const db = levelPrivateStateProvider<string, string>(config);
        await db.setSigningKey('addr1' as ContractAddress, signingKey1);

        const rotationPromise = db.changeSigningKeysPassword(() => OLD_PASSWORD, () => NEW_PASSWORD);
        currentPassword = NEW_PASSWORD;
        const setPromise = db.setSigningKey('addr2' as ContractAddress, signingKey2);

        await rotationPromise;
        await setPromise;

        const key1 = await db.getSigningKey('addr1' as ContractAddress);
        const key2 = await db.getSigningKey('addr2' as ContractAddress);

        expect(key1).toEqual(signingKey1);
        expect(key2).toEqual(signingKey2);
      });
    });

    describe('Memory Limit', () => {
      test('throws error when entry count exceeds maxEntries option', async () => {
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => OLD_PASSWORD,
          accountId: TEST_ACCOUNT_ID
        };

        const db = levelPrivateStateProvider<string, string>(config);
        db.setContractAddress(ROTATION_CONTRACT_ADDRESS);

        await db.set('key1', 'value1');
        await db.set('key2', 'value2');
        await db.set('key3', 'value3');
        await db.set('key4', 'value4');
        await db.set('key5', 'value5');

        await expect(
          db.changePassword(() => OLD_PASSWORD, () => NEW_PASSWORD, { maxEntries: 3 })
        ).rejects.toThrow(/exceeds maximum allowed/);

        const value = await db.get('key1');
        expect(value).toBe('value1');
      });

      test('changeSigningKeysPassword throws error when entry count exceeds limit', async () => {
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => OLD_PASSWORD,
          accountId: TEST_ACCOUNT_ID
        };

        const db = levelPrivateStateProvider<string, string>(config);

        await db.setSigningKey('addr1' as ContractAddress, sampleSigningKey());
        await db.setSigningKey('addr2' as ContractAddress, sampleSigningKey());
        await db.setSigningKey('addr3' as ContractAddress, sampleSigningKey());
        await db.setSigningKey('addr4' as ContractAddress, sampleSigningKey());
        await db.setSigningKey('addr5' as ContractAddress, sampleSigningKey());

        await expect(
          db.changeSigningKeysPassword(() => OLD_PASSWORD, () => NEW_PASSWORD, { maxEntries: 3 })
        ).rejects.toThrow(/exceeds maximum allowed/);

        const key = await db.getSigningKey('addr1' as ContractAddress);
        expect(key).not.toBeNull();
      });
    });

    describe('Early Password Validation', () => {
      test('fails fast with incorrect old password before iterating all entries', async () => {
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => OLD_PASSWORD,
          accountId: TEST_ACCOUNT_ID
        };

        const db = levelPrivateStateProvider<string, string>(config);
        db.setContractAddress(ROTATION_CONTRACT_ADDRESS);
        await db.set('key1', 'value1');

        await expect(
          db.changePassword(() => 'Wrong-Password-88!', () => NEW_PASSWORD)
        ).rejects.toThrow(/incorrect|mismatch|decrypt/i);

        const value = await db.get('key1');
        expect(value).toBe('value1');
      });

      test('changeSigningKeysPassword fails fast with incorrect old password', async () => {
        const config = {
          midnightDbName: ROTATION_TEST_DB,
          privateStoragePasswordProvider: () => OLD_PASSWORD,
          accountId: TEST_ACCOUNT_ID
        };

        const signingKey = sampleSigningKey();
        const db = levelPrivateStateProvider<string, string>(config);
        await db.setSigningKey('addr1' as ContractAddress, signingKey);

        await expect(
          db.changeSigningKeysPassword(() => 'Wrong-Password-88!', () => NEW_PASSWORD)
        ).rejects.toThrow(/incorrect|mismatch|decrypt/i);

        const key = await db.getSigningKey('addr1' as ContractAddress);
        expect(key).toEqual(signingKey);
      });
    });
  });

  describe('Account Isolation', () => {
    const ISOLATION_TEST_DB = 'midnight-isolation-test-db';
    const ACCOUNT_1 = 'wallet-address-account-1';
    const ACCOUNT_2 = 'wallet-address-account-2';

    beforeEach(async () => {
      await fs.rm(path.join('.', ISOLATION_TEST_DB), { recursive: true, force: true });
    });

    afterAll(async () => {
      await fs.rm(path.join('.', ISOLATION_TEST_DB), { recursive: true, force: true });
    });

    test('different accountIds have completely isolated private state storage', async () => {
      const config1 = {
        midnightDbName: ISOLATION_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId: ACCOUNT_1
      };
      const config2 = {
        midnightDbName: ISOLATION_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId: ACCOUNT_2
      };

      const db1 = levelPrivateStateProvider<string, string>(config1);
      const db2 = levelPrivateStateProvider<string, string>(config2);

      db1.setContractAddress(TEST_CONTRACT_ADDRESS);
      db2.setContractAddress(TEST_CONTRACT_ADDRESS);

      await db1.set('shared-key', 'value-from-account-1');
      await db2.set('shared-key', 'value-from-account-2');

      const value1 = await db1.get('shared-key');
      const value2 = await db2.get('shared-key');

      expect(value1).toBe('value-from-account-1');
      expect(value2).toBe('value-from-account-2');
    });

    test('different accountIds have completely isolated signing key storage', async () => {
      const config1 = {
        midnightDbName: ISOLATION_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId: ACCOUNT_1
      };
      const config2 = {
        midnightDbName: ISOLATION_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId: ACCOUNT_2
      };

      const db1 = levelPrivateStateProvider<string, string>(config1);
      const db2 = levelPrivateStateProvider<string, string>(config2);

      const signingKey1 = sampleSigningKey();
      const signingKey2 = sampleSigningKey();

      await db1.setSigningKey(TEST_CONTRACT_ADDRESS, signingKey1);
      await db2.setSigningKey(TEST_CONTRACT_ADDRESS, signingKey2);

      const key1 = await db1.getSigningKey(TEST_CONTRACT_ADDRESS);
      const key2 = await db2.getSigningKey(TEST_CONTRACT_ADDRESS);

      expect(key1).toEqual(signingKey1);
      expect(key2).toEqual(signingKey2);
      expect(key1).not.toEqual(key2);
    });

    test('account 2 cannot read data from account 1', async () => {
      const config1 = {
        midnightDbName: ISOLATION_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId: ACCOUNT_1
      };
      const config2 = {
        midnightDbName: ISOLATION_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId: ACCOUNT_2
      };

      const db1 = levelPrivateStateProvider<string, string>(config1);
      const db2 = levelPrivateStateProvider<string, string>(config2);

      db1.setContractAddress(TEST_CONTRACT_ADDRESS);
      db2.setContractAddress(TEST_CONTRACT_ADDRESS);

      await db1.set('account1-only-key', 'secret-value');

      const valueFromAccount2 = await db2.get('account1-only-key');
      expect(valueFromAccount2).toBeNull();
    });

    test('throws error for whitespace-only accountId', () => {
      expect(() => {
        levelPrivateStateProvider<string, string>({
          privateStoragePasswordProvider: () => TEST_PASSWORD,
          accountId: '   '
        });
      }).toThrow('accountId is required');
    });

    test('clear() only affects data for the specific account', async () => {
      const config1 = {
        midnightDbName: ISOLATION_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId: ACCOUNT_1
      };
      const config2 = {
        midnightDbName: ISOLATION_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId: ACCOUNT_2
      };

      const db1 = levelPrivateStateProvider<string, string>(config1);
      const db2 = levelPrivateStateProvider<string, string>(config2);

      db1.setContractAddress(TEST_CONTRACT_ADDRESS);
      db2.setContractAddress(TEST_CONTRACT_ADDRESS);

      await db1.set('key1', 'value1');
      await db2.set('key2', 'value2');

      await db1.clear();

      const value1 = await db1.get('key1');
      const value2 = await db2.get('key2');

      expect(value1).toBeNull();
      expect(value2).toBe('value2');
    });

    test('clearSigningKeys() only affects data for the specific account', async () => {
      const config1 = {
        midnightDbName: ISOLATION_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId: ACCOUNT_1
      };
      const config2 = {
        midnightDbName: ISOLATION_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId: ACCOUNT_2
      };

      const db1 = levelPrivateStateProvider<string, string>(config1);
      const db2 = levelPrivateStateProvider<string, string>(config2);

      const signingKey1 = sampleSigningKey();
      const signingKey2 = sampleSigningKey();

      await db1.setSigningKey(TEST_CONTRACT_ADDRESS, signingKey1);
      await db2.setSigningKey(TEST_CONTRACT_ADDRESS, signingKey2);

      await db1.clearSigningKeys();

      const key1 = await db1.getSigningKey(TEST_CONTRACT_ADDRESS);
      const key2 = await db2.getSigningKey(TEST_CONTRACT_ADDRESS);

      expect(key1).toBeNull();
      expect(key2).toEqual(signingKey2);
    });

    test('same accountId produces same scoped storage path consistently', async () => {
      const accountId = 'consistent-wallet-address';

      const db1 = levelPrivateStateProvider<string, string>({
        midnightDbName: ISOLATION_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId
      });
      db1.setContractAddress(TEST_CONTRACT_ADDRESS);
      await db1.set('consistency-key', 'value1');

      const db2 = levelPrivateStateProvider<string, string>({
        midnightDbName: ISOLATION_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId
      });
      db2.setContractAddress(TEST_CONTRACT_ADDRESS);

      const value = await db2.get('consistency-key');
      expect(value).toBe('value1');
    });
  });

  describe('migrateToAccountScoped', () => {
    const MIGRATION_TEST_DB = 'midnight-migration-test-db';
    const MIGRATION_ACCOUNT_ID = 'migration-test-account';

    beforeEach(async () => {
      await fs.rm(path.join('.', MIGRATION_TEST_DB), { recursive: true, force: true });
    });

    afterAll(async () => {
      await fs.rm(path.join('.', MIGRATION_TEST_DB), { recursive: true, force: true });
    });

    test('migrates private states from unscoped to scoped sublevel', async () => {
      const level = new Level(MIGRATION_TEST_DB, { createIfMissing: true });
      const unscopedSubLevel = level.sublevel<string, string>('private-states', {
        valueEncoding: 'utf-8'
      });

      try {
        await level.open();
        await unscopedSubLevel.open();

        const encryption = new StorageEncryption(TEST_PASSWORD);
        await unscopedSubLevel.put('contract1:state1', encryption.encrypt(superjson.stringify('value1')));
        await unscopedSubLevel.put('contract1:state2', encryption.encrypt(superjson.stringify('value2')));
      } finally {
        await unscopedSubLevel.close();
        await level.close();
      }

      const result = await migrateToAccountScoped({
        midnightDbName: MIGRATION_TEST_DB,
        accountId: MIGRATION_ACCOUNT_ID
      });

      expect(result.privateStatesMigrated).toBe(2);
      expect(result.signingKeysMigrated).toBe(0);
    });

    test('migrates signing keys from unscoped to scoped sublevel', async () => {
      const level = new Level(MIGRATION_TEST_DB, { createIfMissing: true });
      const unscopedSubLevel = level.sublevel<string, string>('signing-keys', {
        valueEncoding: 'utf-8'
      });

      try {
        await level.open();
        await unscopedSubLevel.open();

        const encryption = new StorageEncryption(TEST_PASSWORD);
        await unscopedSubLevel.put('contract1', encryption.encrypt(superjson.stringify({ key: 'data' })));
      } finally {
        await unscopedSubLevel.close();
        await level.close();
      }

      const result = await migrateToAccountScoped({
        midnightDbName: MIGRATION_TEST_DB,
        accountId: MIGRATION_ACCOUNT_ID
      });

      expect(result.privateStatesMigrated).toBe(0);
      expect(result.signingKeysMigrated).toBe(1);
    });

    test('returns zero counts when no data to migrate', async () => {
      const result = await migrateToAccountScoped({
        midnightDbName: MIGRATION_TEST_DB,
        accountId: MIGRATION_ACCOUNT_ID
      });

      expect(result.privateStatesMigrated).toBe(0);
      expect(result.signingKeysMigrated).toBe(0);
    });

    test('throws error for missing accountId', async () => {
      await expect(
        migrateToAccountScoped({
          midnightDbName: MIGRATION_TEST_DB,
          accountId: ''
        })
      ).rejects.toThrow('accountId is required for migration');
    });

    test('throws error for whitespace-only accountId', async () => {
      await expect(
        migrateToAccountScoped({
          midnightDbName: MIGRATION_TEST_DB,
          accountId: '   '
        })
      ).rejects.toThrow('accountId is required for migration');
    });

    test('migrated data is accessible via scoped provider', async () => {
      const level = new Level(MIGRATION_TEST_DB, { createIfMissing: true });
      const unscopedSubLevel = level.sublevel<string, string>('private-states', {
        valueEncoding: 'utf-8'
      });

      const encryption = new StorageEncryption(TEST_PASSWORD);
      const CONTRACT_ADDR = 'test-contract' as ContractAddress;
      const METADATA_KEY = '__midnight_encryption_metadata__';

      try {
        await level.open();
        await unscopedSubLevel.open();

        const metadata = { salt: encryption.getSalt().toString('hex'), version: 2 };
        await unscopedSubLevel.put(METADATA_KEY, JSON.stringify(metadata));
        await unscopedSubLevel.put(
          `${CONTRACT_ADDR}:migrated-key`,
          encryption.encrypt(superjson.stringify('migrated-value'))
        );
      } finally {
        await unscopedSubLevel.close();
        await level.close();
      }

      await migrateToAccountScoped({
        midnightDbName: MIGRATION_TEST_DB,
        accountId: MIGRATION_ACCOUNT_ID
      });

      const db = levelPrivateStateProvider<string, string>({
        midnightDbName: MIGRATION_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId: MIGRATION_ACCOUNT_ID
      });
      db.setContractAddress(CONTRACT_ADDR);

      const value = await db.get('migrated-key');
      expect(value).toBe('migrated-value');
    });

    test('migration is idempotent - running twice does not corrupt data', async () => {
      const level = new Level(MIGRATION_TEST_DB, { createIfMissing: true });
      const unscopedSubLevel = level.sublevel<string, string>('private-states', {
        valueEncoding: 'utf-8'
      });

      const encryption = new StorageEncryption(TEST_PASSWORD);
      const CONTRACT_ADDR = 'test-contract' as ContractAddress;
      const METADATA_KEY = '__midnight_encryption_metadata__';

      try {
        await level.open();
        await unscopedSubLevel.open();

        const metadata = { salt: encryption.getSalt().toString('hex'), version: 2 };
        await unscopedSubLevel.put(METADATA_KEY, JSON.stringify(metadata));
        await unscopedSubLevel.put(
          `${CONTRACT_ADDR}:idempotent-key`,
          encryption.encrypt(superjson.stringify('idempotent-value'))
        );
      } finally {
        await unscopedSubLevel.close();
        await level.close();
      }

      const result1 = await migrateToAccountScoped({
        midnightDbName: MIGRATION_TEST_DB,
        accountId: MIGRATION_ACCOUNT_ID
      });

      const result2 = await migrateToAccountScoped({
        midnightDbName: MIGRATION_TEST_DB,
        accountId: MIGRATION_ACCOUNT_ID
      });

      expect(result1.privateStatesMigrated).toBe(2);
      expect(result2.privateStatesMigrated).toBe(2);

      const db = levelPrivateStateProvider<string, string>({
        midnightDbName: MIGRATION_TEST_DB,
        privateStoragePasswordProvider: () => TEST_PASSWORD,
        accountId: MIGRATION_ACCOUNT_ID
      });
      db.setContractAddress(CONTRACT_ADDR);

      const value = await db.get('idempotent-key');
      expect(value).toBe('idempotent-value');
    });

    test('preserves original unscoped data after migration', async () => {
      const level = new Level(MIGRATION_TEST_DB, { createIfMissing: true });
      const unscopedSubLevel = level.sublevel<string, string>('private-states', {
        valueEncoding: 'utf-8'
      });

      const encryption = new StorageEncryption(TEST_PASSWORD);
      const originalEncryptedValue = encryption.encrypt(superjson.stringify('original-value'));

      try {
        await level.open();
        await unscopedSubLevel.open();
        await unscopedSubLevel.put('original-key', originalEncryptedValue);
      } finally {
        await unscopedSubLevel.close();
        await level.close();
      }

      await migrateToAccountScoped({
        midnightDbName: MIGRATION_TEST_DB,
        accountId: MIGRATION_ACCOUNT_ID
      });

      const levelAfter = new Level(MIGRATION_TEST_DB, { createIfMissing: false });
      const unscopedAfter = levelAfter.sublevel<string, string>('private-states', {
        valueEncoding: 'utf-8'
      });

      try {
        await levelAfter.open();
        await unscopedAfter.open();
        const originalValue = await unscopedAfter.get('original-key');
        expect(originalValue).toBe(originalEncryptedValue);
      } finally {
        await unscopedAfter.close();
        await levelAfter.close();
      }
    });
  });
});

