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

import { causeChain } from './lib/shared/cause-chain';
import type { TransactionStage } from './lib/shared/ledger-transaction';
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
  LEDGER8_RUNTIME_MISSING: 'MIDNIGHT_JS_P_LEDGER8_RUNTIME_MISSING',
  STATE_CONVERSION_FAILED: 'MIDNIGHT_JS_P_STATE_CONVERSION_FAILED',
  COMPOSE_FAILED: 'MIDNIGHT_JS_P_COMPOSE_FAILED',
  COMPOSE_OPTION_INVALID: 'MIDNIGHT_JS_P_COMPOSE_OPTION_INVALID',
  STATE_DECODE_FAILED: 'MIDNIGHT_JS_P_STATE_DECODE_FAILED',
  STATE_INCONSISTENT: 'MIDNIGHT_JS_P_STATE_INCONSISTENT',
  UNKNOWN_LEDGER_VERSION: 'MIDNIGHT_JS_P_UNKNOWN_LEDGER_VERSION',
  LEDGER8_RUNTIME_INVALID: 'MIDNIGHT_JS_P_LEDGER8_RUNTIME_INVALID',
  PAYLOAD_NOT_A_TRANSACTION: 'MIDNIGHT_JS_P_PAYLOAD_NOT_A_TRANSACTION',
  CONTRACT_EXECUTION_FAILED: 'MIDNIGHT_JS_P_CONTRACT_EXECUTION_FAILED',
  MAINTENANCE_AUTHORITY_MISMATCH: 'MIDNIGHT_JS_P_MAINTENANCE_AUTHORITY_MISMATCH'
} as const);
/** The union of every value in {@link PROTOCOL_ERROR_CODES}; the type of every error class's `code` field. */
export type ProtocolErrorCode = (typeof PROTOCOL_ERROR_CODES)[keyof typeof PROTOCOL_ERROR_CODES];

export const MIDNIGHT_JS_ERROR_CATEGORIES = Object.freeze({
  USAGE: 'USAGE',
  ENVIRONMENT: 'ENVIRONMENT',
  TRANSIENT: 'TRANSIENT',
  REJECTED: 'REJECTED',
  UNCERTAIN: 'UNCERTAIN',
  INTEGRITY: 'INTEGRITY',
  INTERNAL: 'INTERNAL'
} as const);
/**
 * What the caller should do about an error: fix its own code (`USAGE`), fix the installation or
 * infrastructure (`ENVIRONMENT`), retry (`TRANSIENT`), handle a refusal by contract or network rules
 * (`REJECTED`), check on chain whether a submitted transaction landed before doing anything else
 * (`UNCERTAIN`), stop and alert on bad data (`INTEGRITY`), or report a midnight-js bug (`INTERNAL`).
 */
export type MidnightJsErrorCategory = (typeof MIDNIGHT_JS_ERROR_CATEGORIES)[keyof typeof MIDNIGHT_JS_ERROR_CATEGORIES];

export type MidnightJsErrorCodeFormat = `MIDNIGHT_JS_${string}`;

/**
 * Base class of every error midnight-js raises itself. An error without a registered code came from a
 * dependency, the platform or user code, and midnight-js passed it through unchanged. Recognise one with
 * `hasErrorCode`, `isMidnightJsError` or `errorCategory` from the `midnight-js-utils` package: they read
 * `code`, so they also work when two copies of a package are installed, where `instanceof` does not.
 */
// eslint-disable-next-line no-restricted-syntax -- the one class allowed to extend Error directly
export abstract class MidnightJsError extends Error {
  abstract readonly code: MidnightJsErrorCodeFormat;
  abstract readonly category: MidnightJsErrorCategory;
}

const { USAGE, ENVIRONMENT, REJECTED, INTEGRITY, INTERNAL } = MIDNIGHT_JS_ERROR_CATEGORIES;

export const PROTOCOL_ERROR_CATEGORIES: Readonly<Record<ProtocolErrorCode, MidnightJsErrorCategory>> = Object.freeze({
  [PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ]: ENVIRONMENT,
  [PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_CONSTRUCT]: ENVIRONMENT,
  [PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_MISSING]: ENVIRONMENT,
  [PROTOCOL_ERROR_CODES.STATE_CONVERSION_FAILED]: INTEGRITY,
  [PROTOCOL_ERROR_CODES.COMPOSE_FAILED]: USAGE,
  [PROTOCOL_ERROR_CODES.COMPOSE_OPTION_INVALID]: USAGE,
  [PROTOCOL_ERROR_CODES.STATE_DECODE_FAILED]: INTEGRITY,
  [PROTOCOL_ERROR_CODES.STATE_INCONSISTENT]: INTEGRITY,
  [PROTOCOL_ERROR_CODES.UNKNOWN_LEDGER_VERSION]: ENVIRONMENT,
  [PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_INVALID]: ENVIRONMENT,
  [PROTOCOL_ERROR_CODES.PAYLOAD_NOT_A_TRANSACTION]: USAGE,
  [PROTOCOL_ERROR_CODES.CONTRACT_EXECUTION_FAILED]: REJECTED,
  [PROTOCOL_ERROR_CODES.MAINTENANCE_AUTHORITY_MISMATCH]: USAGE
});

