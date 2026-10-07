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

import { MidnightJsError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { describe, expect, it } from 'vitest';

import {
  EraUnresolvableError,
  EraUnsupportedError,
  IndexerDataError,
  IndexerError,
  IndexerFormattedError,
  IndexerInvariantError,
  IndexerPayloadTooLargeError,
  IndexerProviderConfigError,
  IndexerQueryError,
  IndexerSubscriptionDataError
} from '../errors';

describe('indexer error classes', () => {
  it('IndexerError extends MidnightJsError, and so does every subclass', () => {
    const classes = [
      EraUnresolvableError,
      EraUnsupportedError,
      IndexerDataError,
      IndexerFormattedError,
      IndexerInvariantError,
      IndexerPayloadTooLargeError,
      IndexerProviderConfigError,
      IndexerQueryError,
      IndexerSubscriptionDataError
    ];

    expect(IndexerError.prototype instanceof MidnightJsError).toBe(true);
    expect(classes.filter((c) => !(c.prototype instanceof IndexerError)).map((c) => c.name)).toEqual([]);
  });

  it.each([
    [new IndexerFormattedError([{ message: 'bad' }]), 'MIDNIGHT_JS_PR_INDEXER_GRAPHQL_FAILED', 'ENVIRONMENT'],
    [new IndexerQueryError('down'), 'MIDNIGHT_JS_PR_INDEXER_QUERY_FAILED', 'TRANSIENT'],
    [IndexerDataError.missingHeadBlock(), 'MIDNIGHT_JS_PR_INDEXER_DATA_INVALID', 'INTEGRITY'],
    [new IndexerSubscriptionDataError('blocks'), 'MIDNIGHT_JS_PR_INDEXER_SUBSCRIPTION_DATA_INVALID', 'INTEGRITY'],
    [new IndexerProviderConfigError('bad'), 'MIDNIGHT_JS_PR_INDEXER_CONFIG_INVALID', 'USAGE'],
    [new IndexerInvariantError('bad'), 'MIDNIGHT_JS_PR_INDEXER_INVARIANT_VIOLATED', 'INTERNAL'],
    [new IndexerPayloadTooLargeError('big'), 'MIDNIGHT_JS_PR_INDEXER_PAYLOAD_TOO_LARGE', 'INTEGRITY'],
    [new EraUnsupportedError('watchForTxData', 'v9', 3), 'MIDNIGHT_JS_PR_ERA_UNSUPPORTED', 'ENVIRONMENT'],
    [
      new EraUnresolvableError('watchForTxData', 99, { cause: new Error('x') }),
      'MIDNIGHT_JS_PR_ERA_UNRESOLVABLE',
      'ENVIRONMENT'
    ]
  ] as const)('%s carries its code and category', (error, code, category) => {
    expect([error.code, error.category]).toEqual([code, category]);
  });
});
