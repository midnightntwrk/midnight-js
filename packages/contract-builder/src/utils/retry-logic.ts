/**
 * Retry logic utilities for handling transient failures
 */

import type { RetryConfig, Logger } from '../types/contract-types.js';
import { calculateRetryDelay } from '../config/RetryConfig.js';
import { RetryExhaustedError } from '../errors/AdapterError.js';

/**
 * Sleep for the specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute an operation with retry logic
 *
 * @param operation - The async operation to execute
 * @param config - Retry configuration
 * @param logger - Optional logger for retry attempts
 * @param operationName - Name of the operation for logging
 * @returns The result of the operation
 * @throws RetryExhaustedError if all retry attempts fail
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  logger?: Logger,
  operationName?: string
): Promise<T> {
  let lastError: Error | undefined;
  const opName = operationName || 'operation';

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = calculateRetryDelay(attempt - 1, config);
        logger?.info(`Retrying ${opName} (attempt ${attempt}/${config.maxRetries}) after ${delay}ms`);
        await sleep(delay);
      }

      const result = await operation();

      if (attempt > 0) {
        logger?.info(`${opName} succeeded after ${attempt} retries`);
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === config.maxRetries) {
        logger?.error(`${opName} failed after ${config.maxRetries} retries`, { error: lastError });
      } else {
        logger?.warn(`${opName} failed on attempt ${attempt + 1}`, { error: lastError });
      }
    }
  }

  // This should never happen due to the loop logic, but TypeScript needs it
  throw new RetryExhaustedError(
    `${opName} failed after ${config.maxRetries} retry attempts`,
    config.maxRetries,
    lastError
  );
}
