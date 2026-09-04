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

import type { LedgerVersion } from './lib/shared/ledger-version';

/**
 * Stable error-code strings for this package. Every error class in this module
 * carries one of these on its `code` field, which is the field a consumer
 * switches on to tell one failure from another.
 *
 * @see {@link SharedTableDiscipline}
 */
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
/** The union of every value in {@link PROTOCOL_ERROR_CODES}; the type of every error class's `code` field. */
export type ProtocolErrorCode = (typeof PROTOCOL_ERROR_CODES)[keyof typeof PROTOCOL_ERROR_CODES];

/**
 * Which call path asked for a ledger version:
 * - `'read'` — the version was taken off an existing record.
 * - `'construct'` — the version was chosen to build something new against the
 *   network's current head.
 */
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
 * `code` is the field to switch on to tell all four cases apart: it splits
 * `reason` by the `path` that produced it.
 *
 * @param protocolVersion The raw `protocolVersion` value that could not be
 *   resolved. Carried for programmatic use, and rendered in the message.
 * @param path Which call path asked for the version — see
 *   {@link VersionResolutionPath}.
 * @param reason A malformed input (wrong shape or type, not a
 *   protocol-version problem at all) or a well-formed but genuinely unknown
 *   version (a real protocol version this framework build does not support
 *   yet) — see {@link ProtocolVersionUnknownReason}.
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
 *
 * @see {@link ModuleGraphAndLazyLoading}
 */
export type RetainedEraSubpath = '/v8' | '/engine';

/**
 * Thrown when a lazily-loaded subpath export carrying the retained pre-fork
 * runtime could not be acquired at all. Raised by `loadLedger8`
 * (`lib/v8/load.ts`) and `loadLedger8Engine` (`lib/v8/load-engine.ts`), and
 * surfaced through `createLedger8Engine` and `loadLedgerEra('v8')`.
 *
 * A failed acquisition is not memoised: the next call retries the import.
 * Distinct from {@link Ledger8RuntimeInvalidError}, which reports a runtime
 * that WAS acquired and then handed over incomplete.
 *
 * @param subpath Which chunk failed to load — see {@link RetainedEraSubpath}.
 * @param cause The underlying module-resolution or initialisation failure,
 *   preserved unchanged. Read it for which module actually failed.
 * @see {@link ModuleGraphAndLazyLoading}
 * @see {@link EraSeam}
 */
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
 * (`lib/v8/instance-guard.ts`) detected two distinct instances on.
 *
 * `'onchain-runtime-v3'` is the only member this framework version checks.
 *
 * @see {@link DualInstantiationGuard}
 */
export type Ledger8InstanceAxis = 'onchain-runtime-v3';

/**
 * The npm scopes this package and its retained pre-fork runtimes are published
 * under, while the scope migration runs.
 *
 * Do not join a scope to the `/` in one literal -- the dual-publish rewrite
 * would collapse both names into one. See DualInstantiationGuard.
 */
const PUBLISHED_SCOPES = Object.freeze(['@midnight-ntwrk', '@midnightntwrk'] as const);

/**
 * The unscoped npm name of each axis; `axisPackageNames` joins every published
 * scope onto it. See DualInstantiationGuard.
 */
const AXIS_BARE_PACKAGE_NAMES: Readonly<Record<Ledger8InstanceAxis, string>> = Object.freeze(
  Object.assign(Object.create(null) as Record<Ledger8InstanceAxis, string>, {
    'onchain-runtime-v3': 'onchain-runtime-v3'
  } satisfies Record<Ledger8InstanceAxis, string>)
);

const axisPackageNames = (axis: Ledger8InstanceAxis): readonly string[] =>
  PUBLISHED_SCOPES.map((scope) => `${scope}/${AXIS_BARE_PACKAGE_NAMES[axis]}`);

/**
 * Thrown by `assertSharedLedger8Instance` (`lib/v8/instance-guard.ts`)
 * when the same-named WASM package resolved to two physically distinct copies
 * in this process (a dual-instantiation).
 *
 * Carries no `cause`: this is a direct reference-equality assertion failure,
 * not a wrapped lower-level exception.
 *
 * @param axis Which physical-copy axis the check ran on — see
 *   {@link Ledger8InstanceAxis}. It also selects the package names the
 *   message tells the reader to trace.
 * @see {@link DualInstantiationGuard}
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
 * came from. A closed union, so a consumer can `switch` on `stage`
 * exhaustively.
 *
 * @see {@link FailClosedDecoding}
 */
