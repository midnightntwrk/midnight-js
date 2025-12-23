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
import { createCommonProviders } from './base-preset.js';
import type { ContractProviders, NetworkConfig, WalletConfig } from './types.js';

/**
 * Creates providers for Node.js environment
 * Note: wallet and midnight providers must be provided separately
 */
export async function createNodeJSProviders(
  network: NetworkConfig,
  _wallet?: WalletConfig,
  logger?: Logger
): Promise<Omit<ContractProviders, 'walletProvider' | 'midnightProvider'>> {
  logger?.info('Creating Node.js providers...', { network: network.networkId });

  try {
    const { NodeZkConfigProvider } = await import(
      '@midnight-ntwrk/midnight-js-node-zk-config-provider'
    );

    const zkConfigProvider = new NodeZkConfigProvider(
      network.zkConfigUrl || './zk-config'
    );

    logger?.debug('Created Node.js ZK config provider');

    const commonProviders = await createCommonProviders(network, logger);

    logger?.info('Node.js providers created successfully');

    return {
      ...commonProviders,
      zkConfigProvider
    } as Omit<ContractProviders, 'walletProvider' | 'midnightProvider'>;
  } catch (error) {
    logger?.error('Failed to create Node.js providers', { error });
    throw new Error(
      `Failed to create Node.js providers: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
