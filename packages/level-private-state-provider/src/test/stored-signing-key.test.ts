/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
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

import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { MidnightJsError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { PROVIDER_ERROR_CATEGORIES, PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-types';

import { readStoredSigningKey, StoredSigningKeyFormatError } from '../stored-signing-key';

describe('readStoredSigningKey', () => {
  const ADDRESS = 'test-contract-address' as ContractAddress;
  const LEGACY_KEY = 'ab'.repeat(32);

  test.each([
    ['lowercase', LEGACY_KEY],
    ['uppercase', 'AB'.repeat(32)]
  ])('wraps a 4.x bare %s 64-char hex key as a schnorr key', (_case, stored) => {
    const result = readStoredSigningKey(stored, ADDRESS);

    expect(result).toEqual({ tag: 'schnorr', value: stored });
  });

  test.each([
    ['schnorr', { tag: 'schnorr', value: LEGACY_KEY }],
    ['ecdsa', { tag: 'ecdsa', value: 'cd'.repeat(32) }]
  ])('returns a structured %s key unchanged', (_kind, stored) => {
    const result = readStoredSigningKey(stored, ADDRESS);

    expect(result).toEqual(stored);
  });

  test.each([
    ['62-char hex string', 'ab'.repeat(31)],
    ['66-char hex string', 'ab'.repeat(33)],
    ['structured key with a 62-char value', { tag: 'schnorr', value: 'ab'.repeat(31) }],
    ['64-char non-hex string', 'zz'.repeat(32)],
    ['empty string', ''],
    ['object with unknown tag', { tag: 'rsa', value: LEGACY_KEY }],
    ['object without value', { tag: 'schnorr' }],
    ['null', null],
    ['number', 12345]
  ])('refuses %s with StoredSigningKeyFormatError', (_reason, stored) => {
    expect(() => readStoredSigningKey(stored, ADDRESS)).toThrow(StoredSigningKeyFormatError);
  });

  test('names the address and never the stored value', () => {
    const storedValue = 'ef'.repeat(31);

    const error = ((): unknown => {
      try {
        readStoredSigningKey(storedValue, ADDRESS);
      } catch (caught) {
        return caught;
      }
      return undefined;
    })();

    expect(error).toBeInstanceOf(StoredSigningKeyFormatError);
    if (error instanceof StoredSigningKeyFormatError) {
      expect(error.contractAddress).toBe(ADDRESS);
      expect(error.message).toContain(ADDRESS);
      expect(error.message).not.toContain(storedValue);
    }
  });

  test('is a MidnightJsError with the stored-signing-key code and its category', () => {
    const error = new StoredSigningKeyFormatError(ADDRESS);

    expect(error).toBeInstanceOf(MidnightJsError);
    expect(error.code).toBe(PROVIDER_ERROR_CODES.STORED_SIGNING_KEY_INVALID);
    expect(error.category).toBe(PROVIDER_ERROR_CATEGORIES[PROVIDER_ERROR_CODES.STORED_SIGNING_KEY_INVALID]);
    expect(error.category).toBe('INTEGRITY');
  });
});
