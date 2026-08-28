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

import type {
  Binding,
  Proof,
  SignatureEnabled,
  Transaction,
  TransactionHash,
  TransactionId
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { describe, expectTypeOf, it } from 'vitest';

import type { BlockHash, Fees, FinalizedTxData, SegmentStatus, TxStatus, UnshieldedUtxos } from '../midnight-types';
import type { VersionedFinalizedTxData } from '../versioned';

// These are compile-level tests: the property under test is that the file
// type-checks (or, for the `@ts-expect-error` case, that it does NOT
// type-check without the suppressed error). They are verified by running
// vitest's typecheck pass for this package (`vitest --typecheck`), which
// surfaces `tsc` diagnostics against this file as test failures — see
// packages/types/vitest.config.ts. Running these bodies at plain runtime is
// incidental; `expectTypeOf(...)` performs no runtime assertion.

// Spelled out independently of `FinalizedTxData` (no `Omit`/`keyof` derived
// from it) so the equality check below actually pins the v9 arm's shape
// instead of reflexively restating it. Keep in step with `FinalizedTxData`
// and `FinalizedTxRecord` by hand — that is what makes the check meaningful.
type FinalizedTxDataV9Fixture = {
  readonly version: 'v9';
  readonly tx: Transaction<SignatureEnabled, Proof, Binding>;
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
          // Fails to compile if an arm is added to the union without a case
          // above, which is the property under test.
          const unhandled: never = data;
          return unhandled;
        }
      }
    };

    // Asserting the *inferred* return type: annotating it `string` would make
    // this unfalsifiable. `never` from the default branch drops out of the
    // union, so a genuine `string` here means both arms were reached.
    expectTypeOf(describeVersion).returns.toEqualTypeOf<string>();
  });

  it('rejects access to the v9-shaped tx field before the discriminant is narrowed', () => {
    const data = {} as VersionedFinalizedTxData;

    // @ts-expect-error `data.tx` on the unnarrowed union is
    // `FinalizedTxDataV8['tx'] | FinalizedTxData['tx']` (a v8 transaction object
    // or a v9 one) — not assignable to the v9-only `FinalizedTxData['tx']` type
    // required here without first narrowing on `data.version`.
    const v9Tx: FinalizedTxData['tx'] = data.tx;

    expectTypeOf(v9Tx).not.toBeAny();
  });

  it('pins the v9 arm field-for-field — fails if any field is dropped, added, or retyped', () => {
    // Bidirectional: catches a field being dropped (fixture would then demand
    // a field FinalizedTxData no longer has), added (FinalizedTxData would
    // demand a field the fixture doesn't have), or retyped (mismatched field
    // type breaks assignability in at least one direction).
    expectTypeOf<FinalizedTxDataV9Fixture>().toEqualTypeOf<FinalizedTxData>();
  });

  it('has exactly the v8 and v9 arms — fails if an arm is silently removed, a third arm added, or a discriminant widened', () => {
    // The real discriminating check: comparing the union's discriminant
    // property against a hardcoded literal union. Removing an arm shrinks
    // the actual union; adding a third arm (with its own literal `version`)
    // or widening an arm's `version` to a non-literal grows it — either way
    // it stops equaling the hardcoded `'v8' | 'v9'`.
    expectTypeOf<VersionedFinalizedTxData['version']>().toEqualTypeOf<'v8' | 'v9'>();
  });
});
