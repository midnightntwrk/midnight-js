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

import { UnknownProtocolVersionError, type VersionResolutionPath } from './errors';

/**
 * The two ledger runtimes midnight-js can talk to. `v8` backs the node 1.x
 * line; `v9` backs the 2.x line. This is a closed, exhaustive set —
 * see {@link protocolVersionToLedger} for how a raw `protocolVersion`
 * integer maps onto it.
 */
export const LEDGER_VERSIONS = ['v8', 'v9'] as const;
export type LedgerVersion = (typeof LEDGER_VERSIONS)[number];

/**
 * Anything that can report the network's current head protocol version —
 * typically an indexer or node client. Consumed by {@link networkHeadVersion}.
 */
export interface ProtocolVersionSource {
  queryLatestProtocolVersion(): Promise<number>;
}

/**
 * Any record carrying a raw `protocolVersion` integer field, e.g. a
 * transaction or block already read from the indexer. Consumed by
 * {@link versionOfRecord}.
 */
export interface VersionedRecord {
  readonly protocolVersion: number;
}

// The protocolVersion integer encodes the NODE version as
// major * 1_000_000 + minor * 1_000 + patch, so a whole node major occupies a
// 1_000_000-wide range. This encoding — and the node-major to ledger-runtime
// mapping below — mirrors the canonical mapping maintained in
// midnightntwrk/midnight-indexer, indexer-common/src/domain/protocol_version.rs.
//
// Only majors 1 and 2 are mapped. midnight-js ships against node 1.x and 2.x,
// so a 0.x protocolVersion is an unknown version, not a supported era.
const NODE_MAJOR_TO_LEDGER = {
  1: 'v8',
  2: 'v9'
} as const satisfies Partial<Record<number, LedgerVersion>>;

type MappedLedgerVersion = (typeof NODE_MAJOR_TO_LEDGER)[keyof typeof NODE_MAJOR_TO_LEDGER];

// Compile-time-only guard: if LEDGER_VERSIONS ever grows without a matching
// entry being added to the table above, this assignment stops type-checking
// (the conditional type resolves to `never`).
const _allLedgerVersionsAreMapped: Exclude<LedgerVersion, MappedLedgerVersion> extends never ? true : never = true;

// Kept as a small typed function (rather than indexing the `as const` table
// directly) because a `number`-typed key cannot index an object type with only
// numeric literal properties — the `Partial<Record<number, ...>>` parameter
// type is what makes the `=== undefined` guard below type-driven instead of
// relying on a cast.
const lookupLedger = (table: Partial<Record<number, LedgerVersion>>, key: number): LedgerVersion | undefined =>
  table[key];

/**
 * Maps a raw `protocolVersion` integer (as returned by the indexer or node)
 * onto the ledger runtime it corresponds to.
 *
 * | protocolVersion range | node version | ledger |
 * | --------------------- | ------------ | ------ |
 * | 1_000_000 – 1_999_999 | 1.x          | v8     |
 * | 2_000_000 – 2_999_999 | 2.x          | v9     |
 *
 * Throws {@link UnknownProtocolVersionError}:
 * - with `reason: 'malformed'` when `protocolVersion` is not a non-negative
 *   integer;
 * - with `reason: 'unknown'` when it is a well-formed integer outside every
 *   range above.
 *
 * Most call sites should not call this directly. Prefer
 * {@link versionOfRecord} for a `protocolVersion` read off an existing
 * indexer/node record, or {@link networkHeadVersion} for the network's
 * current head version — both tag the resulting error with the correct
 * `path` automatically. Pass `path` explicitly here only when neither helper
 * fits the call site.
 */
export const protocolVersionToLedger = (
  protocolVersion: number,
  path: VersionResolutionPath = 'construct'
): LedgerVersion => {
  if (!Number.isInteger(protocolVersion) || protocolVersion < 0) {
    throw new UnknownProtocolVersionError(protocolVersion, path, 'malformed');
  }
  const ledger = lookupLedger(NODE_MAJOR_TO_LEDGER, Math.floor(protocolVersion / 1_000_000));
  if (ledger === undefined) {
    throw new UnknownProtocolVersionError(protocolVersion, path, 'unknown');
  }
  return ledger;
};

/**
 * Resolves the ledger version for a record's `protocolVersion` field (e.g. a
 * transaction or block already read from the indexer). Any resulting
 * {@link UnknownProtocolVersionError} is tagged with the `read` path.
 */
export const versionOfRecord = (record: VersionedRecord): LedgerVersion =>
  protocolVersionToLedger(record.protocolVersion, 'read');

/**
 * Queries `source` for the network's current head protocol version and
 * resolves it to a {@link LedgerVersion}. Any resulting
 * {@link UnknownProtocolVersionError} is tagged with the `construct` path.
 * A rejection from `source.queryLatestProtocolVersion()` propagates
 * unchanged.
 */
export const networkHeadVersion = async (source: ProtocolVersionSource): Promise<LedgerVersion> =>
  protocolVersionToLedger(await source.queryLatestProtocolVersion(), 'construct');
