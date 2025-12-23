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
 * Browser provider preset
 * Uses fetch-zk-config-provider and other browser-compatible providers
 */

import type { Logger } from '../types/contract-types.js';
import type { ContractProviders, NetworkConfig, WalletConfig } from './types.js';

/**
 * Creates providers for browser environment
 * Note: wallet and midnight providers must be provided separately
 */
export async function createBrowserProviders(
  network: NetworkConfig,
  _wallet?: WalletConfig,
  logger?: Logger
): Promise<Omit<ContractProviders, 'walletProvider' | 'midnightProvider'>> {
  logger?.info('Creating browser providers...', { network: network.networkId });

  try {
    // Dynamically import browser-specific providers
    const { FetchZkConfigProvider } = await import(
      '@midnight-ntwrk/midnight-js-fetch-zk-config-provider'
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

    // Create ZK config provider for browser (fetches from URL)
    const zkConfigProvider = new FetchZkConfigProvider(
      network.zkConfigUrl || `${network.nodeUrl}/zk-config`
    );

    logger?.debug('Created fetch ZK config provider');

    const privateStateProvider = levelPrivateStateProvider({
      midnightDbName: '.midnight-private-state'
    });

    logger?.debug('Created browser private state provider');

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

    logger?.info('Browser providers created successfully');

    return {
      privateStateProvider,
      publicDataProvider: indexerProvider,
      zkConfigProvider,
      proofProvider
    };
  } catch (error) {
    logger?.error('Failed to create browser providers', { error });
    throw new Error(
      `Failed to create browser providers: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
