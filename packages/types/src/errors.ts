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

/**
 * Thrown by a provider that only speaks the v9 ledger runtime when it is
 * handed the v8 arm of a versioned transaction payload — serialized,
 * tag-prefixed bytes instead of a live v9 transaction object.
 *
 * This is transitional: the provider seams already carry both arms so that
 * callers can be written once, but handling of the v8 arm is not implemented
 * in these providers yet.
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
      }), which is not yet supported by this provider. ` +
        `Send the v9 arm of the payload ({ version: 'v9', tx }) on this seam, or route v8-era traffic to a provider ` +
        `that handles v8 payloads.`
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
