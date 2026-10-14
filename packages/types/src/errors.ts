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

import {
  MIDNIGHT_JS_ERROR_CATEGORIES,
  MidnightJsError,
  type MidnightJsErrorCategory
} from '@midnight-ntwrk/midnight-js-protocol/errors';
import { CURRENT_LEDGER_VERSION, type LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';

/**
 * The provider methods that carry a version-tagged transaction payload.
 *
 * Closed rather than a bare `string` so a caught error can be switched on
 * exhaustively, and so a typo in a throw site is a compile error.
 */
export type TransactionMethod = 'proveTx' | 'balanceTx' | 'submitTx';

/**
 * The {@link PublicDataProvider} methods that report a version-tagged
 * finalized-transaction record.
 *
 * Declared here, alongside the interface that owns those methods, rather than
 * in a consuming package — otherwise every consumer outside that package falls
 * back to `string` and the closure is lost exactly where it is needed.
 */
export type ReadMethod = 'watchForTxData' | 'watchForDeployTxData';

/**
 * Every provider method at which a payload's ledger era is resolved or
 * narrowed — the three transaction methods plus the two read methods.
 *
 * This is the vocabulary to type a caught error's `method` against when the
 * error can come from either surface.
 */
export type ProviderMethod = TransactionMethod | ReadMethod;

/**
 * Stable error-code strings for the providers.
 *
 * Most of the group belongs to the provider methods. `PRIVATE_STATE_NOT_SERIALIZABLE`
 * does not: it belongs to the private-state provider, and is here because this is
 * the one provider-scoped group there is.
 *
 * Declared in this package because this is where the payload union the provider codes
 * refuse is defined, and where the classes for three of them live; two others
 * come from
 * `@midnight-ntwrk/midnight-js-indexer-public-data-provider`, which depends on
 * this package. `@midnight-ntwrk/midnight-js-utils` re-exports the group and
 * folds it into the registry `hasErrorCode` consults.
 */
export const PROVIDER_ERROR_CODES = Object.freeze({
  LEDGER8_PAYLOAD_UNSUPPORTED: 'MIDNIGHT_JS_PR_LEDGER8_PAYLOAD_UNSUPPORTED',
  UNTAGGED_PAYLOAD: 'MIDNIGHT_JS_PR_UNTAGGED_PAYLOAD',
  ERA_UNSUPPORTED: 'MIDNIGHT_JS_PR_ERA_UNSUPPORTED',
  ERA_UNRESOLVABLE: 'MIDNIGHT_JS_PR_ERA_UNRESOLVABLE',
  // Distinct from ERA_UNSUPPORTED above, which belongs to the READ surface:
  // that one means "this record cannot be decoded", raised while decoding. This
  // one means "this provider states it does not serve that era", raised from a
  // declaration before any payload exists.
  PROVIDER_ERA_UNSUPPORTED: 'MIDNIGHT_JS_PR_PROVIDER_ERA_UNSUPPORTED',
  PRIVATE_STATE_NOT_SERIALIZABLE: 'MIDNIGHT_JS_PR_PRIVATE_STATE_NOT_SERIALIZABLE',
  INVALID_PROTOCOL_SCHEME: 'MIDNIGHT_JS_PR_INVALID_PROTOCOL_SCHEME',
  ARTIFACT_RUNTIME_VERSION_UNAVAILABLE: 'MIDNIGHT_JS_PR_ARTIFACT_RUNTIME_VERSION_UNAVAILABLE',
  ZK_ARTIFACT_NOT_FOUND: 'MIDNIGHT_JS_PR_ZK_ARTIFACT_NOT_FOUND',
  ZK_ARTIFACT_FETCH_FAILED: 'MIDNIGHT_JS_PR_ZK_ARTIFACT_FETCH_FAILED',
  ZK_ARTIFACT_NOT_SERVED: 'MIDNIGHT_JS_PR_ZK_ARTIFACT_NOT_SERVED',
  PROOF_SERVER_UNAVAILABLE: 'MIDNIGHT_JS_PR_PROOF_SERVER_UNAVAILABLE',
  PROOF_SERVER_REFUSED: 'MIDNIGHT_JS_PR_PROOF_SERVER_REFUSED',
  PRIVATE_STATE_EXPORT_FAILED: 'MIDNIGHT_JS_PR_PRIVATE_STATE_EXPORT_FAILED',
  SIGNING_KEY_EXPORT_FAILED: 'MIDNIGHT_JS_PR_SIGNING_KEY_EXPORT_FAILED',
  PRIVATE_STATE_IMPORT_FAILED: 'MIDNIGHT_JS_PR_PRIVATE_STATE_IMPORT_FAILED',
  EXPORT_DECRYPTION_FAILED: 'MIDNIGHT_JS_PR_EXPORT_DECRYPTION_FAILED',
  INVALID_EXPORT_FORMAT: 'MIDNIGHT_JS_PR_INVALID_EXPORT_FORMAT',
  IMPORT_CONFLICT: 'MIDNIGHT_JS_PR_IMPORT_CONFLICT',
  PRIVATE_STATE_DECRYPTION_FAILED: 'MIDNIGHT_JS_PR_PRIVATE_STATE_DECRYPTION_FAILED',
  PRIVATE_STATE_STORAGE_FAILED: 'MIDNIGHT_JS_PR_PRIVATE_STATE_STORAGE_FAILED',
  PRIVATE_STATE_LIMIT_EXCEEDED: 'MIDNIGHT_JS_PR_PRIVATE_STATE_LIMIT_EXCEEDED',
  STORED_SIGNING_KEY_INVALID: 'MIDNIGHT_JS_PR_STORED_SIGNING_KEY_INVALID',
  INDEXER_GRAPHQL_FAILED: 'MIDNIGHT_JS_PR_INDEXER_GRAPHQL_FAILED',
  INDEXER_QUERY_FAILED: 'MIDNIGHT_JS_PR_INDEXER_QUERY_FAILED',
  INDEXER_DATA_INVALID: 'MIDNIGHT_JS_PR_INDEXER_DATA_INVALID',
  INDEXER_SUBSCRIPTION_DATA_INVALID: 'MIDNIGHT_JS_PR_INDEXER_SUBSCRIPTION_DATA_INVALID',
  INDEXER_CONFIG_INVALID: 'MIDNIGHT_JS_PR_INDEXER_CONFIG_INVALID',
  INDEXER_INVARIANT_VIOLATED: 'MIDNIGHT_JS_PR_INDEXER_INVARIANT_VIOLATED',
  INDEXER_PAYLOAD_TOO_LARGE: 'MIDNIGHT_JS_PR_INDEXER_PAYLOAD_TOO_LARGE',
  UNUSABLE_ERA_ENTRY: 'MIDNIGHT_JS_PR_UNUSABLE_ERA_ENTRY'
} as const);
/** The union of every value in {@link PROVIDER_ERROR_CODES}. */
export type ProviderErrorCode = (typeof PROVIDER_ERROR_CODES)[keyof typeof PROVIDER_ERROR_CODES];

const { USAGE, ENVIRONMENT, TRANSIENT, INTEGRITY, INTERNAL } = MIDNIGHT_JS_ERROR_CATEGORIES;

export const PROVIDER_ERROR_CATEGORIES: Readonly<Record<ProviderErrorCode, MidnightJsErrorCategory>> = Object.freeze({
  [PROVIDER_ERROR_CODES.LEDGER8_PAYLOAD_UNSUPPORTED]: USAGE,
  [PROVIDER_ERROR_CODES.UNTAGGED_PAYLOAD]: USAGE,
  [PROVIDER_ERROR_CODES.ERA_UNSUPPORTED]: ENVIRONMENT,
  [PROVIDER_ERROR_CODES.ERA_UNRESOLVABLE]: ENVIRONMENT,
  [PROVIDER_ERROR_CODES.PROVIDER_ERA_UNSUPPORTED]: USAGE,
  [PROVIDER_ERROR_CODES.PRIVATE_STATE_NOT_SERIALIZABLE]: USAGE,
  [PROVIDER_ERROR_CODES.INVALID_PROTOCOL_SCHEME]: USAGE,
  [PROVIDER_ERROR_CODES.ARTIFACT_RUNTIME_VERSION_UNAVAILABLE]: ENVIRONMENT,
  [PROVIDER_ERROR_CODES.ZK_ARTIFACT_NOT_FOUND]: ENVIRONMENT,
  [PROVIDER_ERROR_CODES.ZK_ARTIFACT_FETCH_FAILED]: TRANSIENT,
  [PROVIDER_ERROR_CODES.ZK_ARTIFACT_NOT_SERVED]: ENVIRONMENT,
  [PROVIDER_ERROR_CODES.PROOF_SERVER_UNAVAILABLE]: TRANSIENT,
  [PROVIDER_ERROR_CODES.PROOF_SERVER_REFUSED]: ENVIRONMENT,
  [PROVIDER_ERROR_CODES.PRIVATE_STATE_EXPORT_FAILED]: USAGE,
  [PROVIDER_ERROR_CODES.SIGNING_KEY_EXPORT_FAILED]: USAGE,
  [PROVIDER_ERROR_CODES.PRIVATE_STATE_IMPORT_FAILED]: INTEGRITY,
  [PROVIDER_ERROR_CODES.EXPORT_DECRYPTION_FAILED]: INTEGRITY,
  [PROVIDER_ERROR_CODES.INVALID_EXPORT_FORMAT]: INTEGRITY,
  [PROVIDER_ERROR_CODES.IMPORT_CONFLICT]: USAGE,
  [PROVIDER_ERROR_CODES.PRIVATE_STATE_DECRYPTION_FAILED]: INTEGRITY,
  [PROVIDER_ERROR_CODES.PRIVATE_STATE_STORAGE_FAILED]: ENVIRONMENT,
  [PROVIDER_ERROR_CODES.PRIVATE_STATE_LIMIT_EXCEEDED]: USAGE,
  [PROVIDER_ERROR_CODES.STORED_SIGNING_KEY_INVALID]: INTEGRITY,
  [PROVIDER_ERROR_CODES.INDEXER_GRAPHQL_FAILED]: ENVIRONMENT,
  [PROVIDER_ERROR_CODES.INDEXER_QUERY_FAILED]: TRANSIENT,
  [PROVIDER_ERROR_CODES.INDEXER_DATA_INVALID]: INTEGRITY,
  [PROVIDER_ERROR_CODES.INDEXER_SUBSCRIPTION_DATA_INVALID]: INTEGRITY,
  [PROVIDER_ERROR_CODES.INDEXER_CONFIG_INVALID]: USAGE,
  [PROVIDER_ERROR_CODES.INDEXER_INVARIANT_VIOLATED]: INTERNAL,
  [PROVIDER_ERROR_CODES.INDEXER_PAYLOAD_TOO_LARGE]: INTEGRITY,
  [PROVIDER_ERROR_CODES.UNUSABLE_ERA_ENTRY]: USAGE
});

const {
  LEDGER8_PAYLOAD_UNSUPPORTED,
  UNTAGGED_PAYLOAD,
  PROVIDER_ERA_UNSUPPORTED,
  PRIVATE_STATE_NOT_SERIALIZABLE,
  INVALID_PROTOCOL_SCHEME,
  ARTIFACT_RUNTIME_VERSION_UNAVAILABLE,
  PRIVATE_STATE_EXPORT_FAILED,
  SIGNING_KEY_EXPORT_FAILED,
  PRIVATE_STATE_IMPORT_FAILED,
  EXPORT_DECRYPTION_FAILED,
  INVALID_EXPORT_FORMAT,
  IMPORT_CONFLICT,
  PRIVATE_STATE_DECRYPTION_FAILED,
  PRIVATE_STATE_STORAGE_FAILED,
  PRIVATE_STATE_LIMIT_EXCEEDED,
  ZK_ARTIFACT_FETCH_FAILED,
  ZK_ARTIFACT_NOT_SERVED,
  PROOF_SERVER_UNAVAILABLE,
  PROOF_SERVER_REFUSED,
  UNUSABLE_ERA_ENTRY
} = PROVIDER_ERROR_CODES;

/**
 * Thrown by a provider that only speaks the v9 ledger runtime when it is
 * handed a v8 payload — serialized, tag-prefixed bytes instead of a live v9
 * transaction object.
 *
 * Catching this does NOT mean "the framework cannot do it yet". It means the
 * specific implementation behind that method does not serve v8 payloads — permanently
 * for the lifting adapters, contingently for a concrete provider.
 *
 * Catch it via its stable `code`, using `hasErrorCode` from
 * `@midnight-ntwrk/midnight-js-utils`.
 *
 * @see {@link ProviderEraDeclarations} for which providers raise it and why, and for
 * how it differs from {@link ProviderEraUnsupportedError}.
 */
export class Ledger8PayloadUnsupportedError extends MidnightJsError {
  readonly code = LEDGER8_PAYLOAD_UNSUPPORTED;
  readonly category = PROVIDER_ERROR_CATEGORIES[LEDGER8_PAYLOAD_UNSUPPORTED];

  /**
   * @param method The provider method that received the payload.
   * @param byteLength Size of the rejected payload, recorded so a report of
   *                   this error says something about what arrived. `undefined`
   *                   when the payload's `txBytes` was missing or not a
   *                   `Uint8Array` — which the message states, because that
   *                   caller has a second problem worth knowing about.
   */
  constructor(
    readonly method: TransactionMethod,
    readonly byteLength?: number
  ) {
    super(
      `${method} received a v8-era transaction payload (serialized bytes${
        byteLength === undefined ? ', size unknown: txBytes was missing or not a Uint8Array' : `, ${byteLength} bytes`
      }), which this provider does not serve. ` +
        `The createProofProvider, createWalletProvider and createMidnightProvider adapters never serve a v8 payload: ` +
        `each lifts a v9-only implementation, so this is by design rather than a gap. ` +
        `Send a v9 payload ({ version: 'v9', tx }) to this method, or use an implementation that serves ` +
        `v8 — httpClientProofProvider and dappConnectorProofProvider do so for proveTx, while balanceTx and submitTx ` +
        `need a WalletProvider or MidnightProvider written against the version-tagged interface directly.`
    );
    this.name = 'Ledger8PayloadUnsupportedError';
  }
}

// The longest `version` string echoed back into an error message. A caller
// reaching this path is passing an arbitrary value, and the message lands in
// `error.stack` and from there in every log sink — so an unbounded string is
// copied into all of them.
const MAX_DESCRIBED_VERSION_LENGTH = 32;

// Renders whatever arrived in `version` for the untagged-payload message.
// Deliberately never JSON.stringify()s the payload: that throws on BigInt and
// on circular references, and would serialize a transaction's contents into an
// error message and from there into logs.
const describeVersion = (payload: unknown): string => {
  if (payload === null) {
    // Reported before the `typeof` fallback below, which would call this
    // 'object' and tell the reader their payload was an object with a bad
    // `version` — the opposite of what happened.
    return 'null';
  }
  if (typeof payload !== 'object') {
    return typeof payload;
  }
  if (!('version' in payload)) {
    return 'no version field';
  }
  const version: unknown = payload.version;
  if (typeof version !== 'string') {
    return typeof version;
  }
  return version.length > MAX_DESCRIBED_VERSION_LENGTH
    ? `'${version.slice(0, MAX_DESCRIBED_VERSION_LENGTH)}'… (${version.length} chars)`
    : `'${version}'`;
};

const READ_METHODS: ReadonlySet<ProviderMethod> = new Set<ReadMethod>(['watchForTxData', 'watchForDeployTxData']);

const describeUntagged = (method: ProviderMethod, received: string): string =>
  READ_METHODS.has(method)
    ? `${method}: a finalized transaction record has no recognised 'version' discriminant (got: ${received}). ` +
      `Records returned from read methods are version-tagged: { version: 'v9', tx } carries a v9 ledger ` +
      `transaction, and { version: 'v8', tx } a v8 one.`
    : `${method}: a transaction payload has no recognised 'version' discriminant (got: ${received}). ` +
      `Payloads passed to and returned from transaction methods are version-tagged: a live v9 ledger ` +
      `transaction is { version: 'v9', tx }, and v8-era serialized bytes are { version: 'v8', txBytes }.`;

/**
 * Thrown when a payload passed to, or returned from, a provider method carries
 * no recognised `version` discriminant — most often a transaction passed
 * untagged, the shape these methods took before 5.0.0. A read method's record
 * is reported as a record, because its v8 variant carries `tx`, not `txBytes`.
 *
 * The method signatures make this unrepresentable in TypeScript, so it is reachable
 * only from JavaScript, from a consumer compiled against a pre-5.0.0
 * `midnight-js-types`, or from a payload that crossed an untyped boundary.
 * It carries a `code` so a caller can tell this apart from an arbitrary crash.
 */
export class UntaggedPayloadError extends MidnightJsError {
  readonly code = UNTAGGED_PAYLOAD;
  readonly category = PROVIDER_ERROR_CATEGORIES[UNTAGGED_PAYLOAD];

  /** What the payload's `version` field actually held. */
  readonly received: string;

  /**
   * @param method The method the payload was passed to or returned from. Typed as the full
   *               {@link ProviderMethod} vocabulary because this error is thrown
   *               from both the transaction methods and the read methods.
   * @param payload The offending payload. Only its `version` field is read;
   *                the payload's contents never reach the message.
   */
  constructor(
    readonly method: ProviderMethod,
    payload: unknown
  ) {
    const received = describeVersion(payload);
    super(describeUntagged(method, received));
    this.name = 'UntaggedPayloadError';
    this.received = received;
  }
}

/**
 * Thrown BEFORE an operation starts, when the provider behind one of the three
 * transaction methods declares that it does not serve the ledger era that operation needs.
 *
 * This is a pre-flight refusal, not a payload rejection. It is raised by
 * `assertProvidersSupportEra` from the provider set alone — no payload has been
 * built, no proof has been requested — and it exists so that an operation whose
 * wallet cannot balance the result is refused before its proof is paid for,
 * rather than after.
 *
 * Distinct from {@link Ledger8PayloadUnsupportedError} on purpose, and the two are
 * not interchangeable:
 *
 * - This error means the provider SAID SO, in `supportedEras`, before it was
 *   asked to do anything. The remedy is to wire a different provider.
 * - `Ledger8PayloadUnsupportedError` means a payload reached a method that will not
 *   take it. That remains the defence in depth: a declaration is a claim by the
 *   implementation, and nothing verifies it, so the narrowing in each method still
 *   runs and still reports its own error when a declaration turns out to be
 *   wrong.
 *
 * Catch it via its stable `code`, using `hasErrorCode` from
 * `@midnight-ntwrk/midnight-js-utils`.
 */
export class ProviderEraUnsupportedError extends MidnightJsError {
  readonly code = PROVIDER_ERA_UNSUPPORTED;
  readonly category = PROVIDER_ERROR_CATEGORIES[PROVIDER_ERA_UNSUPPORTED];

  /**
   * @param method The method whose provider does not declare `era`. Reported
   *               in pipeline order, so this names the first method the
   *               operation would have reached.
   * @param era The ledger era the operation needs every provider to serve.
   * @param declared What that provider does declare. An empty list is the
   *                 honest reading of a provider carrying no declaration at all
   *                 — which a JavaScript caller, or a consumer built against an
   *                 older `midnight-js-types`, really can supply.
   */
  constructor(
    readonly method: TransactionMethod,
    readonly era: string,
    readonly declared: readonly string[]
  ) {
    super(
      `This operation runs on the ${era} ledger era, but the provider wired to ${method} declares that it serves ` +
        `${declared.length === 0 ? 'no era at all' : declared.join(', ')}. ` +
        `Refused before any proof was requested, because a transaction this set cannot carry end to end is not ` +
        `worth proving. Wire a provider that serves ${era} for ${method}, or run this operation on an era the ` +
        `whole set serves.`
    );
    this.name = 'ProviderEraUnsupportedError';
  }
}

/**
 * The shape a provider factory needs for each era entry — the value passed as
 * `currentEra` or under `retainedEras`: a `handler` function
 * for the `…FromHandlers` factories, a `proving-provider` with callable
 * `check` and `prove` for `createProofProviderForEras`.
 */
export type EraEntryShape = 'handler' | 'proving-provider';

const ERA_ENTRY_SHAPE_DESCRIPTIONS: Readonly<Record<EraEntryShape, string>> = {
  handler: 'a function',
  'proving-provider': "a ProvingProvider with callable 'check' and 'prove'"
};

/**
 * Thrown by a provider factory given an era entry it cannot use: a `currentEra`
 * that is not the {@link EraEntryShape} the factory needs, or a retained-era
 * entry that is neither `undefined` nor that shape. Raised at construction, so
 * `supportedEras` never claims an era no entry can serve.
 *
 * The types rule these entries out, so it is reachable only from JavaScript or
 * across an untyped boundary. The factory checks shape only: an entry built for
 * the wrong era, such as a `ProvingProvider` with the other era's key
 * material, still passes.
 *
 * Catch it via its stable `code`, using `hasErrorCode` from
 * `@midnight-ntwrk/midnight-js-utils`.
 */
export class UnusableEraEntryError extends MidnightJsError {
  readonly code = UNUSABLE_ERA_ENTRY;
  readonly category = PROVIDER_ERROR_CATEGORIES[UNUSABLE_ERA_ENTRY];

  /**
   * @param method The provider method the rejected entry would have served.
   * @param era The ledger era whose entry was rejected.
   * @param expected The shape the factory needs for that entry.
   * @param received What was passed instead, for the message only: for example
   *                 `'null'`, `'a class'`, `'an instance of Map'`, or
   *                 `"an object without callable 'prove'"`.
   */
  constructor(
    readonly method: TransactionMethod,
    readonly era: LedgerVersion,
    readonly expected: EraEntryShape,
    readonly received: string
  ) {
    const shape = ERA_ENTRY_SHAPE_DESCRIPTIONS[expected];
    const field = era === CURRENT_LEDGER_VERSION ? 'currentEra' : `retainedEras.${era}`;
    super(
      `Cannot use ${field} passed for ${method}: expected ${shape}, got ${received}. ` +
        (era === CURRENT_LEDGER_VERSION
          ? `Pass ${shape} as ${field}: every provider serves the current era.`
          : `Pass ${shape} as ${field}, or leave the entry out (or set it to undefined) if this era is not served.`)
    );
    this.name = 'UnusableEraEntryError';
  }
}

/**
 * An error describing an invalid protocol scheme.
 */
export class InvalidProtocolSchemeError extends MidnightJsError {
  readonly code = INVALID_PROTOCOL_SCHEME;
  readonly category = PROVIDER_ERROR_CATEGORIES[INVALID_PROTOCOL_SCHEME];

  /**
   * @param invalidScheme The invalid scheme.
   * @param allowableSchemes The valid schemes that are allowed.
   */
  constructor(
    public readonly invalidScheme: string,
    public readonly allowableSchemes: string[]
  ) {
    super(`Invalid protocol scheme: '${invalidScheme}'. Allowable schemes are one of: ${allowableSchemes.join(',')}`);
  }
}

/**
 * An error indicating that a {@link ZKConfigProvider} cannot report which `compact-runtime` its
 * artifact set was compiled against.
 *
 * The retained-era pipeline establishes an artifact's era from that declared version, so a provider
 * that cannot serve it cannot be used with retained-era artifacts. Every provider this framework
 * ships can serve it; a provider written outside it may not, which is the case named here.
 *
 * Raised rather than answered with a default, because every default would be a guess about which
 * ledger era a caller's artifacts belong to.
 */
export class ArtifactRuntimeVersionUnavailableError extends MidnightJsError {
  readonly code = ARTIFACT_RUNTIME_VERSION_UNAVAILABLE;
  readonly category = PROVIDER_ERROR_CATEGORIES[ARTIFACT_RUNTIME_VERSION_UNAVAILABLE];

  /**
   * @param providerName The runtime name of the provider that could not answer.
   */
  constructor(public readonly providerName: string) {
    super(
      `The ZK config provider '${providerName}' does not report the compact-runtime version its ` +
        `artifacts were compiled against, so the era of those artifacts cannot be established. ` +
        `Override getArtifactRuntimeVersion() on it to read the runtime-version from the ` +
        `contract-info.json the compiler emits beside the keys, or use a provider that already does.`
    );
    this.name = 'ArtifactRuntimeVersionUnavailableError';
  }
}

/**
 * An error thrown when exporting private states fails.
 */
export class PrivateStateExportError extends MidnightJsError {
  readonly code = PRIVATE_STATE_EXPORT_FAILED;
  readonly category = PROVIDER_ERROR_CATEGORIES[PRIVATE_STATE_EXPORT_FAILED];

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PrivateStateExportError';
  }
}

