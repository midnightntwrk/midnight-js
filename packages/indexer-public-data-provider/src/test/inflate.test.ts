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

import { describe, expect, test, vi } from 'vitest';

import { inflate } from '../inflate';

describe('inflate', () => {
  test('inflate() throws if DecompressionStream is missing at call time', async () => {
    vi.stubGlobal('DecompressionStream', undefined);
    try {
      await expect(inflate(new ArrayBuffer(0))).rejects.toThrow(/DecompressionStream is required/);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test('round-trips a JSON payload compressed in RFC 1950 (zlib) format', async () => {
    const payload = JSON.stringify({ type: 'next', id: '1', payload: { data: { foo: 'bar' } } });
    const compressed = deflateSync(Buffer.from(payload, 'utf8'));

    const result = await inflate(
      compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength)
    );

    expect(result).toBe(payload);
  });

  test('round-trips a 4 KiB repetitive payload (>3x compression ratio)', async () => {
    const payload = JSON.stringify({ data: { items: Array.from({ length: 200 }, (_, i) => ({ id: i, type: 'BlockUpdate' })) } });
    const compressed = deflateSync(Buffer.from(payload, 'utf8'));
    expect(compressed.byteLength).toBeLessThan(payload.length / 3);

    const result = await inflate(
      compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength)
    );

    expect(result).toBe(payload);
  });

  test('rejects on malformed input with a zlib data error', async () => {
    const garbage = new Uint8Array([0xde, 0xad, 0xbe, 0xef]).buffer;

    await expect(inflate(garbage)).rejects.toThrow(TypeError);
    await expect(inflate(garbage)).rejects.toMatchObject({ cause: expect.objectContaining({ code: 'Z_DATA_ERROR' }) });
  });

  test('rejects when the inflated payload exceeds MAX_INFLATED_BYTES (compression-bomb guard)', async () => {
    // 16 MiB + 1 byte of zeros compresses to ~16 KiB — a classic zip-bomb shape.
    const bomb = Buffer.alloc(16 * 1024 * 1024 + 1, 0);
    const compressed = deflateSync(bomb);

    await expect(
      inflate(compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength))
    ).rejects.toThrow(/exceeds.*MAX_INFLATED_BYTES|compression bomb/i);
  });
});
