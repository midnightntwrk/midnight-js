/**
 * Providers module - default provider presets for Node.js and Browser
 */

// Main factory
export {
  createDefaultProviders,
  createDevnetProviders,
  createLocalProviders,
  createTestnetProviders} from './factory.js';

// Types
export type {
  ContractProvidersConfig,
  NetworkConfig,
  NetworkPreset,
  ProviderEnvironment,
  ProviderPresetConfig,
  WalletConfig} from './types.js';
export { NETWORK_PRESETS } from './types.js';

// Environment detection
export {
  detectEnvironment,
  isBrowser,
  isNodeJS,
  resolveEnvironment} from './environment.js';

// Individual presets (advanced use)
export { createBrowserProviders } from './browser-preset.js';
export { createNodeJSProviders } from './nodejs-preset.js';
