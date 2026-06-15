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

import { inflate } from './inflate';

const DEFLATE_PROTOCOL = 'graphql-transport-ws+deflate';

const offerDeflate = (protocols?: string | string[]): string[] => {
  const requested = protocols === undefined
    ? []
    : Array.isArray(protocols) ? protocols : [protocols];
  return requested.includes(DEFLATE_PROTOCOL)
    ? requested
    : [DEFLATE_PROTOCOL, ...requested];
};

/**
 * Normalize a binary WebSocket payload to ArrayBuffer.
 *
 * The browser native `WebSocket` with `binaryType = 'arraybuffer'` delivers
 * `ArrayBuffer`. The Node `ws` package can deliver `Buffer` (a `Uint8Array`
 * subclass) regardless of `binaryType` for some receive paths, so we accept
 * any `ArrayBufferView` and produce a tightly-sliced `ArrayBuffer`.
 *
 * Returns `null` for non-binary inputs (string, anything else) so the
 * caller can treat them as passthrough.
 */
const toArrayBuffer = (data: unknown): ArrayBuffer | null => {
  if (data instanceof ArrayBuffer) return data;
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    // Narrow against SharedArrayBuffer — we never expect shared-backed frames
    // from a WebSocket, and slicing into a fresh ArrayBuffer requires the input
    // backing to be a plain ArrayBuffer.
    if (view.buffer instanceof ArrayBuffer) {
      return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
    }
  }
  return null;
};

export const wrapWithDeflate = (Base: typeof ws.WebSocket): typeof ws.WebSocket => {
  /**
   * NOTE for future maintainers: the returned class uses a fixed two-level
   * prototype walk in its `onmessage` accessor to route writes through the
   * base WebSocket's slot. **Do not subclass `DeflateWebSocket`** — wrapping
   * it again will silently route `onmessage` writes to the wrong prototype
   * and the inflate side of the wire will stop functioning. If composition
   * is needed, instead invoke `wrapWithDeflate` once on the outermost base.
   */
  return class DeflateWebSocket extends (Base as unknown as typeof WebSocket) {
    /** Serializes async inflate so binary frames cannot overtake later text frames. */
    private __deliveryQueue: Promise<void> = Promise.resolve();
    /** Set to true on `close` — gates pending deliveries to avoid post-teardown work. */
    private __closed = false;

    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, offerDeflate(protocols));
      this.binaryType = 'arraybuffer';
      // Use the base class's listener slot — we don't want close handling to
      // route through our own addEventListener override.
      // Guard: some test stubs extend plain classes without addEventListener.
      if (typeof super.addEventListener === 'function') {
        super.addEventListener('close', () => {
          this.__closed = true;
          // Swallow any pending inflate rejections to prevent unhandled rejections
          // surfacing after consumers have already torn down.
          this.__deliveryQueue = this.__deliveryQueue.catch(() => undefined);
        });
      }
    }

    private __deliver(listener: (ev: MessageEvent) => void, original: MessageEvent): void {
      const binary = this.protocol === DEFLATE_PROTOCOL ? toArrayBuffer(original.data) : null;
      if (binary !== null) {
        this.__deliveryQueue = this.__deliveryQueue.then(async () => {
          if (this.__closed) return;
          let text: string;
          try {
            text = await inflate(binary);
          } catch {
            // Single malformed or oversized frame — drop it but keep the queue alive.
            // graphql-ws will reconnect if the stream is genuinely broken.
            return;
          }
          if (this.__closed) return;
          listener(new MessageEvent('message', { data: text }));
        });
      } else {
        this.__deliveryQueue = this.__deliveryQueue.then(() => {
          if (this.__closed) return;
          listener(original);
        });
      }
    }

    addEventListener<K extends keyof WebSocketEventMap>(
      type: K,
      listener: ((this: WebSocket, ev: WebSocketEventMap[K]) => unknown) | EventListenerObject | null,
      options?: boolean | AddEventListenerOptions
    ): void {
      if (type === 'message' && listener !== null) {
        const invoke = typeof listener === 'function'
          ? (ev: MessageEvent): void => { (listener as (ev: MessageEvent) => unknown)(ev); }
          : (ev: MessageEvent): void => { (listener as EventListenerObject).handleEvent(ev); };
        const wrapped = (ev: Event): void => {
          this.__deliver(invoke, ev as MessageEvent);
        };
        super.addEventListener(type, wrapped as EventListener, options);
        return;
      }
      super.addEventListener(type, listener as EventListener, options);
    }

    override set onmessage(handler: ((this: WebSocket, ev: MessageEvent) => unknown) | null) {
      const base = Object.getPrototypeOf(Object.getPrototypeOf(this)) as { onmessage: typeof handler };
      if (handler === null) {
        base.onmessage = null;
        return;
      }
      base.onmessage = (ev: MessageEvent): void => {
        this.__deliver(handler as (ev: MessageEvent) => void, ev);
      };
    }

    override get onmessage(): ((this: WebSocket, ev: MessageEvent) => unknown) | null {
      const base = Object.getPrototypeOf(Object.getPrototypeOf(this)) as { onmessage: ((this: WebSocket, ev: MessageEvent) => unknown) | null };
      return base.onmessage;
    }
  } as unknown as typeof ws.WebSocket;
};