export const COMMON_ERROR_CODES = Object.freeze({
  INVALID_ARGUMENT: 'MIDNIGHT_JS_G_INVALID_ARGUMENT',
  CONFIGURATION_MISSING: 'MIDNIGHT_JS_G_CONFIGURATION_MISSING',
  ENVIRONMENT_UNSUPPORTED: 'MIDNIGHT_JS_G_ENVIRONMENT_UNSUPPORTED',
  INVARIANT_VIOLATED: 'MIDNIGHT_JS_G_INVARIANT_VIOLATED'
} as const);
export type CommonErrorCode = (typeof COMMON_ERROR_CODES)[keyof typeof COMMON_ERROR_CODES];

export const COMMON_ERROR_CATEGORIES: Readonly<Record<CommonErrorCode, MidnightJsErrorCategory>> = Object.freeze({
  [COMMON_ERROR_CODES.INVALID_ARGUMENT]: USAGE,
  [COMMON_ERROR_CODES.CONFIGURATION_MISSING]: USAGE,
  [COMMON_ERROR_CODES.ENVIRONMENT_UNSUPPORTED]: ENVIRONMENT,
  [COMMON_ERROR_CODES.INVARIANT_VIOLATED]: INTERNAL
});

/** A value passed to a midnight-js function is not acceptable. Fix the call. */
export class InvalidArgumentError extends MidnightJsError {
  readonly code = COMMON_ERROR_CODES.INVALID_ARGUMENT;
  readonly category = COMMON_ERROR_CATEGORIES[COMMON_ERROR_CODES.INVALID_ARGUMENT];

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'InvalidArgumentError';
  }
}

/** Required setup is missing or was done in the wrong order. */
export class ConfigurationError extends MidnightJsError {
  readonly code = COMMON_ERROR_CODES.CONFIGURATION_MISSING;
  readonly category = COMMON_ERROR_CATEGORIES[COMMON_ERROR_CODES.CONFIGURATION_MISSING];

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ConfigurationError';
  }
}

/** The JavaScript runtime lacks an API midnight-js needs. */
export class EnvironmentUnsupportedError extends MidnightJsError {
  readonly code = COMMON_ERROR_CODES.ENVIRONMENT_UNSUPPORTED;
  readonly category = COMMON_ERROR_CATEGORIES[COMMON_ERROR_CODES.ENVIRONMENT_UNSUPPORTED];

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'EnvironmentUnsupportedError';
  }
}

/** A condition midnight-js guarantees did not hold. This is a midnight-js bug; report it. */
export class InvariantViolationError extends MidnightJsError {
  readonly code = COMMON_ERROR_CODES.INVARIANT_VIOLATED;
  readonly category = COMMON_ERROR_CATEGORIES[COMMON_ERROR_CODES.INVARIANT_VIOLATED];

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'InvariantViolationError';
  }
}

/**
 * Which call path asked for a ledger version:
 * - `'read'` — the version was taken off an existing record.
 * - `'construct'` — the version was chosen to build something new against the
 *   network's latest block.
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
 * `latestNetworkLedgerVersion`) when a raw `protocolVersion` integer cannot be
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
export class UnknownProtocolVersionError extends MidnightJsError {
  readonly code:
    | typeof PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ
    | typeof PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_CONSTRUCT;
  readonly category: MidnightJsErrorCategory;

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
    this.category = PROTOCOL_ERROR_CATEGORIES[this.code];
  }
}

/**
 * Which lazily-loaded subpath export {@link Ledger8RuntimeMissingError} failed
 * to acquire. Each chunk pulls a different set of ledger 8 dependencies, so
 * naming the wrong one sends an operator to an entry point that loaded fine.
 *
 * @see {@link ModuleGraphAndLazyLoading}
 */
export type Ledger8Subpath = '/v8' | '/v8/engine';

/**
 * Thrown when a lazily-loaded subpath export carrying the retained pre-fork
 * runtime could not be acquired at all. Raised by `loadLedger8Protocol`
 * (`lib/v8/load.ts`) and `loadLedger8Engine` (`lib/v8/load-engine.ts`), and
 * surfaced through `createLedger8Engine` and `loadLedgerEra('v8')`.
 *
 * A failed acquisition is not memoised: the next call retries the import.
 * Distinct from {@link Ledger8RuntimeInvalidError}, which reports a runtime
 * that WAS acquired and then handed over incomplete.
 *
 * @param subpath Which chunk failed to load — see {@link Ledger8Subpath}.
 * @param cause The underlying module-resolution or initialisation failure,
 *   preserved unchanged. Read it for which module actually failed.
 * @see {@link ModuleGraphAndLazyLoading}
 * @see {@link EraBoundary}
 */
