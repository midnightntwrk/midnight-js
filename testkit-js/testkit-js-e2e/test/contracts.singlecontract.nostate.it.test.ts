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

import {
  type CoinPublicKey,
  decodeZswapLocalState,
  emptyZswapLocalState,
  sampleContractAddress,
  sampleSigningKey,
  type SigningKey
} from '@midnight-ntwrk/compact-runtime';
import { ZswapChainState } from '@midnight-ntwrk/ledger';
import {
  call,
  callContractConstructor,
  type CallResult,
  createUnprovenCallTx,
  createUnprovenCallTxFromInitialStates,
  createUnprovenDeployTx,
  deployContract,
  findDeployedContract,
  submitCallTx,
  submitDeployTx,
  type UnsubmittedCallTxData,
  type UnsubmittedDeployTxData
} from '@midnight-ntwrk/midnight-js-contracts';
import { getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { parseCoinPublicKeyToHex } from '@midnight-ntwrk/midnight-js-utils';
import path from 'path';

import { CompiledSimple } from '@/e2e/contract';
import * as api from '@/counter-api';
import type { SimpleContract, SimpleProviders } from '@/simple-types';
import {
  createLogger,
  type EnvironmentConfiguration,
  expectFoundAndDeployedStatesEqual,
  expectFoundAndDeployedTxDataEqual,
  expectSuccessfulCallTx,
  expectSuccessfulDeployTx,
  getTestEnvironment,
  initializeMidnightProviders,
  type MidnightWalletProvider,
  type TestEnvironment} from '@midnight-ntwrk/testkit-js';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `contracts_nostate_${new Date().toISOString()}.log`)
);

const { ledger } = CompiledSimple;

const expectSimpleContractCallResult = (
  coinPublicKey: CoinPublicKey,
  round: bigint,
  callResult: CallResult<SimpleContract, 'noop'>
): void => {
  expect(ledger(callResult.public.nextContractState).round).toEqual(round);
  expect(callResult.private.nextZswapLocalState).toEqual(
    decodeZswapLocalState(emptyZswapLocalState(parseCoinPublicKeyToHex(coinPublicKey, getZswapNetworkId())))
  );
  expect(callResult.private.nextPrivateState).toBeUndefined();
  expect(callResult.private.privateTranscriptOutputs).toEqual([]);
};

const expectSimpleContractCallTxData = (
  coinPublicKey: CoinPublicKey,
  round: bigint,
  unprovenCallTxData: UnsubmittedCallTxData<SimpleContract, 'noop'>
): void => {
  expectSimpleContractCallResult(coinPublicKey, round, unprovenCallTxData);
  expect(unprovenCallTxData.private.newCoins).toEqual([]);
  expect(unprovenCallTxData.private.unprovenTx).toBeTruthy();
  expect(unprovenCallTxData.private.input).toBeTruthy();
  expect(unprovenCallTxData.private.output).toBeTruthy();
};

const expectSimpleContractDeployTxData = (
  signingKey: SigningKey,
  coinPublicKey: CoinPublicKey,
  round: bigint,
  deployTxResult: UnsubmittedDeployTxData<SimpleContract>
): void => {
  expect(ledger(deployTxResult.public.initialContractState.data).round).toEqual(round);
  expect(deployTxResult.private.initialPrivateState).toBeUndefined();
  expect(deployTxResult.private.initialZswapState).toEqual(
    decodeZswapLocalState(emptyZswapLocalState(parseCoinPublicKeyToHex(coinPublicKey, getZswapNetworkId())))
  );
  expect(deployTxResult.private.signingKey).toEqual(signingKey);
  expect(deployTxResult.private.newCoins).toEqual([]);
};

