/**
 * Adapter configuration with default values
 */

import type { AdapterConfig } from '../types/adapter-types.js';

/**
 * Default adapter configuration
 */
export const defaultAdapterConfig: AdapterConfig = {
  logger: undefined,
  retry: undefined,
  errorHandler: undefined
};

/**
 * Merges user-provided config with defaults
 */
export function mergeAdapterConfig(config?: AdapterConfig): AdapterConfig {
  return {
    ...defaultAdapterConfig,
    ...config
  };
}
