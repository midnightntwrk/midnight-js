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
  MERKLE_NOT_REHASHED: 'MIDNIGHT_JS_P_MERKLE_NOT_REHASHED',
  LEDGER8_COMPOSE_FAILED: 'MIDNIGHT_JS_P_LEDGER8_COMPOSE_FAILED'
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
        'This usually means a broken or partial install of the protocol package — reinstall dependencies and retry. ' +
        'The retained pre-fork stack pins @midnightntwrk/ledger-v8@8.1.1, @midnight-ntwrk/onchain-runtime-v3@3.1.0, ' +
        'and compact-runtime@0.16.0 — verify these exact versions are present in node_modules.',
      { cause }
    );
    this.name = 'Ledger8RuntimeMissingError';
  }
}

/**
 * Which physical-copy axis {@link assertSharedLedger8Instance}
 * (`engine/instance-guard.ts`) detected two distinct instances on. Only the
 * retained pre-fork (`compact-runtime@0.16`) runtime axis
 * (`'onchain-runtime-v3'`) has two genuine acquisition paths inside this
 * package — its own dependency versus the copy the 0.16 glue resolves for its
 * own dependency — so it is the union's only member; a new axis joins only
 * when it gains a comparable second acquisition path.
 */
export type Ledger8InstanceAxis = 'onchain-runtime-v3';

/**
 * Thrown by {@link assertSharedLedger8Instance} (`engine/instance-guard.ts`)
 * when the same-named WASM package resolved to two physically distinct
 * copies in this process (a dual-instantiation) — objects created by one
 * copy fail `instanceof`/coercion checks against the other copy's classes,
 * so mixing them silently corrupts down-convert results instead of failing
 * loudly.
 *
 * `axis` names which side of the check failed. This is a direct assertion
 * failure (a reference-equality mismatch), not a wrapped lower-level
 * exception, so unlike {@link DownConvertFailedError} there is no `cause` to
 * carry. This usually means a duplicate npm install of the affected package
 * (e.g. an aliased dependency, a version mismatch that defeated
 * deduplication, or a bundler that failed to dedupe it) — run
 * `yarn why <package>` to find the duplicate and align every consumer on a
 * single resolved version.
 */
export class Ledger8InstanceMismatchError extends Error {
  /** Code-based recognition — see {@link carriesProtocolCode}. */
  static [Symbol.hasInstance](value: unknown): boolean {
    return carriesProtocolCode(value, PROTOCOL_ERROR_CODES.LEDGER8_INSTANCE_MISMATCH);
  }

  readonly code: ProtocolErrorCode = PROTOCOL_ERROR_CODES.LEDGER8_INSTANCE_MISMATCH;

  constructor(readonly axis: Ledger8InstanceAxis) {
    super(
      `Detected two physically distinct copies of ${axis} loaded into the same process (a dual-instantiation). ` +
        "Objects created by one copy fail instanceof/coercion checks against the other copy's classes. This " +
        'usually means a duplicate npm install of the affected package — run `yarn why <package>` to find the ' +
        'duplicate and align every consumer on a single resolved version.'
    );
    this.name = 'Ledger8InstanceMismatchError';
  }
}

/**
 * Thrown by the down-convert engine (`engine/envelope.ts`, `engine/down-convert.ts`)
 * when it cannot turn a raw contract-state envelope, or an already-extracted
 * {@link EncodedStateValue}, into an executable pre-fork state.
 *
 * `stage` names which step failed (e.g. `'v9 envelope extraction'`,
 * `'v9 state down-convert'`) so the message stays useful without ever
 * including the input bytes themselves — this class never renders raw hex or
 * decoded state contents, only the stage name and the wrapped `cause`.
 */
export class DownConvertFailedError extends Error {
  /** Code-based recognition — see {@link carriesProtocolCode}. */
  static [Symbol.hasInstance](value: unknown): boolean {
    return carriesProtocolCode(value, PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED);
  }

  readonly code: ProtocolErrorCode = PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED;

  constructor(
    readonly stage: string,
    cause: unknown
  ) {
    super(
      `Failed to down-convert a contract-state for execution during ${stage}. This usually means malformed or ` +
        'truncated input bytes, or an envelope tagged for a different ledger version than the one requested — ' +
        'check the source and requested LedgerVersion of the input.',
      { cause }
    );
    this.name = 'DownConvertFailedError';
  }
}

/**
 * Thrown by {@link checkRoot} (`engine/down-convert.ts`) when a bounded
 * Merkle tree's root is read before the tree has been rehashed.
 *
 * A bounded Merkle tree only has a readable root once every node hash has
 * been computed; a tree built or modified via `update()` without a
 * subsequent `rehash()` reports `undefined` instead.
 * {@link downConvertForExecution} asserts this (via
 * {@link assertMerkleTreesRehashed}) on every tree it decodes, failing fast
 * instead of silently repairing.
 */
