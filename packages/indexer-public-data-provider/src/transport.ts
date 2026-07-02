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

import { ApolloClient, from, InMemoryCache, split } from '@apollo/client/core';
import { HttpLink } from '@apollo/client/link/http';
import { RetryLink } from '@apollo/client/link/retry';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import fetch from 'cross-fetch';
import { createClient } from 'graphql-ws';

import type { ValidatedConfig } from './config';
import { wrapWithDeflate } from './deflate-websocket';

/**
 * Resource-bearing handle that pairs the Apollo client with an idempotent
 * `dispose()` for releasing the underlying WebSocket connection.
 */
export type ApolloHandle = {
  readonly client: ApolloClient;
  /**
   * Stops the Apollo client (`client.stop()` is void in Apollo Client 4.x
   * — it unsubscribes active observables, rejects in-flight queries, and
   * clears the suspense cache; the `InMemoryCache` itself is not cleared),
   * then awaits the `graphql-ws` client's `dispose()` to close the
   * WebSocket connection.
   *
   * Repeated and concurrent invocations share a single teardown — they
   * return the same `Promise` and never re-run `client.stop()` or
   * `wsClient.dispose()`. If the first invocation rejects, subsequent
   * invocations return the same rejected `Promise` — teardown is not
   * retried.
   */
  dispose(): Promise<void>;
};

/**
 * Constructs the Apollo client used by the indexer public data provider.
 * Queries flow through an HTTP link wrapped in a retry link with exponential
 * backoff; subscriptions flow through a `graphql-ws` link. Operation kind
 * decides the split.
 *
 * Retry policy is intentionally hardcoded — exposing it as configuration
 * is out of scope for the Phase 1–2 restructure.
 */
export const createApolloClient = (validated: ValidatedConfig): ApolloHandle => {
  /**
   * `cross-fetch` resolves to `node-fetch` in Node (which sends
   * `Accept-Encoding: gzip,deflate` by default) and to the platform `fetch`
   * in browsers (which negotiates compression natively). This satisfies the
   * upcoming indexer 4.4.0 HTTP-response compression contract without any
   * configuration here. A unit test was attempted but cannot reliably
   * intercept `cross-fetch` because vitest's hoisted vi.mock('graphql-ws')
   * binds the transport-side cross-fetch import before any per-test
   * vi.doMock can intercept it, making the Accept-Encoding header
   * untestable without a full integration setup.
   */
  const httpLink = new HttpLink({ fetch, uri: validated.queryURLString });
  const retryLink = new RetryLink({
    delay: {
      initial: 1000,
      max: 10000,
      jitter: true
    },
    attempts: {
      max: 5
    }
  });
  const apolloLink = from([retryLink, httpLink]);

  const wsClient = createClient({
    url: validated.subscriptionURLString,
    // TODO(loggerProvider): forward provider's optional logger here once the indexer
    // public-data-provider factory accepts and threads loggerProvider through.
    webSocketImpl: wrapWithDeflate(validated.webSocket)
  });

  const client = new ApolloClient({
    link: split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
      },
      new GraphQLWsLink(wsClient),
      apolloLink
    ),
    cache: new InMemoryCache()
  });

  let disposePromise: Promise<void> | null = null;

  return {
    client,
    dispose(): Promise<void> {
      disposePromise ??= (async () => {
        client.stop();
        await wsClient.dispose();
      })();
      return disposePromise;
    }
  };
};