/**
 * The reasons a private state cannot be stored.
 *
 * Each names what storage would do to the member rather than what the member is,
 * so the remedy follows from the reason.
 */
export type PrivateStateSerializationFailure =
  | 'function'
  | 'symbol'
  | 'symbol_keyed_property'
  | 'class_instance'
  | 'binary_buffer'
  | 'invalid_date'
  | 'sparse_array'
  | 'dropped_property';

const SERIALIZATION_FAILURE_DESCRIPTIONS: Readonly<Record<PrivateStateSerializationFailure, string>> =
  Object.freeze({
    function: 'is a function, and a live function cannot be stored',
    symbol: 'is a symbol, which storage discards',
    symbol_keyed_property: 'has symbol-keyed properties, which storage discards',
    class_instance:
      'is an instance of a type storage cannot restore: it would be read back without its prototype, ' +
      'and so without its methods',
    binary_buffer:
      'is an ArrayBuffer or a DataView, which storage writes as an empty object; ' +
      'convert it first, with Buffer.from(buffer) or new Uint8Array(buffer)',
    invalid_date: 'is an invalid Date, which storage writes as null',
    sparse_array: 'is a sparse array, whose holes storage writes as null',
    dropped_property: 'is an own property that storage does not persist'
  });

/**
 * The value of {@link PrivateStateSerializationError.path} when the private state
 * itself, rather than a member of it, is what cannot be stored.
 */
