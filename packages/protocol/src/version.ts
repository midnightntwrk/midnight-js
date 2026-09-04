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
import { LEDGER_VERSIONS, type LedgerVersion } from './lib/shared/ledger-version';

// Declared in the leaf module `./lib/shared/ledger-version`, which `./errors`
// can also reach; declaring it here would close a cycle — see ModuleGraphAndLazyLoading.
export { LEDGER_VERSIONS, type LedgerVersion };

/**
 * Anything that can report the network's current head protocol version —
 * typically an indexer or node client. Consumed by {@link networkHeadVersion}.
 */
export interface ProtocolVersionSource {
  /**
   * @returns The network's current head `protocolVersion` integer.
   */
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

// Deliberately narrower than the indexer's table: do not "restore" the 0.x
// major to match it without a caller needing it — see SharedTableDiscipline.
const NODE_MAJOR_TO_LEDGER = {
  1: 'v8',
  2: 'v9'
} as const satisfies Partial<Record<number, LedgerVersion>>;

type MappedLedgerVersion = (typeof NODE_MAJOR_TO_LEDGER)[keyof typeof NODE_MAJOR_TO_LEDGER];

// Compile-time-only guard: a `LEDGER_VERSIONS` member with no entry in the
// table above stops this assignment type-checking — see SharedTableDiscipline.
const _allLedgerVersionsAreMapped: Exclude<LedgerVersion, MappedLedgerVersion> extends never ? true : never = true;

// A typed function rather than a direct index, because a `number`-typed key
// cannot index the `as const` table — see SharedTableDiscipline.
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
 * Most call sites should not call this directly. Prefer
 * {@link versionOfRecord} for a `protocolVersion` read off an existing
 * indexer/node record, or {@link networkHeadVersion} for the network's
 * current head version — both tag the resulting error with the correct
 * `path` automatically. Pass `path` explicitly here only when neither helper
 * fits the call site.
 *
 * @param protocolVersion The raw integer read from an indexer or node record.
 * @param path Which resolution path a failure is attributed to. Defaults to
 * `'construct'`, and decides which of the two error codes a failure carries.
 * @returns The {@link LedgerVersion} that `protocolVersion`'s node major maps
 * onto.
 * @throws {@link UnknownProtocolVersionError} with `reason: 'malformed'` when
 * `protocolVersion` is not a non-negative integer, and with `reason: 'unknown'`
 * when it is a well-formed integer outside every range above.
 * @see {@link SharedTableDiscipline}
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
 * transaction or block already read from the indexer).
 *
 * @param record Any object carrying a raw `protocolVersion` integer field.
 * @returns The {@link LedgerVersion} that record was written under.
 * @throws {@link UnknownProtocolVersionError} tagged with the `read` path, on
 * the same two conditions as {@link protocolVersionToLedger}.
 */
export const versionOfRecord = (record: VersionedRecord): LedgerVersion =>
  protocolVersionToLedger(record.protocolVersion, 'read');

/**
 * Queries `source` for the network's current head protocol version and
 * resolves it to a {@link LedgerVersion}.
 *
 * @param source The indexer or node client to ask for the head version.
 * @returns A promise for the {@link LedgerVersion} at the network head.
 * @throws {@link UnknownProtocolVersionError} tagged with the `construct`
 * path, on the same two conditions as {@link protocolVersionToLedger}. A
 * rejection from `source.queryLatestProtocolVersion()` propagates unchanged.
 */
export const networkHeadVersion = async (source: ProtocolVersionSource): Promise<LedgerVersion> =>
  protocolVersionToLedger(await source.queryLatestProtocolVersion(), 'construct');
