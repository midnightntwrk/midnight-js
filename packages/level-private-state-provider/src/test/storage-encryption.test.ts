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

import { getPasswordFromProvider, StorageEncryption } from '../storage-encryption';

describe('StorageEncryption', () => {
  const testPassword = 'test-password-123';
  const testData = 'sensitive data that needs encryption';

  describe('encrypt and decrypt', () => {
    test('successfully encrypts and decrypts data', () => {
      const encryption = new StorageEncryption(testPassword);

      const encrypted = encryption.encrypt(testData);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(testData);
      expect(decrypted).not.toBe(encrypted);
    });

    test('produces different ciphertext for same plaintext', () => {
      const encryption = new StorageEncryption(testPassword);

      const encrypted1 = encryption.encrypt(testData);
      const encrypted2 = encryption.encrypt(testData);

      expect(encrypted1).not.toBe(encrypted2);
      expect(encryption.decrypt(encrypted1)).toBe(testData);
      expect(encryption.decrypt(encrypted2)).toBe(testData);
    });

    test('handles empty string', () => {
      const encryption = new StorageEncryption(testPassword);

      const encrypted = encryption.encrypt('');
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe('');
    });

    test('handles unicode characters', () => {
      const encryption = new StorageEncryption(testPassword);
      const unicodeData = '🔐 Encrypted data with émojis and spëcial çhars 中文';

      const encrypted = encryption.encrypt(unicodeData);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(unicodeData);
    });
  });

  describe('error handling', () => {
    test('throws on wrong password', () => {
      const encryption1 = new StorageEncryption('password1');
      const encrypted = encryption1.encrypt(testData);

      const encryption2 = new StorageEncryption('password2', encryption1.getSalt());

      expect(() => encryption2.decrypt(encrypted)).toThrow();
    });
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
      const validPassword = 'this-is-a-valid-password-123';
      const provider = () => validPassword;

      const result = await getPasswordFromProvider(provider);
      expect(result).toBe(validPassword);
    });

    test('works with async provider', async () => {
      const validPassword = 'this-is-a-valid-password-123';
      const provider = async () => {
        return Promise.resolve(validPassword);
      };

      const result = await getPasswordFromProvider(provider);
      expect(result).toBe(validPassword);
    });
  });
});
