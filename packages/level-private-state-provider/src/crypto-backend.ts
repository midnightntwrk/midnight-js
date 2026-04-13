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

import { NobleCryptoBackend } from './crypto-backend-noble';
import { WebCryptoCryptoBackend } from './crypto-backend-webcrypto';

export interface CryptoBackend {
  randomBytes(length: number): Uint8Array;
  sha256(data: Uint8Array): Promise<Uint8Array>;
  pbkdf2(
    password: Uint8Array,
    salt: Uint8Array,
    iterations: number,
    keyLength: number,
  ): Promise<Uint8Array>;
  aesGcmEncrypt(
    key: Uint8Array,
    iv: Uint8Array,
    plaintext: Uint8Array,
  ): Promise<{ ciphertext: Uint8Array; authTag: Uint8Array }>;
  aesGcmDecrypt(
    key: Uint8Array,
    iv: Uint8Array,
    ciphertext: Uint8Array,
    authTag: Uint8Array,
  ): Promise<Uint8Array>;
}

export type CryptoBackendType = 'webcrypto' | 'noble';

export const isWebCryptoAvailable = (): boolean =>
  typeof globalThis.crypto !== 'undefined' &&
  typeof globalThis.crypto.subtle !== 'undefined';

export const resolveCryptoBackend = (preference?: CryptoBackendType): CryptoBackend => {
  if (preference === 'noble') {
    return new NobleCryptoBackend();
  }
  if (preference === 'webcrypto') {
    if (!isWebCryptoAvailable()) {
      throw new Error(
        'Web Crypto API is not available. Use the \'noble\' crypto backend or run in a secure context (HTTPS or localhost).',
      );
    }
    return new WebCryptoCryptoBackend();
  }

  if (isWebCryptoAvailable()) {
    return new WebCryptoCryptoBackend();
  }
  return new NobleCryptoBackend();
};
