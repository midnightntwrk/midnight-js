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

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { wrapWithDeflate } from '../deflate-websocket';

describe('wrapWithDeflate — subprotocol negotiation', () => {
  test('offers only the deflate protocol when no protocols argument is passed', () => {
    const baseCtor = vi.fn();
    class BaseWS {
      constructor(url: string, protocols?: string | string[]) {
        baseCtor(url, protocols);
      }
    }
    const Wrapped = wrapWithDeflate(BaseWS as unknown as typeof WebSocket);

    new Wrapped('ws://localhost/graphql/ws');

    expect(baseCtor).toHaveBeenCalledWith(
      'ws://localhost/graphql/ws',
      ['graphql-transport-ws+deflate']
    );
  });

  test('offers graphql-transport-ws+deflate FIRST when graphql-ws passes the standard protocol as a string', () => {
    const baseCtor = vi.fn();
    class BaseWS {
      constructor(url: string, protocols?: string | string[]) {
        baseCtor(url, protocols);
      }
    }
    const Wrapped = wrapWithDeflate(BaseWS as unknown as typeof WebSocket);

    new Wrapped('ws://localhost/graphql/ws', 'graphql-transport-ws');

    expect(baseCtor).toHaveBeenCalledWith(
      'ws://localhost/graphql/ws',
      ['graphql-transport-ws+deflate', 'graphql-transport-ws']
    );
  });

  test('preserves and dedupes when an array of protocols is passed', () => {
    const baseCtor = vi.fn();
    class BaseWS {
      constructor(url: string, protocols?: string | string[]) {
        baseCtor(url, protocols);
      }
    }
    const Wrapped = wrapWithDeflate(BaseWS as unknown as typeof WebSocket);

    new Wrapped('ws://localhost/graphql/ws', ['graphql-transport-ws', 'graphql-ws']);

    expect(baseCtor).toHaveBeenCalledWith(
      'ws://localhost/graphql/ws',
      ['graphql-transport-ws+deflate', 'graphql-transport-ws', 'graphql-ws']
    );
  });

  test('does NOT duplicate the deflate protocol if the caller already included it', () => {
    const baseCtor = vi.fn();
    class BaseWS {
      constructor(url: string, protocols?: string | string[]) {
        baseCtor(url, protocols);
      }
    }
    const Wrapped = wrapWithDeflate(BaseWS as unknown as typeof WebSocket);

    new Wrapped('ws://localhost/graphql/ws', ['graphql-transport-ws+deflate', 'graphql-transport-ws']);

    expect(baseCtor).toHaveBeenCalledWith(
      'ws://localhost/graphql/ws',
      ['graphql-transport-ws+deflate', 'graphql-transport-ws']
    );
  });
});

/**
 * Minimal EventTarget-based fake WebSocket. Tests dispatch `MessageEvent`s
 * directly via `__push()` to simulate server frames.
 *
 * `onmessage` is a prototype-level getter/setter (NOT a class-field instance
 * property) so that when `DeflateWebSocket`'s setter writes to
 * `FakeWS.prototype.onmessage` via `Object.getPrototypeOf(Object.getPrototypeOf(this))`,
 * the instance lookup in `__push` resolves to that prototype data property.
 */
class FakeWS extends EventTarget {
  static OPEN = 1;
  url: string;
  protocols: string[];
  protocol = '';
  binaryType: 'blob' | 'arraybuffer' = 'blob';
  readyState = FakeWS.OPEN;
  onopen: ((ev: Event) => void) | null = null;

  // onmessage is intentionally NOT a class field — it lives on the prototype
  // so that DeflateWebSocket's prototype-walk setter can store the wrapped
  // handler there and __push's `this.onmessage?.(event)` resolves to it.
  declare onmessage: ((ev: MessageEvent) => void) | null;

  constructor(url: string, protocols?: string | string[]) {
    super();
    this.url = url;
    this.protocols = protocols === undefined ? [] : Array.isArray(protocols) ? protocols : [protocols];
  }

  __push(data: string | ArrayBuffer | Uint8Array): void {
    const event = new MessageEvent('message', { data });
    this.dispatchEvent(event);
    this.onmessage?.(event);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  send(_: unknown): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  close(): void {}
}
// Initialize prototype-level onmessage to null so the property exists but
// is not an instance field (class fields would shadow the prototype slot).
FakeWS.prototype.onmessage = null;

describe('wrapWithDeflate — message delivery', () => {
  let Wrapped: typeof WebSocket;

  beforeEach(() => {
    Wrapped = wrapWithDeflate(FakeWS as unknown as typeof WebSocket) as unknown as typeof WebSocket;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Reset prototype-level onmessage so that one test's wrapped handler does
    // not bleed into the next test via FakeWS.__push's `this.onmessage?.(event)`.
    FakeWS.prototype.onmessage = null;
  });

  test('inflates binary frames when the +deflate protocol was negotiated (addEventListener path)', async () => {
    const sock = new Wrapped('ws://x', 'graphql-transport-ws') as unknown as FakeWS;
    sock.protocol = 'graphql-transport-ws+deflate';
    const seen: unknown[] = [];
    sock.addEventListener('message', (ev) => seen.push((ev as MessageEvent).data));

    const payload = '{"type":"next","id":"1","payload":{"data":{"hello":"world"}}}';
    const compressed = deflateSync(Buffer.from(payload, 'utf8'));
    sock.__push(compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength));

    await new Promise((r) => setTimeout(r, 20));
    expect(seen).toEqual([payload]);
  });

  test('inflates binary frames via the onmessage setter path', async () => {
    const sock = new Wrapped('ws://x', 'graphql-transport-ws') as unknown as FakeWS;
    sock.protocol = 'graphql-transport-ws+deflate';
    const seen: unknown[] = [];
    sock.onmessage = (ev) => seen.push(ev.data);

    const payload = '{"type":"ping"}';
    const compressed = deflateSync(Buffer.from(payload, 'utf8'));
    sock.__push(compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength));

    await new Promise((r) => setTimeout(r, 20));
    expect(seen).toEqual([payload]);
  });

