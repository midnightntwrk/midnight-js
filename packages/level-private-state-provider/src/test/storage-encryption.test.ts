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

import { Buffer } from 'buffer';

import { decryptValue, getPasswordFromProvider, StorageEncryption, timingSafeEqual } from '../storage-encryption';

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
    test('passes through unencrypted data as-is', async () => {
      const encryption = await StorageEncryption.create(testPassword);
      const plaintext = 'not-encrypted-data';

      const result = await decryptValue(plaintext, encryption, testPassword);

      expect(result).toBe(plaintext);
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

      const encryptionAsRecord = encryption as unknown as Record<string, unknown>;
      const allValues = Object.values(encryptionAsRecord);
      const hasPlaintextPassword = allValues.some(
        (value) => value === testPassword
      );

      expect(hasPlaintextPassword).toBe(false);
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
    test('throws error when password provider returns empty string', async () => {
      const provider = () => '';

      await expect(getPasswordFromProvider(provider)).rejects.toThrow('Password is required');
    });

    test('throws error when password is too short', async () => {
      const provider = () => 'short';

      await expect(getPasswordFromProvider(provider)).rejects.toThrow('must be at least 16 characters long');
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
      test('rejects password with only lowercase letters', async () => {
        const provider = () => 'abcdefghijklmnopqr';

        await expect(getPasswordFromProvider(provider)).rejects.toThrow(
          'Password must contain at least 3 of: uppercase letters, lowercase letters, digits, special characters'
        );
      });

      test('rejects password with only uppercase letters', async () => {
        const provider = () => 'ABCDEFGHIJKLMNOPQR';

        await expect(getPasswordFromProvider(provider)).rejects.toThrow(
          'Password must contain at least 3 of: uppercase letters, lowercase letters, digits, special characters'
        );
      });

      test('rejects password with only digits', async () => {
        const provider = () => '1234567890123456';

        await expect(getPasswordFromProvider(provider)).rejects.toThrow(
          'Password must contain at least 3 of: uppercase letters, lowercase letters, digits, special characters'
        );
      });

      test('rejects password with only two character classes (lowercase + digits)', async () => {
        const provider = () => 'abcdefgh12345678';

        await expect(getPasswordFromProvider(provider)).rejects.toThrow(
          'Password must contain at least 3 of: uppercase letters, lowercase letters, digits, special characters'
        );
      });

      test('accepts password with three character classes (lowercase + uppercase + digits)', async () => {
        const provider = () => 'aXbYcZ1m2n3p4q5r';

        const result = await getPasswordFromProvider(provider);
        expect(result).toBe('aXbYcZ1m2n3p4q5r');
      });

      test('accepts password with three character classes (lowercase + uppercase + special)', async () => {
        const provider = () => 'aXbYcZ!@mNpQ#$rS';

        const result = await getPasswordFromProvider(provider);
        expect(result).toBe('aXbYcZ!@mNpQ#$rS');
      });

      test('accepts password with all four character classes', async () => {
        const provider = () => 'aX1!bY2@cZ3#mN4$';

        const result = await getPasswordFromProvider(provider);
        expect(result).toBe('aX1!bY2@cZ3#mN4$');
      });
    });

    describe('repeated character requirements', () => {
      test('rejects password with more than 3 consecutive identical characters', async () => {
        const provider = () => 'Paaaa-ssword-1!!';

        await expect(getPasswordFromProvider(provider)).rejects.toThrow(
          'Password contains too many repeated characters'
        );
      });

      test('rejects password of all identical characters', async () => {
        const provider = () => '1111111111111111';

        await expect(getPasswordFromProvider(provider)).rejects.toThrow(
          'Password contains too many repeated characters'
        );
      });

      test('accepts password with exactly 3 consecutive identical characters', async () => {
        const provider = () => 'Paaa-ssword-123!';

        const result = await getPasswordFromProvider(provider);
        expect(result).toBe('Paaa-ssword-123!');
      });
    });

    describe('sequential pattern requirements', () => {
      test('rejects password with ascending numeric sequence', async () => {
        const provider = () => 'Password-123456!';

        await expect(getPasswordFromProvider(provider)).rejects.toThrow(
          'Password contains sequential patterns'
        );
      });

      test('rejects password with descending numeric sequence', async () => {
        const provider = () => 'Password-654321!';

        await expect(getPasswordFromProvider(provider)).rejects.toThrow(
          'Password contains sequential patterns'
        );
      });

      test('rejects password with ascending letter sequence', async () => {
        const provider = () => 'Password-abcdef!';

        await expect(getPasswordFromProvider(provider)).rejects.toThrow(
          'Password contains sequential patterns'
        );
      });

      test('rejects password with descending letter sequence', async () => {
        const provider = () => 'Password-fedcba!';

        await expect(getPasswordFromProvider(provider)).rejects.toThrow(
          'Password contains sequential patterns'
        );
      });

      test('accepts password with non-sequential characters', async () => {
        const provider = () => 'Xk9$mP2!qR7@nL4#';

        const result = await getPasswordFromProvider(provider);
        expect(result).toBe('Xk9$mP2!qR7@nL4#');
      });

      test('accepts password with short sequences (3 chars is ok)', async () => {
        const provider = () => 'Pass-abc-XYZ-12!';

        const result = await getPasswordFromProvider(provider);
        expect(result).toBe('Pass-abc-XYZ-12!');
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