export class Ledger8RuntimeMissingError extends MidnightJsError {
  readonly code = PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_MISSING;
  readonly category = PROTOCOL_ERROR_CATEGORIES[PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_MISSING];

  constructor(
    readonly subpath: Ledger8Subpath,
    cause: unknown
  ) {
    super(
      `Failed to load the ledger 8 (pre-fork) runtime via the midnight-js-protocol${subpath} subpath export. ` +
        'Read the wrapped cause for which module actually failed to resolve or initialise. This usually means ' +
        'a broken or partial install of the protocol package — reinstall dependencies and retry.',
      { cause }
    );
    this.name = 'Ledger8RuntimeMissingError';
  }
}

/**
 * Which step a {@link StateConversionFailedError} came from. A closed union,
 * so a consumer can `switch` on `stage` exhaustively.
 *
 * `'state conversion'` is the structural round trip `lib/v8/executable.ts`
 * runs before a circuit executes; the other two decode a serialized contract state
 * written by that ledger version, in `lib/era/envelope.ts`.
 *
 * @see {@link FailClosedDecoding}
 */
export type StateConversionStage = 'v8 state read' | 'v9 state read' | 'state conversion';

/**
 * Thrown when a serialized contract state, or an already-extracted
 * `EncodedStateValue`, cannot be turned into a state a circuit can execute
 * against. Raised by `extractLedger9EncodedStateValue` (`lib/era/envelope.ts`)
 * and by `decodeExecutableStateValue` (`lib/v8/executable.ts`), which refuses a
 * state that decodes but does not re-encode to the bytes it came from.
 *
 * Renders no raw hex and no decoded state contents — only the stage name and
 * the wrapped `cause`.
 *
 * @param stage Which step failed — see {@link StateConversionStage}.
 * @param cause The runtime's own failure, preserved unchanged. It is what
 *   distinguishes a tag mismatch from truncated, trailing, or empty input.
 * @see {@link FailClosedDecoding}
 */
export class StateConversionFailedError extends MidnightJsError {
  readonly code = PROTOCOL_ERROR_CODES.STATE_CONVERSION_FAILED;
  readonly category = PROTOCOL_ERROR_CATEGORIES[PROTOCOL_ERROR_CODES.STATE_CONVERSION_FAILED];