export class MerkleNotRehashedError extends Error {
  /** Code-based recognition — see {@link carriesProtocolCode}. */
  static [Symbol.hasInstance](value: unknown): boolean {
    return carriesProtocolCode(value, PROTOCOL_ERROR_CODES.MERKLE_NOT_REHASHED);
  }

  readonly code: ProtocolErrorCode = PROTOCOL_ERROR_CODES.MERKLE_NOT_REHASHED;

  constructor() {
    super(
      'Attempted to read the root of a bounded Merkle tree before it was rehashed. This usually means the ' +
        'tree was built or updated in memory and never rehashed — call rehash() on it before encoding it or ' +
        'executing against it.'
    );
    this.name = 'MerkleNotRehashedError';
  }
}

/**
 * Which composition step {@link Ledger8ComposeFailedError} failed at:
 * - `'wrap-call'` — {@link wrapKeepStateCall} (`engine/wrap-v9.ts`) could not
 *   resolve a registered operation for the transcript's circuit on the given
 *   v9-native contract state.
 * - `'call-operation'` — {@link composeV8CallTx} (`engine/compose-v8.ts`)
 *   could not resolve a registered operation for the transcript's circuit on
 *   the given v8-native contract state.
 * - `'deploy-verifier-key'` — {@link composeV8DeployTx} (`engine/deploy-v8.ts`)
 *   found a circuit whose operation slot still carries no verifier key after
 *   registration — the exact condition that makes a real ledger's
 *   `wellFormed` check reject the deploy with `VerifierKeyNotSet`.
 */
export type Ledger8ComposeStage = 'wrap-call' | 'call-operation' | 'deploy-verifier-key';

/**
 * Thrown when a ledger-8 (or v9-native keep-state) transaction cannot be
 * composed because a circuit's operation is missing or under-registered:
 * - {@link wrapKeepStateCall} (`engine/wrap-v9.ts`) throws stage `'wrap-call'`
 *   when the given v9-native contract state has no registered operation for
 *   the transcript's circuit.
 * - {@link composeV8CallTx} (`engine/compose-v8.ts`) throws stage
 *   `'call-operation'` when the given v8-native contract state has no
 *   registered operation for the transcript's circuit.
 * - {@link composeV8DeployTx} (`engine/deploy-v8.ts`) throws stage
 *   `'deploy-verifier-key'` when a circuit's operation slot still has no
 *   verifier key after registration.
 *
 * This is a direct assertion failure (a missing-lookup, not a wrapped
 * lower-level exception), so — like {@link Ledger8InstanceMismatchError} —
 * there is no `cause` to carry. `stage` names which composition step failed;
 * `circuitId` may appear in the message, but this class never renders raw
 * hex or byte-array contents.
 */
export class Ledger8ComposeFailedError extends Error {
  /** Code-based recognition — see {@link carriesProtocolCode}. */
  static [Symbol.hasInstance](value: unknown): boolean {
    return carriesProtocolCode(value, PROTOCOL_ERROR_CODES.LEDGER8_COMPOSE_FAILED);
  }

  readonly code: ProtocolErrorCode = PROTOCOL_ERROR_CODES.LEDGER8_COMPOSE_FAILED;

  constructor(
    readonly stage: Ledger8ComposeStage,
    readonly circuitId: string
  ) {
    super(Ledger8ComposeFailedError.buildMessage(stage, circuitId));
    this.name = 'Ledger8ComposeFailedError';
  }

  private static buildMessage(stage: Ledger8ComposeStage, circuitId: string): string {
    if (stage === 'deploy-verifier-key') {
      return (
        `Failed to compose a ledger-8 deploy transaction: circuit '${circuitId}' has no verifier key ` +
        'registered on its operation slot after registration. This usually means the verifier-key map ' +
        'passed to composeV8DeployTx is missing an entry for this circuit — a real ledger would reject this ' +
        "deploy's wellFormed check with VerifierKeyNotSet. Resolve the compiled contract's verifier key for " +
        'this circuit (from its keys/ artifacts) and include it in the map.'
      );
    }
    if (stage === 'call-operation') {
      return (
        `Failed to compose a ledger-8 call transaction: no registered operation found for circuit '${circuitId}' ` +
        'on the given v8-native contract state. This usually means the contract state passed to composeV8CallTx ' +
        'was not read from chain (or produced by a real deploy) — a bare/blank contract state has no operations ' +
        'registered. Resolve the contract state that carries the deployed operation for this circuit and pass ' +
        'that instead.'
      );
    }
    return (
      `Failed to compose a v9-native keep-state call: no registered operation found for circuit '${circuitId}' ` +
      'on the given contract state. This usually means the contract state passed to wrapKeepStateCall was not ' +
      'read from chain (or produced by a real deploy) — a bare/blank contract state has no operations ' +
      'registered. Resolve the contract state that carries the deployed operation for this circuit and pass ' +
      'that instead.'
    );
  }
}
