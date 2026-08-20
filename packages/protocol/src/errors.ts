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
  /** Recognises both of this class's codes — see `carriesProtocolCode` above. */
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
  static [Symbol.hasInstance](value: unknown): boolean {
    return carriesProtocolCode(value, PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_MISSING);
  }

  readonly code: ProtocolErrorCode = PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_MISSING;

  constructor(cause: unknown) {
    super(
      'Failed to load the v8 ledger runtime via @midnight-ntwrk/midnight-js-protocol/v8. ' +
        'This usually means a broken or partial install of the protocol package — reinstall dependencies and retry, ' +
        "and check that the retained pre-fork packages listed in this package's dependencies resolved at their " +
        'pinned versions.',
      { cause }
    );
    this.name = 'Ledger8RuntimeMissingError';
  }
}

/**
 * Which physical-copy axis `assertSharedLedger8Instance`
 * (`engine/instance-guard.ts`) detected two distinct instances on.
 *
 * `'onchain-runtime-v3'` is the only member because it is the only retained
 * pre-fork package this one both depends on directly and can receive from a
 * consumer's own resolution — a `compact-runtime` build that re-exports it, or
 * a bundler that failed to dedupe it. A new axis joins only when it gains a
 * comparable second acquisition path.
 */
export type Ledger8InstanceAxis = 'onchain-runtime-v3';

/** The npm package name behind each axis, so the error can name what to run `yarn why` on. */
const AXIS_PACKAGE_NAMES: Readonly<Record<Ledger8InstanceAxis, string>> = Object.freeze({
  'onchain-runtime-v3': '@midnight-ntwrk/onchain-runtime-v3'
});

/**
 * Thrown by `assertSharedLedger8Instance` (`engine/instance-guard.ts`) when
 * the same-named WASM package resolved to two physically distinct copies in
 * this process (a dual-instantiation).
 *
 * Mixing copies does not corrupt results silently: wasm-bindgen emits an
 * `_assertClass` check on every object handed across a class boundary, so a
 * cross-copy handoff throws `expected instance of <Class>`. That failure is
 * loud but opaque — it names neither the package nor the duplicate install.
 * This error exists to replace it with one that does, at the point the two
 * copies are first observed rather than deep inside a down-convert.
 *
 * `axis` names the package the check ran on. This is a direct assertion
 * failure (a reference-equality mismatch), not a wrapped lower-level
 * exception, so unlike {@link DownConvertFailedError} there is no `cause` to
 * carry.
 */
export class Ledger8InstanceMismatchError extends Error {
  static [Symbol.hasInstance](value: unknown): boolean {
    return carriesProtocolCode(value, PROTOCOL_ERROR_CODES.LEDGER8_INSTANCE_MISMATCH);
  }

  readonly code: ProtocolErrorCode = PROTOCOL_ERROR_CODES.LEDGER8_INSTANCE_MISMATCH;

  constructor(readonly axis: Ledger8InstanceAxis) {
    const packageName = AXIS_PACKAGE_NAMES[axis];
    super(
      `Detected two physically distinct copies of ${packageName} loaded into the same process (a ` +
        "dual-instantiation). Objects created by one copy are rejected by the other copy's classes. This usually " +
        `means a duplicate install of the affected package — run \`yarn why ${packageName}\` to find the ` +
        'duplicate and align every consumer on a single resolved version.'
    );
    this.name = 'Ledger8InstanceMismatchError';
  }
}

/**
 * Which step of the down-convert pipeline a {@link DownConvertFailedError}
 * came from. A closed union rather than a free-form string for two reasons:
 * a consumer can `switch` on `stage` exhaustively, and no call site can
 * interpolate input-derived text into the error message, which is what keeps
 * the "never renders state contents" guarantee a property of this class
 * rather than of every caller's discipline.
 *
 * Down-convert is version-agnostic — it consumes an already-extracted
 * `EncodedStateValue` whichever era it came from — so its stage carries no
 * version, unlike the two extraction stages.
 */
export type DownConvertStage = 'v8 envelope extraction' | 'v9 envelope extraction' | 'state down-convert';

/**
 * Thrown by the down-convert engine (`engine/envelope.ts`, `engine/down-convert.ts`)
 * when it cannot turn a raw contract-state envelope, or an already-extracted
 * `EncodedStateValue`, into an executable pre-fork state.
 *
 * `stage` names which step failed, so the message stays useful without ever
 * including the input bytes themselves — this class never renders raw hex or
 * decoded state contents, only the stage name and the wrapped `cause`. The
 * underlying runtime distinguishes tag-mismatch, truncated, trailing-bytes
 * and empty input in its own message; that detail is preserved on `cause`.
 */
export class DownConvertFailedError extends Error {
  static [Symbol.hasInstance](value: unknown): boolean {
    return carriesProtocolCode(value, PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED);
  }

  readonly code: ProtocolErrorCode = PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED;

  constructor(
    readonly stage: DownConvertStage,
    cause: unknown
  ) {
    super(
      `Failed to down-convert a contract-state for execution during ${stage}. Read the wrapped cause for what ` +
        'the runtime actually reported; it distinguishes a tag mismatch (an envelope tagged for a different ' +
        'ledger version than the one requested) from truncated, trailing, or empty input bytes.',
      { cause }
    );
    this.name = 'DownConvertFailedError';
  }
}

/**
 * Thrown by `checkRoot` (`engine/down-convert.ts`) when a bounded Merkle
 * tree's root is read before the tree has been rehashed.
 *
 * A bounded Merkle tree only has a readable root once every node hash has
 * been computed; the vendor documents `root()` as returning `undefined` until
 * then, and `rehash()` as necessary "because the onchain runtime does not
 * automatically rehash trees". `downConvertForExecution` asserts this on
 * every tree it decodes, failing fast instead of silently repairing.
 */
export class MerkleNotRehashedError extends Error {
  static [Symbol.hasInstance](value: unknown): boolean {
    return carriesProtocolCode(value, PROTOCOL_ERROR_CODES.MERKLE_NOT_REHASHED);
  }

  readonly code: ProtocolErrorCode = PROTOCOL_ERROR_CODES.MERKLE_NOT_REHASHED;

  constructor() {
    super(
      'Attempted to read the root of a bounded Merkle tree before it was rehashed. This usually means the ' +
        'tree was built or updated in memory and never rehashed — call rehash() on it before executing ' +
        'against it.'
    );
    this.name = 'MerkleNotRehashedError';
  }
}
