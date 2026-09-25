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

import type { ApolloHandle } from '../transport';

const wsClientDisposeSpy = vi.fn(() => Promise.resolve());
const wsClientTerminateSpy = vi.fn();
const createClientSpy = vi.fn(() => ({
  dispose: wsClientDisposeSpy,
  terminate: wsClientTerminateSpy,
  subscribe: vi.fn(),
  on: vi.fn(),
  iterate: vi.fn()
}));

// Only `createClient` is replaced: `CloseCode` and `TerminatedCloseEvent` are read
// back by the close-code suite and must stay the library's own values.
vi.mock('graphql-ws', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, createClient: createClientSpy };
});

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
    closed?: (event: unknown) => void;
    message?: (message: unknown) => void;
    ping?: (received: boolean) => void;
    pong?: (received: boolean) => void;
  };
};

const lastClientOptions = (): LivenessOptions =>
  (createClientSpy.mock.calls.at(-1) as unknown as [LivenessOptions])[0];

const buildHandle = async (): Promise<ApolloHandle> => {
  const { validateConfig } = await import('../config');
  const { createApolloClient } = await import('../transport');
  return createApolloClient(
    validateConfig({
      queryURL: 'http://localhost:4000/graphql',
      subscriptionURL: 'ws://localhost:4000/graphql/ws'
    })
  );
};

