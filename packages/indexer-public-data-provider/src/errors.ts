/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import type { GraphQLFormattedError } from 'graphql';

/**
 * Base class for all errors raised by the indexer public data provider.
 * Consumers can catch any indexer error with a single `instanceof IndexerError` check.
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
  | { kind: 'missing-contract-action'; contractAddress: string }
  | {
      kind: 'missing-identifier';
      contractAddress: string;
      actionIndex: number;
      identifiersLength: number;
    };

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

  private static formatMessage(context: IndexerDataErrorContext): string {
    switch (context.kind) {
      case 'unknown-status':
        return `Unexpected transaction status value: ${context.value}`;
      case 'missing-contract-action':
        return `Deploy transaction does not contain a contract action for address ${context.contractAddress}`;
      case 'missing-identifier':
        return (
          `Transaction missing identifier for contract action at address ${context.contractAddress}` +
          ` (actionIndex=${context.actionIndex}, identifiers.length=${context.identifiersLength})`
        );
    }
  }
}

/**
 * Subscription payload fields the indexer provider depends on.
 * Narrowing this to a literal union prevents typos at throw sites and
 * documents the exhaustive set of fields the provider currently reads.
 */
export type IndexerSubscriptionField = 'blocks' | 'contractActions';

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
