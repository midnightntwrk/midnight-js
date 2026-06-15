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

const decoder = new TextDecoder('utf-8', { fatal: true });

/**
 * Hard upper bound on a single inflated subscription frame. A malicious or
 * buggy indexer could exploit zlib's high compression ratio on uniform data
 * to send a small frame that expands gigabytes ("compression bomb").
 */
export const MAX_INFLATED_BYTES = 16 * 1024 * 1024;

/**
 * Inflate an RFC 1950 (zlib) compressed payload into its UTF-8 JSON string,
 * aborting if the inflated size exceeds {@link MAX_INFLATED_BYTES}.
 */
export const inflate = async (data: ArrayBuffer): Promise<string> => {
  if (typeof globalThis.DecompressionStream !== 'function') {
    throw new Error(
      'DecompressionStream is required for graphql-transport-ws+deflate subscriptions. ' +
      'Requires Node >= 18 or a browser shipped after March 2023 (Chrome 80, Firefox 113, Safari 16.4).'
    );
  }
  // 'deflate' in the Web Streams API means RFC 1950 (zlib envelope), not raw RFC 1951.
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate'));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_INFLATED_BYTES) {
      await reader.cancel();
      throw new Error(
        `Inflated payload exceeds MAX_INFLATED_BYTES (${MAX_INFLATED_BYTES} bytes); ` +
        'aborting (possible compression bomb).'
      );
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return decoder.decode(merged);
};
