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
import { type FinalizedTransaction } from '@midnight-ntwrk/ledger-v7';
import {
  ExportDecryptionError,
  ImportConflictError,
  InvalidExportFormatError,
  type PrivateStateExport,
  PrivateStateExportError
} from '@midnight-ntwrk/midnight-js-types';
import * as crypto from 'crypto';

import { levelPrivateStateProvider } from '../index';
import { StorageEncryption } from '../storage-encryption';

describe('Level Private State Provider', (): void => {
  const TEST_PASSWORD = 'test-storage-password-for-unit-tests-only';
  const TEST_CONTRACT_ADDRESS = 'test-contract-address' as ContractAddress;
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
    test('uses wallet encryption public key when only walletProvider is provided', async () => {
      const mockWallet = {
        getEncryptionPublicKey: () => TEST_PASSWORD,
        getCoinPublicKey: () => 'mock-coin-public-key',
        balanceTx: async () => ({} as unknown as FinalizedTransaction)
      };

      const db = levelPrivateStateProvider<PID, PS>({ walletProvider: mockWallet });
      db.setContractAddress(TEST_CONTRACT_ADDRESS);
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
        balanceTx: async () => ({} as unknown as FinalizedTransaction)
      };

      expect(() => {
        levelPrivateStateProvider<PID, PS>({
          walletProvider: mockWallet,
          privateStoragePasswordProvider: () => TEST_PASSWORD
        });
      }).toThrow('Cannot provide both privateStoragePasswordProvider and walletProvider');
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
    const EXPORT_PASSWORD = 'export-test-password-1234';

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
        db.importPrivateStates(exportData, { password: 'wrong-password-12345' })
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
      const VALID_PASSWORD = 'valid-password-for-test';

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
});

