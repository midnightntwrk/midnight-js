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

import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { ContractEventType } from '@midnight-ntwrk/midnight-js-types';
import { describe, expect, test } from 'vitest';

import { IndexerProviderConfigError } from '../errors';
import { buildQueryVariables, buildSubscriptionVariables } from '../events-filter';

const ADDRESS = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as ContractAddress;
const DEFAULT_LIMIT = 100;

describe('buildQueryVariables - eventType translation', () => {
  const expectations: [ContractEventType, string][] = [
    ['ShieldedSpend', 'SHIELDED_SPEND'],
    ['ShieldedReceive', 'SHIELDED_RECEIVE'],
    ['ShieldedMint', 'SHIELDED_MINT'],
    ['ShieldedBurn', 'SHIELDED_BURN'],
    ['UnshieldedSpend', 'UNSHIELDED_SPEND'],
    ['UnshieldedReceive', 'UNSHIELDED_RECEIVE'],
    ['UnshieldedMint', 'UNSHIELDED_MINT'],
    ['UnshieldedBurn', 'UNSHIELDED_BURN'],
    ['Paused', 'PAUSED'],
    ['Unpaused', 'UNPAUSED'],
    ['Misc', 'MISC']
  ];

  test.each(expectations)('translates %s to %s', (pascal, screaming) => {
    const vars = buildQueryVariables({ contractAddress: ADDRESS, types: [pascal] }, undefined, DEFAULT_LIMIT);
    expect(vars.filter.types).toEqual([screaming]);
  });

  test('throws on an unknown eventType', () => {
    expect(() =>
      buildQueryVariables(
        { contractAddress: ADDRESS, types: ['Gremlin' as ContractEventType] },
        undefined,
        DEFAULT_LIMIT
      )
    ).toThrow(IndexerProviderConfigError);
  });

  test('omitted types yields null (all types)', () => {
    const vars = buildQueryVariables({ contractAddress: ADDRESS }, undefined, DEFAULT_LIMIT);
    expect(vars.filter.types).toBeNull();
  });
});

describe('buildQueryVariables - empty types rejection', () => {
  test('types: [] throws', () => {
    expect(() => buildQueryVariables({ contractAddress: ADDRESS, types: [] }, undefined, DEFAULT_LIMIT)).toThrow(
      IndexerProviderConfigError
    );
  });
});

describe('buildQueryVariables - contractAddress validation', () => {
  test('invalid address throws synchronously', () => {
    expect(() => buildQueryVariables({ contractAddress: 'not-hex' as ContractAddress }, undefined, DEFAULT_LIMIT)).toThrow();
  });
});

describe('buildQueryVariables - fieldPrefixes acceptance rules', () => {
  test('accepted for all-standard types', () => {
    const vars = buildQueryVariables(
      { contractAddress: ADDRESS, types: ['ShieldedSpend'], fieldPrefixes: [{ fieldName: 'nullifier', prefix: 'ab' }] },
      undefined,
      DEFAULT_LIMIT
    );
    expect(vars.filter.fieldPrefixes).toEqual([{ fieldName: 'nullifier', prefix: 'ab' }]);
  });

  test('throws for ["Misc"]', () => {
    expect(() =>
      buildQueryVariables(
        { contractAddress: ADDRESS, types: ['Misc'], fieldPrefixes: [{ fieldName: 'name', prefix: 'ab' }] },
        undefined,
        DEFAULT_LIMIT
      )
    ).toThrow(IndexerProviderConfigError);
  });

  test('throws for ["ShieldedSpend","Misc"]', () => {
    expect(() =>
      buildQueryVariables(
        {
          contractAddress: ADDRESS,
          types: ['ShieldedSpend', 'Misc'],
          fieldPrefixes: [{ fieldName: 'nullifier', prefix: 'ab' }]
        },
        undefined,
        DEFAULT_LIMIT
      )
    ).toThrow(IndexerProviderConfigError);
  });

  test('throws when types is omitted (implicit all)', () => {
    expect(() =>
      buildQueryVariables(
        { contractAddress: ADDRESS, fieldPrefixes: [{ fieldName: 'nullifier', prefix: 'ab' }] },
        undefined,
        DEFAULT_LIMIT
      )
    ).toThrow(IndexerProviderConfigError);
  });
});

