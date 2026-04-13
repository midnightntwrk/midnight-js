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

import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2 as noblePbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 as nobleSha256 } from '@noble/hashes/sha2.js';
import { randomBytes as nobleRandomBytes } from '@noble/hashes/utils.js';

import type { CryptoBackend } from './crypto-backend';

const AUTH_TAG_LENGTH = 16;

export class NobleCryptoBackend implements CryptoBackend {
  randomBytes(length: number): Uint8Array {
    return nobleRandomBytes(length);
  }

  async sha256(data: Uint8Array): Promise<Uint8Array> {
    return nobleSha256(data);
  }

  async pbkdf2(
    password: Uint8Array,
    salt: Uint8Array,
    iterations: number,
    keyLength: number,
  ): Promise<Uint8Array> {
    return noblePbkdf2(nobleSha256, password, salt, {
      c: iterations,
      dkLen: keyLength,
    });
  }

  async aesGcmEncrypt(
    key: Uint8Array,
    iv: Uint8Array,
    plaintext: Uint8Array,
  ): Promise<{ ciphertext: Uint8Array; authTag: Uint8Array }> {
    const encryptedWithTag = gcm(key, iv).encrypt(plaintext);
    const ciphertext = encryptedWithTag.slice(0, encryptedWithTag.length - AUTH_TAG_LENGTH);
    const authTag = encryptedWithTag.slice(encryptedWithTag.length - AUTH_TAG_LENGTH);
    return { ciphertext, authTag };
  }

  async aesGcmDecrypt(
    key: Uint8Array,
    iv: Uint8Array,
    ciphertext: Uint8Array,
    authTag: Uint8Array,
  ): Promise<Uint8Array> {
    const combined = new Uint8Array(ciphertext.length + authTag.length);
    combined.set(ciphertext, 0);
    combined.set(authTag, ciphertext.length);
    return gcm(key, iv).decrypt(combined);
  }
}
