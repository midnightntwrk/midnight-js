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

import { describe, expect, it } from 'vitest';

import { isValidSigningKey } from '../signing-key-utils';

describe('isValidSigningKey', () => {
  it.each([
    ['schnorr key', { tag: 'schnorr', value: '0102030a1b2c3d4e5f' }],
    ['ecdsa key', { tag: 'ecdsa', value: 'deadbeef' }],
    ['minimum length value', { tag: 'schnorr', value: 'abcdef' }]
  ])('accepts a well-formed %s', (_label, key) => {
    expect(isValidSigningKey(key)).toBe(true);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['plain object without tag', { sk: 'deadbeef' }],
    ['legacy hex string', 'deadbeef'],
    ['number', 12345],
    ['array', ['deadbeef']],
    ['unknown tag', { tag: 'rsa', value: 'deadbeef' }],
    ['missing value', { tag: 'schnorr' }],
    ['non-hex value', { tag: 'schnorr', value: 'zz'.repeat(8) }],
    ['odd-length value', { tag: 'schnorr', value: 'abcde' }],
    ['too-short value', { tag: 'schnorr', value: 'ab' }],
    ['empty value', { tag: 'schnorr', value: '' }]
  ])('rejects %s', (_label, key) => {
    expect(isValidSigningKey(key)).toBe(false);
  });
});