describe('Contracts API', () => {
  let providers: SimpleProviders;
  let testEnvironment: TestEnvironment;
  let environmentConfiguration: EnvironmentConfiguration;
  let wallet: MidnightWalletProvider;
  let contractConfiguration: api.SimpleConfiguration;

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    contractConfiguration = new api.SimpleConfiguration();
    api.setLogger(logger);
    wallet = await testEnvironment.getMidnightWalletProvider();
    providers = initializeMidnightProviders(wallet, environmentConfiguration, contractConfiguration);
  });

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  /**
   * Test constructor and circuit execution for contracts with no private state.
   *
   * @given A simple contract with no private state
   * @and A coin public key from wallet provider
   * @when Executing constructor and noop circuit
   * @then Should correctly initialize contract state without private state
   * @and Should maintain proper ledger state and local state consistency
   */
  it('should execute constructor and circuits of contracts with no private state', () => {
    const { coinPublicKey } = providers.walletProvider;
    const constructorResult = callContractConstructor({
      contract: api.simpleContractInstance,
      coinPublicKey
    });
    expect(ledger(constructorResult.nextContractState.data).round).toEqual(0n);
    expect(constructorResult.nextPrivateState).toBeUndefined();
    expect(constructorResult.nextZswapLocalState).toEqual(
      decodeZswapLocalState(emptyZswapLocalState(parseCoinPublicKeyToHex(coinPublicKey, getZswapNetworkId())))
    );
    const callResult = call({
      contract: api.simpleContractInstance,
      coinPublicKey,
      circuitId: 'noop',
      contractAddress: sampleContractAddress(),
      initialContractState: constructorResult.nextContractState,
      initialZswapChainState: new ZswapChainState()
    });
    expectSimpleContractCallResult(coinPublicKey, 1n, callResult);
  });

  /**
   * Test deploying and finding contracts with no private state.
   *
   * @given A simple contract instance with no private state
   * @and Providers configured for simple contract operations
   * @when Deploying contract and finding deployed instance
   * @and Executing noop circuit on found contract
   * @then Should successfully deploy contract without private state
   * @and Should find deployed contract with matching transaction data
   * @and Should execute circuit operations successfully
   * @and Should validate error handling for invalid private state configuration
   */
  it('should deploy and find contracts with no private state [@slow]', async () => {
    const deployedSimpleContract = await deployContract(providers, {
      contract: api.simpleContractInstance
    });
    await expectSuccessfulDeployTx(providers, deployedSimpleContract.deployTxData);

    const foundSimpleContract = await findDeployedContract(providers, {
      contract: api.simpleContractInstance,
      contractAddress: deployedSimpleContract.deployTxData.public.contractAddress
    });
    expectFoundAndDeployedTxDataEqual(deployedSimpleContract.deployTxData, foundSimpleContract.deployTxData);
    await expectFoundAndDeployedStatesEqual(
      providers,
      deployedSimpleContract.deployTxData,
      foundSimpleContract.deployTxData
    );

    const finalizedCallTxData = await foundSimpleContract.callTx.noop();
    await expectSuccessfulCallTx(providers, finalizedCallTxData);
    expectSimpleContractCallTxData(
      parseCoinPublicKeyToHex(providers.walletProvider.coinPublicKey, getZswapNetworkId()),
      1n,
      finalizedCallTxData
    );

    const expandedFindDeployedContractConfig = {
      contract: api.simpleContractInstance,
      contractAddress: deployedSimpleContract.deployTxData.public.contractAddress,
      initialPrivateState: 'random'
    };
    await expect(findDeployedContract(providers, expandedFindDeployedContractConfig)).rejects.toThrow(
      "'initialPrivateState' was defined for contract find while 'privateStateId' was undefined"
    );
  });

  /**
   * Test creating unproven transactions for contracts with no private state.
   *
   * @given A simple contract with no private state and signing key
   * @and Providers configured for transaction creation
   * @when Creating unproven deploy and call transactions
   * @and Testing with and without private state provider
   * @then Should create valid unproven deploy transaction data
   * @and Should create valid unproven call transaction data
   * @and Should handle reduced providers correctly for stateless contracts
   * @and Should validate error for mismatched private state configuration
   */
  it('should create unproven call and deploy transactions for contract with no private state', async () => {
    const signingKey = sampleSigningKey();
    const { coinPublicKey } = providers.walletProvider;
    const unprovenDeployTxResult = await createUnprovenDeployTx(providers, {
      contract: api.simpleContractInstance,
      signingKey
    });
    expectSimpleContractDeployTxData(signingKey, coinPublicKey, 0n, unprovenDeployTxResult);

    const unprovenCallTxData0 = createUnprovenCallTxFromInitialStates(
      {
        contract: api.simpleContractInstance,
        circuitId: 'noop',
        contractAddress: unprovenDeployTxResult.public.contractAddress,
        coinPublicKey,
        initialContractState: unprovenDeployTxResult.public.initialContractState,
        initialZswapChainState: new ZswapChainState()
      },
      providers.walletProvider.coinPublicKey,
      providers.walletProvider.encryptionPublicKey
    );
    expectSimpleContractCallTxData(coinPublicKey, 1n, unprovenCallTxData0);

    // Need to deploy fresh contract to test 'createUnprovenCallTx' independently

    const deployedSimpleContract = await deployContract(providers, {
      contract: api.simpleContractInstance
    });
    await expectSuccessfulDeployTx(providers, deployedSimpleContract.deployTxData);

    // If there is no private state ID, we should be able to leave out the private state provider

    const { privateStateProvider: _, ...reducedProviders } = providers;
    const callTxOptions = {
      contract: api.simpleContractInstance,
      circuitId: 'noop',
      contractAddress: deployedSimpleContract.deployTxData.public.contractAddress
    } as const;
    const unprovenCallTxData1 = await createUnprovenCallTx(reducedProviders, callTxOptions);
    expectSimpleContractCallTxData(
      parseCoinPublicKeyToHex(providers.walletProvider.coinPublicKey, getZswapNetworkId()),
      1n,
      unprovenCallTxData1
    );

    // If there is a private state ID, we should not be able to leave out the private state provider
    const expandedCallTxOptions = { privateStateId: 'random', ...callTxOptions };
    await expect(createUnprovenCallTx(reducedProviders, expandedCallTxOptions)).rejects.toThrow(
      "'privateStateId' was defined for call transaction while 'privateStateProvider' was undefined"
    );
  });

  /**
   * Test submitting deploy and call transactions for contracts with no private state.
   *
   * @given A simple contract with no private state
   * @and Deploy and call transaction options
   * @when Submitting deploy transaction with signing key
   * @and Submitting call transaction with reduced providers
   * @then Should successfully submit deploy transaction
   * @and Should successfully submit call transaction without private state provider
   * @and Should validate error for mismatched private state configuration
   */
  it('should submit deploy and call transactions for contracts with no private state [@slow]', async () => {
    // Need to deploy fresh contract to test 'submitDeployTx' independently
    const deployTxOptions = {
      contract: api.simpleContractInstance,
      signingKey: sampleSigningKey()
    };
    const deployTxData = await submitDeployTx(providers, deployTxOptions);
    await expectSuccessfulDeployTx(providers, deployTxData, deployTxOptions);

    // If there is no private state ID, we should be able to leave out the private state provider

    const { privateStateProvider: _, ...reducedProviders } = providers;
    const callTxOptions = {
      contract: api.simpleContractInstance,
      contractAddress: deployTxData.public.contractAddress,
      circuitId: 'noop'
    } as const;
    const callTxData = await submitCallTx(reducedProviders, callTxOptions);
    await expectSuccessfulCallTx(providers, callTxData, callTxOptions);

    // If there is a private state ID, we should not be able to leave out the private state provider
    const expandedCallTxOptions = { privateStateId: 'random', ...callTxOptions };
    await expect(submitCallTx(reducedProviders, expandedCallTxOptions)).rejects.toThrow(
      "'privateStateId' was defined for call transaction while 'privateStateProvider' was undefined"
    );
  });
});
