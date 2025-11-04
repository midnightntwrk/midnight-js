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

import { indexerPublicDataProvider } from '../indexer-public-data-provider';

describe('indexerPublicDataProvider', () => {
  const queryURL = 'http://localhost:4000/api/v1/graphql';
  const subscriptionURL = 'ws://localhost:4000/api/v1/graphql/ws';
  const queryOrigin = 'http://localhost:4000';
  const subscriptionOriginWithWs = 'ws://localhost:4000/ws'; // this is how dapp connector provides indexerWsUri

  test('indexerPublicDataProvider should throw an error for invalid query URL', () => {
    expect(() => {
      indexerPublicDataProvider('invalid-url', subscriptionURL);
    }).toThrow('Invalid URL');
  });

  test('indexerPublicDataProvider should throw an error for invalid subscription URL', () => {
    expect(() => {
      indexerPublicDataProvider(queryURL, 'invalid-url');
    }).toThrow('Invalid URL');
  });

  test('indexerPublicDataProvider should throw an error for invalid query protocol', () => {
    expect(() => {
      indexerPublicDataProvider(subscriptionURL, subscriptionURL);
    }).toThrow("Invalid protocol scheme: 'ws:'. Allowable schemes are one of: http:,https:");
  });

  test('indexerPublicDataProvider should throw an error for invalid subscription protocol', () => {
    expect(() => {
      indexerPublicDataProvider(queryURL, queryURL);
    }).toThrow("Invalid protocol scheme: 'http:'. Allowable schemes are one of: ws:,wss:");
  });

  test('indexerPublicDataProvider should create a PublicDataProvider instance for subscriptionWithWs', () => {
    const provider = indexerPublicDataProvider(queryOrigin, subscriptionOriginWithWs);
    expect(provider).toBeDefined();
  });

  test('indexerPublicDataProvider should use the provided WebSocket implementation', () => {
    const provider = indexerPublicDataProvider(queryURL, subscriptionURL);
    expect(provider).toBeDefined();
  });
});
