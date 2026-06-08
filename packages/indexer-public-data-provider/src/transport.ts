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

/**
 * Resource-bearing handle that pairs the Apollo client with an idempotent
 * `dispose()` for releasing the underlying WebSocket connection and
 * Apollo's in-memory state.
 */
export type ApolloHandle = {
  readonly client: ApolloClient;
  /**
   * Idempotent. Synchronously stops the Apollo client (`client.stop()` is
   * void in Apollo Client 4.x — it cancels in-flight operations and clears
   * the cache), then awaits the `graphql-ws` client's `dispose()` to close
   * the WebSocket. A second invocation is a no-op.
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
  const queryURL = validated.queryURL.toString();
  const subscriptionURL = validated.subscriptionURL.toString();

  const httpLink = new HttpLink({ fetch, uri: queryURL });
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

  const wsClient = createClient({ url: subscriptionURL, webSocketImpl: validated.webSocket });

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
