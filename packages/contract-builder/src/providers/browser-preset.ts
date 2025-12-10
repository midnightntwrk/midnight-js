/**
 * Browser provider preset
 * Uses fetch-zk-config-provider and other browser-compatible providers
 */

import type { Logger } from '../types/contract-types.js';
import type { ContractProvidersConfig, NetworkConfig, WalletConfig } from './types.js';

/**
 * Private state provider interface
 */
interface PrivateStateProvider {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

/**
 * Wallet provider interface
 */
interface WalletProvider {
  address: string;
  sign: (data: unknown) => Promise<{ signature: string }>;
  isExtensionAvailable: boolean;
}

/**
 * Creates a private state provider for browser using IndexedDB
 */
async function createBrowserPrivateStateProvider(): Promise<PrivateStateProvider> {
  // Check if IndexedDB is available
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in this environment');
  }

  // Simple IndexedDB-based private state provider
  const dbName = 'midnight-private-state';
  const storeName = 'states';

  return {
    get: async (key: string): Promise<unknown> => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);

        request.onerror = () => reject(request.error);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }
        };

        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          const getRequest = store.get(key);

          getRequest.onsuccess = () => resolve(getRequest.result);
          getRequest.onerror = () => reject(getRequest.error);
        };
      });
    },

    set: async (key: string, value: unknown): Promise<void> => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);

        request.onerror = () => reject(request.error);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }
        };

        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const putRequest = store.put(value, key);

          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        };
      });
    },

    delete: async (key: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const deleteRequest = store.delete(key);

          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => reject(deleteRequest.error);
        };
      });
    }
  };
}

/**
 * Creates a wallet provider for browser
 * This is a placeholder - actual implementation depends on wallet API
 */
async function createBrowserWallet(
  wallet: WalletConfig,
  logger?: Logger
): Promise<WalletProvider> {
  logger?.debug('Creating browser wallet provider...');

  // TODO: Implement actual browser wallet creation
  // This might integrate with browser wallet extensions (MetaMask-like)
  // For now, return a mock structure

  return {
    address: 'browser-wallet-address-placeholder',
    sign: async (_data: unknown) => {
      logger?.warn('Using mock wallet provider - implement actual wallet');
      return { signature: 'mock-signature' };
    },
    // Browser-specific: could integrate with wallet extensions
    isExtensionAvailable: false
  };
}

/**
 * Creates providers for browser environment
 */
export async function createBrowserProviders(
  network: NetworkConfig,
  wallet?: WalletConfig,
  logger?: Logger
): Promise<ContractProvidersConfig> {
  logger?.info('Creating browser providers...', { network: network.networkId });

  try {
    // Dynamically import browser-specific providers
    // @ts-expect-error not existent type
    const { createFetchZkConfigProvider } = await import(
      '@midnight-ntwrk/midnight-js-fetch-zk-config-provider'
    );

    // @ts-expect-error not existent type
    const { createHttpClientProofProvider } = await import(
      '@midnight-ntwrk/midnight-js-http-client-proof-provider'
    );

    // @ts-expect-error not existent type
    const { createIndexerPublicDataProvider } = await import(
      '@midnight-ntwrk/midnight-js-indexer-public-data-provider'
    );

    // Create ZK config provider for browser (fetches from URL)
    const zkConfigProvider = await createFetchZkConfigProvider({
      zkConfigUrl: network.zkConfigUrl || `${network.nodeUrl}/zk-config`
    });

    logger?.debug('Created fetch ZK config provider');

    // Create private state provider (IndexedDB for browser)
    const privateStateProvider = await createBrowserPrivateStateProvider();

    logger?.debug('Created browser private state provider');

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
      walletProvider = await createBrowserWallet(wallet, logger);
    }

    logger?.info('Browser providers created successfully');

    return {
      privateStateProvider,
      publicDataProvider: indexerProvider,
      zkConfigProvider,
      proofProvider,
      walletProvider,
      midnightProvider: undefined // Will be created by midnight-js if needed
    };
  } catch (error) {
    logger?.error('Failed to create browser providers', { error });
    throw new Error(
      `Failed to create browser providers: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
