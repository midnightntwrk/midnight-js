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

export const DEFLATE_PROTOCOL = 'graphql-transport-ws+deflate';

/** Minimal logger surface — compatible with Pino's `error(obj, msg)` shape and `console.error`. */
export type DeflateLogger = {
  warn?(message: string, context?: Record<string, unknown>): void;
};

const offerDeflate = (protocols?: string | string[]): string[] => {
  const requested = protocols === undefined
    ? []
    : Array.isArray(protocols) ? protocols : [protocols];
  return requested.includes(DEFLATE_PROTOCOL)
    ? requested
    : [DEFLATE_PROTOCOL, ...requested];
};

/**
 * Normalize any binary WebSocket frame payload to a plain `ArrayBuffer`.
 * Accepts native `ArrayBuffer` and any `ArrayBufferView` (e.g. `Uint8Array`,
 * `Buffer`) — narrowed against `SharedArrayBuffer` since the inflate stream
 * requires a non-shared backing. Returns `null` for non-binary inputs so the
 * caller can treat them as text passthrough.
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

export const wrapWithDeflate = <T extends typeof ws.WebSocket>(
  Base: T,
  logger?: DeflateLogger
): T => {
  // Capture the inherited onmessage accessor descriptor once at class-creation time.
  // This avoids walking the prototype chain on every setter call and — crucially —
  // lets us INVOKE the inherited setter (which has per-instance side-effects) rather
  // than overwriting a prototype slot (which would pollute all instances).
  const inheritedOnmessage = Object.getOwnPropertyDescriptor(
    (Base as unknown as typeof WebSocket).prototype,
    'onmessage'
  );

  /**
   * NOTE for future maintainers: the `onmessage` setter invokes the inherited
   * base accessor with `inheritedOnmessage.set.call(this, wrapped)` so that the
   * base's per-instance dispatch machinery is used. **Do not subclass
   * `DeflateWebSocket`** — wrapping it again will silently bypass the inflate
   * logic. If composition is needed, invoke `wrapWithDeflate` once on the
   * outermost base.
   */
  return class DeflateWebSocket extends (Base as unknown as typeof WebSocket) {
    /** Serializes async inflate so binary frames cannot overtake later text frames. */
    private __deliveryQueue: Promise<void> = Promise.resolve();
    private __closed = false;
    /** User-supplied onmessage handler (the one returned by `get onmessage`). */
    private __onmessage: ((this: WebSocket, ev: MessageEvent) => unknown) | null = null;

    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, offerDeflate(protocols));
      this.binaryType = 'arraybuffer';
      // Use the base class's listener slot — we don't want close handling to
      // route through our own addEventListener override.
      if (typeof super.addEventListener !== 'function') {
        throw new Error(
          'DeflateWebSocket: base WebSocket class must implement addEventListener. ' +
          `Received: ${typeof super.addEventListener}.`
        );
      }
      super.addEventListener('close', () => {
        this.__closed = true;
        // After close, the only expected rejection source is inflate() on already-queued
        // binary frames. Swallowing is intentional — the consumer has torn down; re-raising
        // would surface as an unhandled rejection. Inflate errors during live operation
        // are caught and logged at the call site below, not here.
        this.__deliveryQueue = this.__deliveryQueue.catch(() => undefined);
      });
    }

    private __deliver(listener: (ev: MessageEvent) => void, original: MessageEvent): void {
      const binary = this.protocol === DEFLATE_PROTOCOL ? toArrayBuffer(original.data) : null;
      if (binary !== null) {
        this.__deliveryQueue = this.__deliveryQueue.then(async () => {
          if (this.__closed) return;
          let text: string;
          try {
            text = await inflate(binary);
          } catch (err) {
            // Single malformed or oversized frame — drop it but keep the queue alive so
            // subsequent frames are not blocked. The underlying socket is unaffected, so
            // graphql-ws will NOT trigger a reconnect (its reconnect path fires on close /
            // error events, not frame-level decoding failures). If a server is systematically
            // misbehaving, the subscription will stall silently from the consumer's view —
            // surfacing the error through `logger` is the only diagnostic signal available.
            logger?.warn?.('deflate-websocket: inflate failed, dropping frame', {
              error: err instanceof Error ? err.message : String(err),
              code: err instanceof Error && 'cause' in err && err.cause instanceof Error && 'code' in err.cause
                ? (err.cause as { code?: unknown }).code
                : undefined
            });
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
          : (ev: MessageEvent): void => { (listener as EventListenerObject).handleEvent.call(listener, ev); };
        const wrapped = (ev: Event): void => {
          this.__deliver(invoke, ev as MessageEvent);
        };
        super.addEventListener(type, wrapped as EventListener, options);
        return;
      }
      super.addEventListener(type, listener as EventListener, options);
    }

    override get onmessage(): ((this: WebSocket, ev: MessageEvent) => unknown) | null {
      return this.__onmessage;
    }

    override set onmessage(handler: ((this: WebSocket, ev: MessageEvent) => unknown) | null) {
      this.__onmessage = handler;
      const wrapped: ((ev: MessageEvent) => void) | null = handler === null
        ? null
        : (ev: MessageEvent): void => {
            this.__deliver(handler as (ev: MessageEvent) => void, ev);
          };
      // Invoke the inherited accessor's setter with `this` = this instance,
      // so the base implementation's per-instance dispatch machinery is used.
      // No prototype writes here — each instance gets its own wrapped handler.
      if (inheritedOnmessage?.set) {
        inheritedOnmessage.set.call(this, wrapped);
      }
    }
  } as unknown as T;
};