export const PRIVATE_STATE_ROOT_PATH = '<root>';

/**
 * An error thrown when a private state holds something that cannot survive being
 * stored, raised by an implementation of {@link PrivateStateProvider.set} before
 * anything is written.
 *
 * Private state must be plain data. The exact set of values a given implementation
 * stores faithfully depends on how it serializes, so that set is documented by the
 * implementation rather than here.
 */
export class PrivateStateSerializationError extends MidnightJsError {
  readonly code = PRIVATE_STATE_NOT_SERIALIZABLE;
  readonly category = PROVIDER_ERROR_CATEGORIES[PRIVATE_STATE_NOT_SERIALIZABLE];

  /**
   * @param path Where the offending value sits inside the private state, as a
   *             property path (`registry.findPathForLeaf`, `witnesses[1]`), or
   *             {@link PRIVATE_STATE_ROOT_PATH} for the private state itself.
   * @param reason What storage would do to it.
   * @param privateStateId The state being written, when the caller knows it.
   */
  constructor(
    public readonly path: string,
    public readonly reason: PrivateStateSerializationFailure,
    public readonly privateStateId?: string
  ) {
    super(
      `Private state at '${path}' ${SERIALIZATION_FAILURE_DESCRIPTIONS[reason]}. ` +
        (privateStateId === undefined ? '' : `Writing private state '${privateStateId}'. `) +
        'Private state must be plain data; nothing was written.'
    );
    this.name = 'PrivateStateSerializationError';
  }
}

