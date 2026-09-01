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

import type { LedgerVersion } from './lib/ledger-version';

/** Stable error-code strings for this package. Frozen so a downstream package cannot mutate the shared registry object at runtime. */
export const PROTOCOL_ERROR_CODES = Object.freeze({
  UNKNOWN_PROTOCOL_VERSION_READ: 'MIDNIGHT_JS_P_UNKNOWN_PROTOCOL_VERSION_READ',
  UNKNOWN_PROTOCOL_VERSION_CONSTRUCT: 'MIDNIGHT_JS_P_UNKNOWN_PROTOCOL_VERSION_CONSTRUCT',
  LEDGER8_INSTANCE_MISMATCH: 'MIDNIGHT_JS_P_LEDGER8_INSTANCE_MISMATCH',
  LEDGER8_RUNTIME_MISSING: 'MIDNIGHT_JS_P_LEDGER8_RUNTIME_MISSING',
  DOWN_CONVERT_FAILED: 'MIDNIGHT_JS_P_DOWN_CONVERT_FAILED',
  MERKLE_NOT_REHASHED: 'MIDNIGHT_JS_P_MERKLE_NOT_REHASHED',
  COMPOSE_FAILED: 'MIDNIGHT_JS_P_COMPOSE_FAILED',
  COMPOSE_OPTION_INVALID: 'MIDNIGHT_JS_P_COMPOSE_OPTION_INVALID',
  STATE_DECODE_FAILED: 'MIDNIGHT_JS_P_STATE_DECODE_FAILED',
  UNKNOWN_LEDGER_VERSION: 'MIDNIGHT_JS_P_UNKNOWN_LEDGER_VERSION',
  LEDGER8_RUNTIME_INVALID: 'MIDNIGHT_JS_P_LEDGER8_RUNTIME_INVALID',
  UNKNOWN_LEDGER8_AXIS: 'MIDNIGHT_JS_P_UNKNOWN_LEDGER8_AXIS'
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
const AXIS_BARE_PACKAGE_NAMES: Readonly<Record<Ledger8InstanceAxis, string>> = Object.freeze(
  Object.assign(Object.create(null) as Record<Ledger8InstanceAxis, string>, {
    'onchain-runtime-v3': 'onchain-runtime-v3'
  } satisfies Record<Ledger8InstanceAxis, string>)
);

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
 * What `circuitId` a {@link ComposeFailedError} names when the failure happened
 * before any circuit was looked up — only `'call-empty'` reaches this today.
 *
 * Exported, and one literal rather than a per-module copy, so a consumer
 * reading `circuitId` off a caught error can compare against it instead of
 * matching a string this package could change, and so it can never be mistaken
 * for a real entry point a caller might try to resolve.
 */
export const NO_CIRCUIT = '(none)';

/**
 * Which composition step {@link ComposeFailedError} failed at.
 *
 * Call stages:
 * - `'call-empty'` — a call transaction was requested with no calls in it.
 *   The one stage that names no circuit: it is raised before any circuit is
 *   looked up, so it names {@link NO_CIRCUIT}.
 * - `'call-operation'` — a call leg could not resolve a registered operation
 *   for the call's circuit on the given contract state.
 * - `'call-verifier-key'` — a call leg resolved a registered operation for the
 *   call's circuit, but that operation carries no verifier key, so no ledger
 *   could verify a call against it.
 * - `'call-contract-state'` — the call's pre-call state could not be bridged
 *   into the target era's own state algebra. Carries the decoder's failure on
 *   `cause`.
 * - `'call-transcript-empty'` — a caller-supplied partitioned transcript
 *   carried neither a guaranteed nor a fallible half, so the call would record
 *   no operations at all.
 * - `'call-partition'` — the ledger rejected the public transcript supplied
 *   for a call while splitting it into its guaranteed and fallible halves.
 *   Carries the runtime's own failure on `cause`.
 * - `'call-prototype'` — the ledger rejected the call's own inputs while
 *   constructing the call prototype. Carries the runtime's failure on `cause`.
 * - `'call-dust-payout'` — a transcript claimed an unshielded spend to a user
 *   address in DUST, which has no raw token type to be paid out in.
 * - `'call-unsupported-payout'` — a transcript claimed an unshielded spend to
 *   a user address in a token type that cannot be paid out as an unshielded
 *   UTXO at all (a shielded token type today).
 *
 * Deploy stages:
 * - `'deploy-verifier-key'` — a deploy leg was given no verifier key for a
 *   circuit the contract state declares.
 * - `'deploy-unknown-circuit'` — the verifier-key map handed to a deploy leg
 *   names a circuit the contract state does not declare. Registering it would
 *   add an entry point the compiled contract never had, and silently change
 *   the deployed contract's address.
 * - `'deploy-ambiguous-circuit'` — two entry points the contract state
 *   declares resolve to the same name, so the verifier-key map (keyed by
 *   name) cannot address them apart. Registering under the shared name would
 *   key one slot and leave the other blank.
 * - `'deploy-verifier-key-blob'` — the ledger rejected the verifier-key bytes
 *   supplied for a circuit.
 *
 * Keep-state stage:
 * - `'wrap-call'` — the keep-state leg could not resolve a registered
 *   operation for the transcript's circuit on the given contract state.
 *
 * Which ledger era the failure happened on is carried separately, on the
 * error's `version` field. Every stage but `'wrap-call'` is reachable on both
 * eras, so folding the era into the stage would nearly double this union
 * without adding a distinction any caller wants to `switch` on. `'wrap-call'`
 * is the exception because the operation it names is itself fork-crossing: it
 * binds a pre-fork transcript onto a v9 state, so it is only ever raised for
 * `'v9'`.
 */
export type ComposeStage =
  | 'wrap-call'
  | 'call-empty'
  | 'call-transcript-empty'
  | 'call-partition'
  | 'call-prototype'
  | 'call-dust-payout'
  | 'call-unsupported-payout'
  | 'call-operation'
  | 'call-contract-state'
  | 'call-verifier-key'
  | 'deploy-verifier-key'
  | 'deploy-unknown-circuit'
  | 'deploy-ambiguous-circuit'
  | 'deploy-verifier-key-blob';

/**
 * Thrown when a transaction cannot be composed because a circuit's operation
 * is missing, under-registered, or names a circuit the contract does not have.
 * `stage` (see {@link ComposeStage}) names which composition step failed and is
 * a closed union, so a consumer can `switch` on it exhaustively; `version`
 * names the ledger era the composition was running against.
 *
 * Most stages are direct assertion failures (a missing lookup, not a wrapped
 * lower-level exception) and carry no `cause`, like
 * {@link Ledger8InstanceMismatchError}. The exceptions are
 * `'call-contract-state'` and `'deploy-verifier-key-blob'`, where the ledger
 * itself rejected caller-supplied bytes: that failure is preserved on `cause`,
 * the same way {@link DownConvertFailedError} preserves its runtime's own
 * message.
 *
 * `circuitId` names the entry point, never its raw contents: this class
 * renders no hex and no byte-array dump, and callers pass entry-point names
 * that have already been decoded (see `entryPointName` in
 * `lib/verifier-keys.ts`). `'call-empty'` is the one stage with no circuit
 * to name, and its message names none.
 */
export class ComposeFailedError extends Error {
  readonly code: ProtocolErrorCode = PROTOCOL_ERROR_CODES.COMPOSE_FAILED;

  constructor(
    readonly version: LedgerVersion,
    readonly stage: ComposeStage,
    readonly circuitId: string,
    cause?: unknown
  ) {
    super(ComposeFailedError.MESSAGES[stage](version, circuitId), { cause });
    this.name = 'ComposeFailedError';
  }

  // A total Record rather than an if-chain, for the same reason
  // ENVELOPE_DECODERS in lib/engine/envelope.ts is one: adding a stage without
  // its message fails to compile here, instead of silently shipping whichever
  // message the fallthrough happened to reach.
  //
  // Every entry takes the era rather than naming one, so the same table serves
  // both axes. An entry that hardcoded an era would report a v9 failure as a
  // v8 one, which is worse than saying nothing: the two eras' remediations
  // differ.
  private static readonly MESSAGES: Readonly<
    Record<ComposeStage, (version: LedgerVersion, circuitId: string) => string>
  > = {
    'wrap-call': (version, circuitId) =>
      `Failed to compose a ${version}-native keep-state call: no registered operation found for circuit ` +
      `'${circuitId}' on the given contract state. This usually means the contract state passed to ` +
      'wrapKeepStateCall was not read from chain (or produced by a real deploy) — a bare/blank contract ' +
      'state has no operations registered. Resolve the contract state that carries the deployed operation ' +
      'for this circuit and pass that instead.',
    'call-empty': (version) =>
      `Refusing to compose a ${version} call transaction with no calls in it. An empty intent is accepted by ` +
      'the ledger and serializes into a transaction that changes nothing, so the omission would only surface ' +
      'as a call that appeared to succeed and had no effect. Pass at least one call.',
    'call-operation': (version, circuitId) =>
      `Failed to compose a ${version} call transaction: no registered operation found for circuit ` +
      `'${circuitId}' on the given ${version}-native contract state. This usually means the contract state ` +
      'passed to composeCallTx was not read from chain (or produced by a real deploy) — a bare/blank ' +
      'contract state has no operations registered. Resolve the contract state that carries the deployed ' +
      'operation for this circuit and pass that instead.',
    'call-contract-state': (version, circuitId) =>
      `Failed to compose a ${version} call transaction: the pre-call state carried by the transcript for ` +
      `circuit '${circuitId}' could not be bridged into the ${version} ledger era. Read the wrapped cause ` +
      'for what the decoder reported; it distinguishes a state encoded by a different runtime from ' +
      'truncated or empty input. Pass the state the era it targets produced.',
    'call-transcript-empty': (version, circuitId) =>
      `Failed to compose a ${version} call: the transcript supplied for circuit '${circuitId}' carries neither ` +
      'a guaranteed nor a fallible half, so the call would record no operations at all. A transaction built ' +
      'from it serializes, proves and submits, and changes nothing — the same silent no-op an empty call list ' +
      'would produce. Pass the partitioned pair the execution leg produced, at least one half of which is ' +
      'always present for a circuit that ran.',
    'call-dust-payout': (version, circuitId) =>
      `Failed to compose a ${version} call: the transcript for circuit '${circuitId}' claims an unshielded ` +
      'spend to a user address in DUST, which has no raw token type to be paid out in. The transaction ' +
      'cannot carry that payout, and composing it anyway would tell the user they were paid while the ' +
      'transaction paid them nothing. Settle dust through its own mechanism rather than as a claimed ' +
      'unshielded spend.',
    'call-unsupported-payout': (version, circuitId) =>
      `Failed to compose a ${version} call: the transcript for circuit '${circuitId}' claims an unshielded ` +
      'spend to a user address in a token type that cannot be paid out as an unshielded UTXO — a shielded ' +
      'token type today. Shielded value moves through a Zswap offer, not through a claimed unshielded ' +
      'spend, so nothing can settle this claim; composing it anyway would tell the user they were paid ' +
      'while the transaction paid them nothing. Move the shielded value through the guaranteed or fallible ' +
      'Zswap offer instead.',
    'call-partition': (version, circuitId) =>
      `Failed to compose a ${version} call: the ${version} ledger rejected the public transcript supplied ` +
      `for circuit '${circuitId}' while splitting it into its guaranteed and fallible halves. Read the ` +
      'wrapped cause for what the runtime reported; it names the operation and the operand it could not ' +
      'read. This usually means a hand-built or re-encoded op sequence rather than one an execution leg ' +
      'produced — pass the transcript the circuit actually emitted.',
    'call-prototype': (version, circuitId) =>
      `Failed to compose a ${version} call: the ${version} ledger rejected the inputs supplied for circuit ` +
      `'${circuitId}' while constructing the call prototype. Read the wrapped cause for what the runtime ` +
      'reported; it distinguishes an out-of-range numeric field from a malformed address or aligned value. ' +
      'Every part of a call is plain data that nothing type-checks into range, so this usually means a ' +
      'hand-built transcript pair, private transcript output, or input/output value.',
    'call-verifier-key': (version, circuitId) =>
      `Failed to compose a ${version} call: the operation registered for circuit '${circuitId}' carries no ` +
      'verifier key, so no ledger could verify a call against it. This usually means the contract state came ' +
      'from a constructor result rather than from chain — a freshly built state declares its entry points ' +
      'with blank keys, which only a deploy transaction fills in. Pass the contract state as read from chain ' +
      'after a successful deploy.',
    'deploy-verifier-key': (version, circuitId) =>
      `Failed to compose a ${version} deploy transaction: no verifier key was supplied for circuit ` +
      `'${circuitId}', which the contract state declares as an entry point. A deploy carrying an ` +
      "unregistered entry point is rejected by a ledger's own well-formedness check. Resolve the compiled " +
      "contract's verifier key for this circuit (from its keys/ artifacts) and include it in the map passed " +
      'to composeDeployTx.',
    'deploy-unknown-circuit': (version, circuitId) =>
      `Failed to compose a ${version} deploy transaction: the verifier-key map names circuit '${circuitId}', ` +
      'which the contract state does not declare as an entry point. Registering it would give the deployed ' +
      "contract an entry point its compiled source never had, and would change the deployed contract's " +
      'address. This usually means a stale or foreign key file was picked up (for example by globbing ' +
      'keys/*.verifier across compiler runs) — supply keys for exactly the circuits this contract declares.',
    'deploy-ambiguous-circuit': (version, circuitId) =>
      `Failed to compose a ${version} deploy transaction: the contract state declares two entry points that ` +
      `both resolve to the name '${circuitId}', so a verifier-key map keyed by name cannot tell them apart. ` +
      'Registering under that name would key one slot and leave the other blank, deploying a contract whose ' +
      "address does not match the caller's artifacts. This is not something a compactc-built contract " +
      'produces — it means the contract state was assembled by hand, or by a tool that set an entry point to ' +
      'bytes that are not valid UTF-8.',
    'deploy-verifier-key-blob': (version, circuitId) =>
      `Failed to compose a ${version} deploy transaction: the ledger rejected the verifier-key bytes supplied ` +
      `for circuit '${circuitId}'. Read the wrapped cause for what the ledger reported; a verifier key must ` +
      'be the tagged blob the compiler emits as keys/<circuit>.verifier, so this usually means a truncated ' +
      'or empty file, or a key emitted for a different ledger era.'
  };
}

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
 * - `'calls'` — the call list is not one the target era can compose. The
 *   retained pre-fork era composes exactly one call: a cross-contract call is a
 *   ledger-9-only feature that a pre-fork contract cannot emit, so that era has
 *   no call tree to express.
 * - `'verifierKeys'` — a deploy was requested with no verifier-key map, and the
 *   state it was given needs one. Raised on BOTH eras, for two different
 *   reasons: the retained era's deploy leg has to register the compiled
 *   contract's keys itself and so always needs the map, while the current era
 *   accepts its omission for a state that already carries its keys and refuses
 *   it only for a state still declaring a blank-keyed entry point.
 * - `'zswapOffer'` — the supplied offer bytes were rejected by the target era's
 *   decoder. Raised on BOTH eras, for the same reason and with the same
 *   remediation: pass the bytes that era's own offer serialization produced.
 */
export type ComposeOption = 'calls' | 'contractState' | 'networkId' | 'ttl' | 'verifierKeys' | 'zswapOffer';

/**
 * Thrown by the composition legs when one of their options cannot be used at
 * all, as opposed to {@link ComposeFailedError}, which reports a circuit whose
 * operation is missing or under-registered.
 *
 * These are the well-formedness checks the ledger itself does not make. Which
 * network a deployment targets and what TTL policy it uses are the caller's
 * decisions, but an empty network id and an Invalid Date are not decisions —
 * they are defects that the WASM accepts silently, so they are rejected here
 * instead of surfacing as an unexplained rejection at submission time.
 *
 * `option` names the offending field and `version` the ledger era the option
 * was being used against. Like {@link DownConvertFailedError}, this class
 * renders no input contents of its own: a wrapped decoder failure is preserved
 * on `cause`.
 */
export class ComposeOptionError extends Error {
  readonly code: ProtocolErrorCode = PROTOCOL_ERROR_CODES.COMPOSE_OPTION_INVALID;

  constructor(
    readonly version: LedgerVersion,
    readonly option: ComposeOption,
    cause?: unknown
  ) {
    super(ComposeOptionError.MESSAGES[option](version), { cause });
    this.name = 'ComposeOptionError';
  }

  // A total Record rather than an if-chain, for exactly the reason
  // `ComposeFailedError.MESSAGES` above is one: adding an option without its
  // message fails to compile here. As an if-chain this fell through to the
  // `'ttl'` text, so a seventh option would have told a caller their
  // time-to-live was invalid while `option` named something else — an error
  // contradicting its own field.
  private static readonly MESSAGES: Readonly<Record<ComposeOption, (version: LedgerVersion) => string>> = {
    contractState: (version) =>
      `Failed to compose a ${version} transaction: the given contract state could not be bridged into the ` +
      `${version} ledger era. Read the wrapped cause for what the decoder reported; it distinguishes an ` +
      'envelope tagged for a different ledger era from truncated or empty input bytes. Pass the contract ' +
      'state the era it targets produced, not an already down-converted or otherwise re-tagged one.',
    networkId: () =>
      'Refusing to compose a transaction against an empty network id. The ledger would accept it and bake ' +
      'it into the transaction, which the network then rejects at submission. Resolve the network id for ' +
      'the target environment and pass it explicitly.',
    ttl: () =>
      'Refusing to compose a transaction with an invalid time-to-live. An unparseable Date is recorded by ' +
      'the ledger as the Unix epoch, producing a transaction that has already expired. Pass a valid future ' +
      'instant as `ttl`.',
    calls: (version) =>
      `Refusing to compose a ${version} call transaction from this call list: the era can compose exactly ` +
      'one call, and composing only the first would silently drop the rest. A cross-contract call is a ' +
      'ledger-9-only feature a pre-fork contract cannot emit, so this era has no call tree to express — ' +
      'compose each call as its own transaction, or target the era that carries call trees.',
    verifierKeys: (version) =>
      `Refusing to compose a ${version} deploy transaction with no verifier-key map. This era's deploy leg ` +
      "registers the compiled contract's keys onto the initial state itself, and a constructor-built state " +
      'declares every entry point with a blank key — without the map the deploy would carry unregistered ' +
      "entry points and be refused by the ledger's own well-formedness check. Supply keys for exactly the " +
      'circuits the contract declares. An era whose deploy leg accepts the omission still refuses it for a ' +
      'state that declares a blank-keyed entry point, for the same reason.',
    zswapOffer: (version) =>
      `Failed to compose a ${version} transaction: the supplied Zswap offer bytes could not be read by ` +
      `the ${version} ledger. Read the wrapped cause for what the decoder reported. Pass the bytes that ` +
      "era's own offer serialization produced."
  };
}

/**
 * Thrown when a raw, serialized contract-state envelope could not be read by
 * the ledger era it was requested for.
 *
 * Distinct from {@link DownConvertFailedError}, which reports a failure to
 * bridge an already-extracted state into the pre-fork execution algebra: this
 * one reports the envelope never having been readable at all. `version` names
 * the era whose decoder rejected it, which is the first thing a reader needs —
 * the same bytes are a valid state on one axis and refuse to decode on the
 * other, so an era-less message would send a caller to audit bytes that are
 * fine.
 *
 * Renders no hex and no byte dump of its own. The decoder's own diagnosis —
 * which distinguishes a tag mismatch from truncated, trailing or empty input —
 * is preserved on `cause`.
 */
export class StateDecodeFailedError extends Error {
  readonly code: ProtocolErrorCode = PROTOCOL_ERROR_CODES.STATE_DECODE_FAILED;

  constructor(
    readonly version: LedgerVersion,
    cause: unknown
  ) {
    super(
      `Failed to decode a contract state for the ${version} ledger era. Read the wrapped cause for what the ` +
        'decoder reported; it distinguishes an envelope tagged for a different ledger era from truncated, ' +
        'trailing, or empty input bytes. Resolve the era the state was written by — protocolVersionToLedger ' +
        'maps a raw protocolVersion integer onto it — and decode it as that era.',
      { cause }
    );
    this.name = 'StateDecodeFailedError';
  }
}

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
        'Pass the classes of the onchain-runtime-v3 copy your application already loaded, all of them from that ' +
        'one copy, rather than assembling the runtime object by hand. This package exposes no accessor for it — ' +
        'loadLedger8() resolves the v8 ledger, a different package whose own same-named classes run on a ' +
        'separate WASM instance. Read `missingMember` on this error for the absent member.'
    );
    this.name = 'Ledger8RuntimeInvalidError';
  }
}