describe('buildQueryVariables - fieldName allow-list', () => {
  const validCases: [ContractEventType, string][] = [
    ['ShieldedSpend', 'nullifier'],
    ['ShieldedMint', 'commitment'],
    ['ShieldedMint', 'domainSep'],
    ['ShieldedBurn', 'nullifier'],
    ['UnshieldedSpend', 'sender'],
    ['UnshieldedSpend', 'tokenType'],
    ['UnshieldedMint', 'domainSep'],
    ['UnshieldedBurn', 'sender']
  ];

  test.each(validCases)('accepts indexed field %s.%s', (type, fieldName) => {
    const vars = buildQueryVariables(
      { contractAddress: ADDRESS, types: [type], fieldPrefixes: [{ fieldName, prefix: 'ab' }] },
      undefined,
      DEFAULT_LIMIT
    );
    expect(vars.filter.fieldPrefixes).toEqual([{ fieldName, prefix: 'ab' }]);
  });

  test('throws on a field not indexed for the variant', () => {
    expect(() =>
      buildQueryVariables(
        { contractAddress: ADDRESS, types: ['ShieldedSpend'], fieldPrefixes: [{ fieldName: 'commitment', prefix: 'ab' }] },
        undefined,
        DEFAULT_LIMIT
      )
    ).toThrow(IndexerProviderConfigError);
  });

  test('throws when fieldName is not indexed for EVERY filtered type', () => {
    // nullifier is indexed on ShieldedSpend but not on ShieldedMint.
    expect(() =>
      buildQueryVariables(
        {
          contractAddress: ADDRESS,
          types: ['ShieldedSpend', 'ShieldedMint'],
          fieldPrefixes: [{ fieldName: 'nullifier', prefix: 'ab' }]
        },
        undefined,
        DEFAULT_LIMIT
      )
    ).toThrow(IndexerProviderConfigError);
  });

  test('rejects recipient/ciphertext (conservative allow-list, spec §3.2)', () => {
    expect(() =>
      buildQueryVariables(
        { contractAddress: ADDRESS, types: ['UnshieldedReceive'], fieldPrefixes: [{ fieldName: 'recipient', prefix: 'ab' }] },
        undefined,
        DEFAULT_LIMIT
      )
    ).toThrow(IndexerProviderConfigError);
    expect(() =>
      buildQueryVariables(
        { contractAddress: ADDRESS, types: ['ShieldedReceive'], fieldPrefixes: [{ fieldName: 'ciphertext', prefix: 'ab' }] },
        undefined,
        DEFAULT_LIMIT
      )
    ).toThrow(IndexerProviderConfigError);
  });
});

describe('buildQueryVariables - pagination and bounds', () => {
  test('applies default limit when page omitted', () => {
    const vars = buildQueryVariables({ contractAddress: ADDRESS }, undefined, DEFAULT_LIMIT);
    expect(vars.limit).toBe(DEFAULT_LIMIT);
    expect(vars.offset).toBeNull();
  });

  test('forwards explicit limit/offset', () => {
    const vars = buildQueryVariables({ contractAddress: ADDRESS }, { limit: 10, offset: 20 }, DEFAULT_LIMIT);
    expect(vars.limit).toBe(10);
    expect(vars.offset).toBe(20);
  });

  test('forwards fromBlock/toBlock/transactionHash', () => {
    const vars = buildQueryVariables(
      { contractAddress: ADDRESS, fromBlock: 5, toBlock: 9, transactionHash: 'aa' },
      undefined,
      DEFAULT_LIMIT
    );
    expect(vars.filter.fromBlock).toBe(5);
    expect(vars.filter.toBlock).toBe(9);
    expect(vars.filter.transactionHash).toBe('aa');
  });
});

describe('buildSubscriptionVariables - cursor mapping', () => {
  test('{ fromId } maps to the id arg, not filter.fromBlock', () => {
    const vars = buildSubscriptionVariables({ contractAddress: ADDRESS }, { startAt: { fromId: 12 } });
    expect(vars.id).toBe(12);
    expect(vars.filter.fromBlock).toBeNull();
  });

  test('{ fromBlock } maps to filter.fromBlock, not the id arg', () => {
    const vars = buildSubscriptionVariables({ contractAddress: ADDRESS }, { startAt: { fromBlock: 33 } });
    expect(vars.filter.fromBlock).toBe(33);
    expect(vars.id).toBeNull();
  });

  test('omitted startAt sends neither', () => {
    const vars = buildSubscriptionVariables({ contractAddress: ADDRESS });
    expect(vars.id).toBeNull();
    expect(vars.filter.fromBlock).toBeNull();
  });

  test('forwards toBlock', () => {
    const vars = buildSubscriptionVariables({ contractAddress: ADDRESS, toBlock: 77 });
    expect(vars.filter.toBlock).toBe(77);
  });
});
