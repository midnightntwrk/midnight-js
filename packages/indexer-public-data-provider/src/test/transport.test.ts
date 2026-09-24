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

import type * as ws from 'isomorphic-ws';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { DEFLATE_DECODE_FAILURE_CLOSE_CODE } from '../deflate-websocket';

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

  test('passes a deflate-wrapped WebSocket implementation to graphql-ws createClient', async () => {
    const { validateConfig } = await import('../config');
    const { createApolloClient } = await import('../transport');
    class CustomWS {}
    const validated = validateConfig({
      queryURL: 'http://localhost:4000/graphql',
      subscriptionURL: 'ws://localhost:4000/graphql/ws',
      webSocket: CustomWS as unknown as typeof ws.WebSocket
    });

    createApolloClient(validated);

    const lastCall = createClientSpy.mock.calls.at(-1) as [{ webSocketImpl: new (...args: unknown[]) => unknown }] | undefined;
    const passed = lastCall?.[0].webSocketImpl;
    expect(passed).toBeDefined();
    expect(passed).not.toBe(CustomWS);
    // Wrapper is a subclass of the user-supplied class:
    expect(Object.getPrototypeOf(passed)).toBe(CustomWS);
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

/**
 * The subset of `graphql-ws` client options this suite drives. The real option
 * type is not exported in a form a mock call can be read back as.
 */
type LivenessOptions = {
  keepAlive?: number;
  connectionAckWaitTimeout?: number;
  on?: {
    connected?: (socket: unknown) => void;
    ping?: (received: boolean) => void;
    pong?: (received: boolean) => void;
  };
};

/** The `graphql-ws` close codes documented as fatal, named so a typo fails the build. */
type FatalCloseCodes = Record<
  | 'InternalServerError'
  | 'InternalClientError'
  | 'BadRequest'
  | 'BadResponse'
  | 'Unauthorized'
  | 'SubprotocolNotAcceptable'
  | 'SubscriberAlreadyExists'
  | 'TooManyInitialisationRequests',
  number
>;

const lastClientOptions = (): LivenessOptions =>
  (createClientSpy.mock.calls.at(-1) as unknown as [LivenessOptions])[0];

const buildHandle = async (): Promise<void> => {
  const { validateConfig } = await import('../config');
  const { createApolloClient } = await import('../transport');
  createApolloClient(
    validateConfig({
      queryURL: 'http://localhost:4000/graphql',
      subscriptionURL: 'ws://localhost:4000/graphql/ws'
    })
  );
};

describe('createApolloClient — WebSocket liveness', () => {
  test('pings the server on an interval so a silent socket can be discovered', async () => {
    await buildHandle();

    expect(lastClientOptions().keepAlive).toBeGreaterThan(0);
  });

  test('bounds the wait for the connection acknowledgement', async () => {
    await buildHandle();

    expect(lastClientOptions().connectionAckWaitTimeout).toBeGreaterThan(0);
  });

  test('closes a socket that does not answer a ping', async () => {
    vi.useFakeTimers();
    try {
      await buildHandle();
      const { on } = lastClientOptions();
      const socket = { readyState: 1, close: vi.fn() };

      const { PONG_TIMEOUT_CLOSE_CODE } = await import('../transport');

      on?.connected?.(socket);
      on?.ping?.(false);
      vi.advanceTimersByTime(60_000);

      expect(socket.close).toHaveBeenCalledTimes(1);
      expect(socket.close).toHaveBeenCalledWith(PONG_TIMEOUT_CLOSE_CODE, expect.any(String));
    } finally {
      vi.useRealTimers();
    }
  });

  test('leaves a socket open when the pong arrives', async () => {
    vi.useFakeTimers();
    try {
      await buildHandle();
      const { on } = lastClientOptions();
      const socket = { readyState: 1, close: vi.fn() };

      on?.connected?.(socket);
      on?.ping?.(false);
      on?.pong?.(true);
      vi.advanceTimersByTime(60_000);

      expect(socket.close).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  test('never closes a socket with a code graphql-ws treats as fatal', async () => {
    const { CloseCode } = await vi.importActual<{ CloseCode: FatalCloseCodes }>('graphql-ws');
    const { PONG_TIMEOUT_CLOSE_CODE } = await import('../transport');
    const fatal: number[] = [
      CloseCode.InternalServerError,
      CloseCode.InternalClientError,
      CloseCode.BadRequest,
      CloseCode.BadResponse,
      CloseCode.Unauthorized,
      CloseCode.SubprotocolNotAcceptable,
      CloseCode.SubscriberAlreadyExists,
      CloseCode.TooManyInitialisationRequests
    ];

    expect(fatal).not.toContain(PONG_TIMEOUT_CLOSE_CODE);
    expect(fatal).not.toContain(DEFLATE_DECODE_FAILURE_CLOSE_CODE);
  });
});
