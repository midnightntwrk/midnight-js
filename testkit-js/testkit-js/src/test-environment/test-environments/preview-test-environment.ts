/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import { NetworkId } from '@midnight-ntwrk/wallet-sdk';

import type { EnvironmentConfiguration } from '@/test-environment';

import { RemoteTestEnvironment } from './remote-test-environment';

/**
 * Test environment configuration for the Midnight preview network.
 * Provides URLs and endpoints for preview network services.
 */
export class PreviewTestEnvironment extends RemoteTestEnvironment {
  /**
   * Returns the configuration for the preview environment services.
   * @returns {EnvironmentConfiguration} Object containing URLs for preview services:
   * - indexer: GraphQL API endpoint for the indexer
   * - indexerWS: WebSocket endpoint for the indexer
   * - node: RPC endpoint for the blockchain node
   * - faucet: API endpoint for requesting test tokens
   * - proofServer: URL for the proof generation server
   */
  getEnvironmentConfiguration(): EnvironmentConfiguration {
    return {
      walletNetworkId: NetworkId.NetworkId.Preview,
      networkId: 'preview',
      indexer: 'https://indexer.preview.midnight.network/api/v4/graphql',
      indexerWS: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
      node: 'https://rpc.preview.midnight.network',
      nodeWS: 'wss://rpc.preview.midnight.network',
      faucet: 'https://faucet.preview.midnight.network/api/request-tokens',
      proofServer: this.proofServerContainer?.getUrl()
    };
  }
}