/**
 * An error thrown when exporting signing keys fails.
 */
export class SigningKeyExportError extends MidnightJsError {
  readonly code = SIGNING_KEY_EXPORT_FAILED;
  readonly category = PROVIDER_ERROR_CATEGORIES[SIGNING_KEY_EXPORT_FAILED];

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SigningKeyExportError';
  }
}

/**
 * Cause types for private state import errors.
 */
export type PrivateStateImportErrorCause =
  | 'decryption_failed'
  | 'invalid_format'
  | 'conflict'
  | 'unknown';

type PrivateStateImportErrorCode =
  | typeof PRIVATE_STATE_IMPORT_FAILED
  | typeof EXPORT_DECRYPTION_FAILED
  | typeof INVALID_EXPORT_FORMAT
  | typeof IMPORT_CONFLICT;

/**
 * Base error thrown when importing private states fails.
 */
export class PrivateStateImportError extends MidnightJsError {
  readonly code: PrivateStateImportErrorCode = PRIVATE_STATE_IMPORT_FAILED;
  readonly category: MidnightJsErrorCategory = PROVIDER_ERROR_CATEGORIES[PRIVATE_STATE_IMPORT_FAILED];

  constructor(
    message: string,
    public readonly cause?: PrivateStateImportErrorCause
  ) {
    super(message);
    this.name = 'PrivateStateImportError';
  }
}

