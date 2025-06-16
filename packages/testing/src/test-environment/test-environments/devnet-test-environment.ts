// This file is part of MIDNIGHT-JS.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { RemoteTestEnvironment } from './remote-test-environment';
import type { EnvironmentConfiguration } from '../environment-configuration';

/**
 * Test environment configuration for the Midnight devnet network.
 * Provides URLs and endpoints for devnet services.
 */
export class DevnetTestEnvironment extends RemoteTestEnvironment {
  /**
   * Returns the configuration for the devnet environment services.
   * @returns {EnvironmentConfiguration} Object containing URLs for devnet services:
   * - indexer: GraphQL API endpoint for the indexer
   * - indexerWS: WebSocket endpoint for the indexer
   * - node: RPC endpoint for the blockchain node
   * - faucet: API endpoint for requesting test tokens
   * - proofServer: URL for the proof generation server
   */
  getEnvironmentConfiguration(): EnvironmentConfiguration {
    return {
      indexer: 'https://indexer.devnet.midnight.network/api/v1/graphql',
      indexerWS: 'wss://indexer.devnet.midnight.network/api/v1/graphql/ws',
      node: 'https://rpc.devnet.midnight.network',
      faucet: 'https://faucet.devnet.midnight.network/api/request-tokens',
      proofServer: this.proofServerContainer.getUrl()
    };
  }
}
