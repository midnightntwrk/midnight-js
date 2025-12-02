/**
 * Environment detection utilities
 */

import type { ProviderEnvironment } from './types.js';

/**
 * Detects the current runtime environment
 */
export function detectEnvironment(): 'nodejs' | 'browser' {
  // Check for Node.js specific globals
  if (
    typeof process !== 'undefined' &&
    process.versions != null &&
    process.versions.node != null
  ) {
    return 'nodejs';
  }

  // Check for browser specific globals
  if (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  ) {
    return 'browser';
  }

  // Default to browser for web workers, service workers, etc.
  return 'browser';
}

/**
 * Resolves the environment, handling 'auto' detection
 */
export function resolveEnvironment(env?: ProviderEnvironment): 'nodejs' | 'browser' {
  if (!env || env === 'auto') {
    return detectEnvironment();
  }
  return env;
}

/**
 * Checks if running in Node.js environment
 */
export function isNodeJS(): boolean {
  return detectEnvironment() === 'nodejs';
}

/**
 * Checks if running in browser environment
 */
export function isBrowser(): boolean {
  return detectEnvironment() === 'browser';
}
