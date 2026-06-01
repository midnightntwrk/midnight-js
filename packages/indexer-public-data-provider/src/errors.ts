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
 * An error describing the causes of error that occurred during server-side execution of
 * a query against the Indexer.
 */
export class IndexerFormattedError extends IndexerError {
  /**
   * @param cause An array of GraphQL errors that occurred during the server-side execution.
   */
  constructor(public readonly cause: readonly GraphQLFormattedError[]) {
    const formatted = cause.map((c, idx) => `${idx + 1}. ${c.message}`).join('\n\t');
    super(`Indexer GraphQL error(s):\n\t${formatted}`);
    this.name = 'IndexerFormattedError';
  }
}

/**
 * An error raised when an Apollo query or fetch returns a transport-level or
 * GraphQL-level error. Preserves the original Apollo error via {@link Error.cause}
 * so consumers can inspect network details, GraphQL errors, and the original stack.
 */
export class IndexerQueryError extends IndexerError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'IndexerQueryError';
  }
}
