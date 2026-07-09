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

import { isDeserializationError } from '../deserialization';
import {
  decodeLedgerStateValue,
  deserializeCompactContractState,
  deserializeContractState,
  deserializeLedgerParameters,
  deserializeLedgerTransaction,
  deserializeZswapChainState
} from '../deserialization/typed-wrappers';

const garbage = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
const caller = '@midnight-ntwrk/midnight-js-test:typed-wrapper-fixture';

const expectThrowsDeserializationError = (
  fn: () => unknown,
  expected: { dataType: string; source: string }
): void => {
  let caught: unknown;
  try {
    fn();
  } catch (e) {
    caught = e;
  }

  expect(caught).toBeDefined();
  expect(isDeserializationError(caught)).toBe(true);
  if (isDeserializationError(caught)) {
    expect(caught.context.dataType).toBe(expected.dataType);
    expect(caught.context.source).toBe(expected.source);
    expect(caught.context.caller).toBe(caller);
  }
};

describe('typed wrappers — source attribution', () => {
  it('deserializeContractState attributes to ledger', () => {
    expectThrowsDeserializationError(
      () => deserializeContractState(garbage, { caller }),
      {
        dataType: 'ContractState',
        source: 'ledger'
      }
    );
  });

  it('deserializeCompactContractState attributes to compact-runtime', () => {
    expectThrowsDeserializationError(
      () => deserializeCompactContractState(garbage, { caller }),
      {
        dataType: 'ContractState',
        source: 'compact-runtime'
      }
    );
  });

  it('deserializeZswapChainState attributes to ledger', () => {
    expectThrowsDeserializationError(
      () => deserializeZswapChainState(garbage, { caller }),
      {
        dataType: 'ZswapChainState',
        source: 'ledger'
      }
    );
  });

  it('deserializeLedgerTransaction attributes to ledger; dataType becomes "Transaction" via D9 regex override', () => {
    // The wrapper hardcodes `dataType: 'LedgerTransaction'` (the TS import alias),
    // but the WASM error reports "Unable to deserialize Transaction. Error: ..." —
    // classifier extracts `what: 'Transaction'` and overrides per D9.
    expectThrowsDeserializationError(
      () => deserializeLedgerTransaction(garbage, { caller }),
      {
        dataType: 'Transaction',
        source: 'ledger'
      }
    );
  });

  it('deserializeLedgerParameters attributes to ledger', () => {
    expectThrowsDeserializationError(
      () => deserializeLedgerParameters(garbage, { caller }),
      {
        dataType: 'LedgerParameters',
        source: 'ledger'
      }
    );
  });

  it('decodeLedgerStateValue attributes to onchain-runtime (per D8)', () => {
    // EncodedStateValue is a tagged union, not bytes. Construct a deliberately
    // malformed one — the underlying StateValue.decode will throw, classifier
    // returns 'unknown' (no pattern matches a structured-data decode error).
    const malformedEncoded = { tag: 'not-a-real-tag' } as unknown as Parameters<typeof decodeLedgerStateValue>[0];

    expectThrowsDeserializationError(
      () => decodeLedgerStateValue(malformedEncoded, { caller }),
      {
        dataType: 'StateValue',
        source: 'onchain-runtime'
      }
    );
  });
});

