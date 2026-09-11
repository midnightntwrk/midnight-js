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
import { ERA_PAIRING, type EraPairing, type EraPairingTable } from '../../internal/era';

// Compile-level tests, run by the typecheck pass this package enables in `vitest.config.ts` —
// see the note at the top of `./overloads.test-d.ts` for how they are gated.
//
// What they pin is the ONE declaration that binds the two era vocabularies together: `PipelineEra`
// keys the rows and `LedgerVersion` keys the columns, so neither set can gain a member without
// this table gaining the cells for it. The runtime behaviour of every cell is asserted separately,
// in `../era-dispatch.test.ts`.

describe('the era pairing table is declared total in BOTH era vocabularies', () => {
  it('types the table as a row per pipeline era and a column per ledger version', () => {
    expectTypeOf(ERA_PAIRING).toEqualTypeOf<EraPairingTable>();
    expectTypeOf<EraPairingTable>().toEqualTypeOf<
      Readonly<Record<PipelineEra, Readonly<Record<LedgerVersion, EraPairing>>>>
    >();
  });

  it('refuses a table whose row rules only some of the ledger versions', () => {
    // A `Partial<Record<...>>` here — the shape `NODE_MAJOR_TO_LEDGER` legitimately uses, and so
    // the shape a later edit is most likely to copy — would accept this and leave the pairing
    // undecided for one head era at run time.
    const missingColumn: EraPairingTable = {
      ledger8: { v8: 'run', v9: 'call-only' },
      // @ts-expect-error - this row rules no `v8` head
      ledger9: { v9: 'run' }
    };
    void missingColumn;
  });

  it('refuses a table missing a whole pipeline era', () => {
    // @ts-expect-error - no `ledger8` row
    const missingRow: EraPairingTable = {
      ledger9: { v8: 'artifact-newer-than-head', v9: 'run' }
    };
    void missingRow;
  });

  it('refuses a ruling outside the closed verdict set', () => {
    // Without this the table would type-check with a verdict `assertEraCompatible` never reads,
    // which is a cell that silently falls through to its unreachable arm.
    const unknownVerdict: EraPairingTable = {
      // @ts-expect-error - `'maybe'` is not an era pairing verdict
      ledger8: { v8: 'run', v9: 'maybe' },
      ledger9: { v8: 'artifact-newer-than-head', v9: 'run' }
    };
    void unknownVerdict;
  });
});
