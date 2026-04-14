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

import { NobleCryptoBackend } from '../crypto-backend-noble';
import { WebCryptoCryptoBackend } from '../crypto-backend-webcrypto';

describe('CryptoBackend cross-compatibility', () => {
  const webcrypto = new WebCryptoCryptoBackend();
  const noble = new NobleCryptoBackend();

  const key = new Uint8Array(32);
  key.fill(42);
  const iv = new Uint8Array(12);
  iv.fill(7);
  const plaintext = new TextEncoder().encode('cross-backend test data');

  describe('sha256 produces identical output', () => {
    test('same input hashes match', async () => {
      const input = new TextEncoder().encode('test input for sha256');
      const webcryptoHash = await webcrypto.sha256(input);
      const nobleHash = await noble.sha256(input);
      expect(Buffer.from(webcryptoHash).toString('hex')).toBe(Buffer.from(nobleHash).toString('hex'));
    });
  });

  describe('pbkdf2 produces identical output', () => {
    test('same inputs derive same key', async () => {
      const password = new TextEncoder().encode('Test-Password-123!');
      const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
      const webcryptoKey = await webcrypto.pbkdf2(password, salt, 1000, 32);
      const nobleKey = await noble.pbkdf2(password, salt, 1000, 32);
      expect(Buffer.from(webcryptoKey).toString('hex')).toBe(Buffer.from(nobleKey).toString('hex'));
    });
  });

  describe('AES-GCM encrypt/decrypt interop', () => {
    test('webcrypto encrypts, noble decrypts', async () => {
      const { ciphertext, authTag } = await webcrypto.aesGcmEncrypt(key, iv, plaintext);
      const decrypted = await noble.aesGcmDecrypt(key, iv, ciphertext, authTag);
      expect(new TextDecoder().decode(decrypted)).toBe('cross-backend test data');
    });

    test('noble encrypts, webcrypto decrypts', async () => {
      const { ciphertext, authTag } = await noble.aesGcmEncrypt(key, iv, plaintext);
      const decrypted = await webcrypto.aesGcmDecrypt(key, iv, ciphertext, authTag);
      expect(new TextDecoder().decode(decrypted)).toBe('cross-backend test data');
    });

    test('same inputs produce identical ciphertext', async () => {
      const { ciphertext: wc, authTag: wcTag } = await webcrypto.aesGcmEncrypt(key, iv, plaintext);
      const { ciphertext: nb, authTag: nbTag } = await noble.aesGcmEncrypt(key, iv, plaintext);
      expect(Buffer.from(wc).toString('hex')).toBe(Buffer.from(nb).toString('hex'));
      expect(Buffer.from(wcTag).toString('hex')).toBe(Buffer.from(nbTag).toString('hex'));
    });
  });
});
