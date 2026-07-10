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

import { createHash } from 'node:crypto';

import { PasswordValidationError,type PasswordValidationFailure } from '@midnight-ntwrk/midnight-js-utils';
import { Buffer } from 'buffer';

import { decryptValue, getPasswordFromProvider, StorageEncryption, timingSafeEqual } from '../storage-encryption';

const expectPasswordValidationFailure = async (
  provider: () => string | Promise<string>,
  reason: PasswordValidationFailure
): Promise<void> => {
  let caught: unknown;
  try {
    await getPasswordFromProvider(provider);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(PasswordValidationError);
  if (caught instanceof PasswordValidationError) {
    expect(caught.reason).toBe(reason);
  }
};

const getInstanceFieldValues = (encryption: StorageEncryption): unknown[] =>
  Object.values(encryption as unknown as Record<string, unknown>);

describe('StorageEncryption', () => {
  const testPassword = 'Test-Password-123!';
  const testData = 'sensitive data that needs encryption';

  const V1_FIXTURES = {
    password: 'Test-Password-123!',
    plaintext: 'sensitive data for v1 migration test',
    encrypted: 'AYse8BxWbiRb618I8CQKwLJoGyzx0zddBBQ3LORO2wBSgi/4kHm3CqznHcvmSNPw5Y0wW9XDhweunjM/zyq8cHVQYoS53gzsFYEae5imclcA03IJN2Rr5Gf+z1GNd5J5Vg==',
    salt: '8b1ef01c566e245beb5f08f0240ac0b2681b2cf1d3375d0414372ce44edb0052'
  };

  describe('encrypt and decrypt', () => {
    test('successfully encrypts and decrypts data', async () => {
      const encryption = await StorageEncryption.create(testPassword);

      const encrypted = await encryption.encrypt(testData);
      const decrypted = await encryption.decrypt(encrypted);

      expect(decrypted).toBe(testData);
      expect(decrypted).not.toBe(encrypted);
    });

    test('produces different ciphertext for same plaintext', async () => {
      const encryption = await StorageEncryption.create(testPassword);

      const encrypted1 = await encryption.encrypt(testData);
      const encrypted2 = await encryption.encrypt(testData);

      expect(encrypted1).not.toBe(encrypted2);
      expect(await encryption.decrypt(encrypted1)).toBe(testData);
      expect(await encryption.decrypt(encrypted2)).toBe(testData);
    });

    test('handles empty string', async () => {
      const encryption = await StorageEncryption.create(testPassword);

      const encrypted = await encryption.encrypt('');
      const decrypted = await encryption.decrypt(encrypted);

      expect(decrypted).toBe('');
    });

    test('handles unicode characters', async () => {
      const encryption = await StorageEncryption.create(testPassword);
      const unicodeData = '🔐 Encrypted data with émojis and spëcial çhars 中文';

      const encrypted = await encryption.encrypt(unicodeData);
      const decrypted = await encryption.decrypt(encrypted);

      expect(decrypted).toBe(unicodeData);
    });
  });

  describe('error handling', () => {
    test('throws on wrong password', async () => {
      const encryption1 = await StorageEncryption.create('Correct-Pass-123!');
      const encrypted = await encryption1.encrypt(testData);

      const encryption2 = await StorageEncryption.create('Wrong-Password-1!', { existingSalt: encryption1.getSalt() });

      await expect(encryption2.decrypt(encrypted)).rejects.toThrow();
    });

    test('rejects tampered ciphertext', async () => {
      const encryption = await StorageEncryption.create(testPassword);
      const encrypted = await encryption.encrypt(testData);

      const buffer = Buffer.from(encrypted, 'base64');
      buffer[buffer.length - 1] ^= 0xff;
      const tampered = buffer.toString('base64');

      await expect(encryption.decrypt(tampered)).rejects.toThrow();
    });
  });

  describe('create with Uint8Array salt', () => {
    test('produces working encryption with Uint8Array salt', async () => {
      const salt = new Uint8Array(32);
      globalThis.crypto.getRandomValues(salt);

      const encryption = await StorageEncryption.create(testPassword, { existingSalt: salt });
      const encrypted = await encryption.encrypt(testData);
      const decrypted = await encryption.decrypt(encrypted);

      expect(decrypted).toBe(testData);
    });

    test('Uint8Array salt produces same results as Buffer salt', async () => {
      const rawBytes = new Uint8Array(32);
      globalThis.crypto.getRandomValues(rawBytes);

      const encryptionFromUint8 = await StorageEncryption.create(testPassword, { existingSalt: rawBytes });
      const encryptionFromBuffer = await StorageEncryption.create(testPassword, { existingSalt: Buffer.from(rawBytes) });

      expect(encryptionFromUint8.getSalt()).toEqual(encryptionFromBuffer.getSalt());
    });
  });

  describe('decryptValue', () => {
    test('throws on unrecognized or unencrypted data', async () => {
      const encryption = await StorageEncryption.create(testPassword);
      const plaintext = 'not-encrypted-data';

      await expect(decryptValue(plaintext, encryption, testPassword)).rejects.toThrow(
        'Unrecognized or unencrypted data encountered during decryption'
      );
    });

    test('throws on empty string input', async () => {
      const encryption = await StorageEncryption.create(testPassword);

      await expect(decryptValue('', encryption, testPassword)).rejects.toThrow(
        'Unrecognized or unencrypted data encountered during decryption'
      );
    });

    test('decrypts V2 encrypted data', async () => {
      const encryption = await StorageEncryption.create(testPassword);
      const encrypted = await encryption.encrypt(testData);

      const result = await decryptValue(encrypted, encryption, testPassword);

      expect(result).toBe(testData);
    });

    test('decrypts V1 encrypted data with password', async () => {
      const salt = Buffer.from(V1_FIXTURES.salt, 'hex');
      const encryption = await StorageEncryption.create(V1_FIXTURES.password, { existingSalt: salt });

      const result = await decryptValue(V1_FIXTURES.encrypted, encryption, V1_FIXTURES.password);

      expect(result).toBe(V1_FIXTURES.plaintext);
    });
  });

  describe('isEncrypted', () => {
    test('returns false for empty string without throwing', () => {
      expect(StorageEncryption.isEncrypted('')).toBe(false);
    });

    test('returns false for invalid base64 input without throwing', () => {
      expect(StorageEncryption.isEncrypted('!!!not-base64$$$')).toBe(false);
    });

    test('returns false for plaintext that decodes to a too-short buffer', () => {
      expect(StorageEncryption.isEncrypted('short')).toBe(false);
    });
  });

  describe('version migration', () => {
    test('decrypts v1 encrypted data with 100k iterations using decryptWithPassword', async () => {
      const salt = Buffer.from(V1_FIXTURES.salt, 'hex');
      const encryption = await StorageEncryption.create(V1_FIXTURES.password, { existingSalt: salt });

      const decrypted = await encryption.decryptWithPassword(V1_FIXTURES.encrypted, V1_FIXTURES.password);

      expect(decrypted).toBe(V1_FIXTURES.plaintext);
    });

    test('new encryption uses version 2', async () => {
      const encryption = await StorageEncryption.create(testPassword);

      const encrypted = await encryption.encrypt(testData);
      const buffer = Buffer.from(encrypted, 'base64');

      expect(buffer[0]).toBe(2);
    });

    test('v2 encrypted data can be decrypted', async () => {
      const encryption = await StorageEncryption.create(testPassword);

      const encrypted = await encryption.encrypt(testData);
      const decrypted = await encryption.decrypt(encrypted);

      expect(decrypted).toBe(testData);
    });

    test('detects encryption version correctly', async () => {
      expect(StorageEncryption.getVersion(V1_FIXTURES.encrypted)).toBe(1);

      const encryption = await StorageEncryption.create(testPassword);
      const v2Encrypted = await encryption.encrypt(testData);
      expect(StorageEncryption.getVersion(v2Encrypted)).toBe(2);
    });

    test('decrypt throws when V1 data is encountered without password', async () => {
      const salt = Buffer.from(V1_FIXTURES.salt, 'hex');
      const encryption = await StorageEncryption.create(V1_FIXTURES.password, { existingSalt: salt });

      await expect(encryption.decrypt(V1_FIXTURES.encrypted)).rejects.toThrow(
        'V1 encrypted data requires password for decryption'
      );
    });

    test('decryptWithPassword works for V2 data as well', async () => {
      const encryption = await StorageEncryption.create(testPassword);

      const encrypted = await encryption.encrypt(testData);
      const decrypted = await encryption.decryptWithPassword(encrypted, testPassword);

      expect(decrypted).toBe(testData);
    });

    test('decryptWithPassword rejects V1 data when password is wrong', async () => {
      const salt = Buffer.from(V1_FIXTURES.salt, 'hex');
      const encryption = await StorageEncryption.create(V1_FIXTURES.password, { existingSalt: salt });

      await expect(
        encryption.decryptWithPassword(V1_FIXTURES.encrypted, 'Wrong-Password-1!')
      ).rejects.toThrow();
    });
  });

  describe('password verification', () => {
    test('verifyPassword returns true for correct password', async () => {
      const encryption = await StorageEncryption.create(testPassword);

      expect(await encryption.verifyPassword(testPassword)).toBe(true);
    });

    test('verifyPassword returns false for incorrect password', async () => {
      const encryption = await StorageEncryption.create(testPassword);

      expect(await encryption.verifyPassword('Wrong-Password-1!')).toBe(false);
    });

    test('verifyPassword is case-sensitive', async () => {
      const encryption = await StorageEncryption.create(testPassword);

      expect(await encryption.verifyPassword(testPassword.toLowerCase())).toBe(false);
      expect(await encryption.verifyPassword(testPassword.toUpperCase())).toBe(false);
    });

    test('password is not stored in plaintext', async () => {
      const encryption = await StorageEncryption.create(testPassword);

      const hasPlaintextPassword = getInstanceFieldValues(encryption).some(
        (value) => value === testPassword
      );

      expect(hasPlaintextPassword).toBe(false);
    });

    test('does not retain a fast hash of the password', async () => {
      const encryption = await StorageEncryption.create(testPassword);
      const fastHashHex = createHash('sha256').update(testPassword).digest('hex');
      const fastHashBytes = Buffer.from(fastHashHex, 'hex');

      const leaksFastHash = getInstanceFieldValues(encryption).some((value) => {
        if (typeof value === 'string') {
          return value === fastHashHex;
        }
        if (value instanceof Uint8Array) {
          return value.length === fastHashBytes.length && timingSafeEqual(value, fastHashBytes);
        }
        return false;
      });

      expect(leaksFastHash).toBe(false);
    });

    test('verifyPassword rejects when the salt is the same but password differs', async () => {
      const encryption = await StorageEncryption.create(testPassword);

      const other = await StorageEncryption.create('Wrong-Password-1!', {
        existingSalt: encryption.getSalt()
      });

      expect(await other.verifyPassword(testPassword)).toBe(false);
      expect(await encryption.verifyPassword('Wrong-Password-1!')).toBe(false);
    });
  });

  test('timingSafeEqual returns expected results for matching/mismatched buffers', () => {
    const a = Buffer.from([1, 2, 3, 4, 5]);
    const b = Buffer.from([1, 2, 3, 4, 5]);
    const c = Buffer.from([1, 2, 3, 4, 6]);

    expect(timingSafeEqual(a, b)).toBe(true);
    expect(timingSafeEqual(a, c)).toBe(false);
  });

  test('timingSafeEqual works with Uint8Array inputs', () => {
    const a = new Uint8Array([1, 2, 3, 4, 5]);
    const b = new Uint8Array([1, 2, 3, 4, 5]);
    const c = new Uint8Array([1, 2, 3, 4, 6]);

    expect(timingSafeEqual(a, b)).toBe(true);
    expect(timingSafeEqual(a, c)).toBe(false);
  });

  test('timingSafeEqual throws error for buffers of different lengths', () => {
    const a = Buffer.from([1, 2, 3]);
    const b = Buffer.from([1, 2, 3, 4]);

    expect(() => timingSafeEqual(a, b)).toThrow('Input buffers must have the same byte length');
  });

  test('timingSafeEqual throws error for Uint8Array of different lengths', () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2, 3, 4]);

    expect(() => timingSafeEqual(a, b)).toThrow('Input buffers must have the same byte length');
  });

  test('timingSafeEqual returns true for empty buffers', () => {
    const a = Buffer.from([]);
    const b = Buffer.from([]);
    expect(timingSafeEqual(a, b)).toBe(true);
  });

  describe('getPasswordFromProvider', () => {
    test('propagates PasswordValidationError when provider returns empty string', async () => {
      await expectPasswordValidationFailure(() => '', 'missing');
    });

    test('propagates PasswordValidationError when password is too short', async () => {
      await expectPasswordValidationFailure(() => 'short', 'too_short');
    });

    test('returns password when valid', async () => {
      const validPassword = 'Valid-Password-123!';
      const provider = () => validPassword;

      const result = await getPasswordFromProvider(provider);
      expect(result).toBe(validPassword);
    });

    test('works with async provider', async () => {
      const validPassword = 'Valid-Password-123!';
      const provider = async () => {
        return Promise.resolve(validPassword);
      };

      const result = await getPasswordFromProvider(provider);
      expect(result).toBe(validPassword);
    });

    describe('character class requirements', () => {
      test.each([
        'abcdefghijklmnopqr',
        'ABCDEFGHIJKLMNOPQR',
        '1234567890123456',
        'abcdefgh12345678'
      ])('rejects password "%s" with reason insufficient_classes', async (password) => {
        await expectPasswordValidationFailure(() => password, 'insufficient_classes');
      });

      test.each([
        'aXbYcZ1m2n3p4q5r',
        'aXbYcZ!@mNpQ#$rS',
        'aX1!bY2@cZ3#mN4$'
      ])('accepts password "%s"', async (password) => {
        expect(await getPasswordFromProvider(() => password)).toBe(password);
      });
    });

    describe('repeated character requirements', () => {
      test.each([
        'Paaaa-ssword-1!!',
        '1111111111111111'
      ])('rejects password "%s" with reason repeated_characters', async (password) => {
        await expectPasswordValidationFailure(() => password, 'repeated_characters');
      });

      test('accepts password with exactly 3 consecutive identical characters', async () => {
        const password = 'Paaa-ssword-123!';
        expect(await getPasswordFromProvider(() => password)).toBe(password);
      });
    });

    describe('sequential pattern requirements', () => {
      test.each([
        'Password-123456!',
        'Password-654321!',
        'Password-abcdef!',
        'Password-fedcba!'
      ])('rejects password "%s" with reason sequential_pattern', async (password) => {
        await expectPasswordValidationFailure(() => password, 'sequential_pattern');
      });

      test.each([
        'Xk9$mP2!qR7@nL4#',
        'Pass-abc-XYZ-12!'
      ])('accepts password "%s" (no 4+ char sequences)', async (password) => {
        expect(await getPasswordFromProvider(() => password)).toBe(password);
      });
    });
  });
});

