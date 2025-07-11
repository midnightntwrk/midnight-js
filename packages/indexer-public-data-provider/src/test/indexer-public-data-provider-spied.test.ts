/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
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

import { vi } from 'vitest';
import { WebSocket } from 'ws';

// Dynamically load the package to be able to mock its dependencies.
const mockLinkHttp = await import('@apollo/client/link/http/http.cjs');
const mockGraphqlWS = await import('graphql-ws');
const mockApolloCore = await import('@apollo/client/core/core.cjs');

// Define the mocks.
const mockCreateHttpLink = vi.fn();
const mockFrom = vi.fn();
const mockCreateClient = vi.fn();

// Mock the dependencies.
vi.doMock('graphql-ws', () => ({
  __esModule: true,
  ...mockGraphqlWS,
  createClient: mockCreateClient
}));

vi.doMock('@apollo/client/link/http/http.cjs', () => ({
  __esModule: true,
  ...mockLinkHttp,
  createHttpLink: mockCreateHttpLink
}));

vi.doMock('@apollo/client/core/core.cjs', () => ({
  __esModule: true,
  ...mockApolloCore,
  from: mockFrom
}));

// TODO: Rework the following tests. They're currently failing and will require some rework. Essentially it
// looks like the mock HTTP link will have to return some data because the internals of Apollo is now
// reading it.
describe.skip('indexerPublicDataProvider', () => {
  // Define the URLs and origins.
  const queryURL = 'http://localhost:4000/api/v1/graphql';
  const subscriptionURL = 'ws://localhost:4000/api/v1/graphql/ws';
  const queryOrigin = 'http://localhost:4000';
  const subscriptionWithWs = 'ws://localhost:4000/ws'; // this is how dapp connector provides indexerWsUri

  test('indexerPublicDataProvider should create a PublicDataProvider instance using fully qualified urls', async () => {
    // Dynamically load the function so jest can mock its dependencies.
    const { indexerPublicDataProvider } = await import('../indexer-public-data-provider');
    const provider = indexerPublicDataProvider(queryURL, subscriptionURL, WebSocket);
    expect(mockCreateHttpLink).toHaveBeenCalledWith(expect.objectContaining({ uri: queryURL }));
    expect(mockCreateClient).toHaveBeenCalledWith(expect.objectContaining({ url: subscriptionURL }));
    expect(provider).toBeDefined();
  });

  test('indexerPublicDataProvider should create a PublicDataProvider instance using origin urls with ws', async () => {
    // Dynamically load the function so jest can mock its dependencies.
    const { indexerPublicDataProvider } = await import('../indexer-public-data-provider');
    const provider = indexerPublicDataProvider(queryOrigin, subscriptionWithWs, WebSocket);
    expect(mockCreateHttpLink).toHaveBeenCalledWith(expect.objectContaining({ uri: queryURL }));
    expect(mockCreateClient).toHaveBeenCalledWith(expect.objectContaining({ url: subscriptionURL }));
    expect(provider).toBeDefined();
  });
});