  constructor(
    readonly stage: StateConversionStage,
    cause: unknown
  ) {
    super(
      `Failed to convert a contract state into one a circuit can execute against, during ${stage}. Read the ` +
        'wrapped cause for what the runtime actually reported; it distinguishes a version tag for a different ' +
        'ledger version than the one requested from truncated, trailing, or empty input bytes.',
      { cause }
    );
    this.name = 'StateConversionFailedError';
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
 * Maintenance stage:
 * - `'maintenance-update'` — the maintenance update could not be built,
 *   signed, or wrapped into a transaction: platform-js refused the contract
 *   address, compact-js refused one of its own steps (building the update,
 *   creating it with the address and counter, reading the data to sign,
 *   signing, attaching the signature), or the ledger refused the signed update
 *   when it was wrapped into the transaction. Names the circuit for a
 *   verifier-key update and {@link NO_CIRCUIT} for an authority replacement.
 *   Carries the refusing library's own failure on `cause`.
 *
 * Keep-state stage:
 * - `'wrap-call'` — the keep-state leg could not resolve a registered
 *   operation for the transcript's circuit on the given contract state.
 *
 * Which ledger era the failure happened on is carried separately, on the
 * error's `version` field. Every stage but `'wrap-call'` and
 * `'maintenance-update'` is reachable on both eras; `'wrap-call'` is only ever
 * raised for `'v9'`, and `'maintenance-update'` only for `'v8'`.
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
  | 'deploy-verifier-key-blob'
  | 'maintenance-update';

/**
 * Thrown when a transaction cannot be composed because a circuit's operation
 * is missing, under-registered, or names a circuit the contract does not have.
 * `stage` (see {@link ComposeStage}) names which composition step failed and is
 * a closed union, so a consumer can `switch` on it exhaustively; `version`
 * names the ledger era the composition was running against.
 *
 * Most stages carry no `cause`. The exceptions are the stages where a runtime
 * library rejected what it was handed, enumerated under `cause` below.
 *
 * `circuitId` names the entry point, never its raw contents: this class renders
 * no hex and no byte-array dump.
 *
 * @param version The ledger era the composition was running against.
 * @param stage Which composition step failed — see {@link ComposeStage}. A
 *   closed union, so a consumer can `switch` on it exhaustively.
 * @param circuitId The entry-point name, already decoded. {@link NO_CIRCUIT}
 *   for `'call-empty'`, the one stage raised before any circuit is looked up.
 * @param cause The runtime's own failure, present only for the stages where
 *   the ledger rejected caller-supplied bytes — `'call-contract-state'`,
 *   `'call-partition-context'`, `'call-partition'`, `'call-prototype'`,
 *   `'deploy-verifier-key-blob'` — and for `'maintenance-update'`, where it is
 *   the failure of platform-js, compact-js or the ledger, whichever refused.
 * @see {@link ComposeRefusalOrder}
 * @see {@link VerifierKeys}
 */
export class ComposeFailedError extends MidnightJsError {
  readonly code = PROTOCOL_ERROR_CODES.COMPOSE_FAILED;
  readonly category = PROTOCOL_ERROR_CATEGORIES[PROTOCOL_ERROR_CODES.COMPOSE_FAILED];

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
      'or empty file, or a key emitted for a different ledger era.',
    'maintenance-update': (version, circuitId) =>
      `Failed to compose a ${version} maintenance transaction: the maintenance update could not be built ` +
      (circuitId === NO_CIRCUIT
        ? 'to replace the maintenance authority. '
        : `for circuit '${circuitId}'. `) +
      'Read the wrapped cause for the step that refused it: the contract address, building the update, ' +
      'creating it with the address and counter, reading the data to sign, signing, attaching the ' +
      'signature, or wrapping the signed update into the transaction. A verifier key that is not the tagged ' +
      'blob the compiler emits as keys/<circuit>.verifier is refused while building the update. A failure ' +
      'naming an expected instance, or a null pointer, usually means a second copy of the ledger package is ' +
      'installed, not that a key is wrong.'
  };
}

/**
 * Which option handed to a composition leg was unusable:
 * - `'contractStateBytes'` — the state could not be bridged into the target
 *   ledger era (the era's decoder rejected its bytes).
 * - `'guaranteedZswapOfferBytes'` — the offer bytes supplied to a deploy were
 *   rejected by the target era's decoder.
 * - `'ledgerParametersBytes'` — the supplied ledger parameters could not be
 *   read by the target era.
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
 * - `'signingKey'` — a signing key is not the 32 bytes of hex the era's runtime
 *   reads: the key a constructor builds the maintenance authority from, or the
 *   key a maintenance update is signed with.
 * - `'newSigningKey'` — the key a maintenance update would make the new
 *   authority is not the 32 bytes of hex the era's runtime reads.
 * - `'zswapOffer'` — the offer bytes a call's offer factory returned were
 *   rejected by the target era's decoder. Raised on BOTH eras, for the same reason and with the same
 *   remediation: pass the bytes that era's own offer serialization produced.
 *
 * @see {@link ComposeRefusalOrder}
 * @see {@link VerifierKeys}
 */
export type ComposeOption =
  | 'calls'
  | 'contractStateBytes'
  | 'guaranteedZswapOfferBytes'
  | 'ledgerParametersBytes'
  | 'networkId'
  | 'newSigningKey'
  | 'signingKey'
  | 'ttl'
  | 'verifierKeys'
  | 'zswapOffer';

/**
 * Thrown by the composition legs when one of their options cannot be used at
 * all, as opposed to {@link ComposeFailedError}, which reports a circuit whose
 * operation is missing or under-registered.
 *
 * These are the well-formedness checks the ledger itself does not make.
 *
 * Like {@link StateConversionFailedError}, this class renders no input contents of
 * its own.
 *
 * @param version The ledger era the option was being used against.
 * @param option Which option was unusable — see {@link ComposeOption}. A
 *   closed union, so a consumer can `switch` on it exhaustively.
 * @param cause The decoder's own failure, present where caller-supplied bytes
 *   were rejected.
 * @see {@link ComposeRefusalOrder}
 * @see {@link VerifierKeys}
 */
export class ComposeOptionError extends MidnightJsError {
  readonly code = PROTOCOL_ERROR_CODES.COMPOSE_OPTION_INVALID;
  readonly category = PROTOCOL_ERROR_CATEGORIES[PROTOCOL_ERROR_CODES.COMPOSE_OPTION_INVALID];

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
    contractStateBytes: (version) =>
      `Failed to compose a ${version} transaction: the given contract state could not be bridged into the ` +
      `${version} ledger era. Read the wrapped cause for what the decoder reported; it distinguishes an ` +
      'version tag for a different ledger era from truncated or empty input bytes. Pass the contract ' +
      'state the era it targets produced, not one already converted to another era or otherwise re-tagged.',
    ledgerParametersBytes: (version) =>
      `Failed to compose a ${version} transaction: the supplied ledger parameters could not be read by the ` +
      `${version} ledger. They are era-tagged, so bytes read from a block of the other era will be refused ` +
      'here — read the wrapped cause for the tag the decoder found. Pass the parameters the block this call ' +
      'is built against served: the bytes of `ContractStateAndParametersRead.ledgerParameters`, from its `serialize()`.',
    networkId: () =>
      'Refusing to compose a transaction against an empty network id. The ledger would accept it and bake ' +
      'it into the transaction, which the network then rejects at submission. Resolve the network id for ' +
      'the target environment and pass it explicitly.',
    ttl: () =>
      'Refusing to compose a transaction with an invalid time-to-live. An unparseable Date is recorded by ' +
      'the ledger as the Unix epoch, producing a transaction that has already expired. Pass a valid future ' +
      'instant as `ttl`.',
    signingKey: (version) =>
      `Refusing to use a malformed \`signingKey\` on the ${version} era. The key builds a deployed ` +
      "contract's maintenance authority or signs an update to it, and the runtime reads it as 32 bytes written in hex - so " +
      'pass exactly 64 hexadecimal characters, which is what that era\'s `sampleSigningKey` produces. The ' +
      'runtime itself reports a malformed key as `failed to fill whole buffer` or ' +
      "`Invalid character 'z' at position 0`, naming neither the option nor the era. The key is not " +
      'rendered here: it is a secret, and on the sampled path the only copy that will exist.',
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
    guaranteedZswapOfferBytes: (version) =>
      `Failed to compose a ${version} deploy transaction: the supplied guaranteed Zswap offer bytes could ` +
      `not be read by the ${version} ledger. Read the wrapped cause for what the decoder reported. Pass the ` +
      "bytes that era's own offer serialization produced.",
    newSigningKey: (version) =>
      `Refusing to compose a ${version} maintenance transaction with a malformed \`newSigningKey\`. The key ` +
      'becomes the whole of the replacement maintenance authority, and the runtime reads it as 32 bytes ' +
      "written in hex - so pass exactly 64 hexadecimal characters, which is what that era's " +
      '`sampleSigningKey` produces. The key is not rendered here: it is a secret.',
    zswapOffer: (version) =>
      `Failed to compose a ${version} transaction: the supplied Zswap offer bytes could not be read by ` +
      `the ${version} ledger. Read the wrapped cause for what the decoder reported. Pass the bytes that ` +
      "era's own offer serialization produced."
  };
}

