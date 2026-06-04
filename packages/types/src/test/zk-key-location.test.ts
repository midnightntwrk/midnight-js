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

import { encodeContractKeyLocation, hashVerifierKey, parseContractKeyLocation } from '../zk-key-location';

const ADDRESS = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const VK_HASH = 'a'.repeat(64);

describe('hashVerifierKey', () => {
  // NIST / well-known SHA-256 vectors.
  it.each([
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    [
      'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'
    ],
    [
      'The quick brown fox jumps over the lazy dog',
      'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592'
    ]
  ])('hashes %j to the expected SHA-256 digest', (input, expected) => {
    expect(hashVerifierKey(new TextEncoder().encode(input))).toEqual(expected);
  });

  it('hashes inputs spanning many blocks', () => {
    // 200 bytes: exercises multi-block compression and the length encoding.
    expect(hashVerifierKey(new Uint8Array(200))).toEqual(
      '6d9c54dee5660c46886f32d80e57e9dd0ffa57ee0cd2a762b036d9c8e0c3a33a'
    );
  });
});

describe('encodeContractKeyLocation / parseContractKeyLocation', () => {
  it('round-trips a canonical location', () => {
    const location = { contractAddress: ADDRESS, circuitId: 'transfer', verifierKeyHash: VK_HASH };
    expect(parseContractKeyLocation(encodeContractKeyLocation(location))).toEqual(location);
  });

  it('encodes to the documented grammar', () => {
    expect(encodeContractKeyLocation({ contractAddress: ADDRESS, circuitId: 'get_v', verifierKeyHash: VK_HASH })).toEqual(
      `contract:${ADDRESS}/get_v?vk=${VK_HASH}`
    );
  });

  it.each([
    ['a protocol builtin', 'midnight/zswap/spend'],
    ['a bare circuit name', 'transfer'],
    ['the wasm default', 'dummy'],
    ['a non-hex address', `contract:not-hex/transfer?vk=${VK_HASH}`],
    ['a missing vk parameter', `contract:${ADDRESS}/transfer`],
    ['a short vk hash', `contract:${ADDRESS}/transfer?vk=${'a'.repeat(63)}`],
    ['an uppercase vk hash', `contract:${ADDRESS}/transfer?vk=${'A'.repeat(64)}`],
    ['a circuit containing a slash', `contract:${ADDRESS}/a/b?vk=${VK_HASH}`]
  ])('does not parse %s', (_description, location) => {
    expect(parseContractKeyLocation(location)).toBeUndefined();
  });

  it.each([
    ['a non-hex address', { contractAddress: 'not-hex', circuitId: 'transfer', verifierKeyHash: VK_HASH }],
    ['a circuit containing "/"', { contractAddress: ADDRESS, circuitId: 'a/b', verifierKeyHash: VK_HASH }],
    ['a circuit containing "?"', { contractAddress: ADDRESS, circuitId: 'a?b', verifierKeyHash: VK_HASH }],
    ['an empty circuit', { contractAddress: ADDRESS, circuitId: '', verifierKeyHash: VK_HASH }],
    ['a malformed vk hash', { contractAddress: ADDRESS, circuitId: 'transfer', verifierKeyHash: 'abc' }]
  ])('throws when encoding %s', (_description, location) => {
    expect(() => encodeContractKeyLocation(location)).toThrow(/Cannot encode contract key location/);
  });
});
