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

import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';
import type { ReadSeam } from '@midnight-ntwrk/midnight-js-types';
import { PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import type { GraphQLFormattedError } from 'graphql';

/**
 * Base class for the errors this provider raises itself. Consumers can catch
 * them with a single `instanceof IndexerError` check.
 *
 * Two failure classes deliberately escape that check, because both report
 * something that is not an indexer fault and wrapping them would hide what
 * they are:
 *
 * - `DeserializationError` (`@midnight-ntwrk/midnight-js-utils`) — bytes that
 *   will not decode. Predates the dual-decode read path and is unchanged by it.
 * - `Ledger8RuntimeMissingError`
 *   (`@midnight-ntwrk/midnight-js-protocol`) — the pre-fork ledger runtime
 *   could not be acquired for a v8-era record. That is an installation or
 *   bundling failure in the consumer's own dependency tree, not a bad record,
 *   and a caller who saw it as an `IndexerError` would go looking at the
 *   indexer.
 *
 * A consumer that needs to catch everything a read can raise should catch
 * broadly and branch, or match on `code` via `hasErrorCode` from
 * `@midnight-ntwrk/midnight-js-utils`.
 */
export abstract class IndexerError extends Error {}

/**
 * Raised when a GraphQL response includes one or more `GraphQLFormattedError`
 * entries. Aggregates all server-side errors into a single numbered message
 * and exposes the original array via {@link errors}.
 *
 * The field is named `errors` (not `cause`) because the standard ES2022
 * `Error.cause` slot is contractually a single underlying error, not a
 * peer collection. Reusing `cause` would confuse Node's `util.inspect`
 * causal chain, Sentry, and other structured loggers.
 *
 * Transport-level and other Apollo failures are reported via {@link IndexerQueryError}.
 */
export class IndexerFormattedError extends IndexerError {
  /**
   * @param errors The GraphQL errors reported by the server.
   */
  constructor(public readonly errors: readonly GraphQLFormattedError[]) {
    const formatted = errors.map((e, idx) => `${idx + 1}. ${e.message}`).join('\n\t');
    super(`Indexer GraphQL error(s):\n\t${formatted}`);
    this.name = 'IndexerFormattedError';
  }
}

/**
 * An error raised when an Apollo query or fetch fails at the transport layer
 * (network failure, malformed response, Apollo client error) — distinct from
 * the case where the server returns a well-formed response containing
 * `GraphQLFormattedError` entries, which is reported via
 * {@link IndexerFormattedError}.
 *
 * Preserves the original Apollo error via `Error.cause` so consumers can
 * inspect network details and the original stack.
 */
export class IndexerQueryError extends IndexerError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'IndexerQueryError';
  }
}

/**
 * Discriminated context describing the specific way indexer-returned data
 * failed to satisfy the provider's expectations. The `kind` tag lets
 * consumers branch on the failure mode without parsing the error message.
 */
export type IndexerDataErrorContext =
  | { kind: 'unknown-status'; value: string }
  | { kind: 'missing-head-block' }
  | { kind: 'undated-state' }
  | { kind: 'malformed-state-encoding' }
  | { kind: 'malformed-transaction-encoding' }
  | { kind: 'missing-contract-action'; contractAddress: string }
  | {
      kind: 'missing-identifier';
      contractAddress: string;
      actionIndex: number;
      identifiersLength: number;
    }
  | { kind: 'unknown-event-type'; typename: string }
  | { kind: 'missing-event-field'; typename: string; field: string }
  | { kind: 'unknown-address-kind'; typename: string; field: string; value: string }
  | {
      kind: 'era-disagreement';
      protocolVersion: number;
      reportedVersion: LedgerVersion;
      envelopeVersion: LedgerVersion;
    }
  | { kind: 'unsupported-decode-era'; version: LedgerVersion };

/**
 * An error raised when indexer-returned data is structurally inconsistent
 * with the provider's expectations: unknown enum values, broken referential
 * integrity between related rows, or missing relations the schema implies
 * should be present.
 *
 * Distinct from:
 * - {@link IndexerSubscriptionDataError} — missing top-level field on a
 *   subscription payload (server returned `null`/`undefined` for a field).
 * - {@link IndexerFormattedError} — errors the server explicitly returned
 *   as `GraphQLFormattedError` entries.
 * - {@link IndexerQueryError} — transport / Apollo failure before data is
 *   parsed.
 *
 * Construct via the static factory methods to ensure the message and
 * {@link context} stay in sync.
 */
