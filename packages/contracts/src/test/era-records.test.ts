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

import { PROTOCOL_ERROR_CODES, UnknownLedgerVersionError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import {
  InvalidTransactionHandleError,
  LedgerTransaction,
  type ReadMethod,
  type VersionedFinalizedTxData
} from '@midnight-ntwrk/midnight-js-types';
import { CONTRACTS_ERROR_CODES, hasErrorCode, PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it } from 'vitest';

import { EraInvariantViolationError } from '../errors';
import { requireLedger9Record, requireTaggedRecord } from '../internal/era';
import { createMockFinalizedTxData, createMockLedger8FinalizedTxData } from './test-mocks';

const thrownBy = (read: () => unknown): unknown => {
  try {
    read();
  } catch (error) {
    return error;
  }
  return undefined;
};

const HELPERS = [
  ['requireTaggedRecord', (record: VersionedFinalizedTxData, method: ReadMethod) => requireTaggedRecord(record, method)],
  [
    'requireLedger9Record',
    (record: VersionedFinalizedTxData, method: ReadMethod) => requireLedger9Record(record, method, 'testCircuit')
  ]
] as const;

describe.each(HELPERS)('%s: a read record a third-party provider got wrong', (_name, read) => {
  it.each(['watchForTxData', 'watchForDeployTxData'] as const)(
    'refuses a raw ledger transaction in tx, the pre-handle shape, naming %s',
    (method) => {
      const v9 = createMockFinalizedTxData();
      const record: VersionedFinalizedTxData = {
        ...v9,
        // @ts-expect-error a record from before the handle carries the raw ledger transaction
        tx: LedgerTransaction.unwrap(v9.tx, 'v9')
      };

      const error = thrownBy(() => read(record, method));

      expect(error).toBeInstanceOf(InvalidTransactionHandleError);
      expect(hasErrorCode(error, PROVIDER_ERROR_CODES.INVALID_TRANSACTION_HANDLE)).toBe(true);
      expect(error).toMatchObject({ method, reason: 'not-a-handle' });
      expect(String(error)).toContain(method);
    }
  );

  it.each(['watchForTxData', 'watchForDeployTxData'] as const)(
    'refuses a v9 record whose tx is a v8 handle, naming %s',
    (method) => {
      // @ts-expect-error the types tie tx to version; an untyped provider can still mismatch them
      const record: VersionedFinalizedTxData = { ...createMockFinalizedTxData(), tx: createMockLedger8FinalizedTxData().tx };

      const error = thrownBy(() => read(record, method));

      expect(error).toBeInstanceOf(EraInvariantViolationError);
      expect(hasErrorCode(error, CONTRACTS_ERROR_CODES.ERA_INVARIANT_VIOLATION)).toBe(true);
      expect(error).toMatchObject({ method, expected: 'v9', received: 'v8' });
      expect(String(error)).toContain(method);
    }
  );

  it.each(['watchForTxData', 'watchForDeployTxData'] as const)(
    'refuses a record with no version, naming %s',
    (method) => {
      const { version: _dropped, ...untagged } = createMockFinalizedTxData();

      // @ts-expect-error the pre-5.0.0 record carries no version
      const error = thrownBy(() => read(untagged, method));

      expect(error).toBeInstanceOf(UnknownLedgerVersionError);
      expect(hasErrorCode(error, PROTOCOL_ERROR_CODES.UNKNOWN_LEDGER_VERSION)).toBe(true);
      expect(error).toMatchObject({ requestedVersion: 'undefined', context: method });
      expect(String(error)).toContain(method);
    }
  );

  it('reports no version, rather than the value itself, for a record that is not an object', () => {
    // @ts-expect-error a JavaScript provider can resolve with anything
    const error = thrownBy(() => read('v9', 'watchForTxData'));

    expect(error).toBeInstanceOf(UnknownLedgerVersionError);
    expect(error).toMatchObject({ requestedVersion: 'undefined', context: 'watchForTxData' });
  });
});

describe('requireTaggedRecord', () => {
  it('refuses a v8 record whose tx is a v9 handle', () => {
    // @ts-expect-error the types tie tx to version; an untyped provider can still mismatch them
    const record: VersionedFinalizedTxData = { ...createMockLedger8FinalizedTxData(), tx: createMockFinalizedTxData().tx };

    const error = thrownBy(() => requireTaggedRecord(record, 'watchForDeployTxData'));

    expect(error).toBeInstanceOf(EraInvariantViolationError);
    expect(error).toMatchObject({ method: 'watchForDeployTxData', expected: 'v8', received: 'v9' });
  });

  it.each([
    ['v8', createMockLedger8FinalizedTxData],
    ['v9', createMockFinalizedTxData]
  ] as const)('accepts a %s record whose tx is a handle of its own era', (_era, makeRecord) => {
    const record = makeRecord();

    expect(requireTaggedRecord(record, 'watchForTxData')).toBe(record);
  });
});

describe('requireLedger9Record', () => {
  it('accepts a v9 record whose tx is a v9 handle', () => {
    const record = createMockFinalizedTxData();

    expect(requireLedger9Record(record, 'watchForTxData')).toBe(record);
  });
});
