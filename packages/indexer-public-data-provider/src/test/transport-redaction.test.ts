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

import { inspect } from 'node:util';

import { gql } from '@apollo/client/core';
import { afterEach, describe, expect, test, vi } from 'vitest';

const SECRET = 'SECRETTOKEN123';
const QUERY_URL = `https://midnight-mainnet.blockfrost.io/api/v0?project_id=${SECRET}`;
const SUBSCRIPTION_URL = `wss://midnight-mainnet.blockfrost.io/api/v0/ws?project_id=${SECRET}`;

class FetchError extends Error {
  readonly code = 'ENOTFOUND';
  constructor(message: string) {
    super(message);
    this.name = 'FetchError';
  }
}

const networkFailure = (): FetchError =>
  new FetchError(`request to ${QUERY_URL} failed, reason: getaddrinfo ENOTFOUND midnight-mainnet.blockfrost.io`);

const responseAt = (url: string, body: string, init: ResponseInit): Response => {
  const response = new Response(body, init);
  Object.defineProperty(response, 'url', { value: url });
  return response;
};

const fetchSpy = vi.hoisted(() => vi.fn());
vi.mock('cross-fetch', () => ({ default: fetchSpy }));

const queryThroughApollo = async (): Promise<unknown> => {
  vi.useFakeTimers();
  const { validateConfig } = await import('../config');
  const { createApolloClient } = await import('../transport');
  const { client } = createApolloClient(validateConfig({ queryURL: QUERY_URL, subscriptionURL: SUBSCRIPTION_URL }));
  const outcome = client.query({ query: gql`query { block { height } }` }).then(
    () => undefined,
    (error: unknown) => error
  );
  await vi.runAllTimersAsync();
  return outcome;
};

afterEach(() => {
  vi.useRealTimers();
  fetchSpy.mockReset();
});

describe('withRedactedUrlQueries — failed request', () => {
  test('removes the query string of a URL from the message and stack, keeping the same error', async () => {
    const { withRedactedUrlQueries } = await import('../transport');
    const failure = networkFailure();

    const result = withRedactedUrlQueries(vi.fn().mockRejectedValue(failure))(QUERY_URL);

    await expect(result).rejects.toBe(failure);
    expect(failure.message).toBe(
      'request to https://midnight-mainnet.blockfrost.io/api/v0?<redacted> failed, reason: getaddrinfo ENOTFOUND midnight-mainnet.blockfrost.io'
    );
    expect(failure.stack).not.toContain(SECRET);
    expect({ name: failure.name, code: failure.code }).toEqual({ name: 'FetchError', code: 'ENOTFOUND' });
  });

  test('redacts every URL in the message, whatever the case of its scheme', async () => {
    const { withRedactedUrlQueries } = await import('../transport');
    const failure = new Error(`redirect from HTTPS://a.io/x?project_id=${SECRET}#top to wss://b.io/y?key=${SECRET}`);

    await withRedactedUrlQueries(vi.fn().mockRejectedValue(failure))(QUERY_URL).catch(() => undefined);

    expect(failure.message).toBe('redirect from HTTPS://a.io/x?<redacted> to wss://b.io/y?<redacted>');
  });

  test('rethrows an abort DOMException unchanged', async () => {
    const { withRedactedUrlQueries } = await import('../transport');
    const abort = new DOMException('This operation was aborted', 'AbortError');

    const result = withRedactedUrlQueries(vi.fn().mockRejectedValue(abort))(QUERY_URL);

    await expect(result).rejects.toBe(abort);
    expect({ name: abort.name, message: abort.message }).toEqual({
      name: 'AbortError',
      message: 'This operation was aborted'
    });
  });

  test('redacts a DOMException whose message cannot be assigned', async () => {
    const { withRedactedUrlQueries } = await import('../transport');
    const failure = new DOMException(`request to ${QUERY_URL} timed out`, 'TimeoutError');

    const result = withRedactedUrlQueries(vi.fn().mockRejectedValue(failure))(QUERY_URL);

    await expect(result).rejects.toBe(failure);
    expect(failure.message).toBe('request to https://midnight-mainnet.blockfrost.io/api/v0?<redacted> timed out');
  });
});

describe('withRedactedUrlQueries — response', () => {
  test('returns a response with the same status, headers and body but not the request URL', async () => {
    const { withRedactedUrlQueries } = await import('../transport');
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(responseAt(QUERY_URL, '{"error":"Forbidden"}', { status: 403, headers: { 'x-a': '1' } }));

    const response = await withRedactedUrlQueries(fetchImpl)(QUERY_URL, { method: 'POST' });

    expect(fetchImpl).toHaveBeenCalledWith(QUERY_URL, { method: 'POST' });
    expect(response.url).not.toContain(SECRET);
    expect({ status: response.status, header: response.headers.get('x-a'), body: await response.text() }).toEqual({
      status: 403,
      header: '1',
      body: '{"error":"Forbidden"}'
    });
  });

  test('passes a response without a body through as one without a body', async () => {
    const { withRedactedUrlQueries } = await import('../transport');
    const noContent = new Response(null, { status: 204 });
    Object.defineProperty(noContent, 'url', { value: QUERY_URL });
    const fetchImpl = vi.fn().mockResolvedValue(noContent);

    const response = await withRedactedUrlQueries(fetchImpl)(QUERY_URL);

    expect({ status: response.status, body: response.body }).toEqual({ status: 204, body: null });
  });
});

describe('createApolloClient — failed indexer request', () => {
  test('a network failure does not show the project token', async () => {
    fetchSpy.mockImplementation(() => Promise.reject(networkFailure()));

    const error = await queryThroughApollo();

    expect(fetchSpy).toHaveBeenCalledWith(QUERY_URL, expect.anything());
    expect(error).toBeInstanceOf(Error);
    expect(inspect(error, { depth: 10 })).toContain('?<redacted>');
    expect(inspect(error, { depth: 10 })).not.toContain(SECRET);
  });

  test('a refused request does not show the project token', async () => {
    fetchSpy.mockImplementation(() =>
      Promise.resolve(responseAt(QUERY_URL, '{"error":"Forbidden"}', { status: 403 }))
    );

    const error = await queryThroughApollo();

    expect(error).toHaveProperty('statusCode', 403);
    expect(inspect(error, { depth: 10 })).not.toContain(SECRET);
  });
});
