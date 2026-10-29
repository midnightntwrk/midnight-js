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

import { gql } from '@apollo/client/core';
import { afterEach, describe, expect, test, vi } from 'vitest';

const SECRET = 'SECRETTOKEN123';
const QUERY_URL = `https://midnight-mainnet.blockfrost.io/api/v0?project_id=${SECRET}`;

class FetchError extends Error {
  readonly code = 'ENOTFOUND';
  constructor(message: string) {
    super(message);
    this.name = 'FetchError';
  }
}

const networkFailure = (): FetchError =>
  new FetchError(`request to ${QUERY_URL} failed, reason: getaddrinfo ENOTFOUND midnight-mainnet.blockfrost.io`);

const fetchSpy = vi.hoisted(() => vi.fn());
vi.mock('cross-fetch', () => ({ default: fetchSpy }));

const textOf = (error: unknown): string => {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; current instanceof Error && depth < 5; depth++) {
    parts.push(current.message, current.stack ?? '');
    current = current.cause;
  }
  return parts.join('\n');
};

afterEach(() => {
  vi.useRealTimers();
  fetchSpy.mockReset();
});

describe('withRedactedUrlQueries', () => {
  test('removes the query string of a URL from the message and stack of a failed request', async () => {
    const { withRedactedUrlQueries } = await import('../transport');
    const failure = networkFailure();
    const fetchImpl = vi.fn().mockRejectedValue(failure);

    const result = withRedactedUrlQueries(fetchImpl)(QUERY_URL);

    await expect(result).rejects.toBe(failure);
    expect(failure.message).toBe(
      'request to https://midnight-mainnet.blockfrost.io/api/v0?<redacted> failed, reason: getaddrinfo ENOTFOUND midnight-mainnet.blockfrost.io'
    );
    expect(failure.stack).not.toContain(SECRET);
    expect(failure.name).toBe('FetchError');
    expect(failure.code).toBe('ENOTFOUND');
  });

  test('returns the response of a successful request unchanged', async () => {
    const { withRedactedUrlQueries } = await import('../transport');
    const response = new Response('{}');
    const fetchImpl = vi.fn().mockResolvedValue(response);

    const result = await withRedactedUrlQueries(fetchImpl)(QUERY_URL, { method: 'POST' });

    expect(result).toBe(response);
    expect(fetchImpl).toHaveBeenCalledWith(QUERY_URL, { method: 'POST' });
  });
});

describe('createApolloClient — failed indexer request', () => {
  test('rejects a query without the project token in the error', async () => {
    vi.useFakeTimers();
    fetchSpy.mockImplementation(() => Promise.reject(networkFailure()));
    const { validateConfig } = await import('../config');
    const { createApolloClient } = await import('../transport');
    const { client } = createApolloClient(
      validateConfig({
        queryURL: QUERY_URL,
        subscriptionURL: `wss://midnight-mainnet.blockfrost.io/api/v0/ws?project_id=${SECRET}`
      })
    );

    const outcome = client.query({ query: gql`query { block { height } }` }).then(
      () => undefined,
      (error: unknown) => error
    );
    await vi.runAllTimersAsync();
    const error = await outcome;

    expect(error).toBeInstanceOf(Error);
    expect(fetchSpy).toHaveBeenCalled();
    expect(textOf(error)).toContain('?<redacted>');
    expect(textOf(error)).not.toContain(SECRET);
  });
});