/**
 * Error thrown when decryption of export data fails.
 * This could be due to wrong password, corrupted data, or tampered content.
 * The specific cause is intentionally not disclosed to prevent oracle attacks.
 */
export class ExportDecryptionError extends PrivateStateImportError {
  readonly code = EXPORT_DECRYPTION_FAILED;
  readonly category = PROVIDER_ERROR_CATEGORIES[EXPORT_DECRYPTION_FAILED];

  constructor() {
    super(
      'Failed to decrypt export data. The password may be incorrect or the data may be corrupted.',
      'decryption_failed'
    );
    this.name = 'ExportDecryptionError';
  }
}

/**
 * Error thrown when the export data format is invalid.
 */
export class InvalidExportFormatError extends PrivateStateImportError {
  readonly code = INVALID_EXPORT_FORMAT;
  readonly category = PROVIDER_ERROR_CATEGORIES[INVALID_EXPORT_FORMAT];

  constructor(message = 'Invalid export format') {
    super(message, 'invalid_format');
    this.name = 'InvalidExportFormatError';
  }
}

/**
 * Error thrown when import conflicts with existing data and conflictStrategy is 'error'.
 */
export class ImportConflictError extends PrivateStateImportError {
  readonly code = IMPORT_CONFLICT;
  readonly category = PROVIDER_ERROR_CATEGORIES[IMPORT_CONFLICT];

