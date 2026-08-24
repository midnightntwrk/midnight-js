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
  LEDGER8_COMPOSE_OPTION_INVALID: 'MIDNIGHT_JS_P_LEDGER8_COMPOSE_OPTION_INVALID',
  LEDGER8_ZSWAP_UNSUPPORTED: 'MIDNIGHT_JS_P_LEDGER8_ZSWAP_UNSUPPORTED',
  UNKNOWN_LEDGER_VERSION: 'MIDNIGHT_JS_P_UNKNOWN_LEDGER_VERSION',
  LEDGER8_RUNTIME_INVALID: 'MIDNIGHT_JS_P_LEDGER8_RUNTIME_INVALID'
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
 * Which composition step {@link Ledger8ComposeFailedError} failed at:
 * - `'wrap-call'` — {@link wrapKeepStateCall} (`lib/engine/wrap-v9.ts`) could
 *   not resolve a registered operation for the transcript's circuit on the
 *   given v9-native contract state.
 * - `'call-operation'` — {@link composeV8CallTx} (`lib/engine/compose-v8.ts`)
 *   could not resolve a registered operation for the transcript's circuit on
 *   the given v8-native contract state.
 * - `'call-verifier-key'` — either call leg resolved a registered operation
 *   for the transcript's circuit, but that operation carries no verifier key,
 *   so no ledger could verify a call against it.
 * - `'deploy-verifier-key'` — {@link composeV8DeployTx}
 *   (`lib/engine/deploy-v8.ts`) was given no verifier key for a circuit the
 *   contract state declares.
 * - `'deploy-unknown-circuit'` — the verifier-key map handed to
 *   {@link composeV8DeployTx} names a circuit the contract state does not
 *   declare. Registering it would add an entry point the compiled contract
 *   never had, and silently change the deployed contract's address.
 * - `'deploy-ambiguous-circuit'` — two entry points the contract state
 *   declares resolve to the same name, so the verifier-key map (keyed by
 *   name) cannot address them apart. Registering under the shared name would
 *   key one slot and leave the other blank.
 * - `'deploy-verifier-key-blob'` — the ledger rejected the verifier-key bytes
 *   supplied for a circuit. The only stage that wraps a lower-level failure,
 *   so the only one carrying a `cause`.
 */
export type Ledger8ComposeStage =
  | 'wrap-call'
  | 'call-operation'
  | 'call-verifier-key'
  | 'deploy-verifier-key'
  | 'deploy-unknown-circuit'
  | 'deploy-ambiguous-circuit'
  | 'deploy-verifier-key-blob';

/**
 * Thrown when a ledger-8 (or v9-native keep-state) transaction cannot be
 * composed because a circuit's operation is missing, under-registered, or
 * names a circuit the contract does not have. `stage` (see
 * {@link Ledger8ComposeStage}) names which composition step failed and is a
 * closed union, so a consumer can `switch` on it exhaustively.
 *
 * Most stages are direct assertion failures (a missing lookup, not a wrapped
 * lower-level exception) and carry no `cause`, like
 * {@link Ledger8InstanceMismatchError}. The one exception is
 * `'deploy-verifier-key-blob'`, where the ledger itself rejected caller-supplied
 * bytes: that failure is preserved on `cause`, the same way
 * {@link DownConvertFailedError} preserves its runtime's own message.
 *
 * `circuitId` names the entry point, never its raw contents: this class
 * renders no hex and no byte-array dump, and callers pass entry-point names
 * that have already been decoded (see `entryPointName` in
 * `lib/engine/deploy-v8.ts`).
 */
export class Ledger8ComposeFailedError extends Error {
  readonly code: ProtocolErrorCode = PROTOCOL_ERROR_CODES.LEDGER8_COMPOSE_FAILED;

  constructor(
    readonly stage: Ledger8ComposeStage,
    readonly circuitId: string,
    cause?: unknown
  ) {
    super(Ledger8ComposeFailedError.MESSAGES[stage](circuitId), { cause });
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
    'call-operation': (circuitId) =>
      `Failed to compose a ledger-8 call transaction: no registered operation found for circuit '${circuitId}' ` +
      'on the given v8-native contract state. This usually means the contract state passed to composeV8CallTx ' +
      'was not read from chain (or produced by a real deploy) — a bare/blank contract state has no operations ' +
      'registered. Resolve the contract state that carries the deployed operation for this circuit and pass ' +
      'that instead.',
    'call-verifier-key': (circuitId) =>
      `Failed to compose a call: the operation registered for circuit '${circuitId}' carries no verifier key, ` +
      'so no ledger could verify a call against it. This usually means the contract state came from a ' +
      'constructor result rather than from chain — a freshly built state declares its entry points with blank ' +
      'keys, which only a deploy transaction fills in. Pass the contract state as read from chain after a ' +
      'successful deploy.',
    'deploy-verifier-key': (circuitId) =>
      `Failed to compose a ledger-8 deploy transaction: no verifier key was supplied for circuit ` +
      `'${circuitId}', which the contract state declares as an entry point. A deploy carrying an ` +
      "unregistered entry point is rejected by a ledger's own well-formedness check. Resolve the compiled " +
      "contract's verifier key for this circuit (from its keys/ artifacts) and include it in the map passed " +
      'to composeV8DeployTx.',
    'deploy-unknown-circuit': (circuitId) =>
      `Failed to compose a ledger-8 deploy transaction: the verifier-key map names circuit '${circuitId}', ` +
      'which the contract state does not declare as an entry point. Registering it would give the deployed ' +
      "contract an entry point its compiled source never had, and would change the deployed contract's " +
      'address. This usually means a stale or foreign key file was picked up (for example by globbing ' +
      'keys/*.verifier across compiler runs) — supply keys for exactly the circuits this contract declares.',
    'deploy-ambiguous-circuit': (circuitId) =>
      `Failed to compose a ledger-8 deploy transaction: the contract state declares two entry points that ` +
      `both resolve to the name '${circuitId}', so a verifier-key map keyed by name cannot tell them apart. ` +
      'Registering under that name would key one slot and leave the other blank, deploying a contract whose ' +
      "address does not match the caller's artifacts. This is not something a compactc-built contract " +
      'produces — it means the contract state was assembled by hand, or by a tool that set an entry point to ' +
      'bytes that are not valid UTF-8.',
    'deploy-verifier-key-blob': (circuitId) =>
      `Failed to compose a ledger-8 deploy transaction: the ledger rejected the verifier-key bytes supplied ` +
      `for circuit '${circuitId}'. Read the wrapped cause for what the ledger reported; a verifier key must ` +
      'be the tagged blob the compiler emits as keys/<circuit>.verifier, so this usually means a truncated ' +
      'or empty file, or a key emitted for a different ledger era.'
  };
}

