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

/** Stable error-code strings for this package. Frozen so a downstream package cannot mutate the shared registry object at runtime. */
export const PROTOCOL_ERROR_CODES = Object.freeze({
  UNKNOWN_PROTOCOL_VERSION_READ: 'MIDNIGHT_JS_P_UNKNOWN_PROTOCOL_VERSION_READ',
  UNKNOWN_PROTOCOL_VERSION_CONSTRUCT: 'MIDNIGHT_JS_P_UNKNOWN_PROTOCOL_VERSION_CONSTRUCT',
  LEDGER8_INSTANCE_MISMATCH: 'MIDNIGHT_JS_P_LEDGER8_INSTANCE_MISMATCH',
  LEDGER8_RUNTIME_MISSING: 'MIDNIGHT_JS_P_LEDGER8_RUNTIME_MISSING',
  DOWN_CONVERT_FAILED: 'MIDNIGHT_JS_P_DOWN_CONVERT_FAILED',
  MERKLE_NOT_REHASHED: 'MIDNIGHT_JS_P_MERKLE_NOT_REHASHED',
  LEDGER8_COMPOSE_FAILED: 'MIDNIGHT_JS_P_LEDGER8_COMPOSE_FAILED',
  LEDGER8_ZSWAP_UNSUPPORTED: 'MIDNIGHT_JS_P_LEDGER8_ZSWAP_UNSUPPORTED',
  UNKNOWN_LEDGER_VERSION: 'MIDNIGHT_JS_P_UNKNOWN_LEDGER_VERSION'
} as const);
export type ProtocolErrorCode = (typeof PROTOCOL_ERROR_CODES)[keyof typeof PROTOCOL_ERROR_CODES];

export type VersionResolutionPath = 'read' | 'construct';

/**
 * Why `protocolVersionToLedger` could not resolve a ledger version:
 * - `'malformed'` — the input was not even a well-formed protocolVersion
 *   value (not a non-negative integer).
 * - `'unknown'` — the input was a well-formed integer, but outside every
 *   range this framework version knows how to map.
 */
export type ProtocolVersionUnknownReason = 'unknown' | 'malformed';

/**
 * Thrown by `protocolVersionToLedger` (and, transitively, `versionOfRecord` /
 * `networkHeadVersion`) when a raw `protocolVersion` integer cannot be
 * resolved to a `LedgerVersion`. Those live in `./version`, which imports this
 * module -- the dependency stays one-way, so they are named here rather than
 * linked.
 *
 * `reason` distinguishes a malformed input (wrong shape/type, not a
 * protocol-version problem at all) from a well-formed but genuinely unknown
 * version (a real protocol version this framework build does not support
 * yet). `code` further splits each case by which call path produced it —
 * `read` for a version taken off an existing record, `construct` for a version
 * chosen to build something new against the network's current head.
 */
export class UnknownProtocolVersionError extends Error {
  readonly code:
    | typeof PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ
    | typeof PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_CONSTRUCT;

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
            `Supported eras: v8 (node 1.x) and v9 (node 2.x). ` +
            `An unknown node major usually means this framework major predates a newer fork — upgrade midnight-js.`
    );
    this.name = 'UnknownProtocolVersionError';
    this.code =
      path === 'read'
        ? PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ
        : PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_CONSTRUCT;
  }
}

/**
 * Which lazily-loaded subpath export {@link Ledger8RuntimeMissingError} failed
 * to acquire. Each chunk pulls a different set of retained-era dependencies, so
 * naming the wrong one sends an operator to an entry point that loaded fine.
 */
export type RetainedEraSubpath = '/v8' | '/engine';

export class Ledger8RuntimeMissingError extends Error {
  readonly code = PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_MISSING;

  constructor(
    readonly subpath: RetainedEraSubpath,
    cause: unknown
  ) {
    super(
      `Failed to load the retained pre-fork runtime via the midnight-js-protocol${subpath} subpath export. ` +
        'Read the wrapped cause for which module actually failed to resolve or initialise. This usually means ' +
        'a broken or partial install of the protocol package — reinstall dependencies and retry.',
      { cause }
    );
    this.name = 'Ledger8RuntimeMissingError';
  }
}

