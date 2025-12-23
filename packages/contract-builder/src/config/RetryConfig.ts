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
 * Retry configuration with default values
 */

import type { RetryConfig } from '../types/contract-types.js';

/**
 * Default retry configuration
 */
export const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  backoffMs: 1000,
  exponentialBackoff: true
};

/**
 * Merges user-provided retry config with defaults
 */
export function mergeRetryConfig(config?: RetryConfig): RetryConfig {
  if (!config) {
    return defaultRetryConfig;
  }

  return {
    ...defaultRetryConfig,
    ...config
  };
}

/**
 * Calculates the delay for the next retry attempt
 */
export function calculateRetryDelay(
  attemptNumber: number,
  config: RetryConfig
): number {
  if (!config.exponentialBackoff) {
    return config.backoffMs;
  }

  // Exponential backoff: backoffMs * 2^attemptNumber
  return config.backoffMs * Math.pow(2, attemptNumber);
}