/**
 * Why a maintenance update cannot be signed by the key held for a contract:
 * - `'not-first-member'` — the key's verifying key is not the first member of
 *   the contract's maintenance authority committee, the member every update is
 *   signed for.
 * - `'empty-committee'` — the authority has no committee, so no key can sign
 *   for it.
 * - `'threshold-above-one'` — the authority needs more signatures than the one
 *   every update carries.
 */
export type MaintenanceAuthorityMismatchReason = 'not-first-member' | 'empty-committee' | 'threshold-above-one';

const MAINTENANCE_AUTHORITY_MISMATCH_MESSAGES: Readonly<Record<MaintenanceAuthorityMismatchReason, string>> = {
  'not-first-member':
    "the signing key's verifying key is not the first member of the contract's maintenance authority " +
    'committee, which is the member the update is signed for, so the ledger would refuse it. The key held ' +
    'for this address is not the one the authority was built from - most often a key another deployment or ' +
    'the other ledger era stored under the same address, or a previous authority replacement whose new key ' +
    'was never stored. Supply the key the contract was deployed with, or the key a previous authority ' +
    'replacement installed.',
  'empty-committee':
    "the contract's maintenance authority has no committee, so no key can sign an update for it and the " +
    'contract cannot be maintained.',
  'threshold-above-one':
    "the contract's maintenance authority needs more than one signature, and every update this framework " +
    'composes carries exactly one, so the ledger would refuse it.'
};

/**
 * Thrown when a maintenance update cannot be signed so that the ledger accepts
 * it with the key held for the contract — see
 * {@link MaintenanceAuthorityMismatchReason} for the three ways.
 *
 * Raised BEFORE anything is signed or proven: the ledger would accept the
 * signature into the transaction and refuse the update only at submission,
 * after a proof has been paid for.
 *
 * Renders the contract address and no key material: neither the signing key
 * nor any verifying key appears in the message.
 *
 * @param version The ledger era the update was being composed on.
 * @param contractAddress The contract whose authority was checked.
 * @param reason Which check refused it.
 * @see {@link RetainedEraExecution}
 */
export class MaintenanceAuthorityMismatchError extends MidnightJsError {
  readonly code = PROTOCOL_ERROR_CODES.MAINTENANCE_AUTHORITY_MISMATCH;
  readonly category = PROTOCOL_ERROR_CATEGORIES[PROTOCOL_ERROR_CODES.MAINTENANCE_AUTHORITY_MISMATCH];

