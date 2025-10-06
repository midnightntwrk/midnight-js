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

import { type NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';

import {
  MN_TEST_FAUCET,
  MN_TEST_INDEXER,
  MN_TEST_INDEXER_WS,
  MN_TEST_NETWORK_ID,
  MN_TEST_NODE,
  MN_TEST_WALLET_NETWORK_ID
} from '@/env-vars';
import { MissingEnvironmentVariable } from '@/errors';
import type { EnvironmentConfiguration } from '@/test-environment';

import { RemoteTestEnvironment } from './remote-test-environment';

/**
 * List of required environment variables that must be set for this test environment
 */
const MN_REQUIRED_ENVIRONMENT_VARIABLES = ['MN_TEST_INDEXER', 'MN_TEST_INDEXER_WS', 'MN_TEST_NODE'];

/**
 * Test environment that configures services using environment variables.
 * Allows specifying custom endpoints through environment variables.
 */
export class EnvVarRemoteTestEnvironment extends RemoteTestEnvironment {
  /**
   * Returns the configuration for environment services based on environment variables.
   * Required environment variables:
   * - MN_TEST_NETWORK_ID: Network identifier (e.g., 'testnet', 'devnet')
   * - MN_TEST_INDEXER: GraphQL API endpoint for the indexer
   * - MN_TEST_INDEXER_WS: WebSocket endpoint for the indexer
   * - MN_TEST_NODE: RPC endpoint for the blockchain node
   * Optional environment variables:
   * - MN_TEST_FAUCET: API endpoint for requesting test tokens
   * @returns {EnvironmentConfiguration} Object containing service URLs from environment variables
   * @throws {MissingEnvironmentVariable} If any required environment variable is not set
   */
  getEnvironmentConfiguration(): EnvironmentConfiguration {
    // Throw is any of the required MN_* environment variables are missing.
    MN_REQUIRED_ENVIRONMENT_VARIABLES.forEach((envVar) => {
      if (!process.env[envVar]) {
        throw new MissingEnvironmentVariable(envVar);
      }
    });
    return {
      walletNetworkId: MN_TEST_WALLET_NETWORK_ID as NetworkId.NetworkId,
      networkId: MN_TEST_NETWORK_ID as string,
      indexer: MN_TEST_INDEXER as string,
      indexerWS: MN_TEST_INDEXER_WS as string,
      node: MN_TEST_NODE as string,
      faucet: MN_TEST_FAUCET,
      proofServer: this.proofServerContainer.getUrl()
    };
  }
}
