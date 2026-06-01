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
 * and exposes the original array via {@link cause}.
 *
 * Transport-level and other Apollo failures are reported via {@link IndexerQueryError}.
 */
export class IndexerFormattedError extends IndexerError {
  /**
   * @param cause The GraphQL errors reported by the server.
   */
  constructor(public readonly cause: readonly GraphQLFormattedError[]) {
    const formatted = cause.map((c, idx) => `${idx + 1}. ${c.message}`).join('\n\t');
    super(`Indexer GraphQL error(s):\n\t${formatted}`);
    this.name = 'IndexerFormattedError';
  }
}

/**
 * An error raised when an Apollo query or fetch returns a transport-level or
 * GraphQL-level error. Preserves the original Apollo error via `Error.cause`
 * so consumers can inspect network details, GraphQL errors, and the original stack.
 */
export class IndexerQueryError extends IndexerError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'IndexerQueryError';
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