export type DownConvertStage = 'v8 envelope extraction' | 'v9 envelope extraction' | 'state down-convert';

/**
 * Thrown by the down-convert engine (`lib/era/envelope.ts`,
 * `lib/v8/down-convert.ts`) when it cannot turn a raw contract-state
 * envelope, or an already-extracted `EncodedStateValue`, into an executable
 * pre-fork state. Raised by `extractV9EncodedStateValue` (`lib/era/envelope.ts`)
 * and `downConvertForExecution` (`lib/v8/down-convert.ts`).
 *
 * Renders no raw hex and no decoded state contents — only the stage name and
 * the wrapped `cause`.
 *
 * @param stage Which step failed — see {@link DownConvertStage}.
 * @param cause The runtime's own failure, preserved unchanged. It is what
 *   distinguishes a tag mismatch from truncated, trailing, or empty input.
 * @see {@link FailClosedDecoding}
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
 * Thrown by `checkRoot` (`lib/v8/down-convert.ts`) when a bounded Merkle
 * tree's root is read before the tree has been rehashed. Reaches a caller
 * through `assertMerkleTreesRehashed` and `downConvertForExecution`, which
 * assert it on every tree they decode.
 *
 * The remediation is always the caller's: call `rehash()` on the tree before
 * executing against it. Nothing here repairs the tree.
 *
 * @param cause The runtime's own failure, when reading the root threw. Absent
 *   when `root()` returned nothing instead of throwing.
 * @see {@link FailClosedDecoding}
 * @see {@link RetainedEraExecution}
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
 *
 * @see {@link ComposeRefusalOrder}
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
 * - `'call-partition-context'` — the era rejected the query-context state the
 *   call recorded (its block, its starting effects, or one of the commitment
 *   indices it registered for a coin received in-contract) while bridging it
 *   onto the context the transcript is partitioned against. Carries the
 *   runtime's own failure on `cause`.
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
 * eras; `'wrap-call'` is only ever raised for `'v9'`.
 *
 * @see {@link ComposeRefusalOrder}
 * @see {@link VerifierKeys}
 */
export type ComposeStage =
  | 'wrap-call'
  | 'call-empty'
  | 'call-transcript-empty'
  | 'call-partition-context'
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
 * {@link Ledger8InstanceMismatchError}. The exceptions are the stages where
 * the ledger itself rejected caller-supplied bytes — enumerated under `cause`
 * below: that failure is preserved on `cause`, the same way
 * {@link DownConvertFailedError} preserves its runtime's own message.
 *
 * `circuitId` names the entry point, never its raw contents: this class
 * renders no hex and no byte-array dump. `'call-empty'` is the one stage with
 * no circuit to name, and its message names none.
 *
 * @param version The ledger era the composition was running against.
 * @param stage Which composition step failed — see {@link ComposeStage}. A
 *   closed union, so a consumer can `switch` on it exhaustively.
 * @param circuitId The entry-point name, already decoded. {@link NO_CIRCUIT}
 *   for `'call-empty'`, the one stage raised before any circuit is looked up.
 * @param cause The runtime's own failure, present only for the stages where
 *   the ledger itself rejected caller-supplied bytes: `'call-contract-state'`,
 *   `'call-partition-context'`, `'call-partition'`, `'call-prototype'` and
 *   `'deploy-verifier-key-blob'`.
 * @see {@link ComposeRefusalOrder}
 * @see {@link VerifierKeys}
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

  // A total Record, and every entry takes the era rather than naming one --
  // see SharedTableDiscipline. Keep both properties when adding a stage.
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
    'call-partition-context': (version, circuitId) =>
      `Failed to compose a ${version} call: the ${version} era rejected the query-context state recorded ` +
      `for circuit '${circuitId}' — its block, its starting effects, or one of the commitment indices it ` +
      'registered for a coin received in-contract. Read the wrapped cause for the member the runtime could ' +
      'not read. Pass the context the execution leg recorded on the transcript, unmodified.',
    'call-partition': (version, circuitId) =>
      `Failed to compose a ${version} call: the ${version} ledger rejected the public transcript supplied ` +
      `for circuit '${circuitId}' while splitting it into its guaranteed and fallible halves. Read the ` +
      'wrapped cause for what the runtime reported; it names the operation and the operand it could not ' +
      'read. Two causes are common: a hand-built or re-encoded op sequence rather than one an execution ' +
      'leg produced, or a call that received a coin in-contract whose recorded commitment indices never ' +
      'reached the partitioner — a transcript that reads a received coin cannot be split without them.',
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
 *
 * @see {@link ComposeRefusalOrder}
 * @see {@link VerifierKeys}
 */
