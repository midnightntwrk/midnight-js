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

import { WebCryptoCryptoBackend } from '../crypto-backend-webcrypto';

describe('WebCryptoCryptoBackend', () => {
  const backend = new WebCryptoCryptoBackend();

  describe('randomBytes', () => {
    test('returns Uint8Array of requested length', () => {
      const result = backend.randomBytes(32);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32);
    });

    test('produces non-deterministic output', () => {
      const a = backend.randomBytes(32);
      const b = backend.randomBytes(32);
      expect(Buffer.from(a).toString('hex')).not.toBe(Buffer.from(b).toString('hex'));
    });
  });

  describe('sha256', () => {
    test('produces correct hash for known input', async () => {
      const input = new TextEncoder().encode('hello');
      const result = await backend.sha256(input);
      const hex = Buffer.from(result).toString('hex');
      expect(hex).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    test('produces 32-byte output', async () => {
      const input = new TextEncoder().encode('test');
      const result = await backend.sha256(input);
      expect(result.length).toBe(32);
    });
  });

  describe('pbkdf2', () => {
    test('derives key of requested length', async () => {
      const password = new TextEncoder().encode('password');
      const salt = new Uint8Array(32);
      const result = await backend.pbkdf2(password, salt, 1000, 32);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32);
    });

    test('same inputs produce same output', async () => {
      const password = new TextEncoder().encode('password');
      const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const a = await backend.pbkdf2(password, salt, 1000, 32);
      const b = await backend.pbkdf2(password, salt, 1000, 32);
      expect(Buffer.from(a).toString('hex')).toBe(Buffer.from(b).toString('hex'));
    });

    test('different passwords produce different keys', async () => {
      const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const a = await backend.pbkdf2(new TextEncoder().encode('password1'), salt, 1000, 32);
      const b = await backend.pbkdf2(new TextEncoder().encode('password2'), salt, 1000, 32);
      expect(Buffer.from(a).toString('hex')).not.toBe(Buffer.from(b).toString('hex'));
    });
  });

  describe('aesGcmEncrypt and aesGcmDecrypt', () => {
    test('encrypt then decrypt roundtrip', async () => {
      const key = new Uint8Array(32);
      key.fill(1);
      const iv = new Uint8Array(12);
      iv.fill(2);
      const plaintext = new TextEncoder().encode('secret message');

      const { ciphertext, authTag } = await backend.aesGcmEncrypt(key, iv, plaintext);
      expect(ciphertext.length).toBeGreaterThan(0);
      expect(authTag.length).toBe(16);

      const decrypted = await backend.aesGcmDecrypt(key, iv, ciphertext, authTag);
      expect(new TextDecoder().decode(decrypted)).toBe('secret message');
    });

    test('decrypt fails with wrong key', async () => {
      const key = new Uint8Array(32);
      key.fill(1);
      const wrongKey = new Uint8Array(32);
      wrongKey.fill(9);
      const iv = new Uint8Array(12);
      const plaintext = new TextEncoder().encode('secret');

      const { ciphertext, authTag } = await backend.aesGcmEncrypt(key, iv, plaintext);
      await expect(backend.aesGcmDecrypt(wrongKey, iv, ciphertext, authTag)).rejects.toThrow();
    });

    test('decrypt fails with tampered ciphertext', async () => {
      const key = new Uint8Array(32);
      key.fill(1);
      const iv = new Uint8Array(12);
      const plaintext = new TextEncoder().encode('secret');

      const { ciphertext, authTag } = await backend.aesGcmEncrypt(key, iv, plaintext);
      ciphertext[0] ^= 0xff;
      await expect(backend.aesGcmDecrypt(key, iv, ciphertext, authTag)).rejects.toThrow();
    });
  });
});
