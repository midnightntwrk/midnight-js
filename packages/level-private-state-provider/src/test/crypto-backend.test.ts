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

import { resolveCryptoBackend } from '../crypto-backend';
import { NobleCryptoBackend } from '../crypto-backend-noble';
import { WebCryptoCryptoBackend } from '../crypto-backend-webcrypto';

describe('resolveCryptoBackend', () => {
  test('returns NobleCryptoBackend when noble is requested', () => {
    const backend = resolveCryptoBackend('noble');
    expect(backend).toBeInstanceOf(NobleCryptoBackend);
  });

  test('returns WebCryptoCryptoBackend when webcrypto is requested', () => {
    const backend = resolveCryptoBackend('webcrypto');
    expect(backend).toBeInstanceOf(WebCryptoCryptoBackend);
  });

  test('auto-detects WebCrypto when available (default in Node.js)', () => {
    const backend = resolveCryptoBackend();
    expect(backend).toBeInstanceOf(WebCryptoCryptoBackend);
  });

  test('throws when webcrypto requested but unavailable', () => {
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    try {
      expect(() => resolveCryptoBackend('webcrypto')).toThrow(
        'Web Crypto API is not available',
      );
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: originalCrypto, configurable: true });
    }
  });

  test('falls back to noble when WebCrypto unavailable and no preference', () => {
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    try {
      const backend = resolveCryptoBackend();
      expect(backend).toBeInstanceOf(NobleCryptoBackend);
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: originalCrypto, configurable: true });
    }
  });
});
