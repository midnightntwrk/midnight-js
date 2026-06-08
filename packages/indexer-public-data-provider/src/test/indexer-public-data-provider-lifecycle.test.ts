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

import type { PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const wsClientDisposeSpy = vi.fn(() => Promise.resolve());
const createClientSpy = vi.fn(() => ({
  dispose: wsClientDisposeSpy,
  terminate: vi.fn(),
  subscribe: vi.fn(),
  on: vi.fn(),
  iterate: vi.fn()
}));

vi.mock('graphql-ws', () => ({
  createClient: createClientSpy
}));

beforeEach(() => {
  wsClientDisposeSpy.mockClear();
  createClientSpy.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

const queryURL = 'http://localhost:4000/api/v1/graphql';
const subscriptionURL = 'ws://localhost:4000/api/v1/graphql/ws';

describe('indexerPublicDataProvider — config-object overload', () => {
  test('accepts IndexerProviderConfig and returns an object satisfying PublicDataProvider with dispose()', async () => {
    const { indexerPublicDataProvider } = await import('..');

    const provider = indexerPublicDataProvider({ queryURL, subscriptionURL });

    expect(typeof provider.queryContractState).toBe('function');
    expect(typeof provider.contractStateObservable).toBe('function');
    expect(typeof provider.dispose).toBe('function');
  });

  test('positional overload still works (backward compatibility)', async () => {
    const { indexerPublicDataProvider } = await import('..');

    const provider = indexerPublicDataProvider(queryURL, subscriptionURL);

    expect(typeof provider.queryContractState).toBe('function');
    expect(typeof provider.dispose).toBe('function');
  });

  test('dispose() resolves and closes the WebSocket client exactly once', async () => {
    const { indexerPublicDataProvider } = await import('..');
    const provider = indexerPublicDataProvider({ queryURL, subscriptionURL });

    await provider.dispose();

    expect(wsClientDisposeSpy).toHaveBeenCalledTimes(1);
  });

  test('dispose() is idempotent', async () => {
    const { indexerPublicDataProvider } = await import('..');
    const provider = indexerPublicDataProvider({ queryURL, subscriptionURL });

    await provider.dispose();
    await provider.dispose();
    await provider.dispose();

    expect(wsClientDisposeSpy).toHaveBeenCalledTimes(1);
  });

  test('positional overload propagates URL validation error', async () => {
    const { indexerPublicDataProvider } = await import('..');

    expect(() => indexerPublicDataProvider('invalid-url', subscriptionURL)).toThrow('Invalid URL');
  });

  test('custom pollInterval reaches Apollo watchQuery (end-to-end threading)', async () => {
    const { IndexerPublicDataProvider } = await import('../provider');
    const { validateConfig } = await import('../config');
    const { createApolloClient } = await import('../transport');
    const customPollInterval = 7777;
    const validated = validateConfig({ queryURL, subscriptionURL, pollInterval: customPollInterval });
    const handle = createApolloClient(validated);
    const provider = new IndexerPublicDataProvider(handle, validated.pollInterval);
    const watchQuerySpy = vi.spyOn(handle.client, 'watchQuery').mockImplementationOnce(() => {
      throw new Error('intentional short-circuit before observable subscribe');
    });

    const fakeTxId = '00'.repeat(32) as unknown as Parameters<typeof provider.watchForTxData>[0];
    try {
      await provider.watchForTxData(fakeTxId);
    } catch {
      // expected — the mocked watchQuery short-circuits before any data flows
    }

    expect(watchQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({ pollInterval: customPollInterval })
    );

    await provider.dispose();
  });

  test('provider value is assignable to PublicDataProvider (type-level)', async () => {
    const { indexerPublicDataProvider } = await import('..');

    const provider = indexerPublicDataProvider({ queryURL, subscriptionURL });
    // Compile-time check: the returned value must satisfy PublicDataProvider.
    const asInterface: PublicDataProvider = provider;

    expect(asInterface).toBe(provider);
  });
});
