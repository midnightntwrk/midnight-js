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

import {
  FailEntirely,
  FailFallible,
  SegmentFail,
  SegmentSuccess,
  SucceedEntirely
} from '@midnight-ntwrk/midnight-js-types';
import { describe, expect, test } from 'vitest';

import { IndexerFormattedError } from '../errors';
import type { TransactionResult } from '../gen/graphql';
import {
  type IndexerUtxo,
  isRegularTransaction,
  toSegmentStatus,
  toSegmentStatusMap,
  toTxStatus,
  toUnshieldedBalances,
  toUnshieldedUtxos
} from '../indexer-public-data-provider';

describe('isRegularTransaction', () => {
  test('returns true for object with hash and identifiers array', () => {
    const tx = { hash: 'abc', identifiers: ['id1', 'id2'] };

    expect(isRegularTransaction(tx)).toBe(true);
  });

  test('returns false when identifiers is missing', () => {
    const tx = { hash: 'abc' };

    expect(isRegularTransaction(tx)).toBe(false);
  });

  test('returns false when hash is missing', () => {
    const tx = { identifiers: ['id1'] };

    expect(isRegularTransaction(tx)).toBe(false);
  });

  test('returns false when identifiers is not an array', () => {
    const tx = { hash: 'abc', identifiers: 'not-array' };

    expect(isRegularTransaction(tx)).toBe(false);
  });

  test('returns false for empty object', () => {
    expect(isRegularTransaction({})).toBe(false);
  });
});

describe('toTxStatus', () => {
  test('maps SUCCESS to SucceedEntirely', () => {
    const result: TransactionResult = { status: 'SUCCESS', segments: null };

    expect(toTxStatus(result)).toBe(SucceedEntirely);
  });

  test('maps FAILURE to FailEntirely', () => {
    const result: TransactionResult = { status: 'FAILURE', segments: null };

    expect(toTxStatus(result)).toBe(FailEntirely);
  });

  test('maps PARTIAL_SUCCESS to FailFallible', () => {
    const result: TransactionResult = { status: 'PARTIAL_SUCCESS', segments: null };

    expect(toTxStatus(result)).toBe(FailFallible);
  });

  test('throws for unknown status', () => {
    const result = { status: 'UNKNOWN', segments: null } as unknown as TransactionResult;

    expect(() => toTxStatus(result)).toThrow("Unexpected 'status' value UNKNOWN");
  });
});

describe('toSegmentStatus', () => {
  test('maps true to SegmentSuccess', () => {
    expect(toSegmentStatus(true)).toBe(SegmentSuccess);
  });

  test('maps false to SegmentFail', () => {
    expect(toSegmentStatus(false)).toBe(SegmentFail);
  });
});

describe('toSegmentStatusMap', () => {
  test('returns undefined for SUCCESS status', () => {
    const result: TransactionResult = { status: 'SUCCESS', segments: null };

    expect(toSegmentStatusMap(result)).toBeUndefined();
  });

  test('returns undefined for FAILURE status', () => {
    const result: TransactionResult = { status: 'FAILURE', segments: null };

    expect(toSegmentStatusMap(result)).toBeUndefined();
  });

  test('returns undefined for PARTIAL_SUCCESS with no segments', () => {
    const result: TransactionResult = { status: 'PARTIAL_SUCCESS', segments: null };

    expect(toSegmentStatusMap(result)).toBeUndefined();
  });

  test('returns Map for PARTIAL_SUCCESS with segments', () => {
    const result: TransactionResult = {
      status: 'PARTIAL_SUCCESS',
      segments: [
        { id: 0, success: true },
        { id: 1, success: false },
        { id: 2, success: true }
      ]
    };

    const map = toSegmentStatusMap(result);

    expect(map).toBeInstanceOf(Map);
    expect(map!.get(0)).toBe(SegmentSuccess);
    expect(map!.get(1)).toBe(SegmentFail);
    expect(map!.get(2)).toBe(SegmentSuccess);
    expect(map!.size).toBe(3);
  });
});

describe('toUnshieldedUtxos', () => {
  const utxo: IndexerUtxo = {
    owner: 'abcd1234',
    intentHash: 'hash1234',
    tokenType: 'token01',
    value: '1000'
  };

  test('transforms created and spent utxos', () => {
    const result = toUnshieldedUtxos([utxo], [utxo]);

    expect(result.created).toHaveLength(1);
    expect(result.spent).toHaveLength(1);
    expect(result.created[0].value).toBe(1000n);
    expect(result.created[0].owner).toBe('abcd1234');
    expect(result.created[0].intentHash).toBe('hash1234');
    expect(result.created[0].tokenType).toBe('token01');
  });

  test('handles empty arrays', () => {
    const result = toUnshieldedUtxos([], []);

    expect(result.created).toHaveLength(0);
    expect(result.spent).toHaveLength(0);
  });

  test('converts string value to BigInt', () => {
    const largeUtxo: IndexerUtxo = { ...utxo, value: '99999999999999999999' };

    const result = toUnshieldedUtxos([largeUtxo], []);

    expect(result.created[0].value).toBe(99999999999999999999n);
  });
});

describe('toUnshieldedBalances', () => {
  test('transforms contract balances', () => {
    const balances = [
      { amount: '500', tokenType: 'token01' },
      { amount: '1000', tokenType: 'token02' }
    ];

    const result = toUnshieldedBalances(balances);

    expect(result).toHaveLength(2);
    expect(result[0].balance).toBe(500n);
    expect(result[0].tokenType).toBe('token01');
    expect(result[1].balance).toBe(1000n);
    expect(result[1].tokenType).toBe('token02');
  });

  test('handles empty array', () => {
    const result = toUnshieldedBalances([]);

    expect(result).toHaveLength(0);
  });
});

describe('IndexerFormattedError', () => {
  test('formats single GraphQL error', () => {
    const error = new IndexerFormattedError([{ message: 'Something went wrong' }]);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('Indexer GraphQL error(s)');
    expect(error.message).toContain('Something went wrong');
  });

  test('formats multiple GraphQL errors', () => {
    const error = new IndexerFormattedError([
      { message: 'First error' },
      { message: 'Second error' }
    ]);

    expect(error.message).toContain('First error');
    expect(error.message).toContain('Second error');
  });

  test('preserves cause array', () => {
    const causes = [{ message: 'err1' }, { message: 'err2' }];

    const error = new IndexerFormattedError(causes);

    expect(error.cause).toBe(causes);
  });
});
