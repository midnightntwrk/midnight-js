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

import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';

import type { FinalizedTx, LedgerTransaction } from './ledger-transaction';
import type { FinalizedTxRecord, Ledger9FinalizedTxData } from './midnight-types';

/**
 * The v8 variant of {@link FinalizedTxRead}. Carries the same
 * finalized-transaction metadata as {@link Ledger9FinalizedTxData} — both variants extend
 * {@link FinalizedTxRecord} — and the transaction as a {@link FinalizedTx}
 * handle whose era is v8: `record.tx.era === record.era`.
 *
 * `era` is derived from the record's own `protocolVersion` by the provider
 * that builds it, so this shape is only produced for a record that resolves to
 * the v8 ledger runtime.
 *
 * A provider that decodes per era produces this variant for any record whose
 * `protocolVersion` places it in the v8 era. A consumer that narrows on
 * `era` therefore has to handle it: it is a value the read surface really
 * returns, not a placeholder.
 */
export interface Ledger8FinalizedTxData extends FinalizedTxRecord {
  readonly era: 'v8';
  /** The finalized transaction, as a v8 handle. */
  readonly tx: LedgerTransaction<'Finalized', 'v8'>;
}

/**
 * A finalized transaction record, discriminated by which ledger runtime
 * produced it. Both variants carry identical metadata and a {@link FinalizedTx}
 * handle of their own era, so narrowing on `era` narrows `tx.era` with it.
 * Read the transaction with `LedgerTransaction.unwrap(record.tx, record.era)`.
 *
 * The providers in this framework resolve `era` from the record's own
 * `protocolVersion` at the one construction point per provider, and throw
 * rather than mislabel a record from an era they cannot decode. Nothing in the
 * type system obliges a third-party `PublicDataProvider` to do the same, so the
 * discriminant is exactly as trustworthy as the provider that produced it.
 */
export type FinalizedTxRead = Ledger8FinalizedTxData | Ledger9FinalizedTxData;

// Compile-time-only bridge to the era vocabulary in
// `@midnight-ntwrk/midnight-js-protocol`, which owns the mapping from a raw
// `protocolVersion` to an era. These two assertions keep the discriminant sets
// here and `LedgerVersion` there as one fact: if either side gains an era the
// other lacks, the difference is non-empty and `Assert` fails to satisfy its
// `true` constraint. No runtime declarations, so `versioned.ts` stays
// types-only.
//
// The difference is wrapped in a tuple deliberately. A bare
// `Difference extends never ? true : false` is a *distributive* conditional:
// when `Difference` is `never` it distributes over the empty union and yields
// `never` rather than `true`, and `never` satisfies `T extends true`, so the
// assertion holds no matter what the two sides say. `[D] extends [never]`
// compares the types directly, which is what makes these load-bearing.
type Assert<T extends true> = T;
type _EveryEraHasAReadVariant = Assert<
  [Exclude<LedgerVersion, FinalizedTxRead['era']>] extends [never] ? true : false
>;
type _NoReadVariantOutsideTheEraSet = Assert<
  [Exclude<FinalizedTxRead['era'], LedgerVersion>] extends [never] ? true : false
>;
