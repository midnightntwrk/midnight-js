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

import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { dappConnectorProofProvider } from '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { CostModel } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { type PrivateStateId } from '@midnight-ntwrk/midnight-js-types';
import {
  createLogger,
  DAppConnectorWalletAdapter,
  type EnvironmentConfiguration,
  expectSuccessfulCallTx,
  expectSuccessfulDeployTx,
  getTestEnvironment,
  type MidnightWalletProvider,
  type TestEnvironment,
} from '@midnight-ntwrk/testkit-js';
import path from 'path';

import * as api from '@/counter-api';
import type { SimpleProviders } from '@/types/simple-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `dapp_connector_proving_${new Date().toISOString()}.log`),
);

describe('DApp Connector Proving', () => {
  let testEnvironment: TestEnvironment;
  let environmentConfiguration: EnvironmentConfiguration;
  let wallet: MidnightWalletProvider;
  let walletAdapter: DAppConnectorWalletAdapter;

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    api.setLogger(logger);
    wallet = await testEnvironment.getMidnightWalletProvider();
    walletAdapter = new DAppConnectorWalletAdapter(wallet, environmentConfiguration);
  });

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  /**
   * @given A DAppConnectorWalletAdapter wrapping a started MidnightWalletProvider
   * @and A dappConnectorProofProvider created from the adapter's getProvingProvider
   * @when Deploying a simple contract (no private state) using wallet-delegated proving
   * @and Calling a circuit on the deployed contract
   * @then Deploy transaction should succeed and be confirmed on-chain
   * @and Call transaction should succeed and be confirmed on-chain
   * @and No proof server should be needed (proving happens locally via WASM)
   */
  test('should deploy and call contract using dapp-connector-proof-provider with wallet-delegated proving [@slow]', async () => {
    const contractConfiguration = new api.SimpleConfiguration();
    const zkConfigProvider = new NodeZkConfigProvider<string>(contractConfiguration.zkConfigPath);
    const costModel = CostModel.initialCostModel();

    const proofProvider = await dappConnectorProofProvider(walletAdapter, zkConfigProvider, costModel);

    const coinPublicKey = wallet.getCoinPublicKey();
    const accountId = Buffer.from(coinPublicKey).toString('hex');
    const storeSuffix = Date.now();

    const providers: SimpleProviders = {
      privateStateProvider: levelPrivateStateProvider<PrivateStateId, undefined>({
        privateStateStoreName: `dapp-connector-proving-test-${storeSuffix}`,
        signingKeyStoreName: `dapp-connector-proving-test-${storeSuffix}-signing-keys`,
        privateStoragePasswordProvider: () => 'Answer to the Ultimate Question of Life, the Universe, and Everything!',
        accountId,
      }),
      publicDataProvider: indexerPublicDataProvider(environmentConfiguration.indexer, environmentConfiguration.indexerWS),
      zkConfigProvider,
      proofProvider,
      walletProvider: wallet,
      midnightProvider: wallet,
    };

    const deployedContract = await deployContract(providers, {
      compiledContract: api.CompiledSimpleContract,
    });
    await expectSuccessfulDeployTx(providers, deployedContract.deployTxData);

    const callTxData = await deployedContract.callTx.noop();
    await expectSuccessfulCallTx(providers, callTxData);
  });
});
