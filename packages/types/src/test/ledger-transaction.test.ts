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
import { MidnightJsError, UnknownLedgerEraError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { Transaction } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { LEDGER_TRANSACTION_TAGS } from '@midnight-ntwrk/midnight-js-protocol/version';
import { describe, expect, it, vi } from 'vitest';

import {
  InvalidTransactionHandleError,
  PROVIDER_ERROR_CODES,
  TransactionDecodeFailedError,
  TransactionDecoderMissingError
} from '../errors';
import { LedgerTransaction, type TransactionStage } from '../ledger-transaction';
import { ledgerTransactions } from './ledger-transaction-fixtures';

const NETWORK_ID = 'undeployed';

const STAGES = ['Unproven', 'Unbound', 'Finalized'] as const;

const MARKERS: Readonly<Record<TransactionStage, readonly [string, string, string]>> = {
  Unproven: ['signature', 'pre-proof', 'pre-binding'],
  Unbound: ['signature', 'proof', 'pre-binding'],
  Finalized: ['signature', 'proof', 'binding']
};

const thrownBy = (action: () => unknown): unknown => {
  try {
    action();
  } catch (error: unknown) {
    return error;
  }
  return undefined;
};

const v9Bytes = (): Uint8Array => Transaction.fromParts(NETWORK_ID).serialize();

const recordingDecoder = () => {
  const calls: unknown[][] = [];
  const decoded = { decoded: true };
  return {
    calls,
    decoded,
    decoder: {
      deserialize: (...args: unknown[]) => {
        calls.push(args);
        return decoded;
      },
      fromParts: Transaction.fromParts
    }
  };
};

describe('LedgerTransaction.fromBytes', () => {
  it.each(['v9', 'v8'] as const)('makes a %s handle at every stage from the bytes that ledger writes', async (era) => {
    for (const stage of STAGES) {
      const bytes = (await ledgerTransactions[era][stage]()).serialize();

      const handle = LedgerTransaction.fromBytes(era, stage, bytes);

      expect([LedgerTransaction.isLedgerTransaction(handle), handle.era, handle.stage]).toEqual([true, era, stage]);
      expect(handle.serialize()).toEqual(bytes);
    }
  });

  it('copies the bytes in and out, so neither the caller nor a reader can change the handle', () => {
    const bytes = v9Bytes();
    const original = new Uint8Array(bytes);
    const handle = LedgerTransaction.fromBytes('v9', 'Unproven', bytes);

    bytes.fill(0);
    handle.serialize().fill(0);

    expect(handle.serialize()).toEqual(original);
  });

  it('accepts a body it cannot read, because it checks only the header', () => {
    const bytes = new TextEncoder().encode(`${LEDGER_TRANSACTION_TAGS.v9.Finalized}:truncated`);

    const handle = LedgerTransaction.fromBytes('v9', 'Finalized', bytes);

    expect(handle.serialize()).toEqual(bytes);
  });

  it.each([
    ['v9 bytes read as v8', 'v8', 'Unproven', 'v9', 'Unproven'],
    ['v8 bytes read as v9', 'v9', 'Unproven', 'v8', 'Unproven'],
    ['unproven bytes read as finalized', 'v9', 'Finalized', 'v9', 'Unproven'],
    ['unbound bytes read as finalized', 'v8', 'Finalized', 'v8', 'Unbound'],
    ['finalized bytes read as unbound', 'v9', 'Unbound', 'v9', 'Finalized']
  ] as const)('refuses %s', async (_label, era, stage, actualEra, actualStage) => {
    const bytes = (await ledgerTransactions[actualEra][actualStage]()).serialize();

    const error = thrownBy(() => LedgerTransaction.fromBytes(era, stage, bytes));

    expect(error).toBeInstanceOf(InvalidTransactionHandleError);
    expect(error).toMatchObject({
      code: PROVIDER_ERROR_CODES.INVALID_TRANSACTION_HANDLE,
      method: 'LedgerTransaction.fromBytes',
      reason: 'header-mismatch'
    });
  });

  it('names the expected header and only the header-shaped start of the bytes, never the body', () => {
    const bytes = new TextEncoder().encode(`${LEDGER_TRANSACTION_TAGS.v9.Unproven}:SECRET-BODY`);

    const error = thrownBy(() => LedgerTransaction.fromBytes('v8', 'Unproven', bytes));

    expect(String(error)).toContain(
      `expected header tag '${LEDGER_TRANSACTION_TAGS.v8.Unproven}:', got '${LEDGER_TRANSACTION_TAGS.v9.Unproven}:'`
    );
    expect(String(error)).not.toContain('SECRET');
  });

  it('names no bytes at all when they do not start with a ledger header', () => {
    const error = thrownBy(() => LedgerTransaction.fromBytes('v9', 'Unproven', new TextEncoder().encode('SECRET-BODY')));

    expect(String(error)).toContain("got ''");
  });

  it('refuses a header whose signature marker belongs to another era', () => {
    const forged = LEDGER_TRANSACTION_TAGS.v9.Unproven.replace('signature[v2]', 'signature[v1]');

    const error = thrownBy(() => LedgerTransaction.fromBytes('v9', 'Unproven', new TextEncoder().encode(`${forged}:`)));

    expect(error).toMatchObject({ reason: 'header-mismatch' });
  });

  it('refuses a header without the separator after it', () => {
    const bytes = new TextEncoder().encode(LEDGER_TRANSACTION_TAGS.v9.Unproven);

    const error = thrownBy(() => LedgerTransaction.fromBytes('v9', 'Unproven', bytes));

    expect(error).toMatchObject({ reason: 'header-mismatch' });
  });

  it.each([
    ['an Array of byte values', [1, 2, 3]],
    ['a hex string', '6d69646e69676874'],
    ['undefined', undefined]
  ])('refuses %s as not bytes', (_label, value) => {
    // @ts-expect-error the value is not a Uint8Array
    const error = thrownBy(() => LedgerTransaction.fromBytes('v9', 'Unproven', value));

    expect(error).toMatchObject({ name: 'InvalidTransactionHandleError', reason: 'not-bytes' });
  });

  it('refuses an era that is not a ledger era', () => {
    // @ts-expect-error 'v7' is not a ledger era
    const error = thrownBy(() => LedgerTransaction.fromBytes('v7', 'Unproven', v9Bytes()));

    expect(error).toBeInstanceOf(UnknownLedgerEraError);
    expect(error).toMatchObject({ requestedVersion: 'v7' });
  });

  it.each(['Proven', 'constructor', '__proto__'])('refuses %s as a stage', (stage) => {
    // @ts-expect-error the value is not a transaction stage
    const error = thrownBy(() => LedgerTransaction.fromBytes('v9', stage, v9Bytes()));

    expect(error).toMatchObject({ name: 'InvalidTransactionHandleError', reason: 'invalid-stage' });
  });
});

describe('LedgerTransaction.seal', () => {
  it('seals an object of the framework ledger copy', async () => {
    const v8 = await loadLedger8Protocol();
    const tx = v8.Transaction.fromParts(NETWORK_ID);

    const handle = LedgerTransaction.seal('v8', 'Unproven', tx);

    expect([handle.era, handle.stage]).toEqual(['v8', 'Unproven']);
    expect(handle.serialize()).toEqual(tx.serialize());
  });

  it('seals an object of another ledger copy by its bytes', () => {
    const bytes = v9Bytes();
    const otherCopy = { serialize: () => bytes };

    const handle = LedgerTransaction.seal('v9', 'Unproven', otherCopy);

    expect(handle.serialize()).toEqual(bytes);
  });

  it.each([
    ['serialized bytes', new Uint8Array([1, 2, 3])],
    ['undefined', undefined],
    ['an object whose serialize is not a function', { serialize: 'bytes' }]
  ])('refuses %s as not a transaction, pointing at fromBytes', (_label, value) => {
    // @ts-expect-error the value is not a transaction
    const error = thrownBy(() => LedgerTransaction.seal('v9', 'Unproven', value));

    expect(error).toBeInstanceOf(InvalidTransactionHandleError);
    expect(error).toMatchObject({ method: 'LedgerTransaction.seal', reason: 'not-a-transaction' });
    expect(String(error)).toContain('LedgerTransaction.fromBytes');
  });

  it('refuses an object at another stage, naming the provider method that produced it', async () => {
    const unbound = await ledgerTransactions.v9.Unbound();

    const error = thrownBy(() => LedgerTransaction.seal('v9', 'Finalized', unbound, 'balanceTx'));

    expect(error).toMatchObject({ method: 'balanceTx', reason: 'header-mismatch' });
  });

  it('refuses a v9 object sealed as v8', () => {
    const error = thrownBy(() => LedgerTransaction.seal('v8', 'Unproven', Transaction.fromParts(NETWORK_ID)));

    expect(error).toMatchObject({ method: 'LedgerTransaction.seal', reason: 'header-mismatch' });
  });
});

describe('LedgerTransaction.deserialize', () => {
  it.each(STAGES)('decodes a v9 %s handle with the caller class into an object of that class', async (stage) => {
    const bytes = (await ledgerTransactions.v9[stage]()).serialize();
    const handle = LedgerTransaction.fromBytes('v9', stage, bytes);

    const tx = handle.deserialize({ v9: Transaction });

    expect(tx).toBeInstanceOf(Transaction);
    expect(tx.serialize()).toEqual(bytes);
  });

  it.each(STAGES)('decodes a v8 %s handle with the v8 class', async (stage) => {
    const v8 = await loadLedger8Protocol();
    const bytes = (await ledgerTransactions.v8[stage]()).serialize();
    const handle = LedgerTransaction.fromBytes('v8', stage, bytes);

    const tx = handle.deserialize({ v8: v8.Transaction });

    expect(tx).toBeInstanceOf(v8.Transaction);
    expect(tx.serialize()).toEqual(bytes);
  });

  it.each(STAGES)('passes the markers of a %s handle, so the caller cannot pick the stage', async (stage) => {
    const handle = LedgerTransaction.fromBytes('v9', stage, (await ledgerTransactions.v9[stage]()).serialize());
    const { calls, decoded, decoder } = recordingDecoder();

    const result = handle.deserialize({ v9: decoder });

    expect(result).toBe(decoded);
    expect(calls.map((args) => args.slice(0, 3))).toEqual([MARKERS[stage]]);
  });

  it('calls only the decoder of the handle era', () => {
    const handle = LedgerTransaction.fromBytes('v9', 'Unproven', v9Bytes());
    const v8 = recordingDecoder();
    const v9 = recordingDecoder();

    handle.deserialize({ v8: v8.decoder, v9: v9.decoder });

    expect([v8.calls.length, v9.calls.length]).toEqual([0, 1]);
  });

  it('hands the decoder a copy, so a decoder cannot change the handle', () => {
    const bytes = v9Bytes();
    const handle = LedgerTransaction.fromBytes('v9', 'Unproven', bytes);
    const decoder = {
      deserialize: (_s: string, _p: string, _b: string, raw: Uint8Array) => raw.fill(0),
      fromParts: Transaction.fromParts
    };

    handle.deserialize({ v9: decoder });

    expect(handle.serialize()).toEqual(bytes);
  });

  it('refuses decoders with none for the handle era, naming the class to import', () => {
    const handle: LedgerTransaction<'Unproven'> = LedgerTransaction.fromBytes('v9', 'Unproven', v9Bytes());

    const error = thrownBy(() => handle.deserialize({ v8: Transaction }));

    expect(error).toBeInstanceOf(TransactionDecoderMissingError);
    expect(error).toMatchObject({ code: PROVIDER_ERROR_CODES.TRANSACTION_DECODER_MISSING, era: 'v9' });
    expect(String(error)).toContain('@midnightntwrk/ledger-v9');
  });

  it.each([
    ['null', null],
    ['an inherited era key', Object.create({ v9: Transaction })]
  ])('refuses %s as decoders', (_label, decoders) => {
    const handle = LedgerTransaction.fromBytes('v9', 'Unproven', v9Bytes());

    // @ts-expect-error the value is not a decoder map
    const error = thrownBy(() => handle.deserialize(decoders));

    expect(error).toBeInstanceOf(TransactionDecoderMissingError);
  });

  it('reports a body the decoder cannot read as a decode failure with the cause', () => {
    const handle = LedgerTransaction.fromBytes(
      'v9',
      'Finalized',
      new TextEncoder().encode(`${LEDGER_TRANSACTION_TAGS.v9.Finalized}:truncated`)
    );

    const error = thrownBy(() => handle.deserialize({ v9: Transaction }));

    expect(error).toBeInstanceOf(TransactionDecodeFailedError);
    expect(error).toMatchObject({
      code: PROVIDER_ERROR_CODES.TRANSACTION_DECODE_FAILED,
      category: 'INTEGRITY',
      era: 'v9',
      stage: 'Finalized'
    });
    expect((error as Error).cause).toBeDefined();
  });

  it('rethrows a MidnightJsError from the decoder unchanged', () => {
    const handle = LedgerTransaction.fromBytes('v9', 'Unproven', v9Bytes());
    const own = new TransactionDecoderMissingError('v8');
    const decoder = {
      deserialize: (): never => {
        throw own;
      },
      fromParts: Transaction.fromParts
    };

    const error = thrownBy(() => handle.deserialize({ v9: decoder }));

    expect(error).toBe(own);
    expect(error).toBeInstanceOf(MidnightJsError);
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
    const handle = LedgerTransaction.fromBytes('v9', 'Unproven', v9Bytes());

    expect(Object.isFrozen(handle)).toBe(true);
    expect(Object.keys(handle).sort()).toEqual(['era', 'stage']);
  });

  it('cannot be constructed without LedgerTransaction.fromBytes', () => {
    const error = thrownBy(() => Reflect.construct(LedgerTransaction, ['v9', 'Unproven', v9Bytes()]));

    expect(error).toBeInstanceOf(InvalidTransactionHandleError);
    expect(error).toMatchObject({ method: 'LedgerTransaction.fromBytes', reason: 'not-a-handle' });
  });

  it('tells a caller that a copied handle is refused, and how to pass it on', () => {
    const handle = LedgerTransaction.fromBytes('v9', 'Unproven', v9Bytes());
    const copy = { ...handle };

    const error = thrownBy(() => LedgerTransaction.require(copy, 'Unproven', 'proveTx'));

    expect(error).toMatchObject({ reason: 'not-a-handle' });
    expect(String(error)).toContain('structuredClone');
    expect(String(error)).toContain('LedgerTransaction.fromBytes');
  });

  it('is not a handle of a second copy of the module, which names a duplicate midnight-js-types install', async () => {
    vi.resetModules();
    const secondCopy = await import('../ledger-transaction');
    const foreignHandle = secondCopy.LedgerTransaction.fromBytes('v9', 'Unproven', v9Bytes());

    const error = thrownBy(() => LedgerTransaction.require(foreignHandle, 'Unproven', 'proveTx'));

    expect([LedgerTransaction.isLedgerTransaction(foreignHandle), secondCopy.LedgerTransaction.isLedgerTransaction(foreignHandle)]).toEqual([false, true]);
    expect(String(error)).toContain('midnight-js-types');
  });

  it.each([['a plain object', {}], ['null', null], ['a string', 'v9']])('isLedgerTransaction is false for %s', (_label, value) => {
    expect(LedgerTransaction.isLedgerTransaction(value)).toBe(false);
  });
});
