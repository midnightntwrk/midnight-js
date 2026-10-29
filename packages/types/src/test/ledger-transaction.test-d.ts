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

import type { UnprovenTransaction as Ledger8UnprovenTransaction } from '@midnight-ntwrk/midnight-js-protocol/v8';
import type { UnprovenTransaction as Ledger9UnprovenTransaction } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { describe, expectTypeOf, it } from 'vitest';

import {
  type FinalizedTx,
  LedgerTransaction,
  type LedgerTransactionTypes,
  type UnboundTx,
  type UnprovenTx
} from '../ledger-transaction';
import type { FinalizedTxData } from '../midnight-types';
import type { FinalizedTxRead,Ledger8FinalizedTxData } from '../versioned';

declare const unprovenTx: UnprovenTx;
declare const unboundTx: UnboundTx;
declare const finalizedTx: FinalizedTx;
declare const ledger8Unbound: LedgerTransactionTypes['v8']['Unbound'];
declare const ledger9Unproven: Ledger9UnprovenTransaction;

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

describe('LedgerTransaction.seal', () => {
  it('returns the handle at the stage and era it was given', () => {
    expectTypeOf(LedgerTransaction.seal('v9', 'Unproven', ledger9Unproven)).toEqualTypeOf<LedgerTransaction<'Unproven', 'v9'>>();
  });

  it('returns a handle that is a handle of its stage in any era', () => {
    expectTypeOf(LedgerTransaction.seal('v9', 'Unproven', ledger9Unproven)).toExtend<UnprovenTx>();
  });

  it('refuses an object of the same era at another stage', () => {
    // @ts-expect-error an unproven transaction cannot be sealed as finalized
    LedgerTransaction.seal('v9', 'Finalized', ledger9Unproven);
  });

  it('refuses an object of the other era', () => {
    // @ts-expect-error a v8 unbound transaction cannot be sealed as v9
    LedgerTransaction.seal('v9', 'Unbound', ledger8Unbound);
  });
});

describe('LedgerTransaction.unwrap', () => {
  it('returns the ledger class of the requested era at the handle stage', () => {
    expectTypeOf(LedgerTransaction.unwrap(unprovenTx, 'v8')).toEqualTypeOf<Ledger8UnprovenTransaction>();
    expectTypeOf(LedgerTransaction.unwrap(unprovenTx, 'v9')).toEqualTypeOf<Ledger9UnprovenTransaction>();
  });
});

describe('finalized transaction records', () => {
  it('carry the transaction as a finalized handle of the record era', () => {
    expectTypeOf<FinalizedTxData['tx']>().toEqualTypeOf<LedgerTransaction<'Finalized', 'v9'>>();
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
