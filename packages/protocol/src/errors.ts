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

/** Registry of every error code this package's error classes can carry. Frozen so a downstream package cannot mutate the shared registry object at runtime. */
export const PROTOCOL_ERROR_CODES = Object.freeze({
  UNKNOWN_PROTOCOL_VERSION_READ: 'MIDNIGHT_JS_P_UNKNOWN_PROTOCOL_VERSION_READ',
  UNKNOWN_PROTOCOL_VERSION_CONSTRUCT: 'MIDNIGHT_JS_P_UNKNOWN_PROTOCOL_VERSION_CONSTRUCT',
  LEDGER8_INSTANCE_MISMATCH: 'MIDNIGHT_JS_P_LEDGER8_INSTANCE_MISMATCH',
  LEDGER8_RUNTIME_MISSING: 'MIDNIGHT_JS_P_LEDGER8_RUNTIME_MISSING',
  DOWN_CONVERT_FAILED: 'MIDNIGHT_JS_P_DOWN_CONVERT_FAILED',
  MERKLE_NOT_REHASHED: 'MIDNIGHT_JS_P_MERKLE_NOT_REHASHED'
} as const);
export type ProtocolErrorCode = (typeof PROTOCOL_ERROR_CODES)[keyof typeof PROTOCOL_ERROR_CODES];

/**
 * Whether `value` is an `Error` carrying one of `codes` — the predicate behind
 * every error class's `Symbol.hasInstance` below, which makes `instanceof`
 * code-based rather than prototype-based for this package's errors.
 *
 * Why: nothing guarantees a process holds only one physical copy of this
 * module. A consumer's bundler can inline it into several chunks, and two
 * versions of this package can coexist in one dependency tree; each copy
 * declares its own classes, so an error thrown by one copy answers `false` to
 * a prototype-based `instanceof` against another copy's class — silently, and
 * exactly where a caller is trying to tell one failure mode from another. The
 * `code` string is the one identity that survives every copy, so it is what
 * these classes compare. (This package's own build additionally shares a
 * single error module across its entry points — see the `share-error-module`
 * plugin in rollup.config.mjs — so both layers have to fail before class-based
 * discrimination breaks.)
 *
 * A non-`Error` value never matches: a plain object carrying the same `code`
 * is rejected, so this stays narrower than a bare duck-type check.
 */
const carriesProtocolCode = (value: unknown, ...codes: readonly ProtocolErrorCode[]): boolean =>
  value instanceof Error && 'code' in value && codes.some((code) => code === value.code);

export type VersionResolutionPath = 'read' | 'construct';

/**
 * Why {@link protocolVersionToLedger} could not resolve a ledger version:
 * - `'malformed'` — the input was not even a well-formed protocolVersion
 *   value (not a non-negative integer).
 * - `'unknown'` — the input was a well-formed integer, but outside every
 *   range this framework version knows how to map.
 */
export type ProtocolVersionUnknownReason = 'unknown' | 'malformed';

/**
 * Thrown by {@link protocolVersionToLedger} (and, transitively,
 * {@link versionOfRecord} / {@link networkHeadVersion}) when a raw
 * `protocolVersion` integer cannot be resolved to a {@link LedgerVersion}.
 *
 * `reason` distinguishes a malformed input (wrong shape/type, not a
 * protocol-version problem at all) from a well-formed but genuinely unknown
 * version (a real protocol version this framework build does not support
 * yet). `code` further splits each case by which call path produced it —
 * `read` for a version read off an existing record, `construct` for one used
 * to build a new construct.
 */
export class UnknownProtocolVersionError extends Error {
  /** Recognises both of this class's codes — see {@link carriesProtocolCode}. */
  static [Symbol.hasInstance](value: unknown): boolean {
    return carriesProtocolCode(
      value,
      PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ,
      PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_CONSTRUCT
    );
  }

  readonly code: ProtocolErrorCode;

  constructor(
    readonly protocolVersion: number,
    readonly path: VersionResolutionPath,
    readonly reason: ProtocolVersionUnknownReason
  ) {
    super(
      reason === 'malformed'
        ? `Malformed protocolVersion (expected a non-negative integer, got ${typeof protocolVersion} ` +
            `${String(protocolVersion)}) on the ${path} path. This usually means a non-numeric, fractional, or ` +
            `negative value reached protocolVersionToLedger — check that the source field is actually a raw ` +
            `protocolVersion integer (e.g. from an indexer transaction/block record or ` +
            `queryLatestProtocolVersion()), not a derived or miscoded value.`
        : `Unknown protocolVersion ${protocolVersion} on the ${path} path. ` +
            `Supported eras: v8 (node 0.22, 1.x) and v9 (node 2.x). ` +
            `An unknown node major usually means this framework major predates a newer fork — upgrade midnight-js.`
    );
    this.name = 'UnknownProtocolVersionError';
    this.code =
      path === 'read'
        ? PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ
        : PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_CONSTRUCT;
  }
}

export class Ledger8RuntimeMissingError extends Error {
  /** Code-based recognition — see {@link carriesProtocolCode}. */
  static [Symbol.hasInstance](value: unknown): boolean {
    return carriesProtocolCode(value, PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_MISSING);
  }

  readonly code: ProtocolErrorCode = PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_MISSING;

  constructor(cause: unknown) {
    super(
      'Failed to load the v8 ledger runtime via @midnight-ntwrk/midnight-js-protocol/v8. ' +
        'This usually means a broken or partial install of the protocol package — reinstall dependencies and retry.',
      { cause }
    );
    this.name = 'Ledger8RuntimeMissingError';
  }
}