  constructor(
    readonly version: LedgerVersion,
    readonly contractAddress: string,
    readonly reason: MaintenanceAuthorityMismatchReason
  ) {
    super(
      `Refusing to sign a ${version} maintenance update for the contract at '${contractAddress}': ` +
        MAINTENANCE_AUTHORITY_MISMATCH_MESSAGES[reason]
    );
    this.name = 'MaintenanceAuthorityMismatchError';
  }
}

/**
 * Thrown when a raw, serialized contract state could not be read by
 * the ledger era it was requested for. Raised by both of the facade's read
 * paths, `extractState` and `decodeContractState`
 * (`lib/shared/contract-state.ts`), so a caller writes one handler for both.
 *
 * Renders no hex and no byte dump of its own.
 *
 * @param version The era whose decoder rejected the bytes.
 * @param cause The decoder's own diagnosis, preserved unchanged. It is what
 *   distinguishes a tag mismatch from truncated, trailing or empty input.
 * @see {@link FailClosedDecoding}
 */
export class StateDecodeFailedError extends MidnightJsError {
  readonly code = PROTOCOL_ERROR_CODES.STATE_DECODE_FAILED;
  readonly category = PROTOCOL_ERROR_CATEGORIES[PROTOCOL_ERROR_CODES.STATE_DECODE_FAILED];

  constructor(
    readonly version: LedgerVersion,
    cause: unknown
  ) {
    super(
      `Failed to decode a contract state for the ${version} ledger era. Read the wrapped cause for what the ` +
        'decoder reported; it distinguishes a version tag for a different ledger era from truncated, ' +
        'trailing, or empty input bytes. Resolve the era the state was written by — protocolVersionToLedger ' +
        'maps a raw protocolVersion integer onto it — and decode it as that era.',
      { cause }
    );
    this.name = 'StateDecodeFailedError';
  }
}

/**
 * Thrown by `decodeContractState` (`lib/shared/contract-state.ts`) when the
 * era's decoder read the bytes but the state it produced is internally
 * inconsistent: it declares an entry point it resolves no operation for, holds
 * a verifier key that will not hash, or resolves no usable balance.
 *
 * Distinct from {@link StateDecodeFailedError}: the bytes were readable by the
 * requested era, so decoding them as the other era cannot help. A caller that
 * retries on `STATE_DECODE_FAILED` must not retry on this one.
 *
 * Renders no hex and no decoded state contents of its own.
 *
 * @param version The era whose decoder produced the state.
 * @param cause The diagnosis of what was inconsistent, preserved unchanged.
 * @see {@link FailClosedDecoding}
 */
export class StateInconsistentError extends MidnightJsError {
  readonly code = PROTOCOL_ERROR_CODES.STATE_INCONSISTENT;
  readonly category = PROTOCOL_ERROR_CATEGORIES[PROTOCOL_ERROR_CODES.STATE_INCONSISTENT];

  constructor(
    readonly version: LedgerVersion,
    cause: unknown
  ) {
    super(
      `Decoded a contract state for the ${version} ledger era, but the state is internally inconsistent. ` +
        'Read the wrapped cause for what was inconsistent. The bytes were readable by this era, so decoding ' +
        'them as another era will not fix it; check the decoder the era was loaded with and the source of ' +
        'the state.',
      { cause }
    );
    this.name = 'StateInconsistentError';
  }
}

/**
 * Thrown by `extractEncodedStateValue` (`lib/era/envelope.ts`) when the
 * injected pre-fork runtime cannot be used — it was not passed at all, or the
 * binding the decoder needs is absent from it.
 *
 * `downConvertForExecution` and the shared-instance guard used to raise it too;
 * both are gone with the hand-maintained execution layer, so the contract-state
 * decoder is now its only source.
 *
 * Nothing is wrong with the caller's input here. Distinct from
 * {@link Ledger8RuntimeMissingError}, which reports the v8 chunk failing to
 * load at all, and from {@link StateConversionFailedError}, which reports a
 * serialized state that could not be turned into an executable pre-fork
 * state.
 *
 * @param missingMember Which binding was absent. One of this module's own
 *   literals, never caller-supplied text, so it is safe to log.
 * @see {@link FailClosedDecoding}
 * @see {@link DualInstantiationGuard}
 */
export class Ledger8RuntimeInvalidError extends MidnightJsError {
  readonly code = PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_INVALID;
  readonly category = PROTOCOL_ERROR_CATEGORIES[PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_INVALID];

