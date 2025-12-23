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

/**
 * Retry logic utilities for handling transient failures
 */

import { calculateRetryDelay } from '../config/RetryConfig.js';
import { RetryExhaustedError } from '../errors/AdapterError.js';
import type { Logger,RetryConfig } from '../types/contract-types.js';

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
