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
import { Transaction } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { describe, expect, it, vi } from 'vitest';

import {
  ForeignLedgerTransactionError,
  InvalidTransactionHandleError,
  PROVIDER_ERROR_CODES,
  TransactionEraMismatchError
} from '../errors';
import { LedgerTransaction } from '../ledger-transaction';
import { ledgerTransactions } from './ledger-transaction-fixtures';

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

    expect([LedgerTransaction.isLedgerTransaction(handle), handle.era, handle.stage]).toEqual([true, 'v9', 'Unproven']);
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

  it.each([
    ['serialized bytes', new Uint8Array([1, 2, 3])],
    ['undefined', undefined]
  ])('refuses %s as not a transaction, pointing at deserializeTransactionAtStage', (_label, value) => {
    // @ts-expect-error the value is not a ledger transaction
    const error = thrownBy(() => LedgerTransaction.seal('v9', 'Unproven', value));

    expect(error).toBeInstanceOf(InvalidTransactionHandleError);
    expect(error).toMatchObject({ method: 'LedgerTransaction.seal', reason: 'not-a-transaction' });
    expect(String(error)).toContain('deserializeTransactionAtStage');
  });

  it.each([
    ['v9', 'Finalized', 'Unproven'],
    ['v9', 'Unbound', 'Finalized'],
    ['v9', 'Finalized', 'Unbound'],
    ['v8', 'Finalized', 'Unproven'],
    ['v8', 'Unproven', 'Unbound']
  ] as const)('refuses a %s object sealed as %s when it is at the %s stage', async (era, claimed, actual) => {
    const tx = await ledgerTransactions[era][actual]();

    const error = thrownBy(() => LedgerTransaction.seal(era, claimed, tx));

    expect(error).toBeInstanceOf(InvalidTransactionHandleError);
    expect(error).toMatchObject({ method: 'LedgerTransaction.seal', reason: 'stage-mismatch' });
    expect(String(error)).toContain(`${actual} transaction sealed as ${claimed}`);
  });

  it('names the provider method that produced a refused object', async () => {
    const unbound = await ledgerTransactions.v9.Unbound();

    // @ts-expect-error an unbound transaction is not a finalized one
    const error = thrownBy(() => LedgerTransaction.seal('v9', 'Finalized', unbound, 'balanceTx'));

    expect(error).toMatchObject({ method: 'balanceTx', reason: 'stage-mismatch' });
  });

  it('names the provider method in a foreign-instance refusal', () => {
    const lookalike = { serialize: () => new Uint8Array() };

    // @ts-expect-error a structural lookalike is not a ledger transaction
    const error = thrownBy(() => LedgerTransaction.seal('v9', 'Unbound', lookalike, 'proveTx'));

    expect(error).toMatchObject({ name: 'ForeignLedgerTransactionError', method: 'proveTx', reason: 'foreign-instance' });
    expect(String(error)).toContain('proveTx');
  });

  it('refuses an era that is not a ledger version', () => {
    const tx = Transaction.fromParts(NETWORK_ID);

    // @ts-expect-error 'v7' is not a ledger version
    const error = thrownBy(() => LedgerTransaction.seal('v7', 'Unproven', tx));

    expect(error).toBeInstanceOf(UnknownLedgerVersionError);
    expect(error).toMatchObject({ requestedVersion: 'v7' });
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

  it('refuses to read a v8 handle as v9', async () => {
    const handle = LedgerTransaction.seal('v8', 'Unproven', await ledgerTransactions.v8.Unproven());

    const error = thrownBy(() => LedgerTransaction.unwrap(handle, 'v9'));

    expect(error).toBeInstanceOf(TransactionEraMismatchError);
    expect(error).toMatchObject({ expected: 'v9', actual: 'v8' });
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

    expect([LedgerTransaction.isLedgerTransaction(foreignHandle), secondCopy.LedgerTransaction.isLedgerTransaction(foreignHandle)]).toEqual([false, true]);
    expect(error).toMatchObject({ name: 'InvalidTransactionHandleError', reason: 'not-a-handle' });
    expect(String(error)).toContain('midnight-js-types');
  });
});

describe('LedgerTransaction.require', () => {
  it('returns a handle at the stage asked for', () => {
    const handle = LedgerTransaction.seal('v9', 'Unproven', Transaction.fromParts(NETWORK_ID));

    expect(LedgerTransaction.require(handle, 'Unproven', 'proveTx')).toBe(handle);
  });

  it('refuses a handle at another stage, naming the method and both stages', async () => {
    const handle = LedgerTransaction.seal('v9', 'Unbound', await ledgerTransactions.v9.Unbound());

    const error = thrownBy(() => LedgerTransaction.require(handle, 'Unproven', 'submitTx'));

    expect(error).toBeInstanceOf(InvalidTransactionHandleError);
    expect(error).toMatchObject({ method: 'submitTx', reason: 'wrong-stage' });
    expect(String(error)).toContain('Unbound handle, where submitTx takes Unproven handles');
  });

  it.each([
    ['the pre-handle version-tagged payload', { version: 'v9', tx: {} }],
    ['null', null]
  ])('refuses %s as not a handle, naming the method', (_label, value) => {
    const error = thrownBy(() => LedgerTransaction.require(value, 'Finalized', 'watchForTxData'));

    expect(error).toMatchObject({ name: 'InvalidTransactionHandleError', method: 'watchForTxData', reason: 'not-a-handle' });
  });
});

describe('LedgerTransaction handle', () => {
  it('is frozen and exposes only its era and stage as own properties', () => {
    const handle = LedgerTransaction.seal('v9', 'Unproven', Transaction.fromParts(NETWORK_ID));

    expect(Object.isFrozen(handle)).toBe(true);
    expect(Object.keys(handle).sort()).toEqual(['era', 'stage']);
  });

  it('cannot be constructed without LedgerTransaction.seal', () => {
    const tx = Transaction.fromParts(NETWORK_ID);

    const error = thrownBy(() =>
      Reflect.construct(LedgerTransaction, ['v9', 'Unproven', { v9: tx }, () => tx.serialize()])
    );

    expect(error).toBeInstanceOf(InvalidTransactionHandleError);
    expect(error).toMatchObject({ method: 'LedgerTransaction.seal', reason: 'not-a-handle' });
  });

  it('cannot be constructed through a subclass', () => {
    const tx = Transaction.fromParts(NETWORK_ID);
    const Subclass = class extends Object {};
    Reflect.setPrototypeOf(Subclass, LedgerTransaction);

    const error = thrownBy(() =>
      Reflect.construct(LedgerTransaction, ['v9', 'Unproven', { v9: tx }, () => tx.serialize()], Subclass)
    );

    expect(error).toBeInstanceOf(InvalidTransactionHandleError);
  });

  it('tells a caller that a copied handle is refused, and how to pass it on', () => {
    const handle = LedgerTransaction.seal('v9', 'Unproven', Transaction.fromParts(NETWORK_ID));
    const copy = { ...handle };

    // @ts-expect-error a spread copy is not a handle
    const error = thrownBy(() => LedgerTransaction.unwrap(copy, 'v9'));

    expect(error).toMatchObject({ reason: 'not-a-handle' });
    expect(String(error)).toContain('structuredClone');
  });

  it.each([['a plain object', {}], ['null', null], ['a string', 'v9']])('is() is false for %s', (_label, value) => {
    expect(LedgerTransaction.isLedgerTransaction(value)).toBe(false);
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
