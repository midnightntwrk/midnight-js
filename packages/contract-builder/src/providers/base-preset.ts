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
 * Base provider creation utilities shared across Node.js and Browser presets
 */

import type { Logger } from '../types/contract-types.js';
import type { NetworkConfig } from './types.js';

/**
 * Common provider creation interface for shared providers
 */
export interface CommonProviders {
  privateStateProvider: unknown;
  publicDataProvider: unknown;
  proofProvider: unknown;
}

/**
 * Creates the common providers shared between Node.js and Browser environments
 * (privateStateProvider, proofProvider, indexerPublicDataProvider)
 */
export async function createCommonProviders(
  network: NetworkConfig,
  logger?: Logger
): Promise<CommonProviders> {
  const { levelPrivateStateProvider } = await import(
    '@midnight-ntwrk/midnight-js-level-private-state-provider'
  );

  const { httpClientProofProvider } = await import(
    '@midnight-ntwrk/midnight-js-http-client-proof-provider'
  );

  const { indexerPublicDataProvider } = await import(
    '@midnight-ntwrk/midnight-js-indexer-public-data-provider'
  );

  const privateStateProvider = levelPrivateStateProvider({
    midnightDbName: '.midnight-private-state'
  });

  logger?.debug('Created private state provider');

  const proofProvider = httpClientProofProvider(
    network.proofServerUrl || network.nodeUrl
  );

  logger?.debug('Created proof provider');

  const publicDataProvider = indexerPublicDataProvider(
    network.indexerUrl,
    network.indexerUrl.replace(/^http/, 'ws')
  );

  logger?.debug('Created public data provider');

  return {
    privateStateProvider,
    publicDataProvider,
    proofProvider
  };
}
