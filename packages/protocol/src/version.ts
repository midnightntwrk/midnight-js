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

export const LEDGER_VERSIONS = ['v8', 'v9'] as const;
export type LedgerVersion = (typeof LEDGER_VERSIONS)[number];

/** int encodes the NODE version (major·1_000_000 + minor·1_000) — spec OQ1.
 *  Bounded per-major ranges; fail fast ONLY on an unknown major. Major 0 is
 *  exempt from the same-major rule (0.x minors are semver-breaking). */
const NODE_MAJOR_TO_LEDGER: Readonly<Record<number, LedgerVersion>> = { 1: 'v8', 2: 'v9' };
const NODE_MAJOR0_MINOR_TO_LEDGER: Readonly<Record<number, LedgerVersion>> = { 22: 'v8' };

export const protocolVersionToLedger = (
  protocolVersion: number,
  path: VersionResolutionPath = 'construct'
): LedgerVersion => {
  if (!Number.isInteger(protocolVersion) || protocolVersion < 0) {
    throw new UnknownProtocolVersionError(protocolVersion, path);
  }
  const major = Math.floor(protocolVersion / 1_000_000);
  const ledger =
    major === 0
      ? NODE_MAJOR0_MINOR_TO_LEDGER[Math.floor(protocolVersion / 1_000)]
      : NODE_MAJOR_TO_LEDGER[major];
  if (ledger === undefined) {
    throw new UnknownProtocolVersionError(protocolVersion, path);
  }
  return ledger;
};

export const versionOfRecord = (record: { protocolVersion: number }): LedgerVersion =>
  protocolVersionToLedger(record.protocolVersion, 'read');

export const networkHeadVersion = async (source: {
  queryLatestProtocolVersion(): Promise<number>;
}): Promise<LedgerVersion> => protocolVersionToLedger(await source.queryLatestProtocolVersion(), 'construct');