/**
 * Thrown when a retained pre-fork circuit produced Zswap inputs or outputs.
 *
 * `executeCircuit` builds its circuit context from a coin public key alone, so
 * the post-call `currentZswapLocalState` it would need to assemble the
 * transaction's segmented offers is not carried on {@link TranscriptPojo}. A
 * call that moved coins would therefore compose into an unbalanced transaction,
 * rejected on submission with nothing in the engine having reported a problem.
 * This engine refuses that call instead.
 */
export class Ledger8ZswapUnsupportedError extends Error {
  readonly code: ProtocolErrorCode = PROTOCOL_ERROR_CODES.LEDGER8_ZSWAP_UNSUPPORTED;

  constructor(readonly circuitId: string) {
    super(
      `Circuit '${circuitId}' produced Zswap inputs or outputs, which the retained pre-fork execution leg ` +
        'does not carry. Composing this call would drop those coin movements and yield an unbalanced ' +
        'transaction that the node rejects on submission. Only circuits with no coin effects can run on the ' +
        'retained era today.'
    );
    this.name = 'Ledger8ZswapUnsupportedError';
  }
}

/**
 * Which physical-copy axis `assertSharedLedger8Instance`
 * (`lib/engine/instance-guard.ts`) detected two distinct instances on.
 *
 * `'onchain-runtime-v3'` is the only member because it is the only retained
 * pre-fork package this one both depends on directly and can receive from a
 * consumer's own resolution — a `compact-runtime` build that re-exports it, a
 * bundler that failed to dedupe it, or the same version installed under both
 * npm scopes while the scope migration runs. A new axis joins only when it
 * gains a comparable second acquisition path.
 */
export type Ledger8InstanceAxis = 'onchain-runtime-v3';

/**
 * The npm scopes this package and its retained pre-fork runtimes are published
 * under, while the scope migration runs.
 *
 * Held apart from the `/` on purpose, and joined only at
 * {@link axisPackageNames}. The dual-publish
 * (`.github/scripts/publish-public-npm.mjs`) rewrites the old scope to the new
 * one inside built `.js`/`.d.ts` files as well as in `package.json`, matching
 * on the scope *with* its trailing slash. A scoped package name written as one
 * literal would therefore ship rewritten, collapsing the two names below into
 * one and turning a hint that names both scopes into one that names a single
 * scope twice. Splitting the scope from the slash leaves the rewrite nothing
 * to match; `errors.test.ts` holds that line.
 */
const PUBLISHED_SCOPES = Object.freeze(['@midnight-ntwrk', '@midnightntwrk'] as const);

/**
 * The unscoped npm name of each axis. Both published copies of an axis carry
 * this same name under a different scope, so naming only one scope would point
 * every consumer installed from the other at a package not in their tree.
 */
const AXIS_BARE_PACKAGE_NAMES: Readonly<Record<Ledger8InstanceAxis, string>> = Object.freeze({
  'onchain-runtime-v3': 'onchain-runtime-v3'
});

const axisPackageNames = (axis: Ledger8InstanceAxis): readonly string[] =>
  PUBLISHED_SCOPES.map((scope) => `${scope}/${AXIS_BARE_PACKAGE_NAMES[axis]}`);

/**
 * Thrown by `assertSharedLedger8Instance` (`lib/engine/instance-guard.ts`)
 * when the same-named WASM package resolved to two physically distinct copies
 * in this process (a dual-instantiation).
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
 *
 * The remediation names every mainstream package manager rather than the one
 * this repo happens to use, because this package is consumed by dApps
 * installed with all of them.
 */
export class Ledger8InstanceMismatchError extends Error {
  readonly code = PROTOCOL_ERROR_CODES.LEDGER8_INSTANCE_MISMATCH;

