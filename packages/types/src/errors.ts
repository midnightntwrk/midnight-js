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

/**
 * The provider methods that carry a version-tagged transaction payload.
 *
 * Closed rather than a bare `string` so a caught error can be switched on
 * exhaustively, and so a typo in a throw site is a compile error.
 */
export type ProviderSeam = 'proveTx' | 'balanceTx' | 'submitTx';

/**
 * The {@link PublicDataProvider} methods that report a version-tagged
 * finalized-transaction record.
 *
 * Declared here, alongside the interface that owns those methods, rather than
 * in a consuming package — otherwise every consumer outside that package falls
 * back to `string` and the closure is lost exactly where it is needed.
 */
export type ReadSeam = 'watchForTxData' | 'watchForDeployTxData';

/**
 * Every seam at which a payload's ledger era is resolved or narrowed — the
 * three transaction seams plus the two read-surface methods.
 *
 * This is the vocabulary to type a caught error's `seam` against when the
 * error can come from either surface.
 */
export type Seam = ProviderSeam | ReadSeam;

// These two code strings are declared here rather than imported from
// `@midnight-ntwrk/midnight-js-utils`, because that would invert the package
// layer order: `utils` sits below `types`, and `types` is the leaf every other
// package depends on (see ADR 0006). They must stay in step with
// PROVIDER_ERROR_CODES in `utils`, which is the registry `hasErrorCode`
// consults. What holds them in step is `src/test/proof-provider.test.ts`: it
// throws these errors and asserts the code against the `utils` registry, so
// the two copies drifting apart fails a test. Do not delete those assertions
// thinking they restate the constructor.
const V8_PAYLOAD_UNSUPPORTED = 'MIDNIGHT_JS_PR_V8_PAYLOAD_UNSUPPORTED';
const UNTAGGED_PAYLOAD = 'MIDNIGHT_JS_PR_UNTAGGED_PAYLOAD';
const SEAM_ERA_UNSUPPORTED = 'MIDNIGHT_JS_PR_SEAM_ERA_UNSUPPORTED';

/**
 * Thrown by a provider that only speaks the v9 ledger runtime when it is
 * handed the v8 arm of a versioned transaction payload — serialized,
 * tag-prefixed bytes instead of a live v9 transaction object.
 *
 * Which providers raise this, and why, differs — the distinction matters at the
 * point of failure:
 *
 * - `createProofProvider`, `createWalletProvider` and `createMidnightProvider`
 *   raise it PERMANENTLY. Each lifts a v9-only implementation into the
 *   version-tagged interface, so refusing the v8 arm is the adapter reporting
 *   what it actually wraps. Supply a `WalletProvider` or `MidnightProvider`
 *   implementing the interface directly to serve the v8 arm.
 * - Concrete providers may or may not implement it.
 *   `httpClientProofProvider` and `dappConnectorProofProvider` both DO, taking
 *   and returning serialized bytes; other implementations that have not been
 *   widened still raise this.
 *
 * So catching this does not mean "the framework cannot do it yet" — it means
 * the specific implementation on that seam does not serve the v8 arm.
 *
 * Lives in this package (rather than in each provider package) because the
 * payload union it rejects is defined here, on the provider interfaces every
 * implementation shares. Catch it via its stable `code`, using `hasErrorCode`
 * from `@midnight-ntwrk/midnight-js-utils`.
 */
export class V8PayloadUnsupportedError extends Error {
  readonly code = V8_PAYLOAD_UNSUPPORTED;

