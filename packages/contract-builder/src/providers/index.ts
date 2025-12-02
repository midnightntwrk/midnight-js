/**
 * Providers module - default provider presets for Node.js and Browser
 */

// Main factory
export {
  createDefaultProviders,
  createTestnetProviders,
  createDevnetProviders,
  createLocalProviders
} from './factory.js';

// Types
export type {
  ProviderEnvironment,
  NetworkConfig,
  WalletConfig,
  ProviderPresetConfig,
  ContractProvidersConfig,
  NetworkPreset
} from './types.js';

export { NETWORK_PRESETS } from './types.js';

// Environment detection
export {
  detectEnvironment,
  resolveEnvironment,
  isNodeJS,
  isBrowser
} from './environment.js';

// Individual presets (advanced use)
export { createNodeJSProviders } from './nodejs-preset.js';
export { createBrowserProviders } from './browser-preset.js';