/**
 * Thrown by `assertSharedLedger8Instance` (`lib/engine/instance-guard.ts`)
 * when the `axis` it was handed is not a member of {@link Ledger8InstanceAxis}.
 *
 * The counterpart of {@link UnknownLedgerVersionError} on the other closed
 * union this package validates at a boundary, and it exists for the same
 * untyped JavaScript consumers. The axis is not only a label: it selects the
 * package names {@link Ledger8InstanceMismatchError} tells the reader to trace,
 * so an unvalidated string would put an `Object.prototype` member where a
 * package name belongs, and would land in an `axis` field consumers are told
 * they can `switch` on.
 *
 * `requestedAxis` carries the offending value; like `requestedVersion` it is
 * kept out of the message, because caller-supplied text is the one thing these
 * errors never render.
 */
export class UnknownLedger8AxisError extends Error {
  readonly code = PROTOCOL_ERROR_CODES.UNKNOWN_LEDGER8_AXIS;

  constructor(readonly requestedAxis: string) {
    super(
      'Unknown ledger-8 instance axis requested for the shared-instance guard. The only axis this framework ' +
        'version checks is onchain-runtime-v3; read `requestedAxis` on this error for the value that was passed.'
    );
    this.name = 'UnknownLedger8AxisError';
  }
}

