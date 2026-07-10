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

import { deflateSync } from 'node:zlib';

import type * as ws from 'isomorphic-ws';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { DEFLATE_PROTOCOL, wrapWithDeflate } from '../deflate-websocket';

describe('wrapWithDeflate — subprotocol negotiation', () => {
  test('offers only the deflate protocol when no protocols argument is passed', () => {
    const baseCtor = vi.fn();
    class BaseWS extends EventTarget {
      constructor(url: string, protocols?: string | string[]) {
        super();
        baseCtor(url, protocols);
      }
    }
    const Wrapped = wrapWithDeflate(BaseWS as unknown as typeof ws.WebSocket);

    new Wrapped('ws://localhost/graphql/ws');

    expect(baseCtor).toHaveBeenCalledWith(
      'ws://localhost/graphql/ws',
      [DEFLATE_PROTOCOL]
    );
  });

  test('offers graphql-transport-ws+deflate FIRST when graphql-ws passes the standard protocol as a string', () => {
    const baseCtor = vi.fn();
    class BaseWS extends EventTarget {
      constructor(url: string, protocols?: string | string[]) {
        super();
        baseCtor(url, protocols);
      }
    }
    const Wrapped = wrapWithDeflate(BaseWS as unknown as typeof ws.WebSocket);

    new Wrapped('ws://localhost/graphql/ws', 'graphql-transport-ws');

    expect(baseCtor).toHaveBeenCalledWith(
      'ws://localhost/graphql/ws',
      [DEFLATE_PROTOCOL, 'graphql-transport-ws']
    );
  });

  test('preserves and dedupes when an array of protocols is passed', () => {
    const baseCtor = vi.fn();
    class BaseWS extends EventTarget {
      constructor(url: string, protocols?: string | string[]) {
        super();
        baseCtor(url, protocols);
      }
    }
    const Wrapped = wrapWithDeflate(BaseWS as unknown as typeof ws.WebSocket);

    new Wrapped('ws://localhost/graphql/ws', ['graphql-transport-ws', 'graphql-ws']);

    expect(baseCtor).toHaveBeenCalledWith(
      'ws://localhost/graphql/ws',
      [DEFLATE_PROTOCOL, 'graphql-transport-ws', 'graphql-ws']
    );
  });

  test('does NOT duplicate the deflate protocol if the caller already included it', () => {
    const baseCtor = vi.fn();
    class BaseWS extends EventTarget {
      constructor(url: string, protocols?: string | string[]) {
        super();
        baseCtor(url, protocols);
      }
    }
    const Wrapped = wrapWithDeflate(BaseWS as unknown as typeof ws.WebSocket);

    new Wrapped('ws://localhost/graphql/ws', [DEFLATE_PROTOCOL, 'graphql-transport-ws']);

    expect(baseCtor).toHaveBeenCalledWith(
      'ws://localhost/graphql/ws',
      [DEFLATE_PROTOCOL, 'graphql-transport-ws']
    );
  });
});

/**
 * Minimal EventTarget-based fake WebSocket. Tests dispatch `MessageEvent`s
 * directly via `__push()` to simulate server frames.
 *
 * `onmessage` is a true prototype-level accessor (getter + setter pair) so that
 * `inheritedOnmessage.set` inside `wrapWithDeflate` finds it and calls per-instance
 * writes. Each instance stores its installed handler in the hard-private `#installedOnmessage`
 * field, preventing cross-instance pollution.
 */
class FakeWS extends EventTarget {
  static OPEN = 1;
  url: string;
  protocols: string[];
  protocol = '';
  binaryType: 'blob' | 'arraybuffer' = 'blob';
  readyState = FakeWS.OPEN;
  onopen: ((ev: Event) => void) | null = null;

  /** Per-instance storage for whatever the wrapper installs via our prototype-level accessor. */
  #installedOnmessage: ((ev: MessageEvent) => void) | null = null;

  get onmessage(): ((ev: MessageEvent) => void) | null {
    return this.#installedOnmessage;
  }
  set onmessage(handler: ((ev: MessageEvent) => void) | null) {
    this.#installedOnmessage = handler;
  }

  constructor(url: string, protocols?: string | string[]) {
    super();
    this.url = url;
    this.protocols = protocols === undefined ? [] : Array.isArray(protocols) ? protocols : [protocols];
  }