  constructor(readonly missingMember: string) {
    super(
      'The ledger 8 runtime passed in to decode a ledger 8 contract state cannot be used: the binding it ' +
        'needs is missing. ' +
        'Pass the classes of the onchain-runtime-v3 copy your application already loaded, all of them from that ' +
        'one copy, rather than assembling the runtime object by hand. This package exposes no accessor for it — ' +
        'loadLedger8Protocol() resolves the v8 ledger, a different package whose own same-named classes run on a ' +
        'separate WASM instance. Read `missingMember` on this error for the absent member.'
    );
    this.name = 'Ledger8RuntimeInvalidError';
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
 * @param context The call that read the version off a value it was handed,
 *   for example the provider method that returned a record. Named in the
 *   message, so a caller can tell which provider produced the value.
 * @see {@link SharedTableDiscipline}
 * @see {@link FailClosedDecoding}
 */
export class UnknownLedgerVersionError extends MidnightJsError {
  readonly code = PROTOCOL_ERROR_CODES.UNKNOWN_LEDGER_VERSION;
  readonly category = PROTOCOL_ERROR_CATEGORIES[PROTOCOL_ERROR_CODES.UNKNOWN_LEDGER_VERSION];

  constructor(
    readonly requestedVersion: string,
    readonly context?: string
  ) {
    super(
      `${context === undefined ? 'Unknown ledger version requested.' : `${context} returned a value with an unknown ledger version.`} ` +
        'Supported eras are v8 (node 1.x) and ' +
        'v9 (node 2.x); read `requestedVersion` on this error for the value that was passed. Derive it with ' +
        'protocolVersionToLedger rather than constructing the string by hand.'
    );
    this.name = 'UnknownLedgerVersionError';
  }
}

/**
 * The opening of the tag every serialized ledger transaction carries, on both
 * eras.
 *
 * Stops before the bracketed version deliberately: a `[vN]` is the wire-schema
 * version of the serialized OBJECT and never a ledger era — the retained era's
 * transactions are tagged `transaction[v9]`.
 *
 * @see packages/contracts/docs/verification-path.md for the same rule stated
 *      about verifier-key tags.
 */
export const TRANSACTION_TAG_PREFIX = 'midnight:transaction[';

/**
 * The bounds on a constructor name reported by {@link describeType}. It is
 * CALLER DATA — `{ constructor: { name: ... } }` sets it to anything at all —
 * so it is bounded in length and restricted to an identifier alphabet before
 * it can reach an error message and from there a logger provider.
 */
const MAX_TYPE_NAME_LENGTH = 32;
const TYPE_NAME_PATTERN = /^[A-Za-z0-9_$]+$/;

/**
 * Reads a value's constructor name, or `undefined` where it cannot be read.
 *
 * The read is a property access on caller data, so it can throw: an object may
 * define `constructor` as an accessor that throws, or be an exotic object whose
 * trap does. No operation is being attempted here — only a label chosen for a
 * payload that has ALREADY been refused — so letting the throw propagate would
 * replace the coded refusal with the caller's own error.
 */
const readConstructorName = (value: object): unknown => {
  try {
    return value.constructor?.name;
  } catch {
    return undefined;
  }
};

/**
 * Names the kind of a value without reproducing any of it verbatim.
 *
 * Validated AFTER truncation, and that order is the point: what is checked has
 * to be exactly what is emitted.
 */
const describeType = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }
  if (typeof value !== 'object') {
    return typeof value;
  }
  const constructorName = readConstructorName(value);
  if (typeof constructorName !== 'string') {
    return 'object';
  }
  const bounded = constructorName.slice(0, MAX_TYPE_NAME_LENGTH);
  return TYPE_NAME_PATTERN.test(bounded) ? bounded : 'object';
};

const SANCTIONED_SOURCE_HINT =
  'Pass the bytes of a transaction produced by a sanctioned composition function; a contract state, a Zswap ' +
  'offer or a proof preimage is not a transaction.';

/**
 * Thrown when a payload handed to `deserializeTransactionAtStage` is not a
 * serialized transaction of the requested era and stage.
 *
 * It covers four ways that can happen: a value that is not a byte string, a
 * byte string shorter than the tag prefix, one that does not open with the
 * prefix, and one the era's runtime refuses to read at the requested stage.
 * The first three are refused before any runtime reads the bytes. The last
 * carries the runtime's refusal on `cause`.
 *
 * @remarks Match it with `hasErrorCode` against
 * `PROTOCOL_ERROR_CODES.PAYLOAD_NOT_A_TRANSACTION` rather than constructing it.
 */
export class PayloadNotATransactionError extends MidnightJsError {
  readonly code = PROTOCOL_ERROR_CODES.PAYLOAD_NOT_A_TRANSACTION;
  readonly category = PROTOCOL_ERROR_CATEGORIES[PROTOCOL_ERROR_CODES.PAYLOAD_NOT_A_TRANSACTION];

