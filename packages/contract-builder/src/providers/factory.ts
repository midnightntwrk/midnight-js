/**
 * Provider factory - main entry point for creating providers
 */

import { ConfigurationError } from '../errors/AdapterError.js';
import type { Logger } from '../types/contract-types.js';
import { createBrowserProviders } from './browser-preset.js';
import { resolveEnvironment } from './environment.js';
import { createNodeJSProviders } from './nodejs-preset.js';
import type {
  ContractProvidersConfig,
  NetworkConfig,
  NetworkPreset,
  ProviderPresetConfig,
  WalletConfig} from './types.js';
import { NETWORK_PRESETS } from './types.js';

/**
 * Helper: Normalize various config formats to ProviderPresetConfig
 */
function normalizeConfig(
  config: NetworkPreset | NetworkConfig | ProviderPresetConfig
): ProviderPresetConfig {
  // If it's a string (network preset)
  if (typeof config === 'string') {
    if (!(config in NETWORK_PRESETS)) {
      throw new ConfigurationError(
        `Unknown network preset: ${config}. Available: ${Object.keys(NETWORK_PRESETS).join(', ')}`
      );
    }
    return {
      network: NETWORK_PRESETS[config]
    };
  }

  // If it's a NetworkConfig (has networkId)
  if ('networkId' in config && 'indexerUrl' in config) {
    return {
      network: config
    };
  }

  // Otherwise it's already a ProviderPresetConfig
  return config as ProviderPresetConfig;
}

/**
 * Helper: Normalize network config from preset or custom
 */
function normalizeNetworkConfig(
  network: NetworkPreset | NetworkConfig
): NetworkConfig {
  if (typeof network === 'string') {
    if (!(network in NETWORK_PRESETS)) {
      throw new ConfigurationError(
        `Unknown network preset: ${network}. Available: ${Object.keys(NETWORK_PRESETS).join(', ')}`
      );
    }
    return NETWORK_PRESETS[network];
  }

  return network;
}

/**
 * Creates default providers based on environment and configuration
 *
 * @example
 * ```typescript
 * // Using network preset
 * const providers = await createDefaultProviders({
 *   network: 'testnet',
 *   wallet: { seed: 'my-seed-phrase' }
 * });
 *
 * // Using custom network config
 * const providers = await createDefaultProviders({
 *   network: {
 *     networkId: 'custom',
 *     indexerUrl: 'https://my-indexer.com',
 *     nodeUrl: 'https://my-node.com'
 *   }
 * });
 *
 * // With explicit environment
 * const providers = await createDefaultProviders({
 *   environment: 'nodejs',
 *   network: 'testnet'
 * });
 * ```
 */
export async function createDefaultProviders(
  config: NetworkPreset | NetworkConfig | ProviderPresetConfig,
  logger?: Logger
): Promise<ContractProvidersConfig> {
  // Normalize config to ProviderPresetConfig
  const normalizedConfig = normalizeConfig(config);

  logger?.info('Creating default providers...', {
    environment: normalizedConfig.environment || 'auto',
    network: typeof normalizedConfig.network === 'string'
      ? normalizedConfig.network
      : normalizedConfig.network.networkId
  });

  // Resolve environment
  const environment = resolveEnvironment(normalizedConfig.environment);

  logger?.debug('Resolved environment', { environment });

  // Get network config
  const networkConfig = normalizeNetworkConfig(normalizedConfig.network);

  // Create providers based on environment
  let providers: ContractProvidersConfig;

  if (environment === 'nodejs') {
    providers = await createNodeJSProviders(
      networkConfig,
      normalizedConfig.wallet,
      logger
    );
  } else {
    providers = await createBrowserProviders(
      networkConfig,
      normalizedConfig.wallet,
      logger
    );
  }

  // Apply any custom provider overrides
  if (normalizedConfig.providers) {
    providers = {
      ...providers,
      ...normalizedConfig.providers
    };
    logger?.debug('Applied custom provider overrides');
  }

  return providers;
}

/**
 * Quick helper for common use case: testnet with auto-detection
 */
export async function createTestnetProviders(
  wallet?: WalletConfig,
  logger?: Logger
): Promise<ContractProvidersConfig> {
  return createDefaultProviders({
    network: 'testnet',
    wallet,
    environment: 'auto'
  }, logger);
}

/**
 * Quick helper for common use case: devnet with auto-detection
 */
export async function createDevnetProviders(
  wallet?: WalletConfig,
  logger?: Logger
): Promise<ContractProvidersConfig> {
  return createDefaultProviders({
    network: 'devnet',
    wallet,
    environment: 'auto'
  }, logger);
}

/**
 * Quick helper for common use case: local development
 */
export async function createLocalProviders(
  wallet?: WalletConfig,
  logger?: Logger
): Promise<ContractProvidersConfig> {
  return createDefaultProviders({
    network: 'local',
    wallet,
    environment: 'auto'
  }, logger);
}