  __push(data: string | ArrayBuffer | Uint8Array): void {
    const event = new MessageEvent('message', { data });
    this.dispatchEvent(event);
    // Use the hard-private slot (NOT `this.onmessage`) — `this.onmessage` would invoke
    // the WRAPPER's getter (returning the original user handler), which would bypass __deliver.
    this.#installedOnmessage?.(event);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  send(_: unknown): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  close(): void {}
}

describe('wrapWithDeflate — message delivery', () => {
  let Wrapped: typeof ws.WebSocket;

  beforeEach(() => {
    Wrapped = wrapWithDeflate(FakeWS as unknown as typeof ws.WebSocket);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Awaits the wrapper's internal delivery queue to flush all pending async inflate work.
  // The cast is intentional: __deliveryQueue is a private implementation detail accessed
  // here only for deterministic test awaiting (avoids arbitrary setTimeout delays).
  const flushDelivery = async (sock: FakeWS): Promise<void> => {
    // The wrapper's __deliveryQueue is replaced on each delivery, not mutated.
    // Awaiting the current reference flushes everything queued up to this point.
    await (sock as unknown as { __deliveryQueue: Promise<void> }).__deliveryQueue;
  };

  test('inflates binary frames when the +deflate protocol was negotiated (addEventListener path)', async () => {
    const sock = new Wrapped('ws://x', 'graphql-transport-ws') as unknown as FakeWS;
    sock.protocol = DEFLATE_PROTOCOL;
    const seen: unknown[] = [];
    sock.addEventListener('message', (ev) => seen.push((ev as MessageEvent).data));

    const payload = '{"type":"next","id":"1","payload":{"data":{"hello":"world"}}}';
    const compressed = deflateSync(Buffer.from(payload, 'utf8'));
    sock.__push(compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength));

    await flushDelivery(sock);
    expect(seen).toEqual([payload]);
  });

  test('inflates binary frames via the onmessage setter path', async () => {
    const sock = new Wrapped('ws://x', 'graphql-transport-ws') as unknown as FakeWS;
    sock.protocol = DEFLATE_PROTOCOL;
    const seen: unknown[] = [];
    sock.onmessage = (ev) => seen.push(ev.data);

    const payload = '{"type":"ping"}';
    const compressed = deflateSync(Buffer.from(payload, 'utf8'));
    sock.__push(compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength));

    await flushDelivery(sock);
    expect(seen).toEqual([payload]);
  });

  test('passes text frames through unchanged (server skipped compression on <256 B)', async () => {
    const sock = new Wrapped('ws://x', 'graphql-transport-ws') as unknown as FakeWS;
    sock.protocol = DEFLATE_PROTOCOL;
    const seen: unknown[] = [];
    sock.addEventListener('message', (ev) => seen.push((ev as MessageEvent).data));

    sock.__push('{"type":"pong"}');

    await flushDelivery(sock);
    expect(seen).toEqual(['{"type":"pong"}']);
  });

  test('preserves delivery order when text and binary frames interleave', async () => {
    const sock = new Wrapped('ws://x', 'graphql-transport-ws') as unknown as FakeWS;
    sock.protocol = DEFLATE_PROTOCOL;
    const seen: string[] = [];
    sock.addEventListener('message', (ev) => seen.push(String((ev as MessageEvent).data)));

    const firstBinary = deflateSync(Buffer.from('{"id":"1"}', 'utf8'));
    sock.__push(firstBinary.buffer.slice(firstBinary.byteOffset, firstBinary.byteOffset + firstBinary.byteLength));
    sock.__push('{"id":"2"}');
    const thirdBinary = deflateSync(Buffer.from('{"id":"3"}', 'utf8'));
    sock.__push(thirdBinary.buffer.slice(thirdBinary.byteOffset, thirdBinary.byteOffset + thirdBinary.byteLength));

    await flushDelivery(sock);
    expect(seen).toEqual(['{"id":"1"}', '{"id":"2"}', '{"id":"3"}']);
  });

  test('does NOT inflate when server fell back to plain graphql-transport-ws (fallback path)', async () => {
    const sock = new Wrapped('ws://x', 'graphql-transport-ws') as unknown as FakeWS;
    sock.protocol = 'graphql-transport-ws';
    const seen: unknown[] = [];
    sock.addEventListener('message', (ev) => seen.push((ev as MessageEvent).data));

    const buf = new Uint8Array([1, 2, 3]).buffer;
    sock.__push(buf);
    sock.__push('{"type":"pong"}');

    await flushDelivery(sock);
    expect(seen).toEqual([buf, '{"type":"pong"}']);
  });

  test('sets binaryType to arraybuffer (so we never receive a Blob in the browser)', () => {
    const sock = new Wrapped('ws://x', 'graphql-transport-ws') as unknown as FakeWS;

    expect(sock.binaryType).toBe('arraybuffer');
  });

  test('normalizes Node Buffer / Uint8Array binary payloads to ArrayBuffer before inflating', async () => {
    // The Node `ws` package may deliver binary frames as Buffer (a Uint8Array subclass)
    // regardless of binaryType — the wrapper must handle that, not just ArrayBuffer.
    const sock = new Wrapped('ws://x', 'graphql-transport-ws') as unknown as FakeWS;
    sock.protocol = DEFLATE_PROTOCOL;
    const seen: unknown[] = [];
    sock.addEventListener('message', (ev) => seen.push((ev as MessageEvent).data));

    const payload = '{"type":"next","id":"42"}';
    const compressed = deflateSync(Buffer.from(payload, 'utf8'));
    // Push the Buffer directly (NOT .buffer) — simulates ws-package behavior.
    sock.__push(compressed as unknown as ArrayBuffer);

    await flushDelivery(sock);
    expect(seen).toEqual([payload]);
  });

  test('drops a frame whose inflate throws and continues delivering subsequent frames (queue not poisoned, no unhandled rejection)', async () => {
    const sock = new Wrapped('ws://x', 'graphql-transport-ws') as unknown as FakeWS;
    sock.protocol = DEFLATE_PROTOCOL;
    const seen: unknown[] = [];
    sock.addEventListener('message', (ev) => seen.push((ev as MessageEvent).data));
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      // First frame: garbage that inflate will reject.
      const garbage = new Uint8Array([0xde, 0xad, 0xbe, 0xef]).buffer;
      sock.__push(garbage);
      // Second frame: a valid compressed payload that must still be delivered.
      const good = deflateSync(Buffer.from('{"id":"survives"}', 'utf8'));
      sock.__push(good.buffer.slice(good.byteOffset, good.byteOffset + good.byteLength));

      await flushDelivery(sock);
      expect(seen).toEqual(['{"id":"survives"}']);
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });

  test('drops queued frames delivered after the socket has closed (no unhandled rejection)', async () => {
    const sock = new Wrapped('ws://x', 'graphql-transport-ws') as unknown as FakeWS;
    sock.protocol = DEFLATE_PROTOCOL;
    const seen: unknown[] = [];
    sock.addEventListener('message', (ev) => seen.push((ev as MessageEvent).data));
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      const compressed = deflateSync(Buffer.from('{"id":"late"}', 'utf8'));
      sock.__push(compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength));
      // Synchronously emit close BEFORE the inflate promise resolves.
      sock.dispatchEvent(new Event('close'));

      await flushDelivery(sock);
      expect(seen).toEqual([]);
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });

  test('routes binary frames through EventListenerObject.handleEvent with correct `this` binding', async () => {
    const sock = new Wrapped('ws://x', 'graphql-transport-ws') as unknown as FakeWS;
    sock.protocol = DEFLATE_PROTOCOL;
    const seen: unknown[] = [];
    // Use a spy so vitest records the call's `this` context via `.mock.instances`.
    const listenerObj = {
      tag: 'expected-this-value' as const,
      handleEvent: vi.fn(function (ev: Event) {
        seen.push((ev as MessageEvent).data);
      })
    };
    sock.addEventListener('message', listenerObj);

    const payload = '{"type":"next","id":"object-listener"}';
    const compressed = deflateSync(Buffer.from(payload, 'utf8'));
    sock.__push(compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength));

    await flushDelivery(sock);
    expect(seen).toEqual([payload]);
    // `.mock.instances[0]` is the value of `this` at the time of the first call.
    expect(listenerObj.handleEvent.mock.instances[0]).toBe(listenerObj);
  });

