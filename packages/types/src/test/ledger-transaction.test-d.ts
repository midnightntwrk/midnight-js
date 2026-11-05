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

import type { FinalizedTransaction as Ledger9FinalizedTransaction } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { Transaction } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { describe, expectTypeOf, it } from 'vitest';

import {
  type FinalizedTx,
  LedgerTransaction,
  type LedgerTransactionTypes,
  type TransactionDecoders,
  type UnboundTx,
  type UnprovenTx
} from '../ledger-transaction';
import type { Ledger9FinalizedTxData } from '../midnight-types';
import type { FinalizedTxRead,Ledger8FinalizedTxData } from '../versioned';

declare const unprovenTx: UnprovenTx;
declare const unboundTx: UnboundTx;
declare const finalizedTx: FinalizedTx;
declare const ledger9UnprovenHandle: LedgerTransaction<'Unproven', 'v9'>;
declare const finalizedTxRead: FinalizedTxRead;
declare const ledger9UnboundHandle: LedgerTransaction<'Unbound', 'v9'>;
declare const ledger9FinalizedHandle: LedgerTransaction<'Finalized', 'v9'>;
declare const anyCopy: { serialize(): Uint8Array };
declare const bytes: Uint8Array;

declare class CallerTransaction<S, P, B> {
  private readonly markers: [S, P, B];
  static fromParts(networkId: string): CallerTransaction<'signature', 'pre-proof', 'pre-binding'>;
  static deserialize(markerS: string, markerP: string, markerB: string, raw: Uint8Array): unknown;
  prove(provider: unknown): Promise<CallerTransaction<S, 'proof', B>>;
  bind(): CallerTransaction<S, P, 'binding'>;
}

describe('LedgerTransaction stages', () => {
  it('keeps the three stages apart', () => {
    expectTypeOf(unboundTx).not.toExtend<FinalizedTx>();
    expectTypeOf(finalizedTx).not.toExtend<UnboundTx>();
    expectTypeOf(unprovenTx).not.toExtend<UnboundTx>();
    expectTypeOf(unprovenTx).not.toExtend<FinalizedTx>();
    expectTypeOf(finalizedTx).not.toExtend<UnprovenTx>();
    expectTypeOf(unboundTx).not.toExtend<UnprovenTx>();
  });

  it('accepts a handle at its own stage', () => {
    const accept = (_tx: UnboundTx): void => undefined;

    accept(unboundTx);
    // @ts-expect-error a finalized handle is not an unbound one
    accept(finalizedTx);
  });
});

describe('LedgerTransaction.fromBytes and seal', () => {
  it('return the handle at the stage and era they were given', () => {
    expectTypeOf(LedgerTransaction.fromBytes('v9', 'Unproven', bytes)).toEqualTypeOf<LedgerTransaction<'Unproven', 'v9'>>();
    expectTypeOf(LedgerTransaction.seal('v8', 'Finalized', anyCopy)).toEqualTypeOf<LedgerTransaction<'Finalized', 'v8'>>();
  });

  it('return a handle that is a handle of its stage in any era', () => {
    expectTypeOf(LedgerTransaction.fromBytes('v9', 'Unproven', bytes)).toExtend<UnprovenTx>();
  });

  it('seal an object of any ledger copy', () => {
    expectTypeOf(LedgerTransaction.seal).parameter(2).toEqualTypeOf<{ serialize(): Uint8Array }>();
  });
});

describe('LedgerTransaction.deserialize', () => {
  it('returns the caller transaction type at each stage', () => {
    expectTypeOf(ledger9UnprovenHandle.deserialize({ v9: CallerTransaction })).toEqualTypeOf<
      CallerTransaction<'signature', 'pre-proof', 'pre-binding'>
    >();
    expectTypeOf(ledger9UnboundHandle.deserialize({ v9: CallerTransaction })).toEqualTypeOf<
      CallerTransaction<'signature', 'proof', 'pre-binding'>
    >();
    expectTypeOf(ledger9FinalizedHandle.deserialize({ v9: CallerTransaction })).toEqualTypeOf<
      CallerTransaction<'signature', 'proof', 'binding'>
    >();
  });

  it('returns the caller type, not the framework one', () => {
    expectTypeOf(ledger9UnprovenHandle.deserialize({ v9: CallerTransaction })).not.toEqualTypeOf<
      LedgerTransactionTypes['v9']['Unproven']
    >();
  });

  it('returns the ledger type of a ledger class', () => {
    expectTypeOf(ledger9FinalizedHandle.deserialize({ v9: Transaction })).toEqualTypeOf<Ledger9FinalizedTransaction>();
  });

  it('decodes the tx of a record of either era with a class per era', () => {
    expectTypeOf(finalizedTxRead.tx.deserialize({ v8: CallerTransaction, v9: CallerTransaction })).toEqualTypeOf<
      CallerTransaction<'signature', 'proof', 'binding'>
    >();
  });

  it('decodes the tx of a record narrowed to one era with that era class only', () => {
    const decode = (record: FinalizedTxRead) => (record.era === 'v9' ? record.tx.deserialize({ v9: CallerTransaction }) : undefined);

    expectTypeOf(decode).returns.toEqualTypeOf<CallerTransaction<'signature', 'proof', 'binding'> | undefined>();
  });

  it('refuses decoders with none for the handle era', () => {
    // @ts-expect-error a v9 handle cannot be decoded with a v8 class only
    ledger9UnprovenHandle.deserialize({ v8: CallerTransaction });
  });

  it('refuses a class that cannot decode a transaction', () => {
    // @ts-expect-error an object without deserialize and fromParts is not a Transaction class
    ledger9UnprovenHandle.deserialize({ v9: { deserialize: (raw: Uint8Array) => raw } });
  });

  it('refuses a class whose transactions cannot be proven and bound', () => {
    const notALedgerClass = { deserialize: (): string => 'decoded', fromParts: () => ({ x: 1 }) };

    // @ts-expect-error fromParts gives no transaction with prove and bind
    ledger9UnprovenHandle.deserialize({ v9: notALedgerClass });
  });

  it('returns a usable type, not never, for decoders typed as TransactionDecoders', () => {
    const decoders: TransactionDecoders = { v9: CallerTransaction };

    expectTypeOf(ledger9FinalizedHandle.deserialize(decoders)).not.toBeNever();
  });

  it('is not on the class: there is no unwrap', () => {
    expectTypeOf(LedgerTransaction).not.toHaveProperty('unwrap');
  });
});

describe('finalized transaction records', () => {
  it('carry the transaction as a finalized handle of the record era', () => {
    expectTypeOf<Ledger9FinalizedTxData['tx']>().toEqualTypeOf<LedgerTransaction<'Finalized', 'v9'>>();
    expectTypeOf<Ledger8FinalizedTxData['tx']>().toEqualTypeOf<LedgerTransaction<'Finalized', 'v8'>>();
    expectTypeOf<FinalizedTxRead['tx']>().toExtend<FinalizedTx>();
  });

  it('narrow the era of tx when narrowing on version', () => {
    const txEraOf = (record: FinalizedTxRead) => (record.era === 'v8' ? record.tx.era : undefined);

    expectTypeOf(txEraOf).returns.toEqualTypeOf<'v8' | undefined>();
  });

  it('still narrow on version', () => {
    const eraOf = (record: FinalizedTxRead) => {
      switch (record.era) {
        case 'v8':
          return record.era;
        case 'v9':
          return record.era;
        default: {
          const unhandled: never = record;
          return unhandled;
        }
      }
    };

    expectTypeOf(eraOf).returns.toEqualTypeOf<'v8' | 'v9'>();
  });
});
