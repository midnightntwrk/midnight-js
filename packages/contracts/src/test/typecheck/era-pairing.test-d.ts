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

import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol';
import { describe, expectTypeOf, it } from 'vitest';

import type { PipelineEra } from '../../era';
import type { EraPairing, EraPairingTable, EraRulings } from '../../internal/era';

// Compile-level tests, run by the typecheck pass this package enables in `vitest.config.ts` --
// see the note at the top of `./overloads.test-d.ts` for how they are gated.
//
// These two types are the PARAMETER types of the constructors that build the pairing table, so a
// literal rejected here is a literal the table cannot be built from. That is the whole gate: the
// annotation on the table itself cannot carry it, because by then the null-prototype cast has
// asserted the rows into existence and an empty table would satisfy it.
//
// Each case gets its own `it`, so a failure names the regression that caused it rather than
// pointing at a block that covers four of them.

describe('a pairing table must rule every artifact era', () => {
  it('is a total map from artifact era to rulings', () => {
    expectTypeOf<EraPairingTable>().toEqualTypeOf<Readonly<Record<PipelineEra, EraRulings>>>();
  });

  it('refuses a table missing an artifact era', () => {
    // @ts-expect-error - no `ledger8` row
    const missingRow: EraPairingTable = {
      ledger9: { v8: 'artifact-newer-than-head', v9: 'run' }
    };
    void missingRow;
  });

  it('refuses a table carrying an artifact era the vocabulary does not spell', () => {
    const excessRow: EraPairingTable = {
      ledger8: { v8: 'run', v9: 'call-only' },
      ledger9: { v8: 'artifact-newer-than-head', v9: 'run' },
      // @ts-expect-error - `ledger10` is not a `PipelineEra`, so this cell could only ever be
      // reached by a value the vocabulary has already refused
      ledger10: { v8: 'run', v9: 'run' }
    };
    void excessRow;
  });
});

describe('one row must rule every head era', () => {
  it('is a total map from head era to verdict', () => {
    expectTypeOf<EraRulings>().toEqualTypeOf<Readonly<Record<LedgerVersion, EraPairing>>>();
  });

  it('refuses a row that rules only some of the head eras', () => {
    // `Partial<Record<...>>` here would accept this and leave the pairing undecided for one head
    // era at run time. That shape is right for `NODE_MAJOR_TO_LEDGER`, whose keys are `number` --
    // an open domain, where a total `Record` is not expressible. It is wrong for a closed union,
    // and the two must not be conflated.
    // @ts-expect-error - rules no `v8` head
    const missingColumn: EraRulings = { v9: 'run' };
    void missingColumn;
  });

  it('refuses a row carrying a head era the vocabulary does not spell', () => {
    const excessColumn: EraRulings = {
      v8: 'run',
      v9: 'call-only',
      // @ts-expect-error - `v10` is not a `LedgerVersion`
      v10: 'run'
    };
    void excessColumn;
  });

  it('refuses a ruling outside the closed verdict set', () => {
    // Without this the table would type-check with a verdict `assertEraCompatible` never reads,
    // which is a cell that silently falls through to its unreachable closing arm.
    // @ts-expect-error - `'maybe'` is not an era pairing verdict
    const unknownVerdict: EraRulings = { v8: 'run', v9: 'maybe' };
    void unknownVerdict;
  });
});
