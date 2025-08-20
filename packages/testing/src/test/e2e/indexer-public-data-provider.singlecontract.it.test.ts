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

import { type FinalizedTxData, type PublicDataProvider, SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import type { FinalizedDeployTxData } from '@midnight-ntwrk/midnight-js-contracts';
import {
  createLogger,
  getTestEnvironment,
  initializeMidnightProviders,
  type TestEnvironment
} from '@/infrastructure';
import path from 'path';
import { getRuntimeNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import * as api from '@/e2e/api';
import { CounterConfiguration } from '@/e2e/api';
import {
  type CounterContract,
  type CounterProviders,
  type DeployedCounterContract,
  privateStateZero
} from '@/e2e/counter-types';
import { CompiledCounter } from '@/e2e/contract';
import { UNDEPLOYED_CONTRACT_ADDRESS, VERY_SLOW_TEST_TIMEOUT } from '@/e2e/constants';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `indexer_${new Date().toISOString()}.log`)
);

const ledger = CompiledCounter.ledger;

describe('Indexer API', () => {
  let publicDataProvider: PublicDataProvider;
  let providers: CounterProviders;
  let deployedContract: DeployedCounterContract;
  let finalizedDeployTxData: FinalizedDeployTxData<CounterContract>;
  let incrementedTxData: FinalizedTxData;
  let testEnvironment: TestEnvironment;

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    const environmentConfiguration = await testEnvironment.start();
    api.setLogger(logger);
    logger.info(`Private state: ${JSON.stringify(privateStateZero)}`);
    const wallet = await testEnvironment.getMidnightWalletProvider();
    providers = initializeMidnightProviders(wallet, environmentConfiguration, new CounterConfiguration());
    publicDataProvider = providers.publicDataProvider;
    deployedContract = await api.deploy(providers, privateStateZero);
    finalizedDeployTxData = deployedContract.deployTxData;
    incrementedTxData = await api.increment(deployedContract);
    await api.increment(deployedContract);
  }, VERY_SLOW_TEST_TIMEOUT);

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  it('queryDeployContractState - should return a contract state equivalent to the initial contract state produced during deployment construction', async () => {
    const state = await publicDataProvider.queryDeployContractState(finalizedDeployTxData.public.contractAddress);

    expect(state).not.toBeNull();
    expect(state?.serialize(getRuntimeNetworkId())).toEqual(
      finalizedDeployTxData.public.initialContractState.serialize(getRuntimeNetworkId())
    );
    if (state) {
      expect(ledger(state.data)).toEqual(
        ledger(finalizedDeployTxData.public.initialContractState.data)
      );
    }
  });

  it('queryContractState - should return the current contract state of a deployed contract', async () => {
    const state = await publicDataProvider.queryContractState(finalizedDeployTxData.public.contractAddress);

    expect(state).not.toBeNull();
    expect(state?.operations()).toEqual(finalizedDeployTxData.public.initialContractState.operations());
    if (state) {
      expect(ledger(state?.data).round).toEqual(2n);
    }
  });

  it('queryContractState - should return the current contract state of a deployed contract at defined block height', async () => {
    const state = await publicDataProvider.queryContractState(finalizedDeployTxData.public.contractAddress, {
      type: 'blockHeight',
      blockHeight: incrementedTxData.blockHeight
    });

    expect(state).not.toBeNull();
    expect(state?.operations()).toEqual(finalizedDeployTxData.public.initialContractState.operations());
    if (state) {
      expect(ledger(state?.data).round).toEqual(1n);
    }
  });

  it('queryContractState - should return the current contract state of a deployed contract at defined block hash', async () => {
    const state = await publicDataProvider.queryContractState(finalizedDeployTxData.public.contractAddress, {
      type: 'blockHash',
      blockHash: incrementedTxData.blockHash
    });

    expect(state).not.toBeNull();
    expect(state?.operations()).toEqual(finalizedDeployTxData.public.initialContractState.operations());
    if (state) {
      expect(ledger(state?.data).round).toEqual(1n);
    }
  });

  it('queryContractState - should return null on no contract at contract address', async () => {
    await expect(publicDataProvider.queryContractState(UNDEPLOYED_CONTRACT_ADDRESS)).resolves.toBeNull();
  });

  it('queryZSwapAndContractState - should return the current ZSwap chain state and contract state of a deployed contract', async () => {
    const state = await publicDataProvider.queryZSwapAndContractState(finalizedDeployTxData.public.contractAddress);

    expect(state).not.toBeNull();
    if (state) {
      expect(state[0].firstFree).toEqual(ledger(finalizedDeployTxData.public.initialContractState.data).round);
      expect(state[1].operations()).toEqual(finalizedDeployTxData.public.initialContractState.operations());
      expect(ledger(state[1].data).round).toEqual(
        ledger(finalizedDeployTxData.public.initialContractState.data).round + 2n
      );
    }
  });

  it('queryZSwapAndContractState - should return null on no contract at contract address', async () => {
    await expect(publicDataProvider.queryZSwapAndContractState(UNDEPLOYED_CONTRACT_ADDRESS)).resolves.toBeNull();
  });

  it('watchForDeployTxData - should return the data of the transaction containing the deployment of the contract with the given address', async () => {
    const finalizedTxData = await publicDataProvider.watchForDeployTxData(finalizedDeployTxData.public.contractAddress);

    expect(finalizedTxData.status).toEqual(SucceedEntirely);
    expect(finalizedTxData.txId).toEqual(finalizedDeployTxData.public.txId);
    expect(finalizedTxData.txHash).toEqual(finalizedDeployTxData.public.txHash);
    expect(finalizedTxData.blockHash).toEqual(finalizedDeployTxData.public.blockHash);
    expect(finalizedTxData.blockHeight).toEqual(finalizedDeployTxData.public.blockHeight);
  });

  it('watchForTxData - should return the data of the transaction containing the contract call with the given transaction id', async () => {
    const finalizedTxData = await publicDataProvider.watchForTxData(incrementedTxData.txId);

    expect(finalizedTxData.status).toEqual(SucceedEntirely);
    expect(finalizedTxData.txId).toEqual(incrementedTxData.txId);
    expect(finalizedTxData.txHash).toEqual(incrementedTxData.txHash);
    expect(finalizedTxData.blockHash).toEqual(incrementedTxData.blockHash);
    expect(finalizedTxData.blockHeight).toEqual(incrementedTxData.blockHeight);

    expect(finalizedTxData.txId).not.toEqual(finalizedDeployTxData.public.txId);
    expect(finalizedTxData.txHash).not.toEqual(finalizedDeployTxData.public.txHash);
    expect(finalizedTxData.blockHash).not.toEqual(finalizedDeployTxData.public.blockHash);
    expect(finalizedTxData.blockHeight).not.toEqual(finalizedDeployTxData.public.blockHeight);
  });

  it('watchForContractState - should immediately return the current state of a deployed contract', async () => {
    const state = await publicDataProvider.watchForContractState(finalizedDeployTxData.public.contractAddress);

    expect(state).not.toBeNull();
    expect(state?.operations()).toEqual(finalizedDeployTxData.public.initialContractState.operations());
    if (state) {
      expect(ledger(state.data).round).toEqual(2n);
    }
  });
});
