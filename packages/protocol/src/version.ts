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

export const LEDGER_VERSIONS = Object.freeze(['v8', 'v9'] as const);
export type LedgerVersion = (typeof LEDGER_VERSIONS)[number];

export type ProtocolVersionErrorCode =
  | 'UNKNOWN_PROTOCOL_VERSION'
  | 'UNKNOWN_RECORD_PROTOCOL_VERSION'
  | 'UNKNOWN_NETWORK_HEAD_PROTOCOL_VERSION';

export interface SupportedProtocolVersionRange {
  /** Inclusive. */
  readonly min: number;
  /** Exclusive. */
  readonly max: number;
  readonly version: LedgerVersion;
}

/**
 * Attested node-major ranges (encoding: nodeMajor * 1_000_000 + nodeMinor * 1_000).
 * Major 0 is exempt from the per-major rule: 0.x minors are semver-breaking and
 * only node 0.22 is attested as v8. Extending this table for a future node major
 * is a one-line diff, made only after that major's ledger era is confirmed.
 */
const SUPPORTED_PROTOCOL_VERSION_RANGES: readonly SupportedProtocolVersionRange[] = Object.freeze([
  Object.freeze({ min: 22_000, max: 23_000, version: 'v8' }),
  Object.freeze({ min: 1_000_000, max: 2_000_000, version: 'v8' }),
  Object.freeze({ min: 2_000_000, max: 3_000_000, version: 'v9' })
] as const);

const MESSAGE_OBSERVED_MAX_LENGTH = 64;

const isSafeInteger = (value: unknown): value is number => Number.isSafeInteger(value);

const isFiniteNumber = (value: unknown): value is number => Number.isFinite(value);

/**
 * The observed value is attacker-controlled indexer output: never interpolated
 * raw. Non-numbers are truncated and stripped of control/ANSI characters so a
 * multi-megabyte or newline-bearing payload can neither bloat logs nor forge
 * log lines.
 */
const describeObserved = (observed: unknown): string =>
  typeof observed === 'number'
    ? String(observed)
    : String(observed)
        .slice(0, MESSAGE_OBSERVED_MAX_LENGTH)
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001f\u007f]/gu, '');

const renderSupportedRanges = (): string =>
  SUPPORTED_PROTOCOL_VERSION_RANGES.map((range) => `[${range.min},${range.max})=${range.version}`).join(', ');

/** Thrown by protocolVersionToLedger when the major is outside the attested table. */
export class UnknownProtocolVersionError extends Error {
  readonly code: ProtocolVersionErrorCode = 'UNKNOWN_PROTOCOL_VERSION';
  /** The observed value when it was a genuine number; undefined for adversarial non-number input. */
  readonly protocolVersion: number | undefined;
  readonly supportedRanges: readonly SupportedProtocolVersionRange[] = SUPPORTED_PROTOCOL_VERSION_RANGES;

  constructor(observed: unknown) {
    super(
      `Unknown protocol version '${describeObserved(observed)}'. Supported: ${renderSupportedRanges()}. ` +
        'Node major not attested by this midnight-js version; upgrade midnight-js.'
    );
    this.name = new.target.name;
    this.protocolVersion = isFiniteNumber(observed) ? observed : undefined;
  }
}

/** Read path (versionOfRecord). */
export class UnknownRecordProtocolVersionError extends UnknownProtocolVersionError {
  override readonly code = 'UNKNOWN_RECORD_PROTOCOL_VERSION';
}

/** Construct path (networkHeadVersion). */
export class UnknownNetworkHeadProtocolVersionError extends UnknownProtocolVersionError {
  override readonly code = 'UNKNOWN_NETWORK_HEAD_PROTOCOL_VERSION';
}

type ProtocolVersionErrorConstructor = new (observed: unknown) => UnknownProtocolVersionError;

const toLedgerVersion = (observed: unknown, ProtocolVersionError: ProtocolVersionErrorConstructor): LedgerVersion => {
  if (!isSafeInteger(observed)) {
    throw new ProtocolVersionError(observed);
  }
  const match = SUPPORTED_PROTOCOL_VERSION_RANGES.find((range) => observed >= range.min && observed < range.max);
  if (match === undefined) {
    throw new ProtocolVersionError(observed);
  }
  return match.version;
};

/**
 * Sole narrowing point: untrusted indexer int → closed LedgerVersion set.
 * midnight-js packages source versions via versionOfRecord (read paths) /
 * networkHeadVersion (construct paths) so the path-specific error taxonomy is
 * never bypassed. dApp code MAY call this directly for ints obtained outside
 * the provider flow (own queries, diagnostics); it then gets the base
 * UnknownProtocolVersionError.
 */
export const protocolVersionToLedger = (protocolVersion: number): LedgerVersion =>
  toLedgerVersion(protocolVersion, UnknownProtocolVersionError);

/** Read-path sourcing helper (historical records). */
export const versionOfRecord = (record: { protocolVersion: number }): LedgerVersion =>
  toLedgerVersion(record.protocolVersion, UnknownRecordProtocolVersionError);

/** Construct-path sourcing helper (network head). Exactly one query per call. */
export const networkHeadVersion = async (source: {
  queryLatestProtocolVersion(): Promise<number>;
}): Promise<LedgerVersion> =>
  toLedgerVersion(await source.queryLatestProtocolVersion(), UnknownNetworkHeadProtocolVersionError);