describe('StorageEncryption with noble backend', () => {
  const testPassword = 'Test-Password-123!';
  const testData = 'sensitive data that needs encryption';

  const V1_FIXTURES = {
    password: 'Test-Password-123!',
    plaintext: 'sensitive data for v1 migration test',
    encrypted: 'AYse8BxWbiRb618I8CQKwLJoGyzx0zddBBQ3LORO2wBSgi/4kHm3CqznHcvmSNPw5Y0wW9XDhweunjM/zyq8cHVQYoS53gzsFYEae5imclcA03IJN2Rr5Gf+z1GNd5J5Vg==',
    salt: '8b1ef01c566e245beb5f08f0240ac0b2681b2cf1d3375d0414372ce44edb0052',
  };

  let nobleEncryption: StorageEncryption;

  beforeAll(async () => {
    nobleEncryption = await StorageEncryption.create(testPassword, { cryptoBackend: 'noble' });
  }, 30_000);

  describe('encrypt and decrypt', () => {
    test('successfully encrypts and decrypts data', async () => {
      const encrypted = await nobleEncryption.encrypt(testData);
      const decrypted = await nobleEncryption.decrypt(encrypted);

      expect(decrypted).toBe(testData);
    });

    test('handles unicode characters', async () => {
      const unicodeData = '🔐 Encrypted data with émojis and spëcial çhars 中文';

      const encrypted = await nobleEncryption.encrypt(unicodeData);
      const decrypted = await nobleEncryption.decrypt(encrypted);

      expect(decrypted).toBe(unicodeData);
    });
  });

  describe('V1 backward compatibility', () => {
    test('decrypts V1 encrypted data using decryptWithPassword', async () => {
      const salt = Buffer.from(V1_FIXTURES.salt, 'hex');
      const encryption = await StorageEncryption.create(V1_FIXTURES.password, { existingSalt: salt, cryptoBackend: 'noble' });

      const decrypted = await encryption.decryptWithPassword(V1_FIXTURES.encrypted, V1_FIXTURES.password);

      expect(decrypted).toBe(V1_FIXTURES.plaintext);
    }, 30_000);
  });

  describe('cross-backend data interop', () => {
    test('data encrypted with webcrypto can be decrypted with noble', async () => {
      const webcryptoEncryption = await StorageEncryption.create(testPassword, { cryptoBackend: 'webcrypto' });
      const encrypted = await webcryptoEncryption.encrypt(testData);

      const interopNoble = await StorageEncryption.create(testPassword, {
        existingSalt: webcryptoEncryption.getSalt(),
        cryptoBackend: 'noble',
      });
      const decrypted = await interopNoble.decrypt(encrypted);

      expect(decrypted).toBe(testData);
    }, 30_000);

    test('data encrypted with noble can be decrypted with webcrypto', async () => {
      const encrypted = await nobleEncryption.encrypt(testData);

      const webcryptoEncryption = await StorageEncryption.create(testPassword, {
        existingSalt: nobleEncryption.getSalt(),
        cryptoBackend: 'webcrypto',
      });
      const decrypted = await webcryptoEncryption.decrypt(encrypted);

      expect(decrypted).toBe(testData);
    });
  });
});
