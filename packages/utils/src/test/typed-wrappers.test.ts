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

import { loadLedger8Protocol } from '@midnight-ntwrk/midnight-js-protocol';
import { UnknownLedgerVersionError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { Transaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { LedgerTransaction } from '@midnight-ntwrk/midnight-js-types';
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

  it.each(['v8', 'v9'] as const)(
    'deserializeLedgerTransaction attributes a %s failure to ledger; dataType becomes "Transaction" via D9 regex override',
    async (era) => {
      // The wrapper hardcodes `dataType: 'LedgerTransaction'` (the TS import alias),
      // but the WASM error reports "Unable to deserialize Transaction. Error: ..." —
      // classifier extracts `what: 'Transaction'` and overrides per D9.
      const caught = await deserializeLedgerTransaction(era, garbage, { caller }).catch((e: unknown) => e);

      expect(isDeserializationError(caught)).toBe(true);
      expect(caught).toMatchObject({ context: { dataType: 'Transaction', source: 'ledger', caller } });
    }
  );

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


describe('deserializeLedgerTransaction', () => {
  it('returns a finalized v9 handle around the decoded transaction', async () => {
    const bytes = Transaction.fromParts('undeployed').mockProve().serialize();

    const handle = await deserializeLedgerTransaction('v9', bytes, { caller });

    expect(LedgerTransaction.is(handle)).toBe(true);
    expect([handle.era, handle.stage]).toEqual(['v9', 'Finalized']);
    expect(handle.serialize()).toEqual(bytes);
  });

  it('returns a finalized v8 handle around an object of the framework v8 ledger', async () => {
    const v8 = await loadLedger8Protocol();
    const bytes = v8.Transaction.fromParts('undeployed').mockProve().serialize();

    const handle = await deserializeLedgerTransaction('v8', bytes, { caller });

    expect([handle.era, handle.stage]).toEqual(['v8', 'Finalized']);
    expect(LedgerTransaction.unwrap(handle, 'v8')).toBeInstanceOf(v8.Transaction);
    expect(handle.serialize()).toEqual(bytes);
  });

  it('reads the bytes in the era it is given, refusing a transaction of the other era', async () => {
    const ledger9Bytes = Transaction.fromParts('undeployed').mockProve().serialize();

    const caught = await deserializeLedgerTransaction('v8', ledger9Bytes, { caller }).catch((e: unknown) => e);

    expect(isDeserializationError(caught)).toBe(true);
  });

  it('refuses an era that is not a ledger version', async () => {
    // @ts-expect-error 'v7' is not a ledger version
    const caught = await deserializeLedgerTransaction('v7', garbage, { caller }).catch((e: unknown) => e);

    expect(caught).toBeInstanceOf(UnknownLedgerVersionError);
  });
});
