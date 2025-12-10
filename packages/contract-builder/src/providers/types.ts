/**
 * Provider types and configuration for different environments
 */

import {
  type MidnightProvider,
  type PrivateStateProvider,
  type ProofProvider,
  type PublicDataProvider,
  type WalletProvider,
  type ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';

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
 * Network preset names
 */
export type NetworkPreset = keyof typeof NETWORK_PRESETS;

/**
 * Provider preset configuration combining network and wallet settings
 */
export interface ProviderPresetConfig {
  /** Environment to use (nodejs, browser, or auto-detect) */
  environment?: ProviderEnvironment;

  /** Network configuration - can be a preset name or custom config */
  network: NetworkPreset | NetworkConfig;

  /** Optional wallet configuration */
  wallet?: WalletConfig;

  /** Optional custom provider overrides */
  providers?: Partial<ContractProvidersConfig>;
}

/**
 * Full providers configuration matching midnight-js requirements
 * Aligns with MidnightProviders from @midnight-ntwrk/midnight-js-types
 */
export interface ContractProvidersConfig {
  privateStateProvider: PrivateStateProvider;
  publicDataProvider: PublicDataProvider;
  zkConfigProvider: ZKConfigProvider<string>;
  proofProvider: ProofProvider<string>;
  walletProvider: WalletProvider;
  midnightProvider: MidnightProvider;
  [key: string]: unknown;
}

/**
 * Preset network configurations
 */
export const NETWORK_PRESETS = {
  testnet: {
    networkId: 'testnet',
    indexerUrl: 'https://indexer.testnet.midnight.network',
    nodeUrl: 'https://node.testnet.midnight.network',
    zkConfigUrl: undefined
  },
  devnet: {
    networkId: 'devnet',
    indexerUrl: 'https://indexer.devnet.midnight.network',
    nodeUrl: 'https://node.devnet.midnight.network',
    zkConfigUrl: undefined
  },
  local: {
    networkId: 'undeployed',
    indexerUrl: 'http://localhost:8080',
    nodeUrl: 'http://localhost:3000',
    zkConfigUrl: 'http://localhost:8081'
  }
} as const;