export class IndexerDataError extends IndexerError {
  constructor(public readonly context: IndexerDataErrorContext) {
    super(IndexerDataError.formatMessage(context));
    this.name = 'IndexerDataError';
  }

  static unknownStatus(value: string): IndexerDataError {
    return new IndexerDataError({ kind: 'unknown-status', value });
  }

  static missingHeadBlock(): IndexerDataError {
    return new IndexerDataError({ kind: 'missing-head-block' });
  }

  static undatedState(): IndexerDataError {
    return new IndexerDataError({ kind: 'undated-state' });
  }

  static malformedStateEncoding(): IndexerDataError {
    return new IndexerDataError({ kind: 'malformed-state-encoding' });
  }

  static malformedTransactionEncoding(): IndexerDataError {
    return new IndexerDataError({ kind: 'malformed-transaction-encoding' });
  }

  static missingContractAction(contractAddress: string): IndexerDataError {
    return new IndexerDataError({ kind: 'missing-contract-action', contractAddress });
  }

  static missingIdentifier(
    contractAddress: string,
    actionIndex: number,
    identifiersLength: number
  ): IndexerDataError {
    return new IndexerDataError({
      kind: 'missing-identifier',
      contractAddress,
      actionIndex,
      identifiersLength
    });
  }

  static unknownEventType(typename: string): IndexerDataError {
    return new IndexerDataError({ kind: 'unknown-event-type', typename });
  }

  static missingEventField(typename: string, field: string): IndexerDataError {
    return new IndexerDataError({ kind: 'missing-event-field', typename, field });
  }

  static unknownAddressKind(typename: string, field: string, value: string): IndexerDataError {
    return new IndexerDataError({ kind: 'unknown-address-kind', typename, field, value });
  }

  static eraDisagreement(
    protocolVersion: number,
    reportedVersion: LedgerVersion,
    envelopeVersion: LedgerVersion
  ): IndexerDataError {
    return new IndexerDataError({ kind: 'era-disagreement', protocolVersion, reportedVersion, envelopeVersion });
  }

  static unsupportedDecodeEra(version: LedgerVersion): IndexerDataError {
    return new IndexerDataError({ kind: 'unsupported-decode-era', version });
  }

  private static formatMessage(context: IndexerDataErrorContext): string {
    switch (context.kind) {
      case 'unknown-status':
        return `Unexpected transaction status value: ${context.value}`;
      case 'malformed-state-encoding':
        return (
          'The indexer returned a contract state that is not a hex-encoded byte string. ' +
          'Check that the indexer and this client agree on the wire encoding, and retry against a healthy indexer.'
        );
      case 'malformed-transaction-encoding':
        return (
          'The indexer returned a transaction that is not a hex-encoded byte string. ' +
          'Check that the indexer and this client agree on the wire encoding, and retry against a healthy indexer.'
        );
      case 'missing-head-block':
        return (
          'The indexer returned no head block, so the network protocol version could not be read. ' +
          'Wait for the indexer to finish indexing at least one block, then retry.'
        );
      case 'undated-state':
        return (
          'The indexer served a contract state but no block to date it, so the ledger era of those bytes ' +
          'cannot be established. The state exists, so this is an inconsistent indexer rather than an absent ' +
          'contract. Retry against a healthy indexer.'
        );
      case 'missing-contract-action':
        return `Deploy transaction does not contain a contract action for address ${context.contractAddress}`;
      case 'missing-identifier':
        return (
          `Transaction missing identifier for contract action at address ${context.contractAddress}` +
          ` (actionIndex=${context.actionIndex}, identifiers.length=${context.identifiersLength})`
        );
      case 'unknown-event-type':
        return `Unknown contract event __typename: ${context.typename}`;
      case 'missing-event-field':
        return `Contract event ${context.typename} is missing required field '${context.field}'`;
      case 'unknown-address-kind':
        return `Contract event ${context.typename} field '${context.field}' has unknown address kind '${context.value}'`;
      case 'era-disagreement':
        return (
          `The indexer served a contract state whose envelope was written by ledger ${context.envelopeVersion}, ` +
          `but dated it to protocol version ${context.protocolVersion} (ledger ${context.reportedVersion}) — a ` +
          'block from before that runtime existed. A state cannot predate the runtime that wrote it, so the two ' +
          'answers cannot both be right. Retry against a healthy indexer; if it persists, the indexer is serving ' +
          'state and block data from different eras.'
        );
      case 'unsupported-decode-era':
        return (
          `The indexer served a contract state from ledger ${context.version}, which this read path cannot ` +
          'decode. Use `queryRawContractState` to obtain the bytes together with their era and decode them ' +
          'with the matching runtime.'
        );
    }
  }
}

