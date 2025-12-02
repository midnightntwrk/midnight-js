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
