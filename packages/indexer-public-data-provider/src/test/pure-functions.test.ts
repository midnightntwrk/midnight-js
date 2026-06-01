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

import {
  IndexerDataError,
  IndexerError,
  IndexerFormattedError,
  IndexerQueryError,
  IndexerSubscriptionDataError
} from '../errors';
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

  test('returns false for a block query result shape', () => {
    const blockQueryResult = { block: { height: 1000, hash: '0xabc' } };

    expect(isRegularTransaction(blockQueryResult)).toBe(false);
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

  test('throws IndexerDataError for unknown status', () => {
    const result = { status: 'UNKNOWN', segments: null } as unknown as TransactionResult;

    expect(() => toTxStatus(result)).toThrow(IndexerDataError);
    expect(() => toTxStatus(result)).toThrow("Unexpected transaction status value: UNKNOWN");
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
  test('formats single GraphQL error with header and numbered prefix', () => {
    const error = new IndexerFormattedError([{ message: 'Something went wrong' }]);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(IndexerError);
    expect(error.name).toBe('IndexerFormattedError');
    expect(error.message).toBe('Indexer GraphQL error(s):\n\t1. Something went wrong');
  });

  test('lists multiple GraphQL errors in original order separated by tab-newline', () => {
    const error = new IndexerFormattedError([
      { message: 'First error' },
      { message: 'Second error' },
      { message: 'Third error' }
    ]);

    expect(error.message).toBe(
      'Indexer GraphQL error(s):\n\t1. First error\n\t2. Second error\n\t3. Third error'
    );
  });

  test('preserves cause array', () => {
    const causes = [{ message: 'err1' }, { message: 'err2' }];

    const error = new IndexerFormattedError(causes);

    expect(error.cause).toBe(causes);
  });
});

describe('IndexerQueryError', () => {
  test('exposes message and name', () => {
    const error = new IndexerQueryError('Query failed');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(IndexerError);
    expect(error.name).toBe('IndexerQueryError');
    expect(error.message).toBe('Query failed');
  });

  test('preserves original error via cause', () => {
    const originalError = new Error('Network unreachable');

    const error = new IndexerQueryError(originalError.message, { cause: originalError });

    expect(error.cause).toBe(originalError);
    expect(error.message).toBe('Network unreachable');
  });
});

describe('IndexerSubscriptionDataError', () => {
  test('describes the missing field in the message', () => {
    const error = new IndexerSubscriptionDataError('blocks');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(IndexerError);
    expect(error.name).toBe('IndexerSubscriptionDataError');
    expect(error.missingField).toBe('blocks');
    expect(error.message).toBe(
      "Expected 'blocks' in indexer subscription data, got null/undefined"
    );
  });
});

describe('IndexerDataError', () => {
  test('exposes message and name', () => {
    const error = new IndexerDataError('Indexer returned malformed payload');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(IndexerError);
    expect(error.name).toBe('IndexerDataError');
    expect(error.message).toBe('Indexer returned malformed payload');
  });
});
