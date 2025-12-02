/**
 * Logger wrapper utilities
 */

import type { Logger } from '../types/contract-types.js';

/**
 * No-op logger that discards all log messages
 */
export const noopLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {}
};

/**
 * Console-based logger implementation
 */
export const consoleLogger: Logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data ? data : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data ? data : '');
  },
  error: (message: string, data?: any) => {
    console.error(`[ERROR] ${message}`, data ? data : '');
  },
  debug: (message: string, data?: any) => {
    console.debug(`[DEBUG] ${message}`, data ? data : '');
  }
};

/**
 * Creates a prefixed logger that adds a prefix to all log messages
 */
export function createPrefixedLogger(logger: Logger, prefix: string): Logger {
  return {
    info: (message: string, data?: any) => logger.info(`[${prefix}] ${message}`, data),
    warn: (message: string, data?: any) => logger.warn(`[${prefix}] ${message}`, data),
    error: (message: string, data?: any) => logger.error(`[${prefix}] ${message}`, data),
    debug: (message: string, data?: any) => logger.debug(`[${prefix}] ${message}`, data)
  };
}
