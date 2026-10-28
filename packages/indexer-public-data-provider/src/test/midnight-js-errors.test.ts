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
import { PROVIDER_ERROR_CATEGORIES } from '@midnight-ntwrk/midnight-js-types';
import { describe, expect, it } from 'vitest';

import {
  DecoderEraUnsupportedError,
  IndexerDataError,
  IndexerError,
  IndexerFormattedError,
  IndexerInvariantError,
  IndexerPayloadTooLargeError,
  IndexerProviderConfigError,
  IndexerQueryError,
  IndexerSubscriptionDataError,
  UnknownRecordEraError} from '../errors';
import * as errors from '../errors';

describe('indexer error classes', () => {
  const exported: unknown[] = Object.values(errors);
  const exportedClasses = exported.filter(
    (value): value is abstract new (...args: never[]) => Error => typeof value === 'function' && value.prototype instanceof Error
  );
  const instances: readonly [string, IndexerError][] = [
    ['IndexerFormattedError', new IndexerFormattedError([{ message: 'bad' }])],
    ['IndexerQueryError', new IndexerQueryError('down')],
    ['IndexerDataError', IndexerDataError.missingLatestBlock()],
    ['IndexerSubscriptionDataError', new IndexerSubscriptionDataError('blocks')],
    ['IndexerProviderConfigError', new IndexerProviderConfigError('bad')],
    ['IndexerInvariantError', new IndexerInvariantError('bad')],
    ['IndexerPayloadTooLargeError', new IndexerPayloadTooLargeError('big')],
    ['DecoderEraUnsupportedError', new DecoderEraUnsupportedError('watchForTxData', 'v9', 3)],
    ['UnknownRecordEraError', new UnknownRecordEraError('watchForTxData', 99, { cause: new Error('x') })]
  ];

  it('IndexerError extends MidnightJsError, and so does every exported subclass', () => {
    expect(IndexerError.prototype instanceof MidnightJsError).toBe(true);
    expect(
      exportedClasses.filter((c) => c !== IndexerError && !(c.prototype instanceof IndexerError)).map((c) => c.name)
    ).toEqual([]);
  });

  it('builds an instance of every concrete exported error class below', () => {
    const concrete = exportedClasses.map((c) => c.name).filter((name) => name !== 'IndexerError');

    expect(concrete.sort()).toEqual(instances.map(([name]) => name).sort());
  });

  it.each(instances)('%s carries the category the table gives its code', (_name, error) => {
    const category = Object.entries(PROVIDER_ERROR_CATEGORIES).find(([code]) => code === error.code)?.[1];

    expect(error.category).toBe(category);
  });

  it.each([
    [new IndexerFormattedError([{ message: 'bad' }]), 'MIDNIGHT_JS_PR_INDEXER_GRAPHQL_FAILED', 'ENVIRONMENT'],
    [new IndexerQueryError('down'), 'MIDNIGHT_JS_PR_INDEXER_QUERY_FAILED', 'TRANSIENT'],
    [IndexerDataError.missingLatestBlock(), 'MIDNIGHT_JS_PR_INDEXER_DATA_INVALID', 'INTEGRITY'],
    [new IndexerSubscriptionDataError('blocks'), 'MIDNIGHT_JS_PR_INDEXER_SUBSCRIPTION_DATA_INVALID', 'INTEGRITY'],
    [new IndexerProviderConfigError('bad'), 'MIDNIGHT_JS_PR_INDEXER_CONFIG_INVALID', 'USAGE'],
    [new IndexerInvariantError('bad'), 'MIDNIGHT_JS_PR_INDEXER_INVARIANT_VIOLATED', 'INTERNAL'],
    [new IndexerPayloadTooLargeError('big'), 'MIDNIGHT_JS_PR_INDEXER_PAYLOAD_TOO_LARGE', 'INTEGRITY'],
    [new DecoderEraUnsupportedError('watchForTxData', 'v9', 3), 'MIDNIGHT_JS_PR_DECODER_ERA_UNSUPPORTED', 'ENVIRONMENT'],
    [
      new UnknownRecordEraError('watchForTxData', 99, { cause: new Error('x') }),
      'MIDNIGHT_JS_PR_UNKNOWN_RECORD_ERA',
      'ENVIRONMENT'
    ]
  ] as const)('%s carries its code and category', (error, code, category) => {
    expect([error.code, error.category]).toEqual([code, category]);
  });

  it.each([
    ['DecoderEraUnsupportedError', new DecoderEraUnsupportedError('watchForDeployTxData', 'v9', 3)],
    ['UnknownRecordEraError', new UnknownRecordEraError('watchForDeployTxData', 99, { cause: new Error('x') })]
  ] as const)('%s reports the read method it was raised for as `method`', (_name, error) => {
    expect([error.method, 'seam' in error]).toEqual(['watchForDeployTxData', false]);
  });
});

describe('IndexerDataError messages a dApp developer reads', () => {
  const MAINTAINER_JARGON = /envelope|\bhead\b|\baxis\b|down-?convert|dual-instantiation|shared-instance/i;

  it.each([
    ['missing-latest-block', IndexerDataError.missingLatestBlock()],
    ['era-disagreement', IndexerDataError.eraDisagreement(2_000_000, 'v8', 'v9')],
    ['mixed-era-public-states', IndexerDataError.mixedEraPublicStates('v8', 'v9')]
  ] as const)('uses no maintainer jargon: %s', (_kind, error) => {
    expect(error.message).not.toMatch(MAINTAINER_JARGON);
  });

  it.each([
    ['missing-latest-block', IndexerDataError.missingLatestBlock()],
    ['era-disagreement', IndexerDataError.eraDisagreement(2_000_000, 'v8', 'v9')]
  ] as const)('names no context kind or field in maintainer jargon: %s', (_kind, error) => {
    const vocabulary = Object.entries(error.context).flatMap(([key, value]: [string, unknown]) =>
      typeof value === 'string' ? [key, value] : [key]
    );

    expect(vocabulary.filter((word) => /envelope|head/i.test(word))).toEqual([]);
  });
});
