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

import { describe, expect, it } from 'vitest';

import { isValidSigningKey } from '../signing-key-utils';

describe('isValidSigningKey', () => {
  it.each([
    ['schnorr key', { tag: 'schnorr', value: 'ab'.repeat(32) }],
    ['ecdsa key', { tag: 'ecdsa', value: 'cd'.repeat(32) }],
    ['uppercase hex value', { tag: 'schnorr', value: 'AB'.repeat(32) }]
  ])('accepts a well-formed %s', (_label, key) => {
    expect(isValidSigningKey(key)).toBe(true);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['plain object without tag', { sk: 'ab'.repeat(32) }],
    ['legacy hex string', 'ab'.repeat(32)],
    ['number', 12345],
    ['array', ['ab'.repeat(32)]],
    ['unknown tag', { tag: 'rsa', value: 'ab'.repeat(32) }],
    ['missing value', { tag: 'schnorr' }],
    ['non-hex value', { tag: 'schnorr', value: 'zz'.repeat(32) }],
    ['odd-length value', { tag: 'schnorr', value: 'a'.repeat(63) }],
    ['62-char value', { tag: 'schnorr', value: 'ab'.repeat(31) }],
    ['66-char value', { tag: 'ecdsa', value: 'cd'.repeat(33) }],
    ['short value', { tag: 'schnorr', value: 'abcdef' }],
    ['empty value', { tag: 'schnorr', value: '' }]
  ])('rejects %s', (_label, key) => {
    expect(isValidSigningKey(key)).toBe(false);
  });
});