/**
 * Subscription payload fields the indexer provider depends on.
 * Narrowing this to a literal union prevents typos at throw sites and
 * documents the exhaustive set of fields the provider currently reads.
 */
export type IndexerSubscriptionField = 'blocks' | 'contractActions' | 'contractEvents';

/**
 * An error raised when an indexer subscription payload is missing a field
 * the provider relies on. Carries the missing field name for diagnostics.
 */
export class IndexerSubscriptionDataError extends IndexerError {
  constructor(public readonly missingField: IndexerSubscriptionField) {
    super(`Expected '${missingField}' in indexer subscription data, got null/undefined`);
    this.name = 'IndexerSubscriptionDataError';
  }
}

/**
 * An error raised when the consumer passes a configuration that the indexer
 * provider does not support (e.g. an observable mode that cannot be served
 * by the indexer's query surface). Signals API misuse, not server-side
 * issues — separate semantic category from {@link IndexerDataError}.
 */
export class IndexerProviderConfigError extends IndexerError {
  constructor(message: string) {
    super(message);
    this.name = 'IndexerProviderConfigError';
  }
}

/**
 * An error raised when an upstream invariant the provider relies on does
 * not hold at runtime — for example, when an `Rx.filter` upstream is
 * expected to guarantee a non-empty array but the downstream `.map` still
 * sees an empty one. Distinct from {@link IndexerDataError} (well-formed
 * indexer payload that violates protocol-level expectations) and from
 * {@link IndexerSubscriptionDataError} (server returned a `null` for a
 * top-level subscription field) — `IndexerInvariantError` flags a bug in
 * the provider's pipeline composition, not in the data.
 */
export class IndexerInvariantError extends IndexerError {
  constructor(message: string) {
    super(message);
    this.name = 'IndexerInvariantError';
  }
}

/**
 * Raised when the era-keyed transaction decoder is asked for an era it has no
 * decoder for.
 *
 * A TypeScript caller cannot produce this: the era reaching
 * {@link decodeVersionedTransaction} is a `LedgerVersion`, and every member of
 * that union has a decoder — a missing one is a build failure, not a runtime
 * one. It exists for the untyped JavaScript consumers this package also serves,
 * where an era string threaded in from elsewhere would otherwise index the
 * decoder table and resolve an inherited `Object.prototype` member instead of
 * failing.
 *
 * `protocolVersion` is the raw integer the indexer reported, kept so a report
 * of this error identifies the network rather than only the era.
 */
export class EraUnsupportedError extends IndexerError {
  readonly code = PROVIDER_ERROR_CODES.ERA_UNSUPPORTED;

  /**
   * @param seam The read-surface method that resolved the era.
   * @param era The era the record resolved to.
   * @param protocolVersion The raw integer the indexer reported.
   * @param recordRef The record this happened on — a transaction id or a
   *                  contract address. A dApp holding several watches open
   *                  concurrently cannot otherwise tell which one rejected.
   */
  constructor(
    readonly seam: ReadSeam,
    readonly era: LedgerVersion,
    readonly protocolVersion: number,
    readonly recordRef?: string
  ) {
    // The era is NOT rendered as the one `protocolVersion` resolves to. The
    // only way to reach this class is a caller supplying an era this build has
    // no decoder for, so the two do not describe each other, and the old
    // phrasing ("read a record from the v7 ledger era (protocolVersion
    // 2000000)") read as a contradiction to the one consumer who ever sees it.
    super(
      `${seam} was asked to decode with ledger era '${era}', which this build has no decoder for` +
        `${recordRef === undefined ? '' : ` (record ${recordRef}, indexer-reported protocolVersion ${protocolVersion})`}` +
        `. This client decodes only the ledger eras it ships runtimes for. Pass an era this build supports, or ` +
        `upgrade to a release that knows this one.`
    );
    this.name = 'EraUnsupportedError';
  }
}

