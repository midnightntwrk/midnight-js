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

import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { type MidnightProviders, type PrivateStateId } from '@midnight-ntwrk/midnight-js-types';

import { type EnvironmentConfiguration } from '../test-environment';
import { type MidnightWalletProvider } from '../wallet';
import { type ContractConfiguration } from './contract-types';

/**
 * Configures and returns the required providers for a Midnight contract.
 *
 * @template ICK - Type parameter for the input circuit key string
 * @template PS - Type parameter for the private state
 *
 * @param {MidnightWalletProvider} midnightWalletProvider - The midnightWalletProvider provider instance to use for transactions
 * @param {EnvironmentConfiguration} environmentConfiguration - Configuration for the environment including indexer and proof server details
 * @param {ContractConfiguration} contractConfiguration - Configuration specific to the contract including storage names and ZK config path
 *
 * @returns {MidnightProviders} An object containing all configured providers:
 *   - privateStateProvider: For managing private contract state
 *   - publicDataProvider: For accessing public blockchain data
 *   - zkConfigProvider: For zero-knowledge proof configurations
 *   - proofProvider: For generating and verifying proofs
 *   - walletProvider: For midnightWalletProvider operations
 *   - midnightProvider: For Midnight-specific operations
 */
export const initializeMidnightProviders = <ICK extends string, PS>(
  midnightWalletProvider: MidnightWalletProvider,
  environmentConfiguration: EnvironmentConfiguration,
  contractConfiguration: ContractConfiguration
): MidnightProviders<ICK, PrivateStateId, PS> => {
  return {
    privateStateProvider: levelPrivateStateProvider<PrivateStateId, PS>({
      privateStateStoreName: contractConfiguration.privateStateStoreName,
      signingKeyStoreName: `${contractConfiguration.privateStateStoreName}-signing-keys`
    }),
    publicDataProvider: indexerPublicDataProvider(environmentConfiguration.indexer, environmentConfiguration.indexerWS),
    zkConfigProvider: new NodeZkConfigProvider<ICK>(contractConfiguration.zkConfigPath),
    proofProvider: httpClientProofProvider(environmentConfiguration.proofServer),
    walletProvider: midnightWalletProvider,
    midnightProvider: midnightWalletProvider
  };
};
