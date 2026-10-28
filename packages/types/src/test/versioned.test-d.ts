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

import type { TransactionHash, TransactionId } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { describe, expectTypeOf, it } from 'vitest';

import type { LedgerTransaction } from '../ledger-transaction';
import type { BlockHash, Fees, FinalizedTxData, SegmentStatus, TxStatus, UnshieldedUtxos } from '../midnight-types';
import type { Ledger8FinalizedTxData, VersionedFinalizedTxData } from '../versioned';

// These are compile-level tests: the property under test is that the file
// type-checks (or, for the `@ts-expect-error` case, that it does NOT
// type-check without the suppressed error). They are verified by running
// vitest's typecheck pass for this package, enabled unconditionally in
// `vitest.config.ts`, which surfaces `tsc` diagnostics against this file as
// test failures; a plain `yarn test` runs them. Running these bodies at
// runtime is incidental — `expectTypeOf(...)` performs no runtime assertion.

// Spelled out independently of `FinalizedTxData` (no `Omit`/`keyof` derived
// from it) so the equality check below actually pins the v9 variant's shape
// instead of reflexively restating it. Keep in step with `FinalizedTxData`
// and `FinalizedTxRecord` by hand — that is what makes the check meaningful.
type Ledger9FinalizedTxDataFixture = {
  readonly version: 'v9';
  readonly tx: LedgerTransaction<'Finalized', 'v9'>;
  readonly status: TxStatus;
  readonly txId: TransactionId;
  readonly identifiers: readonly TransactionId[];
  readonly txHash: TransactionHash;
  readonly blockHash: BlockHash;
  readonly blockHeight: number;
  readonly blockTimestamp: number;
  readonly blockAuthor: string | null;
  readonly indexerId: number;
  readonly protocolVersion: number;
  readonly fees: Fees;
  readonly segmentStatusMap: Map<number, SegmentStatus> | undefined;
  readonly unshielded: UnshieldedUtxos;
};

// The v8 mirror of the fixture above, pinned field for field rather than
// covered only by the discriminant check.
type Ledger8FinalizedTxDataFixture = {
  readonly version: 'v8';
  readonly tx: LedgerTransaction<'Finalized', 'v8'>;
  readonly status: TxStatus;
  readonly txId: TransactionId;
  readonly identifiers: readonly TransactionId[];
  readonly txHash: TransactionHash;
  readonly blockHash: BlockHash;
  readonly blockHeight: number;
  readonly blockTimestamp: number;
  readonly blockAuthor: string | null;
  readonly indexerId: number;
  readonly protocolVersion: number;
  readonly fees: Fees;
  readonly segmentStatusMap: Map<number, SegmentStatus> | undefined;
  readonly unshielded: UnshieldedUtxos;
};

describe('VersionedFinalizedTxData', () => {
  it('is exhaustively narrowable, so the default branch receives never', () => {
    const describeVersion = (data: VersionedFinalizedTxData) => {
      switch (data.version) {
        case 'v8':
          return `v8:${data.txId}`;
        case 'v9':
          return `v9:${data.txId}`;
        default: {
          // Fails to compile if a variant is added to the union without a case
          // above, which is the property under test.
          const unhandled: never = data;
          return unhandled;
        }
      }
    };

    // Asserting the *inferred* return type: annotating it `string` would make
    // this unfalsifiable. `never` from the default branch drops out of the
    // union, so a genuine `string` here means both variants were reached.
    expectTypeOf(describeVersion).returns.toEqualTypeOf<string>();
  });

  it('pins the v9 variant field-for-field — fails if any field is dropped, added, or retyped', () => {
    // Bidirectional: catches a field being dropped (fixture would then demand
    // a field FinalizedTxData no longer has), added (FinalizedTxData would
    // demand a field the fixture doesn't have), or retyped (mismatched field
    // type breaks assignability in at least one direction).
    expectTypeOf<Ledger9FinalizedTxDataFixture>().toEqualTypeOf<FinalizedTxData>();
  });

  it('has exactly the v8 and v9 variants — fails if a variant is silently removed, a third variant added, or a discriminant widened', () => {
    // The real discriminating check: comparing the union's discriminant
    // property against a hardcoded literal union. Removing a variant shrinks
    // the actual union; adding a third variant (with its own literal `version`)
    // or widening a variant's `version` to a non-literal grows it — either way
    // it stops equaling the hardcoded `'v8' | 'v9'`.
    expectTypeOf<VersionedFinalizedTxData['version']>().toEqualTypeOf<'v8' | 'v9'>();
  });

  it('pins the v8 variant field-for-field, so it cannot drift on its own', () => {
    // `Ledger8FinalizedTxData` inherits from `FinalizedTxRecord`, which stops the
    // two variants diverging as fields are added to the *base*. It does not stop a
    // field being added to this variant alone, nor an inherited field being
    // narrowed here. That is what this pins.
    expectTypeOf<Ledger8FinalizedTxDataFixture>().toEqualTypeOf<Ledger8FinalizedTxData>();
  });
});

describe('the compile-time bridge to LedgerVersion', () => {
  // Mirrors the four assertions at the foot of `versioned.ts`. The property
  // under test is the *mechanism*, not the current era set: those assertions
  // can only fail the build on a mismatch if this shape rejects one. The
  // mechanism had to be pinned separately because a broken version of it fails
  // silently — it type-checks in both directions and reads as if it works.
  type Assert<T extends true> = T;

  it('accepts an era set whose eras all have a variant', () => {
    type Eras = 'v8' | 'v9';
    type Variants = 'v8' | 'v9';
    type Matched = Assert<[Exclude<Eras, Variants>] extends [never] ? true : false>;

    expectTypeOf<Matched>().toEqualTypeOf<true>();
  });

  it('rejects an era that has no variant — the failure versioned.ts depends on', () => {
    type Eras = 'v8' | 'v9' | 'v10';
    type Variants = 'v8' | 'v9';

    // @ts-expect-error `'v10'` has no variant, so the difference is non-empty, the
    // condition resolves to `false`, and `false` does not satisfy `T extends
    // true`. If this stops erroring, the directive itself becomes unused
    // (TS2578) and the typecheck pass fails — so this test cannot rot into a
    // no-op.
    //
    // The tuple brackets are what make it fire. A bare
    // `Exclude<Eras, Variants> extends never ? true : false` is a *distributive*
    // conditional: an empty difference distributes over the empty union and
    // yields `never`, not `true` — and `never` satisfies `T extends true`. So
    // the undistributed form is satisfied whether the sets agree or not.
    type Mismatched = Assert<[Exclude<Eras, Variants>] extends [never] ? true : false>;

    expectTypeOf<Mismatched>().toEqualTypeOf<false>();
  });
});