  constructor(readonly axis: Ledger8InstanceAxis) {
    const packageNames = axisPackageNames(axis).join(' and ');
    super(
      `Detected two physically distinct copies of ${axis} loaded into the same process (a dual-instantiation). ` +
        "Objects created by one copy are rejected by the other copy's classes. This usually means a duplicate " +
        'install; the package is published under two npm scopes while the scope migration is in progress, and ' +
        'depending on both names is itself a duplicate that no resolver can dedupe. Trace ' +
        `${packageNames} with your package manager's \`why\` command (npm why, yarn why, pnpm why, ` +
        'bun pm why), then align every consumer on a single package name and version.'
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
 * Thrown by the down-convert engine (`lib/engine/envelope.ts`,
 * `lib/engine/down-convert.ts`) when it cannot turn a raw contract-state
 * envelope, or an already-extracted `EncodedStateValue`, into an executable
 * pre-fork state.
 *
 * `stage` names which step failed, so the message stays useful without ever
 * including the input bytes themselves — this class never renders raw hex or
 * decoded state contents, only the stage name and the wrapped `cause`. The
 * underlying runtime distinguishes tag-mismatch, truncated, trailing-bytes
 * and empty input in its own message; that detail is preserved on `cause`.
 */
export class DownConvertFailedError extends Error {
  readonly code = PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED;

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
 * Thrown by `checkRoot` (`lib/engine/down-convert.ts`) when a bounded Merkle
 * tree's root is read before the tree has been rehashed.
 *
 * A bounded Merkle tree only has a readable root once every node hash has
 * been computed; the vendor documents `root()` as returning `undefined` until
 * then, and `rehash()` as necessary "because the onchain runtime does not
 * automatically rehash trees". `downConvertForExecution` asserts this on
 * every tree it decodes, failing fast instead of silently repairing.
 */
export class MerkleNotRehashedError extends Error {
  readonly code = PROTOCOL_ERROR_CODES.MERKLE_NOT_REHASHED;

  constructor(cause?: unknown) {
    super(
      'Attempted to read the root of a bounded Merkle tree before it was rehashed. This usually means the ' +
        'tree was built or updated in memory and never rehashed — call rehash() on it before executing ' +
        'against it.',
      { cause }
    );
    this.name = 'MerkleNotRehashedError';
  }
}

/**
 * Which composition step {@link Ledger8ComposeFailedError} failed at. Named by
 * the condition rather than by the function that raises it: the legs land
 * across several PRs, and a message naming a function this package does not
 * yet export sends the reader looking for an API that is not there.
 * - `'wrap-call'` — the v9-native keep-state leg (`lib/engine/wrap-v9.ts`)
 *   could not resolve a registered operation for the transcript's circuit on
 *   the given v9-native contract state.
 * - `'call-verifier-key'` — the operation resolved for the transcript's
 *   circuit carries no verifier key, so no ledger could verify a call against
 *   it. Stage-independent: the diagnosis does not differ by leg.
 * - `'call-operation'` — the v8-native call leg could not resolve a
 *   registered operation for the transcript's circuit on the given v8-native
 *   contract state.
 * - `'deploy-verifier-key'` — the v8-native deploy leg found a circuit whose
 *   operation slot still carries no verifier key after registration — the
 *   exact condition that makes a real ledger's `wellFormed` check reject the
 *   deploy with `VerifierKeyNotSet`.
 */
export type Ledger8ComposeStage = 'wrap-call' | 'call-verifier-key' | 'call-operation' | 'deploy-verifier-key';

/**
 * Thrown when a ledger-8 (or v9-native keep-state) transaction cannot be
 * composed because a circuit's operation is missing or under-registered.
 * `stage` (see {@link Ledger8ComposeStage}) names which composition step
 * failed and is a closed union, so a consumer can `switch` on it exhaustively.
 *
 * This is a direct assertion failure (a missing lookup, not a wrapped
 * lower-level exception), so — like {@link Ledger8InstanceMismatchError} —
 * there is no `cause` to carry. `circuitId` names the entry point; this class
 * never renders raw hex or byte-array contents.
 */
export class Ledger8ComposeFailedError extends Error {
  readonly code: ProtocolErrorCode = PROTOCOL_ERROR_CODES.LEDGER8_COMPOSE_FAILED;

  constructor(
    readonly stage: Ledger8ComposeStage,
    readonly circuitId: string
  ) {
    super(Ledger8ComposeFailedError.MESSAGES[stage](circuitId));
    this.name = 'Ledger8ComposeFailedError';
  }

  // A total Record rather than an if-chain, for the same reason
  // ENVELOPE_DECODERS in lib/engine/envelope.ts is one: adding a stage without
  // its message fails to compile here, instead of silently shipping whichever
  // message the fallthrough happened to reach.
  private static readonly MESSAGES: Readonly<Record<Ledger8ComposeStage, (circuitId: string) => string>> = {
    'wrap-call': (circuitId) =>
      `Failed to compose a v9-native keep-state call: no registered operation found for circuit '${circuitId}' ` +
      'on the given contract state. This usually means the contract state passed to wrapKeepStateCall was not ' +
      'read from chain (or produced by a real deploy) — a bare/blank contract state has no operations ' +
      'registered. Resolve the contract state that carries the deployed operation for this circuit and pass ' +
      'that instead.',
    'call-verifier-key': (circuitId) =>
      `Failed to compose a call: the operation registered for circuit '${circuitId}' carries no verifier key, ` +
      'so no ledger could verify a call against it. This usually means the contract state came from a ' +
      'constructor result rather than from chain — a freshly built state declares its entry points with blank ' +
      'keys, which only a deploy transaction fills in. Pass the contract state as read from chain after a ' +
      'successful deploy.',
    'call-operation': (circuitId) =>
      `Failed to compose a ledger-8 call transaction: no registered operation found for circuit '${circuitId}' ` +
      'on the given v8-native contract state. This usually means the contract state was not read from chain ' +
      '(or produced by a real deploy) — a bare/blank contract state has no operations registered. Resolve the ' +
      'contract state that carries the deployed operation for this circuit and pass that instead.',
    'deploy-verifier-key': (circuitId) =>
      `Failed to compose a ledger-8 deploy transaction: circuit '${circuitId}' has no verifier key registered ` +
      "on its operation slot after registration, so a real ledger would reject this deploy's wellFormed check " +
      "with VerifierKeyNotSet. Resolve the compiled contract's verifier key for this circuit (from its keys/ " +
      'artifacts) and include it in the verifier-key map.'
  };
}

/**
 * Thrown by `extractEncodedStateValue` (`lib/engine/envelope.ts`) when the
 * `version` it was handed is not a member of `LEDGER_VERSIONS`.
 *
 * TypeScript callers cannot produce this: `version` is typed as
 * `LedgerVersion`. It exists for the untyped JavaScript consumers this package
 * also serves, where an unvalidated string would otherwise be used to index the
 * decoder table and could resolve to an inherited `Object.prototype` member —
 * yielding a plausible-looking non-state instead of a failure.
 *
 * `requestedVersion` carries the offending value for programmatic use. It is
 * deliberately kept out of the message: this is the one input on the seam that
 * comes straight from an untrusted caller, and the down-convert errors'
 * "never renders caller-supplied text" property is only worth having if it
 * holds here too.
 */
export class UnknownLedgerVersionError extends Error {
  readonly code = PROTOCOL_ERROR_CODES.UNKNOWN_LEDGER_VERSION;

  constructor(readonly requestedVersion: string) {
    super(
      'Unknown ledger version requested for contract-state extraction. Supported eras are v8 (node 1.x) and ' +
        'v9 (node 2.x); read `requestedVersion` on this error for the value that was passed. Derive it with ' +
        'protocolVersionToLedger rather than constructing the string by hand.'
    );
    this.name = 'UnknownLedgerVersionError';
  }
}
