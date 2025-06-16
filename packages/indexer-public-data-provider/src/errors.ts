// This file is part of MIDNIGHT-JS.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import type { GraphQLFormattedError } from 'graphql';

/**
 * An error describing the causes of error that occurred during server-side execution of
 * a query against the Indexer.
 */
export class IndexerFormattedError extends Error {
  /**
   * @param cause An array of GraphQL errors that occurred during the server-side execution.
   */
  constructor(public readonly cause: readonly GraphQLFormattedError[]) {
    super(
      `Indexer GraphQL error(s):\n${cause.reduce((acc, c, idx) => `${idx + 1}. ${c.message}:\n\t${acc}`, '')}`
    );
  }
}
