/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Node.js provider preset
 * Uses node-zk-config-provider and other Node.js-specific providers
 */

import type { Logger } from '../types/contract-types.js';
import type { ContractProviders, NetworkConfig, WalletConfig } from './types.js';

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
): Promise<ContractProviders> {
  logger?.info('Creating Node.js providers...', { network: network.networkId });

  try {
    // Dynamically import Node.js-specific providers
    const { NodeZkConfigProvider } = await import(
      '@midnight-ntwrk/midnight-js-node-zk-config-provider'
    );

    const { levelPrivateStateProvider } = await import(
      '@midnight-ntwrk/midnight-js-level-private-state-provider'
    );

    const { httpClientProofProvider } = await import(
      '@midnight-ntwrk/midnight-js-http-client-proof-provider'
    );

    const { indexerPublicDataProvider } = await import(
      '@midnight-ntwrk/midnight-js-indexer-public-data-provider'
    );

    // Create ZK config provider for Node.js (reads from filesystem or URL)
    const zkConfigProvider = new NodeZkConfigProvider(
      network.zkConfigUrl || './zk-config'
    );

    logger?.debug('Created Node.js ZK config provider');

    // Create private state provider (LevelDB for Node.js)
    const privateStateProvider = levelPrivateStateProvider({
      midnightDbName: '.midnight-private-state'
    });

    logger?.debug('Created Level private state provider');

    // Create proof provider
    const proofProvider = httpClientProofProvider(
      network.proofServerUrl || network.nodeUrl
    );

    logger?.debug('Created HTTP client proof provider');

    // Create indexer provider
    const indexerProvider = indexerPublicDataProvider(
      network.indexerUrl,
      network.indexerUrl.replace(/^http/, 'ws')
    );

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
      privateStateProvider,
      publicDataProvider: indexerProvider,
      zkConfigProvider,
      proofProvider,
      walletProvider,
      midnightProvider: undefined // Will be created by midnight-js if needed
    } as unknown as ContractProviders;
  } catch (error) {
    logger?.error('Failed to create Node.js providers', { error });
    throw new Error(
      `Failed to create Node.js providers: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
