/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
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

import type { FinalizedDeployTxData } from '@midnight-ntwrk/midnight-js-contracts';
import { LEDGER_VERSIONS, versionOfRecord } from '@midnight-ntwrk/midnight-js-protocol';
import { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { LedgerParameters, ZswapChainState } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { type FinalizedTxData, type PublicDataProvider, SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import {
  createLogger,
  getTestEnvironment,
  initializeMidnightProviders,
  type TestEnvironment
} from '@midnight-ntwrk/testkit-js';
import fetch from 'cross-fetch';
import path from 'path';

import { UNDEPLOYED_CONTRACT_ADDRESS, VERY_SLOW_TEST_TIMEOUT } from '../src/constants';
import { CompiledCounter } from '../src/contract';
import * as api from '../src/counter-api';
import { CounterConfiguration } from '../src/counter-api';
import {
  type CounterContract,
  type CounterProviders,
  type DeployedCounterContract,
  privateStateZero
} from '../src/types/counter-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `indexer_${new Date().toISOString()}.log`)
);

const { ledger } = CompiledCounter;

describe('Indexer API', () => {
  let publicDataProvider: PublicDataProvider;
  let providers: CounterProviders;
  let deployedContract: DeployedCounterContract;
  let finalizedDeployTxData: FinalizedDeployTxData<CounterContract>;
  let incrementedTxData: FinalizedTxData;
  let testEnvironment: TestEnvironment;
  let indexerQueryUrl: string;

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    const environmentConfiguration = await testEnvironment.start();
    indexerQueryUrl = environmentConfiguration.indexer;
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

  test('queryDeployContractState - should return a contract state equivalent to the initial contract state produced during deployment construction', async () => {
    const deployState = await publicDataProvider.queryDeployContractState(finalizedDeployTxData.public.contractAddress);

    assert(deployState?.contractState.version === 'v9', `expected a v9 deploy state, got ${deployState?.contractState.version ?? 'null'}`);
    expect(deployState.contractState.deserialize({ v9: ContractState }).serialize()).toEqual(finalizedDeployTxData.public.initialContractState.serialize());
    expect(ledger(deployState.contractState.deserialize({ v9: ContractState }).data)).toEqual(ledger(finalizedDeployTxData.public.initialContractState.data));
  });

  test('queryContractState - should return the current contract state of a deployed contract', async () => {
    const state = await publicDataProvider.queryContractState(finalizedDeployTxData.public.contractAddress);

    assert(state?.contractState.version === 'v9', `expected a v9 contract state, got ${state?.contractState.version ?? 'null'}`);
    expect(state.contractState.deserialize({ v9: ContractState }).operations()).toEqual(finalizedDeployTxData.public.initialContractState.operations());
    expect(ledger(state.contractState.deserialize({ v9: ContractState }).data).round).toEqual(2n);
  });

  test('queryContractState - should return the current contract state of a deployed contract at defined block height', async () => {
    const state = await publicDataProvider.queryContractState(finalizedDeployTxData.public.contractAddress, {
      type: 'blockHeight',
      blockHeight: incrementedTxData.blockHeight
    });

    assert(state?.contractState.version === 'v9', `expected a v9 contract state, got ${state?.contractState.version ?? 'null'}`);
    expect(state.contractState.deserialize({ v9: ContractState }).operations()).toEqual(finalizedDeployTxData.public.initialContractState.operations());
    expect(ledger(state.contractState.deserialize({ v9: ContractState }).data).round).toEqual(1n);
  });

  test('queryContractState - should return the current contract state of a deployed contract at defined block hash', async () => {
    const state = await publicDataProvider.queryContractState(finalizedDeployTxData.public.contractAddress, {
      type: 'blockHash',
      blockHash: incrementedTxData.blockHash
    });

    assert(state?.contractState.version === 'v9', `expected a v9 contract state, got ${state?.contractState.version ?? 'null'}`);
    expect(state.contractState.deserialize({ v9: ContractState }).operations()).toEqual(finalizedDeployTxData.public.initialContractState.operations());
    expect(ledger(state.contractState.deserialize({ v9: ContractState }).data).round).toEqual(1n);
  });

  test('queryLatestProtocolVersion - should return exactly the protocolVersion the indexer reports on its head block', async () => {
    // Asked for straight from the indexer, bypassing the provider entirely, so
    // this compares against the real source field rather than against another
    // reading taken the same way.
    const response = await fetch(indexerQueryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'query { block { protocolVersion } }' })
    });
    const payload = (await response.json()) as { data: { block: { protocolVersion: number } } };

    const version = await publicDataProvider.queryLatestProtocolVersion();

    expect(version).toEqual(payload.data.block.protocolVersion);
    // Resolving throws on a protocol version this client does not know, so
    // this also pins that the indexer's integer is one this client supports.
    expect(LEDGER_VERSIONS).toContain(versionOfRecord({ protocolVersion: version }));
  });

  test('queryContractState - should return the exact state bytes the indexer serves, with the block ledger parameters, nothing decoded', async () => {
    const address = finalizedDeployTxData.public.contractAddress;

    const read = await publicDataProvider.queryContractState(address);

    assert(read !== null, 'expected a contract state');
    expect(read.contractState.version).toBe('v9');
    expect(read.contractState.serialize()).toEqual(read.contractState.deserialize({ v9: ContractState }).serialize());
    expect(read.ledgerParameters?.version).toBe('v9');
    expect(read.ledgerParameters?.deserialize({ v9: LedgerParameters })).toBeInstanceOf(LedgerParameters);
    expect(read.protocolVersion).toEqual(await publicDataProvider.queryLatestProtocolVersion());
  });

  test('queryContractState - should return null on no contract at contract address', async () => {
    await expect(publicDataProvider.queryContractState(UNDEPLOYED_CONTRACT_ADDRESS)).resolves.toBeNull();
  });

  test('queryZSwapAndContractState - should return the current ZSwap chain state and contract state of a deployed contract', async () => {
    const state = await publicDataProvider.queryZSwapAndContractState(finalizedDeployTxData.public.contractAddress);

    assert(state?.contractState.version === 'v9', `expected v9 public states, got ${state?.contractState.version ?? 'null'}`);
    expect(state.zswapChainState.deserialize({ v9: ZswapChainState }).firstFree).toEqual(ledger(finalizedDeployTxData.public.initialContractState.data).round);
    expect(state.contractState.deserialize({ v9: ContractState }).operations()).toEqual(finalizedDeployTxData.public.initialContractState.operations());
    expect(ledger(state.contractState.deserialize({ v9: ContractState }).data).round).toEqual(
      ledger(finalizedDeployTxData.public.initialContractState.data).round + 2n
    );
  });

  test('queryZSwapAndContractState - should return null on no contract at contract address', async () => {
    await expect(publicDataProvider.queryZSwapAndContractState(UNDEPLOYED_CONTRACT_ADDRESS)).resolves.toBeNull();
  });

  test('watchForDeployTxData - should return the data of the transaction containing the deployment of the contract with the given address', async () => {
    const finalizedTxData = await publicDataProvider.watchForDeployTxData(finalizedDeployTxData.public.contractAddress);

    expect(finalizedTxData.status).toEqual(SucceedEntirely);
    expect(finalizedTxData.identifiers).toEqual(finalizedDeployTxData.public.identifiers);
    expect(finalizedTxData.txHash).toEqual(finalizedDeployTxData.public.txHash);
    expect(finalizedTxData.blockHash).toEqual(finalizedDeployTxData.public.blockHash);
    expect(finalizedTxData.blockHeight).toEqual(finalizedDeployTxData.public.blockHeight);
  });

  test('watchForTxData - should return the data of the transaction containing the contract call with the given transaction id', async () => {
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

  test('watchForContractState - should immediately return the current state of a deployed contract', async () => {
    const state = await publicDataProvider.watchForContractState(finalizedDeployTxData.public.contractAddress);

    assert(state?.contractState.version === 'v9', `expected a v9 contract state, got ${state?.contractState.version ?? 'null'}`);
    expect(state.contractState.deserialize({ v9: ContractState }).operations()).toEqual(finalizedDeployTxData.public.initialContractState.operations());
    expect(ledger(state.contractState.deserialize({ v9: ContractState }).data).round).toEqual(2n);
  });
});