  /**
   * @param seam The provider method that received the payload.
   * @param byteLength Size of the rejected payload, recorded so a report of
   *                   this error says something about what arrived. `undefined`
   *                   when the payload's `txBytes` was missing or not a
   *                   `Uint8Array` — which the message states, because that
   *                   caller has a second problem worth knowing about.
   */
  constructor(
    readonly seam: ProviderSeam,
    readonly byteLength?: number
  ) {
    super(
      `${seam} received a v8-era transaction payload (serialized bytes${
        byteLength === undefined ? ', size unknown: txBytes was missing or not a Uint8Array' : `, ${byteLength} bytes`
      }), which this provider does not serve. ` +
        `The createProofProvider, createWalletProvider and createMidnightProvider adapters never serve the v8 arm: ` +
        `each lifts a v9-only implementation, so this is by design rather than a gap. ` +
        `Send the v9 arm of the payload ({ version: 'v9', tx }) on this seam, or use an implementation that serves ` +
        `v8 — httpClientProofProvider and dappConnectorProofProvider do so for proveTx, while balanceTx and submitTx ` +
        `need a WalletProvider or MidnightProvider written against the version-tagged interface directly.`
    );
    this.name = 'V8PayloadUnsupportedError';
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

/**
 * Thrown when a payload crossing a version-tagged seam carries no recognised
 * `version` discriminant — most often a transaction passed untagged, the shape
 * these seams took before 5.0.0.
 *
 * The seam types make this unrepresentable in TypeScript, so it is reachable
 * only from JavaScript, from a consumer compiled against a pre-5.0.0
 * `midnight-js-types`, or from a payload that crossed an untyped boundary.
 * It carries a `code` so a caller can tell this apart from an arbitrary crash.
 */
export class UntaggedPayloadError extends Error {
  readonly code = UNTAGGED_PAYLOAD;

  /** What the payload's `version` field actually held. */
  readonly received: string;

  /**
   * @param seam The method that received the payload. Typed as the full
   *             {@link Seam} vocabulary because this error is thrown from both
   *             the transaction seams and the read surface.
   * @param payload The offending payload. Only its `version` field is read;
   *                the payload's contents never reach the message.
   */
  constructor(
    readonly seam: Seam,
    payload: unknown
  ) {
    const received = describeVersion(payload);
    super(
      `${seam} received a transaction payload with no recognised 'version' discriminant (got: ${received}). ` +
        `Payloads cross this seam version-tagged: wrap a live v9 ledger transaction as ` +
        `{ version: 'v9', tx }, or v8-era serialized bytes as { version: 'v8', txBytes }.`
    );
    this.name = 'UntaggedPayloadError';
    this.received = received;
  }
}

/**
 * Thrown BEFORE an operation starts, when one of the three transaction seams
 * declares that it does not serve the ledger era that operation needs.
 *
 * This is a pre-flight refusal, not a payload rejection. It is raised by
 * `assertSeamsSupportEra` from the provider set alone — no payload has been
 * built, no proof has been requested — and it exists so that an operation whose
 * wallet cannot balance the result is refused before its proof is paid for,
 * rather than after.
 *
 * Distinct from {@link V8PayloadUnsupportedError} on purpose, and the two are
 * not interchangeable:
 *
 * - This error means the provider SAID SO, in `supportedEras`, before it was
 *   asked to do anything. The remedy is to wire a different provider.
 * - `V8PayloadUnsupportedError` means a payload reached a seam that will not
 *   take it. That remains the defence in depth: a declaration is a claim by the
 *   implementation, and nothing verifies it, so the narrowing at each seam still
 *   runs and still reports its own error when a declaration turns out to be
 *   wrong.
 *
 * Catch it via its stable `code`, using `hasErrorCode` from
 * `@midnight-ntwrk/midnight-js-utils`.
 */
export class SeamEraUnsupportedError extends Error {
  readonly code = SEAM_ERA_UNSUPPORTED;

  /**
   * @param seam The seam whose provider does not declare `era`. Reported in
   *             pipeline order, so this names the first seam the operation
   *             would have reached.
   * @param era The ledger era the operation needs every seam to serve.
   * @param declared What that provider does declare. An empty list is the
   *                 honest reading of a provider carrying no declaration at all
   *                 — which a JavaScript caller, or a consumer built against an
   *                 older `midnight-js-types`, really can supply.
   */
  constructor(
    readonly seam: ProviderSeam,
    readonly era: string,
    readonly declared: readonly string[]
  ) {
    super(
      `This operation runs on the ${era} ledger era, but the provider wired to ${seam} declares that it serves ` +
        `${declared.length === 0 ? 'no era at all' : declared.join(', ')}. ` +
        `Refused before any proof was requested, because a transaction this set cannot carry end to end is not ` +
        `worth proving. Wire a provider that serves ${era} on ${seam}, or run this operation on an era the ` +
        `whole set serves.`
    );
    this.name = 'SeamEraUnsupportedError';
  }
}

/**
 * An error describing an invalid protocol scheme.
 */
export class InvalidProtocolSchemeError extends Error {
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
export class ArtifactRuntimeVersionUnavailableError extends Error {
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
export class PrivateStateExportError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PrivateStateExportError';
  }
}

/**
 * An error thrown when exporting signing keys fails.
 */
export class SigningKeyExportError extends Error {
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
  | 'invalid_password'
  | 'unknown';

/**
 * Base error thrown when importing private states fails.
 */
export class PrivateStateImportError extends Error {
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
  constructor(message = 'Invalid export format') {
    super(message, 'invalid_format');
    this.name = 'InvalidExportFormatError';
  }
}

/**
 * Error thrown when the password supplied for an import operation does not
 * satisfy the password strength policy. Extends {@link PrivateStateImportError}
 * so callers can catch every import failure via a single base type, while the
 * `'invalid_password'` cause distinguishes a policy violation from a failed
 * decryption or malformed payload.
 */
export class ImportPasswordValidationError extends PrivateStateImportError {
  constructor(message: string) {
    super(message, 'invalid_password');
    this.name = 'ImportPasswordValidationError';
  }
}

/**
 * Error thrown when import conflicts with existing data and conflictStrategy is 'error'.
 */
export class ImportConflictError extends PrivateStateImportError {
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
