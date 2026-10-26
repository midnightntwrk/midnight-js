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

import * as foreignLedger8 from '@midnight-ntwrk/ledger-v8';
import * as userLedger8 from '@midnightntwrk/ledger-v8';
import { CostModel, type ProvingProvider, Transaction } from '@midnightntwrk/ledger-v9';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  InvalidArgumentError,
  PayloadNotATransactionError,
  PROTOCOL_ERROR_CODES,
  TRANSACTION_TAG_PREFIX,
  UnknownLedgerVersionError
} from '../errors';
import { loadLedger8Protocol } from '../lib/v8/load';
import { deserializeTransactionAtStage, isFrameworkLedgerTransaction, type TransactionStage } from '../transaction';
import { LEDGER8_UNPROVEN_TX_TAG } from './fixtures';

const NETWORK_ID = 'undeployed';

const inertProvingProvider: ProvingProvider = {
  check: () => Promise.resolve([]),
  prove: () => Promise.resolve(new Uint8Array()),
  lookupKey: () => Promise.resolve(undefined)
};

const rejectionOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => undefined,
    (error: unknown) => error
  );

describe('deserializeTransactionAtStage', () => {
  let ledger9Bytes: Record<TransactionStage, Uint8Array>;
  let ledger8Bytes: Record<TransactionStage, Uint8Array>;

  beforeAll(async () => {
    const unproven = Transaction.fromParts(NETWORK_ID);
    const unbound = await unproven.prove(inertProvingProvider, CostModel.initialCostModel());
    ledger9Bytes = {
      Unproven: unproven.serialize(),
      Unbound: unbound.serialize(),
      Finalized: unbound.bind().serialize()
    };

    const v8 = await loadLedger8Protocol();
    const ledger8Unproven = v8.Transaction.fromParts(NETWORK_ID);
    const ledger8Unbound = await ledger8Unproven.prove(inertProvingProvider, v8.CostModel.initialCostModel());
    ledger8Bytes = {
      Unproven: ledger8Unproven.serialize(),
      Unbound: ledger8Unbound.serialize(),
      Finalized: ledger8Unbound.bind().serialize()
    };
  });

  it.each(['Unproven', 'Unbound', 'Finalized'] as const)('round-trips a v9 %s transaction', async (stage) => {
    const bytes = ledger9Bytes[stage];

    const tx = await deserializeTransactionAtStage('v9', stage, bytes);

    expect(tx).toBeInstanceOf(Transaction);
    expect(tx.serialize()).toEqual(bytes);
  });

  it.each(['Unproven', 'Unbound', 'Finalized'] as const)(
    'round-trips a v8 %s transaction as an object of the framework v8 module',
    async (stage) => {
      const v8 = await loadLedger8Protocol();
      const bytes = ledger8Bytes[stage];

      const tx = await deserializeTransactionAtStage('v8', stage, bytes);

      expect(tx).toBeInstanceOf(v8.Transaction);
      expect(tx.serialize()).toEqual(bytes);
    }
  );

  it('refuses garbage bytes with the registered code, before any runtime reads them', async () => {
    const rejection = await rejectionOf(deserializeTransactionAtStage('v9', 'Unproven', new Uint8Array([1, 2, 3, 4])));

    expect(rejection).toBeInstanceOf(PayloadNotATransactionError);
    expect(rejection).toHaveProperty('code', PROTOCOL_ERROR_CODES.PAYLOAD_NOT_A_TRANSACTION);
  });

  it('does not echo a refused payload back in the message', async () => {
    const marker = 'DEADBEEF';
    const payload = new Uint8Array(Buffer.from(`${marker}${'x'.repeat(64)}`, 'latin1'));

    const rejection = await rejectionOf(deserializeTransactionAtStage('v9', 'Unproven', payload));

    expect(rejection).toBeInstanceOf(PayloadNotATransactionError);
    expect(String(rejection)).not.toContain(marker);
    expect(String(rejection)).toContain(String(payload.byteLength));
  });

  const nonBytePayloads: readonly { label: string; payload: unknown; described: string }[] = [
    { label: 'undefined', payload: undefined, described: 'undefined' },
    { label: 'null', payload: null, described: 'null' },
    { label: 'a plain Array of byte values', payload: [1, 2, 3], described: 'Array' },
    { label: 'a null-prototype object', payload: Object.create(null), described: 'object' },
    {
      label: 'an object whose constructor name carries punctuation',
      payload: { constructor: { name: 'SECRET-\n[fake log line]' } },
      described: 'object'
    },
    {
      label: 'an object whose constructor name is over-long',
      payload: { constructor: { name: 'A'.repeat(200) } },
      described: 'A'.repeat(32)
    },
    {
      label: 'an object whose constructor accessor throws',
      payload: Object.defineProperty({}, 'constructor', {
        get: () => {
          throw new Error('constructor accessor exploded');
        }
      }),
      described: 'object'
    }
  ];

  it.each(nonBytePayloads)('refuses $label in place of bytes with the registered code, not a TypeError', async ({ payload, described }) => {
    const rejection = await rejectionOf(
      // @ts-expect-error - the untyped-JS case: the payload is not a Uint8Array
      deserializeTransactionAtStage('v9', 'Unproven', payload)
    );

    expect(rejection).toBeInstanceOf(PayloadNotATransactionError);
    const message = String(rejection);
    expect(message).toContain(`is ${described} rather than a Uint8Array`);
    expect(message).not.toContain('\n');
    expect(message).not.toContain('fake log line');
    expect(message).not.toContain('A'.repeat(33));
  });

  it('refuses a transaction of the other era, keeping the runtime refusal on cause', async () => {
    const rejection = await rejectionOf(deserializeTransactionAtStage('v8', 'Unproven', ledger9Bytes.Unproven));

    expect(rejection).toBeInstanceOf(PayloadNotATransactionError);
    expect(rejection).toHaveProperty('cause');
    expect(String((rejection as Error).cause)).toContain('expected header tag');
  });

  it('refuses a v9 transaction read at the wrong stage', async () => {
    const rejection = await rejectionOf(deserializeTransactionAtStage('v9', 'Finalized', ledger9Bytes.Unproven));

    expect(rejection).toBeInstanceOf(PayloadNotATransactionError);
    expect((rejection as Error).message).toContain('Finalized');
    expect((rejection as Error).cause).toBeInstanceOf(Error);
  });

  it('refuses a real tag with a truncated body as a coded refusal', async () => {
    const truncated = ledger8Bytes.Unproven.subarray(0, LEDGER8_UNPROVEN_TX_TAG.length + 4);

    const rejection = await rejectionOf(deserializeTransactionAtStage('v8', 'Unproven', truncated));

    expect(rejection).toBeInstanceOf(PayloadNotATransactionError);
    expect((rejection as Error).cause).toBeInstanceOf(Error);
  });

  it('keeps the body of a refused payload out of the whole cause chain', async () => {
    const tagRegion = 'A'.repeat(60);
    const bodyMarker = 'BODY-MARKER-MUST-NOT-BE-ECHOED';
    const payload = new Uint8Array(Buffer.from(`${TRANSACTION_TAG_PREFIX}${tagRegion}${bodyMarker}`, 'latin1'));

    const rejection = await rejectionOf(deserializeTransactionAtStage('v8', 'Unproven', payload));

    expect(rejection).toBeInstanceOf(PayloadNotATransactionError);
    expect(`${String(rejection)} ${String((rejection as Error).cause)}`).not.toContain(bodyMarker);
  });

  it('refuses an era that is not a ledger version', async () => {
    const rejection = await rejectionOf(
      // @ts-expect-error - the untyped-JS case: 'v7' is not a LedgerVersion
      deserializeTransactionAtStage('v7', 'Unproven', ledger9Bytes.Unproven)
    );

    expect(rejection).toBeInstanceOf(UnknownLedgerVersionError);
  });

  it('refuses a stage that is not a transaction stage', async () => {
    const rejection = await rejectionOf(
      // @ts-expect-error - the untyped-JS case: 'Proven' is not a TransactionStage
      deserializeTransactionAtStage('v9', 'Proven', ledger9Bytes.Unproven)
    );

    expect(rejection).toBeInstanceOf(InvalidArgumentError);
  });
});