  private constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PayloadNotATransactionError';
  }

  /**
   * The payload was not a `Uint8Array`. Reachable from JavaScript or across an
   * untyped boundary, so it is refused with a code rather than left to become
   * a bare `TypeError`.
   */
  static notBytes(received: unknown): PayloadNotATransactionError {
    return new PayloadNotATransactionError(
      `Refusing to read a transaction from a payload that is ${describeType(received)} rather than a Uint8Array. ` +
        SANCTIONED_SOURCE_HINT
    );
  }

  /** The payload is a byte string, but does not open with a transaction's tag. */
  static wrongTag(byteLength: number): PayloadNotATransactionError {
    return new PayloadNotATransactionError(
      `Refusing to read a ${byteLength}-byte payload that does not begin with the ` +
        `'${TRANSACTION_TAG_PREFIX}' tag of a serialized ledger transaction. ${SANCTIONED_SOURCE_HINT}`
    );
  }

  /** The era's runtime refused to read the payload at the requested stage; its refusal is on `cause`. */
  static undecodable(
    version: LedgerVersion,
    stage: TransactionStage,
    byteLength: number,
    cause: unknown
  ): PayloadNotATransactionError {
    return new PayloadNotATransactionError(
      `Refusing a ${byteLength}-byte payload that the ledger ${version} runtime cannot read as a ${stage} ` +
        `transaction. Check that the bytes were written by the ledger ${version} runtime and serialized at the ` +
        `${stage} stage. Read the wrapped cause for the runtime refusal.`,
      { cause }
    );
  }
}

const MAX_CAUSE_DEPTH = 8;

const CATEGORY_VALUES: ReadonlySet<string> = new Set(Object.values(MIDNIGHT_JS_ERROR_CATEGORIES));

/** A midnight-js error recognised by its fields, which also matches one built by another installed copy. */
export type CodedMidnightJsError = Error & {
  readonly code: MidnightJsErrorCodeFormat;
  readonly category: MidnightJsErrorCategory;
};

const isCodedMidnightJsError = (value: unknown): value is CodedMidnightJsError =>
  value instanceof Error &&
  'code' in value &&
  typeof value.code === 'string' &&
  value.code.startsWith('MIDNIGHT_JS_') &&
  'category' in value &&
  typeof value.category === 'string' &&
  CATEGORY_VALUES.has(value.category);

/**
 * The midnight-js error a failure is or carries: the failure itself when it is one, otherwise the first
 * one on its `cause` chain, at most eight links down. Use it when a dependency wraps a midnight-js error
 * and hides its `code` and `category`.
 */
export const findCodedCause = (failure: unknown): CodedMidnightJsError | undefined => {
  const seen = new Set<unknown>();
  let current: unknown = failure;
  for (let depth = 0; depth <= MAX_CAUSE_DEPTH; depth++) {
    if (isCodedMidnightJsError(current)) {
      return current;
    }
    if (typeof current !== 'object' || current === null || seen.has(current) || !('cause' in current)) {
      return undefined;
    }
    seen.add(current);
    current = current.cause;
  }
  return undefined;
};

/**
 * What a retained-era circuit or constructor execution fails with. A Compact `assert` refusal is the usual
 * cause, but a key or config read failure or a runtime fault can also arrive this way, so `cause` is the
 * source of truth. A failure that is, or carries on its `cause` chain, a midnight-js coded error is not
 * wrapped in this class: that coded error surfaces directly.
 */
export class ContractExecutionError extends MidnightJsError {
  readonly code = PROTOCOL_ERROR_CODES.CONTRACT_EXECUTION_FAILED;
  readonly category = PROTOCOL_ERROR_CATEGORIES[PROTOCOL_ERROR_CODES.CONTRACT_EXECUTION_FAILED];

  /**
   * Every failure the execution reported, as the original objects, in the order they arrived. Filled by
   * {@link ContractExecutionError.fromFailures}; empty when the error was built without a list.
   */
  readonly errors: readonly unknown[];

  constructor(message: string, options?: ErrorOptions & { readonly errors?: readonly unknown[] }) {
    super(message, options);
    this.name = 'ContractExecutionError';
    this.errors = options?.errors ?? [];
  }

  /**
   * Reports every failure of an execution, each with its whole cause chain, separated by `; `.
   * `cause` is the first coded error found on any failure's chain, or the first failure when none is coded.
   * `errors` holds every failure as the original object, so no stack is lost.
   */
  static fromFailures(failures: readonly unknown[]): ContractExecutionError {
    const describe = (failure: unknown): string => {
      const chain = causeChain(failure);
      return chain.length > 0 ? chain.join(': ') : String(failure);
    };
    const coded = failures.map(findCodedCause).find((candidate) => candidate !== undefined);
    return new ContractExecutionError(failures.map(describe).join('; '), { cause: coded ?? failures[0], errors: failures });
  }
}