  constructor(
    public readonly conflictCount: number,
    entityName = 'private state'
  ) {
    super(
      `Import conflicts with ${conflictCount} existing ${entityName}${conflictCount === 1 ? '' : 's'}`,
      'conflict'
    );
    this.name = 'ImportConflictError';
  }
}

const isTransientHttpStatus = (status: number | undefined): boolean =>
  status === undefined || status >= 500 || status === 408 || status === 429;

/**
 * A ZK artifact could not be fetched. `status` is the HTTP status, absent when the request itself failed.
 * A network failure, HTTP 408, 429 or 5xx is TRANSIENT; any other status is ENVIRONMENT.
 */
export class ZkArtifactFetchError extends MidnightJsError {
  readonly code: typeof ZK_ARTIFACT_FETCH_FAILED | typeof ZK_ARTIFACT_NOT_SERVED;
  readonly category: MidnightJsErrorCategory;

  /**
   * @param status The HTTP status, absent when the request itself failed.
   * @param options `notServed` marks an answer that is not the artifact although its status is 2xx
   *   (an HTML fallback page).
   */
  constructor(
    message: string,
    readonly status?: number,
    options?: { cause?: unknown; notServed?: boolean }
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'ZkArtifactFetchError';
    this.code =
      options?.notServed !== true && isTransientHttpStatus(status)
        ? ZK_ARTIFACT_FETCH_FAILED
        : ZK_ARTIFACT_NOT_SERVED;
    this.category = PROVIDER_ERROR_CATEGORIES[this.code];
  }
}