/**
 * Raised when a record's bytes will not decode on the runtime its own
 * `protocolVersion` selected.
 *
 * The era decides which runtime reads the bytes, and the two normally agree —
 * they come from the same indexer row. When they do not, the decoder rejects
 * the payload on its header tag, and that raw diagnosis on its own reads as a
 * dependency-version problem in the consumer's own dApp. It is not: both
 * runtimes are present and correct, and it is the record that is internally
 * inconsistent. Naming the era this read dispatched to is what tells those two
 * situations apart.
 *
 * Raised only where the deserialization layer's diagnosis actually IDENTIFIES
 * another vintage — a `version-mismatch` classification whose `direction` says
 * the data is older or newer than the code. That is a stricter test than the
 * classification alone, and deliberately so: the classifier's tag-header
 * pattern is permissive on the incoming tag, so empty, truncated and garbage
 * payloads all classify as `version-mismatch` while identifying no version at
 * all. Those propagate as the `DeserializationError` they are, and so does a
 * payload whose tag parses to the very version that was expected. Corruption is
 * therefore never reported as an era disagreement.
 *
 * The message renders the era, the raw `protocolVersion` and the record
 * reference, and never the payload or anything decoded from it. The runtime's
 * own diagnosis is preserved on `cause`.
 */
export class DecodeVersionMismatchError extends IndexerError {
  readonly code = PROVIDER_ERROR_CODES.DECODE_VERSION_MISMATCH;

  /**
   * @param seam The read-surface method that performed the decode.
   * @param era The era the record's `protocolVersion` dispatched the decode to.
   * @param protocolVersion The raw integer the indexer reported.
   * @param recordRef The record this happened on — a transaction id or a
   *                  contract address. Required, unlike on the two era
   *                  resolution errors: every decode is reached from a read
   *                  that knows which record it is serving.
   * @param options Carries the classified deserialization failure on `cause`.
   */
  constructor(
    readonly seam: ReadSeam,
    readonly era: LedgerVersion,
    readonly protocolVersion: number,
    readonly recordRef: string,
    options: { cause: unknown }
  ) {
    super(
      `${seam} read a record dated to the ${era} ledger era (protocolVersion ${protocolVersion}` +
        `, ${recordRef}), but its bytes did not decode on the ${era} ` +
        `runtime. The record contradicts itself, so this is an inconsistent indexer rather than a version ` +
        `mismatch in your dApp's dependencies. Retry against a healthy indexer; the runtime's own diagnosis ` +
        `is on \`cause\`.`,
      options
    );
    this.name = 'DecodeVersionMismatchError';
  }
}

/**
 * Raised when a record's `protocolVersion` maps to no ledger era at all —
 * a network outside the node major range this framework knows about, or a
 * value that is not a non-negative integer.
 *
 * Distinct from {@link EraUnsupportedError}, which reports an era string this
 * build has no decoder for — an era that was named, just not one of ours. Here
 * nothing was named: the integer maps to no era, so there is no era to report.
 * Distinct again from {@link DecodeVersionMismatchError}, where the era
 * resolved fine and it was the bytes that disagreed with it.
 *
 * Exists so that all three era failures reach a consumer through
 * `IndexerError`.
 * The underlying `UnknownProtocolVersionError` from
 * `@midnight-ntwrk/midnight-js-protocol` is preserved on `cause`.
 */
export class EraUnresolvableError extends IndexerError {
  readonly code = PROVIDER_ERROR_CODES.ERA_UNRESOLVABLE;

  /**
   * @param seam The read-surface method that attempted to resolve the era.
   * @param protocolVersion The raw value the indexer reported.
   * @param options Carries the originating error on `cause`.
   * @param recordRef The record this happened on, when known.
   */
  constructor(
    readonly seam: ReadSeam,
    readonly protocolVersion: number,
    options: { cause: unknown },
    readonly recordRef?: string
  ) {
    super(
      `${seam} read a record whose protocolVersion (${protocolVersion}) maps to no known ledger era` +
        `${recordRef === undefined ? '' : ` (${recordRef})`}. ` +
        `This framework maps node major versions 1 and 2; point this provider at a network in that range.`,
      options
    );
    this.name = 'EraUnresolvableError';
  }
}
