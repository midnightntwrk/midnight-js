/**
 * Provider types and configuration for different environments
 */

/**
 * Environment type for provider selection
 */
export type ProviderEnvironment = 'nodejs' | 'browser' | 'auto';

/**
 * Network configuration for providers
 */
export interface NetworkConfig {
  /** Network ID (e.g., 'testnet', 'mainnet', 'devnet') */
  networkId: string;

  /** Indexer URL for public data */
  indexerUrl: string;

  /** Node URL for transaction submission */
  nodeUrl: string;

  /** Optional ZK config URL (defaults based on environment) */
  zkConfigUrl?: string;

  /** Optional proof server URL */
  proofServerUrl?: string;
}

/**
 * Wallet configuration
 */
export interface WalletConfig {
  /** Wallet seed phrase or private key */
  seed?: string;

  /** Optional wallet path for derivation */
  path?: string;
}

/**
 * Provider preset configuration combining network and wallet settings
 */
export interface ProviderPresetConfig {
  /** Environment to use (nodejs, browser, or auto-detect) */
  environment?: ProviderEnvironment;

  /** Network configuration */
  network: NetworkConfig;

  /** Optional wallet configuration */
  wallet?: WalletConfig;

  /** Optional custom provider overrides */
  providers?: Partial<ContractProvidersConfig>;
}

/**
 * Full providers configuration matching midnight-js requirements
 */
export interface ContractProvidersConfig {
  walletProvider: any;
  indexerProvider: any;
  privateStateProvider?: any;
  zkConfigProvider: any;
  proofProvider: any;
  [key: string]: any;
}

/**
 * Preset network configurations
 */
export const NETWORK_PRESETS = {
  testnet: {
    networkId: 'testnet',
    indexerUrl: 'https://indexer.testnet.midnight.network',
    nodeUrl: 'https://node.testnet.midnight.network',
    zkConfigUrl: 'https://zk-config.testnet.midnight.network'
  },
  devnet: {
    networkId: 'devnet',
    indexerUrl: 'https://indexer.devnet.midnight.network',
    nodeUrl: 'https://node.devnet.midnight.network',
    zkConfigUrl: 'https://zk-config.devnet.midnight.network'
  },
  local: {
    networkId: 'local',
    indexerUrl: 'http://localhost:8080',
    nodeUrl: 'http://localhost:3000',
    zkConfigUrl: 'http://localhost:8081'
  }
} as const;

export type NetworkPreset = keyof typeof NETWORK_PRESETS;
