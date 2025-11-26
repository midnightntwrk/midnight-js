/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
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

import { Buffer } from 'buffer';
import { beforeAll,describe, expect, it } from 'vitest';

import { ensureSodiumReady, withZeroization,zeroizeBuffer, zeroizeString } from '../zeroize';

describe('zeroize', () => {
  beforeAll(async () => {
    await ensureSodiumReady();
  });

  describe('zeroizeBuffer', () => {
    it('should zeroize buffer contents', () => {
      const buffer = Buffer.from('sensitive data', 'utf-8');
      const originalLength = buffer.length;

      zeroizeBuffer(buffer);

      expect(buffer.length).toBe(originalLength);
      expect(buffer.every((byte) => byte === 0)).toBe(true);
    });

    it('should zeroize Uint8Array contents', () => {
      const array = new Uint8Array([1, 2, 3, 4, 5]);
      const originalLength = array.length;

      zeroizeBuffer(array);

      expect(array.length).toBe(originalLength);
      expect(array.every((byte) => byte === 0)).toBe(true);
    });

    it('should handle empty buffer', () => {
      const buffer = Buffer.from('');

      expect(() => zeroizeBuffer(buffer)).not.toThrow();
      expect(buffer.length).toBe(0);
    });

    it('should handle large buffers', () => {
      const largeBuffer = Buffer.alloc(1024 * 1024);
      largeBuffer.fill(0xff);

      zeroizeBuffer(largeBuffer);

      expect(largeBuffer.every((byte) => byte === 0)).toBe(true);
    });
  });

  describe('zeroizeString', () => {
    it('should handle string zeroization', () => {
      const str = 'sensitive password';

      expect(() => zeroizeString(str)).not.toThrow();
    });

    it('should handle empty string', () => {
      const str = '';

      expect(() => zeroizeString(str)).not.toThrow();
    });
  });

  describe('withZeroization', () => {
    it('should execute function and zeroize buffer afterward', async () => {
      const buffer = Buffer.from('secret key', 'utf-8');
      let capturedValue: string | undefined;

      await withZeroization(buffer, async (buf) => {
        capturedValue = buf.toString('utf-8');
      });

      expect(capturedValue).toBe('secret key');
      expect(buffer.every((byte) => byte === 0)).toBe(true);
    });

    it('should zeroize buffer even when function throws', async () => {
      const buffer = Buffer.from('secret data', 'utf-8');

      await expect(
        withZeroization(buffer, async () => {
          throw new Error('Processing failed');
        })
      ).rejects.toThrow('Processing failed');

      expect(buffer.every((byte) => byte === 0)).toBe(true);
    });

    it('should return function result', async () => {
      const buffer = Buffer.from('input data', 'utf-8');

      const result = await withZeroization(buffer, async (buf) => {
        return buf.length * 2;
      });

      expect(result).toBe(20);
      expect(buffer.every((byte) => byte === 0)).toBe(true);
    });

    it('should handle async operations correctly', async () => {
      const buffer = Buffer.from('async test', 'utf-8');
      let processedData: string | undefined;

      await withZeroization(buffer, async (buf) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        processedData = buf.toString('utf-8').toUpperCase();
      });

      expect(processedData).toBe('ASYNC TEST');
      expect(buffer.every((byte) => byte === 0)).toBe(true);
    });
  });
});
