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
import type { EnvironmentConfiguration } from '@/test-environment';

import { RemoteTestEnvironment } from './remote-test-environment';

/**
 * Test environment configuration for the Midnight StageNet network.
 * Provides URLs and endpoints for StageNet network services.
 */
export class StagenetTestEnvironment extends RemoteTestEnvironment {
  /**
   * Returns the configuration for the StageNet environment services.
   * @returns {EnvironmentConfiguration} Object containing URLs for StageNet services:
   * - indexer: GraphQL API endpoint for the indexer
   * - indexerWS: WebSocket endpoint for the indexer
   * - node: RPC endpoint for the blockchain node
   * - faucet: not available on StageNet; fund wallets via a seed (MN_TEST_WALLET_SEED)
   * - proofServer: URL for the proof generation server
   */
  getEnvironmentConfiguration(): EnvironmentConfiguration {
    return {
      // `NetworkId.StageNet` is not present in the pinned wallet-sdk canary; the literal
      // is type-safe because NetworkId accepts `WellKnownNetworkId | string`.
      walletNetworkId: 'stagenet',
      networkId: 'stagenet',
      indexer: 'https://indexer.stagenet.shielded.tools/api/v4/graphql',
      indexerWS: 'wss://indexer.stagenet.shielded.tools/api/v4/graphql/ws',
      node: 'https://rpc.stagenet.shielded.tools',
      nodeWS: 'wss://rpc.stagenet.shielded.tools',
      faucet: undefined,
      proofServer: this.proofServerContainer?.getUrl()
    };
  }
}
