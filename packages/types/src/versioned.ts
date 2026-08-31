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

import type { FinalizedTransaction as V8Transaction } from '@midnight-ntwrk/midnight-js-protocol/v8';
import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';

import type { FinalizedTxData, FinalizedTxRecord } from './midnight-types';

/**
 * The v8 arm of every transaction payload crossing a provider seam
 * (`proveTx`, `balanceTx`, `submitTx`), in both directions.
 *
 * During the ledger-fork window a v8-era transaction never crosses a provider
 * seam as a live ledger object: the two ledger runtimes are separate WASM
 * instances, so an object built by one cannot be handed to the other. It
 * crosses as its serialized, tag-prefixed byte form instead, and the
 * `version` discriminant says which runtime produced those bytes.
 *
 * Two things this type deliberately does not express. The bytes are not
 * validated — any `Uint8Array` satisfies `txBytes`, and nothing here checks
 * for the tag prefix. And the arm is identical for all three seams, so it
 * carries no statement about which pipeline stage the transaction has reached;
 * on the v8 path, stage is the caller's responsibility.
 */
export interface V8TxBytes {
  readonly version: 'v8';
  /** Serialized, tag-prefixed byte form. Unvalidated — see the note above. */
  readonly txBytes: Uint8Array;
}

/**
 * The v9 arm of every transaction payload crossing a provider seam: the live
 * ledger object, carried directly because both sides of the seam share the v9
 * WASM instance.
 *
 * @typeParam T - The v9 ledger transaction type for the pipeline stage in
 *                question — unproven, unbound, or finalized.
 */
export interface V9Tx<T> {
  readonly version: 'v9';
  readonly tx: T;
}

/**
 * A transaction payload crossing a provider seam, discriminated by the ledger
 * runtime it belongs to: serialized bytes for the v8 era ({@link V8TxBytes}),
 * or the live ledger object for v9 ({@link V9Tx}).
 *
 * Consumers must narrow on `version` before touching the payload — there is
 * deliberately no untagged form, so a bare `Uint8Array` (bytes whose era
 * nobody can tell) is never assignable where this type is expected.
 *
 * The seam types do not tie the input era to the output era: nothing here
 * stops a provider returning a v9 result for a v8 input. A v9-only flow is
 * expected to check that at its own boundary.
 *
 * @typeParam T - The v9 ledger transaction type carried by the `'v9'` arm.
 *
 * @example
 * ```typescript
 * const proven = await proofProvider.proveTx({ version: 'v9', tx: unprovenTx });
 * switch (proven.version) {
 *   case 'v9':
 *     return proven.tx; // live v9 ledger object
 *   case 'v8':
 *     return decodeV8(proven.txBytes); // serialized, tag-prefixed bytes
 * }
 * ```
 */
export type VersionedTx<T> = V8TxBytes | V9Tx<T>;

/**
 * The v8 arm of {@link VersionedFinalizedTxData}. Carries the same
 * finalized-transaction metadata as {@link FinalizedTxData} — both arms extend
 * {@link FinalizedTxRecord} — with a v8 ledger transaction object in place of
 * the v9 one.
 *
 * `version` is derived from the record's own `protocolVersion` by the provider
 * that builds it, so this shape is only produced for a record that resolves to
 * the v8 ledger runtime.
 *
 * No provider produces this arm yet: the read path decodes with the v9-only
 * deserializer, so a v8-era record surfaces as a thrown error rather than as a
 * value. The arm exists so that consumers narrow once now, rather than after a
 * second breaking change when dual decode lands.
 */
export interface FinalizedTxDataV8 extends FinalizedTxRecord {
  readonly version: 'v8';
  readonly tx: V8Transaction;
}

/**
 * A finalized transaction record, discriminated by which ledger runtime
 * produced it. Both arms carry identical metadata; only `tx`'s type and the
 * `version` discriminant differ.
 *
 * The providers in this framework resolve `version` from the record's own
 * `protocolVersion` at the one construction point per provider, and throw
 * rather than mislabel a record from an era they cannot decode. Nothing in the
 * type system obliges a third-party `PublicDataProvider` to do the same, so the
 * discriminant is exactly as trustworthy as the provider that produced it.
 */
export type VersionedFinalizedTxData = FinalizedTxDataV8 | FinalizedTxData;

// Compile-time-only bridge to the era vocabulary in
// `@midnight-ntwrk/midnight-js-protocol`, which owns the mapping from a raw
// `protocolVersion` to an era. These four assertions keep the discriminant set
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
type _EveryEraHasAnArm = Assert<
  [Exclude<LedgerVersion, VersionedTx<unknown>['version']>] extends [never] ? true : false
>;
type _NoArmOutsideTheEraSet = Assert<
  [Exclude<VersionedTx<unknown>['version'], LedgerVersion>] extends [never] ? true : false
>;
type _EveryEraHasAReadArm = Assert<
  [Exclude<LedgerVersion, VersionedFinalizedTxData['version']>] extends [never] ? true : false
>;
type _NoReadArmOutsideTheEraSet = Assert<
  [Exclude<VersionedFinalizedTxData['version'], LedgerVersion>] extends [never] ? true : false
>;
