import { beforeEach,describe, expect, it, vi } from 'vitest';

import { RetryExhaustedError } from '../../src/errors/AdapterError.js';
import type { Logger,RetryConfig } from '../../src/types/contract-types.js';
import { withRetry } from '../../src/utils/retry-logic.js';

describe('retry-logic', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const config: RetryConfig = {
        maxRetries: 3,
        backoffMs: 100,
        exponentialBackoff: false
      };

      const result = await withRetry(operation, config, mockLogger);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const config: RetryConfig = {
        maxRetries: 3,
        backoffMs: 10,
        exponentialBackoff: false
      };

      const result = await withRetry(operation, config, mockLogger, 'test-op');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('succeeded after 2 retries')
      );
    });

    it('should throw RetryExhaustedError after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('always fails'));
      const config: RetryConfig = {
        maxRetries: 2,
        backoffMs: 10,
        exponentialBackoff: false
      };

      await expect(
        withRetry(operation, config, mockLogger, 'test-op')
      ).rejects.toThrow(RetryExhaustedError);

      expect(operation).toHaveBeenCalledTimes(3); // initial + 2 retries
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('failed after 2 retries'),
        expect.any(Object)
      );
    });

    it('should use exponential backoff when configured', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const config: RetryConfig = {
        maxRetries: 3,
        backoffMs: 100,
        exponentialBackoff: true
      };

      const start = Date.now();
      await withRetry(operation, config);
      const duration = Date.now() - start;

      // First retry: 100ms, second retry: 200ms = 300ms total minimum
      expect(duration).toBeGreaterThanOrEqual(250);
    });

    it('should work without logger', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const config: RetryConfig = {
        maxRetries: 3,
        backoffMs: 10
      };

      const result = await withRetry(operation, config);

      expect(result).toBe('success');
    });

    it('should handle non-Error exceptions', async () => {
      const operation = vi.fn().mockRejectedValue('string error');
      const config: RetryConfig = {
        maxRetries: 1,
        backoffMs: 10
      };

      await expect(
        withRetry(operation, config, mockLogger)
      ).rejects.toThrow(RetryExhaustedError);
    });
  });
});