const fakeSocket = (): { readyState: number; close: ReturnType<typeof vi.fn> } => ({
  readyState: 1,
  close: vi.fn()
});

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
      const { PONG_TIMEOUT_CLOSE_CODE } = await import('../transport');
      const { on } = lastClientOptions();
      const socket = fakeSocket();

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
      const socket = fakeSocket();
      expect(on?.ping).toBeTypeOf('function');
      expect(on?.pong).toBeTypeOf('function');

      on?.connected?.(socket);
      on?.ping?.(false);
      expect(vi.getTimerCount()).toBe(1);
      on?.pong?.(true);

      expect(vi.getTimerCount()).toBe(0);
      vi.advanceTimersByTime(60_000);
      expect(socket.close).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  test('leaves a socket open while any message is still arriving', async () => {
    vi.useFakeTimers();
    try {
      await buildHandle();
      const { on } = lastClientOptions();
      const socket = fakeSocket();
      expect(on?.message).toBeTypeOf('function');

      on?.connected?.(socket);
      on?.ping?.(false);
      on?.message?.({ type: 'next' });
      vi.advanceTimersByTime(60_000);

      expect(socket.close).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  test('closes the socket that went quiet, never the one that replaced it', async () => {
    vi.useFakeTimers();
    try {
      await buildHandle();
      const { on } = lastClientOptions();
      const abandoned = fakeSocket();
      const replacement = fakeSocket();

      on?.connected?.(abandoned);
      on?.ping?.(false);
      on?.connected?.(replacement);
      vi.advanceTimersByTime(60_000);

      expect(abandoned.close).toHaveBeenCalledTimes(1);
      expect(replacement.close).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  test('does not arm the deadline for a ping the server sent us', async () => {
    vi.useFakeTimers();
    try {
      await buildHandle();
      const { on } = lastClientOptions();
      const socket = fakeSocket();

      on?.connected?.(socket);
      on?.ping?.(true);
      vi.advanceTimersByTime(60_000);

      expect(socket.close).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  test('does not treat a pong we sent as proof the server is alive', async () => {
    vi.useFakeTimers();
    try {
      await buildHandle();
      const { PONG_TIMEOUT_CLOSE_CODE } = await import('../transport');
      const { on } = lastClientOptions();
      const socket = fakeSocket();

      on?.connected?.(socket);
      on?.ping?.(false);
      on?.pong?.(false);
      vi.advanceTimersByTime(60_000);

      expect(socket.close).toHaveBeenCalledWith(PONG_TIMEOUT_CLOSE_CODE, expect.any(String));
    } finally {
      vi.useRealTimers();
    }
  });

  test('rejects a WebSocket implementation that cannot be closed', async () => {
    await buildHandle();
    const { on } = lastClientOptions();

    expect(() => on?.connected?.({ readyState: 1 })).toThrow();
  });
});

describe('createApolloClient — liveness teardown', () => {
  test('clears a pending pong deadline when the socket closes', async () => {
    vi.useFakeTimers();
    try {
      await buildHandle();
      const { on } = lastClientOptions();
      const socket = fakeSocket();

      on?.connected?.(socket);
      on?.ping?.(false);
      on?.closed?.({ code: 1006 });

      expect(vi.getTimerCount()).toBe(0);
      vi.advanceTimersByTime(60_000);
      expect(socket.close).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  test('clears a pending pong deadline on dispose', async () => {
    vi.useFakeTimers();
    try {
      const handle = await buildHandle();
      const { on } = lastClientOptions();
      const socket = fakeSocket();

      on?.connected?.(socket);
      on?.ping?.(false);
      await handle.dispose();

      expect(vi.getTimerCount()).toBe(0);
      vi.advanceTimersByTime(60_000);
      expect(socket.close).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

/** The close codes `graphql-ws` names as fatal, read back from the library at run time. */
const FATAL_MEMBERS = [
  'InternalServerError',
  'InternalClientError',
  'BadRequest',
  'BadResponse',
  'Unauthorized',
  'SubprotocolNotAcceptable',
  'SubscriberAlreadyExists',
  'TooManyInitialisationRequests'
] as const;

/** The 1000-1999 codes `graphql-ws` does NOT treat as fatal. */
const RETRYABLE_INTERNAL_CODES = [1000, 1001, 1005, 1006, 1012, 1013, 1014];

const loadGraphqlWs = (): Promise<{
  CloseCode: Record<string, number>;
  TerminatedCloseEvent: new () => { code: number };
}> =>
  vi.importActual<{
    CloseCode: Record<string, number>;
    TerminatedCloseEvent: new () => { code: number };
  }>('graphql-ws');

const fatalCodesOf = (closeCode: Record<string, number>): number[] =>
  FATAL_MEMBERS.map((member) => closeCode[member] as number);

/** Mirrors `shouldRetryConnectOrThrow` plus `isFatalInternalCloseCode` in graphql-ws. */
const isFatal = (code: number, closeCode: Record<string, number>): boolean =>
  (code >= 1000 && code <= 1999 && !RETRYABLE_INTERNAL_CODES.includes(code)) ||
  fatalCodesOf(closeCode).includes(code);

describe('close codes', () => {
  test('the fatal members this suite checks against still exist in graphql-ws', async () => {
    const { CloseCode } = await loadGraphqlWs();

    expect(fatalCodesOf(CloseCode).every((code) => typeof code === 'number')).toBe(true);
  });

  test('the codes used for recoverable failures are ones graphql-ws retries', async () => {
    const { CloseCode } = await loadGraphqlWs();
    const { PONG_TIMEOUT_CLOSE_CODE } = await import('../transport');
    const { DEFLATE_DECODE_FAILURE_CLOSE_CODE } = await import('../deflate-websocket');

    expect(isFatal(PONG_TIMEOUT_CLOSE_CODE, CloseCode)).toBe(false);
    expect(isFatal(DEFLATE_DECODE_FAILURE_CLOSE_CODE, CloseCode)).toBe(false);
  });

  test('the code used to give up is one graphql-ws refuses to retry', async () => {
    const { CloseCode } = await loadGraphqlWs();
    const { DEFLATE_DECODE_GIVE_UP_CLOSE_CODE } = await import('../deflate-websocket');

    expect(isFatal(DEFLATE_DECODE_GIVE_UP_CLOSE_CODE, CloseCode)).toBe(true);
  });

  test('the decode-failure code is not the one graphql-ws closes frozen sockets with', async () => {
    const { TerminatedCloseEvent } = await loadGraphqlWs();
    const { DEFLATE_DECODE_FAILURE_CLOSE_CODE } = await import('../deflate-websocket');

    expect(DEFLATE_DECODE_FAILURE_CLOSE_CODE).not.toBe(new TerminatedCloseEvent().code);
  });
});
