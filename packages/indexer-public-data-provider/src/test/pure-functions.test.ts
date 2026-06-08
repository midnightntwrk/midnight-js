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
  IndexerProviderConfigError,
  IndexerQueryError,
  IndexerSubscriptionDataError
} from '../errors';
import type { TransactionResult } from '../gen/graphql';
import {
  correlateDeployTxId,
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

    let thrown: unknown;
    try { toTxStatus(result); } catch (e) { thrown = e; }

    expect(thrown).toBeInstanceOf(IndexerDataError);
    const error = thrown as IndexerDataError;
    expect(error.context).toEqual({ kind: 'unknown-status', value: 'UNKNOWN' });
    expect(error.message).toBe('Unexpected transaction status value: UNKNOWN');
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

  test('exposes the underlying errors array', () => {
    const graphqlErrors = [{ message: 'err1' }, { message: 'err2' }];

    const error = new IndexerFormattedError(graphqlErrors);

    expect(error.errors).toBe(graphqlErrors);
    expect(error.cause).toBeUndefined();
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

describe('correlateDeployTxId', () => {
  const targetAddress = '0xdeadbeef' as ContractAddress;

  test('returns the identifier at the index of the matching contract action', () => {
    const txId = correlateDeployTxId(
      targetAddress,
      [{ address: '0xaaaa' }, { address: targetAddress }, { address: '0xbbbb' }],
      ['id-a', 'id-target', 'id-b']
    );

    expect(txId).toBe('id-target');
  });

  test('throws missing-identifier with actionIndex=-1 when no contract action matches', () => {
    let thrown: unknown;
    try {
      correlateDeployTxId(
        targetAddress,
        [{ address: '0xaaaa' }, { address: '0xbbbb' }],
        ['id-a', 'id-b']
      );
    } catch (e) { thrown = e; }

    expect(thrown).toBeInstanceOf(IndexerDataError);
    const error = thrown as IndexerDataError;
    expect(error.context).toEqual({
      kind: 'missing-identifier',
      contractAddress: targetAddress,
      actionIndex: -1,
      identifiersLength: 2
    });
  });

  test('throws missing-identifier when contractAction matches but identifier slot is undefined', () => {
    let thrown: unknown;
    try {
      correlateDeployTxId(
        targetAddress,
        [{ address: '0xaaaa' }, { address: targetAddress }],
        ['id-a']
      );
    } catch (e) { thrown = e; }

    expect(thrown).toBeInstanceOf(IndexerDataError);
    const error = thrown as IndexerDataError;
    expect(error.context).toEqual({
      kind: 'missing-identifier',
      contractAddress: targetAddress,
      actionIndex: 1,
      identifiersLength: 1
    });
  });

  test('throws missing-identifier when the identifier slot is an empty string', () => {
    let thrown: unknown;
    try {
      correlateDeployTxId(
        targetAddress,
        [{ address: targetAddress }, { address: '0xaaaa' }],
        ['', 'id-a']
      );
    } catch (e) { thrown = e; }

    expect(thrown).toBeInstanceOf(IndexerDataError);
    const error = thrown as IndexerDataError;
    expect(error.context).toEqual({
      kind: 'missing-identifier',
      contractAddress: targetAddress,
      actionIndex: 0,
      identifiersLength: 2
    });
  });
});

describe('IndexerDataError', () => {
  test('unknownStatus factory builds discriminated context and derived message', () => {
    const error = IndexerDataError.unknownStatus('WEIRD');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(IndexerError);
    expect(error.name).toBe('IndexerDataError');
    expect(error.context).toEqual({ kind: 'unknown-status', value: 'WEIRD' });
    expect(error.message).toBe('Unexpected transaction status value: WEIRD');
  });

  test('missingContractAction factory builds discriminated context and derived message', () => {
    const error = IndexerDataError.missingContractAction('0xabc');

    expect(error.context).toEqual({ kind: 'missing-contract-action', contractAddress: '0xabc' });
    expect(error.message).toBe(
      'Deploy transaction does not contain a contract action for address 0xabc'
    );
  });

  test('missingIdentifier factory captures address, index and identifiers length', () => {
    const error = IndexerDataError.missingIdentifier('0xabc', -1, 3);

    expect(error.context).toEqual({
      kind: 'missing-identifier',
      contractAddress: '0xabc',
      actionIndex: -1,
      identifiersLength: 3
    });
    expect(error.message).toBe(
      'Transaction missing identifier for contract action at address 0xabc (actionIndex=-1, identifiers.length=3)'
    );
  });
});

describe('IndexerProviderConfigError', () => {
  test('exposes message and name', () => {
    const error = new IndexerProviderConfigError('Unsupported observable mode: txId');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(IndexerError);
    expect(error.name).toBe('IndexerProviderConfigError');
    expect(error.message).toBe('Unsupported observable mode: txId');
  });
});

// Regression tests for issue-816 refactor: verify the 4 hex-decoder adapters
// in indexer-public-data-provider route bad input through the typed-wrapper
// layer and produce a DeserializationError with the fully-qualified caller
// string. Locks the wiring against future accidental reverts to raw
// .deserialize/.decode calls.
describe('deserialization adapter wiring (issue-816)', () => {
  const PKG = '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
  const garbageHex = 'ffffff';

  test('parseHexContractState throws DeserializationError tagged with the helper caller', async () => {
    const { parseHexContractState } = await import('../indexer-public-data-provider');
    const { isDeserializationError } = await import('@midnight-ntwrk/midnight-js-utils');

    let caught: unknown;
    try {
      parseHexContractState(garbageHex);
    } catch (e) {
      caught = e;
    }

    expect(isDeserializationError(caught)).toBe(true);
    if (isDeserializationError(caught)) {
      expect(caught.context.caller).toBe(`${PKG}:parseHexContractState`);
      expect(caught.context.source).toBe('compact-runtime');
    }
  });

  test('parseHexZswapState throws DeserializationError tagged with the helper caller', async () => {
    const { parseHexZswapState } = await import('../indexer-public-data-provider');
    const { isDeserializationError } = await import('@midnight-ntwrk/midnight-js-utils');

    let caught: unknown;
    try {
      parseHexZswapState(garbageHex);
    } catch (e) {
      caught = e;
    }

    expect(isDeserializationError(caught)).toBe(true);
    if (isDeserializationError(caught)) {
      expect(caught.context.caller).toBe(`${PKG}:parseHexZswapState`);
      expect(caught.context.source).toBe('ledger');
    }
  });

  test('parseHexTransaction throws DeserializationError tagged with the helper caller', async () => {
    const { parseHexTransaction } = await import('../indexer-public-data-provider');
    const { isDeserializationError } = await import('@midnight-ntwrk/midnight-js-utils');

    let caught: unknown;
    try {
      parseHexTransaction(garbageHex);
    } catch (e) {
      caught = e;
    }

    expect(isDeserializationError(caught)).toBe(true);
    if (isDeserializationError(caught)) {
      expect(caught.context.caller).toBe(`${PKG}:parseHexTransaction`);
      expect(caught.context.source).toBe('ledger');
    }
  });

  test('parseHexLedgerParameters throws DeserializationError tagged with the helper caller', async () => {
    const { parseHexLedgerParameters } = await import('../indexer-public-data-provider');
    const { isDeserializationError } = await import('@midnight-ntwrk/midnight-js-utils');

    let caught: unknown;
    try {
      parseHexLedgerParameters(garbageHex);
    } catch (e) {
      caught = e;
    }

    expect(isDeserializationError(caught)).toBe(true);
    if (isDeserializationError(caught)) {
      expect(caught.context.caller).toBe(`${PKG}:parseHexLedgerParameters`);
      expect(caught.context.source).toBe('ledger');
    }
  });
});
