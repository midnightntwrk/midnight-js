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
import type * as ws from 'isomorphic-ws';

/**
 * Constructs the Apollo client used by the indexer public data provider.
 * Queries go through an HTTP link wrapped in a retry link with exponential
 * backoff; subscriptions go through a `graphql-ws` link. The split direction
 * is decided per operation by inspecting the GraphQL operation kind.
 *
 * Retry policy is intentionally hardcoded in this phase — exposing it via
 * configuration is out of scope for the Phase 1–2 restructure.
 */
export const createApolloClient = (
  queryURL: string,
  subscriptionURL: string,
  webSocketImpl: typeof ws.WebSocket
): ApolloClient => {
  const link = new HttpLink({ fetch, uri: queryURL });
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
  const apolloLink = from([retryLink, link]);

  return new ApolloClient({
    link: split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
      },
      new GraphQLWsLink(createClient({ url: subscriptionURL, webSocketImpl })),
      apolloLink
    ),
    cache: new InMemoryCache()
  });
};