  test('passes text frames through unchanged (server skipped compression on <256 B)', async () => {
    const sock = new Wrapped('ws://x', 'graphql-transport-ws') as unknown as FakeWS;
    sock.protocol = 'graphql-transport-ws+deflate';
    const seen: unknown[] = [];
    sock.addEventListener('message', (ev) => seen.push((ev as MessageEvent).data));

    sock.__push('{"type":"pong"}');

    await new Promise((r) => setTimeout(r, 0));
    expect(seen).toEqual(['{"type":"pong"}']);
  });

  test('preserves delivery order when text and binary frames interleave', async () => {
    const sock = new Wrapped('ws://x', 'graphql-transport-ws') as unknown as FakeWS;
    sock.protocol = 'graphql-transport-ws+deflate';
    const seen: string[] = [];
    sock.addEventListener('message', (ev) => seen.push(String((ev as MessageEvent).data)));

    const firstBinary = deflateSync(Buffer.from('{"id":"1"}', 'utf8'));
    sock.__push(firstBinary.buffer.slice(firstBinary.byteOffset, firstBinary.byteOffset + firstBinary.byteLength));
    sock.__push('{"id":"2"}');
    const thirdBinary = deflateSync(Buffer.from('{"id":"3"}', 'utf8'));
    sock.__push(thirdBinary.buffer.slice(thirdBinary.byteOffset, thirdBinary.byteOffset + thirdBinary.byteLength));

    await new Promise((r) => setTimeout(r, 50));
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

    await new Promise((r) => setTimeout(r, 0));
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
    sock.protocol = 'graphql-transport-ws+deflate';
    const seen: unknown[] = [];
    sock.addEventListener('message', (ev) => seen.push((ev as MessageEvent).data));

    const payload = '{"type":"next","id":"42"}';
    const compressed = deflateSync(Buffer.from(payload, 'utf8'));
    // Push the Buffer directly (NOT .buffer) — simulates ws-package behavior.
    sock.__push(compressed as unknown as ArrayBuffer);

    await new Promise((r) => setTimeout(r, 20));
    expect(seen).toEqual([payload]);
  });

  test('drops a frame whose inflate throws and continues delivering subsequent frames (queue not poisoned, no unhandled rejection)', async () => {
    const sock = new Wrapped('ws://x', 'graphql-transport-ws') as unknown as FakeWS;
    sock.protocol = 'graphql-transport-ws+deflate';
    const seen: unknown[] = [];
    sock.addEventListener('message', (ev) => seen.push((ev as MessageEvent).data));
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);

    // First frame: garbage that inflate will reject.
    const garbage = new Uint8Array([0xde, 0xad, 0xbe, 0xef]).buffer;
    sock.__push(garbage);
    // Second frame: a valid compressed payload that must still be delivered.
    const good = deflateSync(Buffer.from('{"id":"survives"}', 'utf8'));
    sock.__push(good.buffer.slice(good.byteOffset, good.byteOffset + good.byteLength));

    await new Promise((r) => setTimeout(r, 50));
    expect(seen).toEqual(['{"id":"survives"}']);
    expect(unhandled).not.toHaveBeenCalled();
    process.off('unhandledRejection', unhandled);
  });

  test('drops queued frames delivered after the socket has closed (no unhandled rejection)', async () => {
    const sock = new Wrapped('ws://x', 'graphql-transport-ws') as unknown as FakeWS;
    sock.protocol = 'graphql-transport-ws+deflate';
    const seen: unknown[] = [];
    sock.addEventListener('message', (ev) => seen.push((ev as MessageEvent).data));
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);

    const compressed = deflateSync(Buffer.from('{"id":"late"}', 'utf8'));
    sock.__push(compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength));
    // Synchronously emit close BEFORE the inflate promise resolves.
    sock.dispatchEvent(new Event('close'));

    await new Promise((r) => setTimeout(r, 20));
    expect(seen).toEqual([]);
    expect(unhandled).not.toHaveBeenCalled();
    process.off('unhandledRejection', unhandled);
  });
});
