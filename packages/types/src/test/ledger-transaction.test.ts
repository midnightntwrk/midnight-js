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
import { describe, expect, it, vi } from 'vitest';

import {
  ForeignLedgerTransactionError,
  InvalidTransactionHandleError,
  PROVIDER_ERROR_CODES,
  TransactionEraMismatchError
} from '../errors';
import { LedgerTransaction } from '../ledger-transaction';

const NETWORK_ID = 'undeployed';

const thrownBy = (action: () => unknown): unknown => {
  try {
    action();
  } catch (error: unknown) {
    return error;
  }
  return undefined;
};

describe('LedgerTransaction.seal', () => {
  it('seals an own v9 transaction into a handle that reports its era and stage and serializes it', () => {
    const tx = Transaction.fromParts(NETWORK_ID);

    const handle = LedgerTransaction.seal('v9', 'Unproven', tx);

    expect([LedgerTransaction.is(handle), handle.era, handle.stage]).toEqual([true, 'v9', 'Unproven']);
    expect(handle.serialize()).toEqual(tx.serialize());
  });

  it('seals an own v8 transaction once the framework has loaded its v8 ledger', async () => {
    const v8 = await loadLedger8Protocol();
    const tx = v8.Transaction.fromParts(NETWORK_ID);

    const handle = LedgerTransaction.seal('v8', 'Unproven', tx);

    expect([handle.era, handle.stage]).toEqual(['v8', 'Unproven']);
    expect(handle.serialize()).toEqual(tx.serialize());
  });

  it('refuses an object that is not a transaction of the framework ledger copy as a foreign instance', () => {
    const lookalike = { serialize: () => new Uint8Array() };

    // @ts-expect-error a structural lookalike is not a ledger transaction
    const error = thrownBy(() => LedgerTransaction.seal('v9', 'Unproven', lookalike));

    expect(error).toBeInstanceOf(ForeignLedgerTransactionError);
    expect(error).toMatchObject({
      code: PROVIDER_ERROR_CODES.FOREIGN_LEDGER_TRANSACTION,
      era: 'v9',
      reason: 'foreign-instance'
    });
  });

  it('refuses a v9 object sealed as a v8 transaction', async () => {
    await loadLedger8Protocol();
    const v9Tx = Transaction.fromParts(NETWORK_ID);

    // @ts-expect-error a v9 transaction is not a v8 one
    const error = thrownBy(() => LedgerTransaction.seal('v8', 'Unproven', v9Tx));

    expect(error).toMatchObject({ name: 'ForeignLedgerTransactionError', era: 'v8', reason: 'foreign-instance' });
  });

  it('refuses a stage that is not a transaction stage', () => {
    const tx = Transaction.fromParts(NETWORK_ID);

    // @ts-expect-error 'Proven' is not a transaction stage
    const error = thrownBy(() => LedgerTransaction.seal('v9', 'Proven', tx));

    expect(error).toBeInstanceOf(InvalidTransactionHandleError);
    expect(error).toMatchObject({
      code: PROVIDER_ERROR_CODES.INVALID_TRANSACTION_HANDLE,
      method: 'LedgerTransaction.seal',
      reason: 'invalid-stage'
    });
  });
});

describe('LedgerTransaction.unwrap', () => {
  it('returns the very object that was sealed', () => {
    const tx = Transaction.fromParts(NETWORK_ID);
    const handle = LedgerTransaction.seal('v9', 'Unproven', tx);

    const unwrapped = LedgerTransaction.unwrap(handle, 'v9');

    expect(unwrapped).toBe(tx);
  });

  it('refuses to read a v9 handle as v8', () => {
    const handle = LedgerTransaction.seal('v9', 'Unproven', Transaction.fromParts(NETWORK_ID));

    const error = thrownBy(() => LedgerTransaction.unwrap(handle, 'v8'));

    expect(error).toBeInstanceOf(TransactionEraMismatchError);
    expect(error).toMatchObject({
      code: PROVIDER_ERROR_CODES.TRANSACTION_ERA_MISMATCH,
      expected: 'v8',
      actual: 'v9'
    });
  });

  it.each(['constructor', '__proto__', 'toString', 'hasOwnProperty', 'v10'])(
    'refuses %s as an unknown era instead of reading it off the slot',
    (era) => {
      const handle = LedgerTransaction.seal('v9', 'Unproven', Transaction.fromParts(NETWORK_ID));

      // @ts-expect-error the era is not a ledger version
      const error = thrownBy(() => LedgerTransaction.unwrap(handle, era));

      expect(error).toBeInstanceOf(UnknownLedgerVersionError);
      expect(error).toMatchObject({ requestedVersion: era });
    }
  );

  it.each([
    ['an object shaped like a handle', { era: 'v9', stage: 'Unproven' }],
    ['the pre-handle version-tagged payload', { version: 'v9', tx: {} }],
    ['null', null],
    ['undefined', undefined]
  ])('refuses %s as not a handle', (_label, value) => {
    // @ts-expect-error the value is not a LedgerTransaction
    const error = thrownBy(() => LedgerTransaction.unwrap(value, 'v9'));

    expect(error).toBeInstanceOf(InvalidTransactionHandleError);
    expect(error).toMatchObject({
      code: PROVIDER_ERROR_CODES.INVALID_TRANSACTION_HANDLE,
      method: 'LedgerTransaction.unwrap',
      reason: 'not-a-handle'
    });
  });

  it('refuses a handle sealed by a second copy of the module, naming a duplicate midnight-js-types install', async () => {
    vi.resetModules();
    const secondCopy = await import('../ledger-transaction');
    const foreignHandle = secondCopy.LedgerTransaction.seal('v9', 'Unproven', Transaction.fromParts(NETWORK_ID));

    const error = thrownBy(() => LedgerTransaction.unwrap(foreignHandle, 'v9'));

    expect([LedgerTransaction.is(foreignHandle), secondCopy.LedgerTransaction.is(foreignHandle)]).toEqual([false, true]);
    expect(error).toMatchObject({ name: 'InvalidTransactionHandleError', reason: 'not-a-handle' });
    expect(String(error)).toContain('midnight-js-types');
  });
});

describe('LedgerTransaction handle', () => {
  it('is frozen and exposes only its era and stage as own properties', () => {
    const handle = LedgerTransaction.seal('v9', 'Unproven', Transaction.fromParts(NETWORK_ID));

    expect(Object.isFrozen(handle)).toBe(true);
    expect(Object.keys(handle).sort()).toEqual(['era', 'stage']);
  });

  it.each([['a plain object', {}], ['null', null], ['a string', 'v9']])('is() is false for %s', (_label, value) => {
    expect(LedgerTransaction.is(value)).toBe(false);
  });
});

describe('ForeignLedgerTransactionError', () => {
  it('names loadLedger8Protocol() as the fix when v8 is not loaded', () => {
    const error = new ForeignLedgerTransactionError('v8', 'ledger8-not-loaded');

    expect([error.name, error.category, error.message.includes('loadLedger8Protocol()')]).toEqual([
      'ForeignLedgerTransactionError',
      'ENVIRONMENT',
      true
    ]);
  });

  it('names a duplicate ledger install for a foreign instance', () => {
    const error = new ForeignLedgerTransactionError('v9', 'foreign-instance');

    expect(error.message).toContain('duplicate');
  });
});