describe('isFrameworkLedgerTransaction', () => {
  it('recognises a v9 transaction built by the framework ledger as its own', () => {
    const tx = Transaction.fromParts(NETWORK_ID);

    expect(isFrameworkLedgerTransaction('v9', tx)).toBe('own');
  });

  it('reports a v9 look-alike as a foreign instance', () => {
    expect(isFrameworkLedgerTransaction('v9', { serialize: () => new Uint8Array() })).toBe('foreign-instance');
  });

  it('refuses an era that is not a ledger version', () => {
    // @ts-expect-error - the untyped-JS case: 'v7' is not a LedgerVersion
    expect(() => isFrameworkLedgerTransaction('v7', {})).toThrow(UnknownLedgerVersionError);
  });

  describe('for v8, in a fresh module graph', () => {
    let freshIsFrameworkLedgerTransaction: typeof isFrameworkLedgerTransaction;
    let freshLoadLedger8Protocol: typeof loadLedger8Protocol;

    beforeEach(async () => {
      vi.resetModules();
      ({ isFrameworkLedgerTransaction: freshIsFrameworkLedgerTransaction } = await import('../transaction'));
      ({ loadLedger8Protocol: freshLoadLedger8Protocol } = await import('../lib/v8/load'));
    });

    it('answers ledger8-not-loaded before loadLedger8Protocol() has resolved', () => {
      const tx = userLedger8.Transaction.fromParts(NETWORK_ID);

      expect(freshIsFrameworkLedgerTransaction('v8', tx)).toBe('ledger8-not-loaded');
    });

    it('recognises a transaction from the loaded v8 module as its own', async () => {
      const v8 = await freshLoadLedger8Protocol();

      expect(freshIsFrameworkLedgerTransaction('v8', v8.Transaction.fromParts(NETWORK_ID))).toBe('own');
    });

    it('reports a transaction from the second npm scope copy of ledger-v8 as a foreign instance', async () => {
      await freshLoadLedger8Protocol();
      const tx = foreignLedger8.Transaction.fromParts(NETWORK_ID);

      expect(freshIsFrameworkLedgerTransaction('v8', tx)).toBe('foreign-instance');
    });
  });
});
