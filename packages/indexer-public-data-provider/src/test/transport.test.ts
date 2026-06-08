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

import type * as ws from 'isomorphic-ws';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const wsClientDisposeSpy = vi.fn(() => Promise.resolve());
const wsClientTerminateSpy = vi.fn();
const createClientSpy = vi.fn(() => ({
  dispose: wsClientDisposeSpy,
  terminate: wsClientTerminateSpy,
  subscribe: vi.fn(),
  on: vi.fn(),
  iterate: vi.fn()
}));

vi.mock('graphql-ws', () => ({
  createClient: createClientSpy
}));

beforeEach(() => {
  wsClientDisposeSpy.mockClear();
  wsClientTerminateSpy.mockClear();
  createClientSpy.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('createApolloClient — handle shape', () => {
  test('returns { client, dispose } from a ValidatedConfig', async () => {
    const { validateConfig } = await import('../config');
    const { createApolloClient } = await import('../transport');
    const validated = validateConfig({
      queryURL: 'http://localhost:4000/graphql',
      subscriptionURL: 'ws://localhost:4000/graphql/ws'
    });

    const handle = createApolloClient(validated);

    expect(handle.client).toBeDefined();
    expect(typeof handle.dispose).toBe('function');
  });

  test('forwards custom webSocket implementation to graphql-ws createClient', async () => {
    const { validateConfig } = await import('../config');
    const { createApolloClient } = await import('../transport');
    class CustomWS {}
    const validated = validateConfig({
      queryURL: 'http://localhost:4000/graphql',
      subscriptionURL: 'ws://localhost:4000/graphql/ws',
      webSocket: CustomWS as unknown as typeof ws.WebSocket
    });

    createApolloClient(validated);

    expect(createClientSpy).toHaveBeenCalledWith(
      expect.objectContaining({ webSocketImpl: CustomWS })
    );
  });
});

describe('createApolloClient — dispose lifecycle', () => {
  test('dispose calls client.stop() and awaits wsClient.dispose() in that order', async () => {
    const { validateConfig } = await import('../config');
    const { createApolloClient } = await import('../transport');
    const validated = validateConfig({
      queryURL: 'http://localhost:4000/graphql',
      subscriptionURL: 'ws://localhost:4000/graphql/ws'
    });
    const handle = createApolloClient(validated);
    const stopSpy = vi.spyOn(handle.client, 'stop');

    await handle.dispose();

    expect(stopSpy).toHaveBeenCalledTimes(1);
    expect(wsClientDisposeSpy).toHaveBeenCalledTimes(1);
    const stopOrder = stopSpy.mock.invocationCallOrder[0];
    const disposeOrder = wsClientDisposeSpy.mock.invocationCallOrder[0];
    expect(stopOrder).toBeDefined();
    expect(disposeOrder).toBeDefined();
    expect(stopOrder).toBeLessThan(disposeOrder);
  });

  test('second dispose call is a no-op (idempotent)', async () => {
    const { validateConfig } = await import('../config');
    const { createApolloClient } = await import('../transport');
    const validated = validateConfig({
      queryURL: 'http://localhost:4000/graphql',
      subscriptionURL: 'ws://localhost:4000/graphql/ws'
    });
    const handle = createApolloClient(validated);
    const stopSpy = vi.spyOn(handle.client, 'stop');

    await handle.dispose();
    await handle.dispose();

    expect(stopSpy).toHaveBeenCalledTimes(1);
    expect(wsClientDisposeSpy).toHaveBeenCalledTimes(1);
  });

  test('concurrent dispose calls share a single tear-down', async () => {
    const { validateConfig } = await import('../config');
    const { createApolloClient } = await import('../transport');
    const validated = validateConfig({
      queryURL: 'http://localhost:4000/graphql',
      subscriptionURL: 'ws://localhost:4000/graphql/ws'
    });
    const handle = createApolloClient(validated);
    const stopSpy = vi.spyOn(handle.client, 'stop');

    await Promise.all([handle.dispose(), handle.dispose(), handle.dispose()]);

    expect(stopSpy).toHaveBeenCalledTimes(1);
    expect(wsClientDisposeSpy).toHaveBeenCalledTimes(1);
  });

  test('failed dispose is not retried — subsequent calls return the same rejection', async () => {
    wsClientDisposeSpy.mockRejectedValueOnce(new Error('ws closed unexpectedly'));
    const { validateConfig } = await import('../config');
    const { createApolloClient } = await import('../transport');
    const validated = validateConfig({
      queryURL: 'http://localhost:4000/graphql',
      subscriptionURL: 'ws://localhost:4000/graphql/ws'
    });
    const handle = createApolloClient(validated);
    const stopSpy = vi.spyOn(handle.client, 'stop');

    await expect(handle.dispose()).rejects.toThrow('ws closed unexpectedly');
    await expect(handle.dispose()).rejects.toThrow('ws closed unexpectedly');

    expect(stopSpy).toHaveBeenCalledTimes(1);
    expect(wsClientDisposeSpy).toHaveBeenCalledTimes(1);
  });
});
