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

import { ApolloClient, from, InMemoryCache, split } from '@apollo/client/core';
import { HttpLink } from '@apollo/client/link/http';
import { RetryLink } from '@apollo/client/link/retry';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import fetch from 'cross-fetch';
import { createClient } from 'graphql-ws';

import type { ValidatedConfig } from './config';
import { wrapWithDeflate } from './deflate-websocket';
import { IndexerProviderConfigError } from './errors';

/** Interval between the client's keep-alive pings. */
const KEEP_ALIVE_INTERVAL_MS = 10_000;

/** How long a ping may go unanswered before the socket is treated as dead. */
const PONG_WAIT_MS = 5_000;

/** How long a socket may stay open without acknowledging the connection. */
const CONNECTION_ACK_WAIT_MS = 10_000;

/**
 * Close code for a socket that stopped answering pings. `graphql-ws` classifies
 * it as retryable, so the client reconnects instead of failing the stream.
 */
export const PONG_TIMEOUT_CLOSE_CODE = 4408;

/** The part of a live WebSocket the keep-alive recipe needs. */
type ClosableSocket = { close(code: number, reason: string): void };

const isClosableSocket = (socket: unknown): socket is ClosableSocket =>
  typeof socket === 'object' && socket !== null && 'close' in socket && typeof socket.close === 'function';

/**
 * A socket that cannot be closed cannot be kept alive either, and accepting one
 * would restore the half-open hang this keep-alive exists to end.
 */
const asClosableSocket = (socket: unknown): ClosableSocket => {
  if (!isClosableSocket(socket)) {
    throw new IndexerProviderConfigError(
      'The configured WebSocket implementation does not expose close(code, reason); ' +
      'the subscription keep-alive cannot work without it.'
    );
  }
  return socket;
};

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
   * `cross-fetch` resolves to `node-fetch` in Node and to the platform `fetch` in
   * browsers, both of which negotiate compression on their own. That is what
   * satisfies the indexer's HTTP-response compression contract with no configuration.
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

  let activeSocket: ClosableSocket | null = null;
  let pongTimer: ReturnType<typeof setTimeout> | undefined;
  const clearPongDeadline = (): void => {
    clearTimeout(pongTimer);
    pongTimer = undefined;
  };

  const wsClient = createClient({
    url: validated.subscriptionURLString,
    // TODO(loggerProvider): forward provider's optional logger here once the indexer
    // public-data-provider factory accepts and threads loggerProvider through.
    webSocketImpl: wrapWithDeflate(validated.webSocket),
    // A half-open socket produces no close event, so without these the subscription
    // waits for a server that is already gone and never reports anything.
    keepAlive: KEEP_ALIVE_INTERVAL_MS,
    connectionAckWaitTimeout: CONNECTION_ACK_WAIT_MS,
    on: {
      connected: (socket) => {
        activeSocket = asClosableSocket(socket);
      },
      closed: () => {
        clearPongDeadline();
        activeSocket = null;
      },
      // `received` distinguishes a message that arrived from one we sent, so only a
      // ping we sent starts a deadline and only a pong the server sent clears it.
      ping: (received) => {
        if (received) return;
        // Captured, not read at timeout: a reconnect in the meantime must not
        // cost the replacement socket its life.
        const pinged = activeSocket;
        pongTimer = setTimeout(() => pinged?.close(PONG_TIMEOUT_CLOSE_CODE, 'Pong timeout'), PONG_WAIT_MS);
      },
      pong: (received) => {
        if (received) clearPongDeadline();
      },
      // The pong reaches us behind every queued frame's inflate and deserialization,
      // so under a backlog it can miss its deadline on a socket that is plainly alive.
      // Any message at all is the proof of life the deadline is really asking for.
      message: () => clearPongDeadline()
    }
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
        clearPongDeadline();
        client.stop();
        await wsClient.dispose();
      })();
      return disposePromise;
    }
  };
};