/**
 * The proof server could not be reached or did not accept the request.
 * A network failure, HTTP 408, 429 or 5xx is TRANSIENT; any other status is ENVIRONMENT.
 */
export class ProofServerError extends MidnightJsError {
  readonly code: typeof PROOF_SERVER_UNAVAILABLE | typeof PROOF_SERVER_REFUSED;
  readonly category: MidnightJsErrorCategory;

  constructor(
    message: string,
    readonly status?: number,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'ProofServerError';
    this.code = isTransientHttpStatus(status) ? PROOF_SERVER_UNAVAILABLE : PROOF_SERVER_REFUSED;
    this.category = PROVIDER_ERROR_CATEGORIES[this.code];
  }
}

/**
 * Why stored private state could not be decrypted: `wrong-key` when it was encrypted with a different key
 * or modified (the two cannot be told apart), `malformed` when it is not readable encrypted data at all.
 */
export type PrivateStateDecryptionReason = 'wrong-key' | 'malformed';

/** Stored private state could not be decrypted. */
export class PrivateStateDecryptionError extends MidnightJsError {
  readonly code = PRIVATE_STATE_DECRYPTION_FAILED;
  readonly category = PROVIDER_ERROR_CATEGORIES[PRIVATE_STATE_DECRYPTION_FAILED];

  constructor(
    message: string,
    readonly reason: PrivateStateDecryptionReason,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'PrivateStateDecryptionError';
  }
}

/**
 * Reading or writing the private-state store failed. `cause` is the failure; `closeError` is set when
 * closing the database afterwards failed too.
 */
export class PrivateStateStorageError extends MidnightJsError {
  readonly code = PRIVATE_STATE_STORAGE_FAILED;
  readonly category = PROVIDER_ERROR_CATEGORIES[PRIVATE_STATE_STORAGE_FAILED];
  readonly closeError?: unknown;

  constructor(message: string, options?: ErrorOptions & { readonly closeError?: unknown }) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'PrivateStateStorageError';
    if (options?.closeError !== undefined) {
      this.closeError = options.closeError;
    }
  }
}

/** More private-state entries than the configured maximum were processed. */
export class PrivateStateLimitExceededError extends MidnightJsError {
  readonly code = PRIVATE_STATE_LIMIT_EXCEEDED;
  readonly category = PROVIDER_ERROR_CATEGORIES[PRIVATE_STATE_LIMIT_EXCEEDED];

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PrivateStateLimitExceededError';
  }
}