/**
/**
 * Which option handed to a composition leg was unusable:
 * - `'contractState'` — the state could not be bridged into the target
 *   ledger era (its serialized envelope was rejected by the era's decoder).
 * - `'networkId'` — the network id was empty. The ledger accepts an empty
 *   string and bakes it into the transaction, so a caller that forgot to
 *   resolve one would only find out at submission.
 * - `'ttl'` — the time-to-live was not a valid instant. `new Date('...')` on
 *   an unparseable value yields an Invalid Date, which the ledger silently
 *   records as the Unix epoch: a transaction that is already expired when it
 *   is composed.
 */
export type Ledger8ComposeOption = 'contractState' | 'networkId' | 'ttl';

/**
 * Thrown by the composition legs (`engine/compose-v8.ts`,
 * `engine/deploy-v8.ts`) when one of their options cannot be used at all, as
 * opposed to {@link Ledger8ComposeFailedError}, which reports a circuit whose
 * operation is missing or under-registered.
 *
 * These are the well-formedness checks the ledger itself does not make. Which
 * network a deployment targets and what TTL policy it uses are the caller's
 * decisions, but an empty network id and an Invalid Date are not decisions —
 * they are defects that the WASM accepts silently, so they are rejected here
 * instead of surfacing as an unexplained rejection at submission time.
 *
 * `option` names the offending field. Like {@link DownConvertFailedError},
 * this class renders no input contents of its own: a wrapped decoder failure
 * is preserved on `cause`.
 */
export class Ledger8ComposeOptionError extends Error {
  readonly code: ProtocolErrorCode = PROTOCOL_ERROR_CODES.LEDGER8_COMPOSE_OPTION_INVALID;

  constructor(
    readonly option: Ledger8ComposeOption,
    cause?: unknown
  ) {
    super(Ledger8ComposeOptionError.buildMessage(option), { cause });
    this.name = 'Ledger8ComposeOptionError';
  }

  private static buildMessage(option: Ledger8ComposeOption): string {
    if (option === 'contractState') {
      return (
        'Failed to compose a ledger-8 deploy transaction: the given contract state could not be bridged into ' +
        'the v8 ledger era. Read the wrapped cause for what the decoder reported; it distinguishes an ' +
        'envelope tagged for a different ledger era from truncated or empty input bytes. Pass the contract ' +
        "state a pre-fork constructor produced (executeConstructor's `contractState`), not an already " +
        'down-converted or post-fork one.'
      );
    }
    if (option === 'networkId') {
      return (
        'Refusing to compose a transaction against an empty network id. The ledger would accept it and bake ' +
        'it into the transaction, which the network then rejects at submission. Resolve the network id for ' +
        'the target environment and pass it explicitly.'
      );
    }
    return (
      'Refusing to compose a transaction with an invalid time-to-live. An unparseable Date is recorded by ' +
      'the ledger as the Unix epoch, producing a transaction that has already expired. Pass a valid future ' +
      'instant as `ttl`.'
    );
  }
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
/**
 * Thrown by `extractEncodedStateValue` (`lib/engine/envelope.ts`) when the
 * injected pre-fork runtime cannot be used — it was not passed at all, or the
 * binding the decoder needs is absent from it.
 *
 * Separate from {@link DownConvertFailedError} because the remediation is
 * unrelated: nothing is wrong with the caller's input. Folding this into a
 * down-convert failure would name an extraction stage and tell the caller to
 * read a cause describing tag mismatches and truncation, sending them to audit
 * data that is perfectly good. It is also distinct from
 * {@link Ledger8RuntimeMissingError}, which reports a *failed acquisition* of
 * the v8 chunk; this one reports a runtime that was acquired, or assembled by
 * hand, and then handed over incomplete.
 *
 * Like {@link UnknownLedgerVersionError}, a TypeScript caller cannot produce
 * this — it exists for the untyped JavaScript consumers this package also
 * serves. `missingMember` names the absent binding; it is one of this module's
 * own literals rather than caller-supplied text, so exposing it leaks nothing.
 */
export class Ledger8RuntimeInvalidError extends Error {
  readonly code = PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_INVALID;

  constructor(readonly missingMember: string) {
    super(
      'The ledger-8 runtime handed to the down-convert engine cannot be used: the binding it needs is missing. ' +
        'Acquire the runtime with loadLedger8() and pass the pre-fork ContractState class it exposes instead of ' +
        'assembling the runtime object by hand. Read `missingMember` on this error for the absent member.'
    );
    this.name = 'Ledger8RuntimeInvalidError';
  }
}

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