  test('clears the installed onmessage when set to null', () => {
    const sock = new Wrapped('ws://x', 'graphql-transport-ws') as unknown as FakeWS;
    sock.onmessage = () => { /* placeholder */ };
    expect(sock.onmessage).not.toBeNull();

    sock.onmessage = null;

    expect(sock.onmessage).toBeNull();
  });

  test('isolates onmessage handlers across multiple wrapped instances (no prototype pollution)', async () => {
    const sock1 = new Wrapped('ws://x/1', 'graphql-transport-ws') as unknown as FakeWS;
    const sock2 = new Wrapped('ws://x/2', 'graphql-transport-ws') as unknown as FakeWS;
    sock1.protocol = DEFLATE_PROTOCOL;
    sock2.protocol = DEFLATE_PROTOCOL;

    const seen1: unknown[] = [];
    const seen2: unknown[] = [];
    sock1.onmessage = (ev) => seen1.push(ev.data);
    sock2.onmessage = (ev) => seen2.push(ev.data);

    // Setting sock2.onmessage MUST NOT overwrite sock1's installed handler.
    // Push the same compressed payload to each socket.
    const payload1 = '{"id":"1"}';
    const payload2 = '{"id":"2"}';
    const c1 = deflateSync(Buffer.from(payload1, 'utf8'));
    const c2 = deflateSync(Buffer.from(payload2, 'utf8'));
    sock1.__push(c1.buffer.slice(c1.byteOffset, c1.byteOffset + c1.byteLength));
    sock2.__push(c2.buffer.slice(c2.byteOffset, c2.byteOffset + c2.byteLength));

    await flushDelivery(sock1);
    await flushDelivery(sock2);
    expect(seen1).toEqual([payload1]);
    expect(seen2).toEqual([payload2]);
  });
});