export type ComposeOption = 'calls' | 'contractState' | 'networkId' | 'ttl' | 'verifierKeys' | 'zswapOffer';

/**
 * Thrown by the composition legs when one of their options cannot be used at
 * all, as opposed to {@link ComposeFailedError}, which reports a circuit whose
 * operation is missing or under-registered.
 *
 * These are the well-formedness checks the ledger itself does not make.
 *
 * Like {@link DownConvertFailedError}, this class renders no input contents of
 * its own.
 *
 * @param version The ledger era the option was being used against.
 * @param option Which option was unusable — see {@link ComposeOption}. A
 *   closed union, so a consumer can `switch` on it exhaustively.
 * @param cause The decoder's own failure, present only for `'contractState'`
 *   and `'zswapOffer'`, where caller-supplied bytes were rejected.
 * @see {@link ComposeRefusalOrder}
 * @see {@link VerifierKeys}
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

  // A total Record, for exactly the reason `ComposeFailedError.MESSAGES` above
  // is one -- see SharedTableDiscipline. Never make this an if-chain.
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
 * the ledger era it was requested for. Raised by both of the facade's read
 * paths, `extractState` and `decodeContractState`
 * (`lib/shared/contract-state.ts`), so a caller writes one handler for both.
 *
 * Renders no hex and no byte dump of its own.
 *
 * @param version The era whose decoder rejected the envelope.
 * @param cause The decoder's own diagnosis, preserved unchanged. It is what
 *   distinguishes a tag mismatch from truncated, trailing or empty input.
 * @see {@link FailClosedDecoding}
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
 * Thrown by `extractEncodedStateValue` (`lib/era/envelope.ts`) when the
 * injected pre-fork runtime cannot be used — it was not passed at all, or the
 * binding the decoder needs is absent from it. Also raised by
 * `downConvertForExecution` (`lib/v8/down-convert.ts`) and
 * `assertSharedLedger8Instance` (`lib/v8/instance-guard.ts`), the latter for a
 * nullish instance probe.
 *
 * Nothing is wrong with the caller's input here. Distinct from
 * {@link Ledger8RuntimeMissingError}, which reports the v8 chunk failing to
 * load at all, and from {@link DownConvertFailedError}, which reports an
 * envelope or state that could not be turned into an executable pre-fork
 * state.
 *
 * @param missingMember Which binding was absent. One of this module's own
 *   literals, never caller-supplied text, so it is safe to log.
 * @see {@link FailClosedDecoding}
 * @see {@link DualInstantiationGuard}
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
 * Thrown by `assertSharedLedger8Instance` (`lib/v8/instance-guard.ts`)
 * when the `axis` it was handed is not a member of {@link Ledger8InstanceAxis}.
 *
 * A TypeScript caller cannot produce this — `axis` is typed as
 * {@link Ledger8InstanceAxis}. It exists for the untyped JavaScript consumers
 * this package also serves.
 *
 * @param requestedAxis The offending value that was passed. Carried for
 *   programmatic use only; it is deliberately kept out of the message.
 * @see {@link DualInstantiationGuard}
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
 * `extractEncodedStateValue` (`lib/era/envelope.ts`).
 *
 * A TypeScript caller cannot produce this: `version` is typed as
 * `LedgerVersion`. It exists for the untyped JavaScript consumers this package
 * also serves.
 *
 * Carries no `version` field, unlike every other era-aware error here — there
 * is no valid era to name.
 *
 * @param requestedVersion The offending value that was passed. Carried for
 *   programmatic use only; it is deliberately kept out of the message.
 * @see {@link SharedTableDiscipline}
 * @see {@link FailClosedDecoding}
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
