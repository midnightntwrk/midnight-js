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

import type { ApolloClient } from '@apollo/client/core';
import type { DocumentNode } from 'graphql';

import type { ApolloHandle } from '../transport';

/** The request shape the provider passes to both Apollo entry points. */
export type ApolloRequest = { readonly query: DocumentNode };

/** A stand-in for `ApolloClient.query`, resolving whatever the test supplies. */
export type QueryStub = (request: ApolloRequest) => Promise<unknown>;

/**
 * A stand-in for `ApolloClient.watchQuery`. The real return type is Apollo's
 * `ObservableQuery`, a class with private fields; the provider only ever pipes
 * it, so an observable-shaped value is enough.
 */
export type WatchQueryStub = (request: ApolloRequest) => unknown;

/**
 * Builds an {@link ApolloHandle} around stubbed client entry points.
 *
 * `ApolloClient` is a class with private fields and invariant generics, so a
 * structural stub cannot be written as a plain value of that type — injecting
 * a custom ApolloLink into the provider's internal client construction is the
 * only alternative, and that is a far larger seam than these tests need. The
 * narrowing is therefore done exactly once, here, so the suites themselves
 * stay free of assertions.
 *
 * `dispose` is a real no-op rather than a stub: nothing in these suites tears
 * a provider down, and a handle that cannot be disposed of at all would be a
 * worse stand-in than one that disposes of nothing.
 */
export const stubApolloHandle = (stubs: {
  readonly query?: QueryStub;
  readonly watchQuery?: WatchQueryStub;
}): ApolloHandle => {
  const client: Partial<ApolloClient> = {};
  if (stubs.query) {
    client.query = stubs.query as ApolloClient['query'];
  }
  if (stubs.watchQuery) {
    client.watchQuery = stubs.watchQuery as ApolloClient['watchQuery'];
  }
  return {
    client: client as ApolloClient,
    dispose: () => Promise.resolve()
  };
};
