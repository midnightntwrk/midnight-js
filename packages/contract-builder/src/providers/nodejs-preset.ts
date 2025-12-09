/**
 * Node.js provider preset
 * Uses node-zk-config-provider and other Node.js-specific providers
 */

import type { Logger } from '../types/contract-types.js';
import type { ContractProvidersConfig, NetworkConfig, WalletConfig } from './types.js';

/**
 * Node.js wallet provider interface
 */
interface NodeJSWalletProvider {
  address: string;
  sign: (data: unknown) => Promise<{ signature: string }>;
}

/**
 * Creates a wallet provider for Node.js
 * This is a placeholder - actual implementation depends on wallet API
 */
async function createNodeJSWallet(
  wallet: WalletConfig,
  logger?: Logger
): Promise<NodeJSWalletProvider> {
  logger?.debug('Creating Node.js wallet provider...');

  // TODO: Implement actual wallet creation
  // This will depend on the midnight-js wallet API
  // For now, return a mock structure

  return {
    address: 'wallet-address-placeholder',
    sign: async (_data: unknown) => {
      logger?.warn('Using mock wallet provider - implement actual wallet');
      return { signature: 'mock-signature' };
    }
  };
}

/**
 * Creates providers for Node.js environment
 */
export async function createNodeJSProviders(
  network: NetworkConfig,
  wallet?: WalletConfig,
  logger?: Logger
): Promise<ContractProvidersConfig> {
  logger?.info('Creating Node.js providers...', { network: network.networkId });

  try {
    // Dynamically import Node.js-specific providers
    // @ts-expect-error not existent type
    const { createNodeZkConfigProvider } = await import(
      '@midnight-ntwrk/midnight-js-node-zk-config-provider'
    );

    // @ts-expect-error not existent type
    const { createLevelPrivateStateProvider } = await import(
      '@midnight-ntwrk/midnight-js-level-private-state-provider'
    );

    // @ts-expect-error not existent type
    const { createHttpClientProofProvider } = await import(
      '@midnight-ntwrk/midnight-js-http-client-proof-provider'
    );

    // @ts-expect-error not existent type
    const { createIndexerPublicDataProvider } = await import(
      '@midnight-ntwrk/midnight-js-indexer-public-data-provider'
    );

    // Create ZK config provider for Node.js (reads from filesystem or URL)
    const zkConfigProvider = await createNodeZkConfigProvider({
      zkConfigPath: network.zkConfigUrl || './zk-config'
    });

    logger?.debug('Created Node.js ZK config provider');

    // Create private state provider (LevelDB for Node.js)
    const privateStateProvider = await createLevelPrivateStateProvider({
      dbPath: './.midnight/private-state'
    });

    logger?.debug('Created Level private state provider');

    // Create proof provider
    const proofProvider = await createHttpClientProofProvider({
      proofServerUrl: network.proofServerUrl || network.nodeUrl
    });

    logger?.debug('Created HTTP client proof provider');

    // Create indexer provider
    const indexerProvider = await createIndexerPublicDataProvider({
      indexerUrl: network.indexerUrl
    });

    logger?.debug('Created indexer public data provider');

    // Create wallet provider (if wallet config provided)
    let walletProvider;
    if (wallet?.seed) {
      // Import wallet creation dynamically
      // This is a placeholder - actual implementation depends on wallet API
      walletProvider = await createNodeJSWallet(wallet, logger);
    }

    logger?.info('Node.js providers created successfully');

    return {
      zkConfigProvider,
      privateStateProvider,
      proofProvider,
      indexerProvider,
      walletProvider,
      publicDataProvider: indexerProvider,
      midnightProvider: undefined // Will be created by midnight-js if needed
    };
  } catch (error) {
    logger?.error('Failed to create Node.js providers', { error });
    throw new Error(
      `Failed to create Node.js providers: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