/**
 * Thrown when a ledger era was requested by a value that is not a member of
 * `LEDGER_VERSIONS`. Raised by `loadLedgerEra` (`lib/era/load-era.ts`) and by
 * `extractEncodedStateValue` (`lib/engine/envelope.ts`).
 *
 * TypeScript callers cannot produce this: `version` is typed as
 * `LedgerVersion`. It exists for the untyped JavaScript consumers this package
 * also serves, where an unvalidated era string threaded from an indexer
 * response would otherwise reach an era-keyed decision — and, where that
 * decision is a lookup table rather than a `switch`, could resolve an inherited
 * `Object.prototype` member and yield a plausible-looking non-era.
 *
 * `requestedVersion` carries the offending value for programmatic use. It is
 * deliberately kept out of the message: this is the one input on the seam that
 * comes straight from an untrusted caller, and the down-convert errors'
 * "never renders caller-supplied text" property is only worth having if it
 * holds here too. For the same reason this class names no `version` field —
 * there is no valid era to name.
 */
export class UnknownLedgerVersionError extends Error {
  readonly code = PROTOCOL_ERROR_CODES.UNKNOWN_LEDGER_VERSION;

  constructor(readonly requestedVersion: string) {
    super(
      'Unknown ledger version requested. Supported eras are v8 (node 1.x) and ' +
        'v9 (node 2.x); read `requestedVersion` on this error for the value that was passed. Derive it with ' +
        'protocolVersionToLedger rather than constructing the string by hand.'
    );
    this.name = 'UnknownLedgerVersionError';
  }
}
