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
  ContractState,
  decodeZswapLocalState,
  emptyZswapLocalState,
  sampleContractAddress,
  sampleSigningKey
} from '@midnight-ntwrk/compact-runtime';
import { type ContractAddress, sampleCoinPublicKey, ZswapChainState } from '@midnight-ntwrk/ledger-v6';
import {
  call,
  callContractConstructor,
  ContractTypeError,
  createCircuitCallTxInterface,
  createUnprovenCallTxFromInitialStates,
  createUnprovenDeployTx,
  deployContract,
  type FinalizedDeployTxData,
  findDeployedContract,
  submitCallTx,
  submitDeployTx} from '@midnight-ntwrk/midnight-js-contracts';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import { parseCoinPublicKeyToHex } from '@midnight-ntwrk/midnight-js-utils';
import path from 'path';

import {
  INVALID_CONTRACT_ADDRESS_HEX_FORMAT,
  INVALID_CONTRACT_ADDRESS_TOO_LONG,
  SLOW_TEST_TIMEOUT,
  UNDEPLOYED_CONTRACT_ADDRESS
} from '@/e2e/constants';
import {
  CompiledCounter,
  type CounterPrivateState,
  createInitialPrivateState,
  createPrivateState,
} from '@/e2e/contract';
import * as api from '@/e2e/counter-api';
import {
  CIRCUIT_ID_INCREMENT,
  cloneContractInstance,
  CounterCloneConfiguration,
  CounterConfiguration,
  counterContractInstance,
  SimpleConfiguration,
  simpleContractInstance
} from '@/e2e/counter-api';
import { type CounterCloneCircuits,CounterClonePrivateStateId } from '@/e2e/counter-clone-types';
import {
  type CounterCircuits,
  type CounterContract,
  CounterPrivateStateId,
  type CounterProviders,
  type DeployedCounterContract,
  privateStateZero
} from '@/e2e/counter-types';
import { type SimpleCircuits } from '@/e2e/simple-types';
import type {
  EnvironmentConfiguration,
  MidnightWalletProvider,
  TestEnvironment} from '@/infrastructure';
import {
  createLogger,
  expectFoundAndDeployedStatesEqual,
  expectFoundAndDeployedTxDataEqual,
  expectFoundAndDeployedTxPublicDataEqual,
  expectSuccessfulCallTx,
  expectSuccessfulDeployTx,
  getTestEnvironment,
  initializeMidnightProviders} from '@/infrastructure';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `contracts_${new Date().toISOString()}.log`)
);

const { ledger } = CompiledCounter;

describe('Contracts API', () => {
  const WAITING_PROMISE_TIMEOUT = 20_000;
  let providers: CounterProviders;
  let finalizedDeployTxData: FinalizedDeployTxData<CounterContract>;
  let deployedContract: DeployedCounterContract;
  let contractAddress: ContractAddress;
  let testEnvironment: TestEnvironment;
  let wallet: MidnightWalletProvider;
  let environmentConfiguration: EnvironmentConfiguration;
  let contractConfiguration: CounterConfiguration;

  const getConfigurationWithEmptyPrivateStore = () => {
    return new CounterConfiguration(`counter-private-store-${Date.now()}`);
  };

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    contractConfiguration = new CounterConfiguration();
    api.setLogger(logger);
    logger.info(`Private state: ${JSON.stringify(privateStateZero)}`);
    wallet = await testEnvironment.getMidnightWalletProvider();

    providers = initializeMidnightProviders(wallet, environmentConfiguration, contractConfiguration);
    deployedContract = await api.deploy(providers, privateStateZero);
    finalizedDeployTxData = deployedContract.deployTxData;
    contractAddress = finalizedDeployTxData.public.contractAddress;
  });

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  /**
   * Test constructor and circuit execution for contracts with private state.
   *
   * @given A contract with private state and initial configuration
   * @and A coin public key and constructor result
   * @when Executing constructor and increment circuit
   * @then Should correctly update contract state, private state, and local state
   * @and Should maintain proper state consistency across operations
   */
  it('should execute constructor and circuits of contracts with private state', () => {
    const coinPublicKey = sampleCoinPublicKey();
    const constructorResult = callContractConstructor({
      contract: api.counterContractInstance,
      coinPublicKey,
      initialPrivateState: privateStateZero
    });
    expect(ledger(constructorResult.nextContractState.data).round).toEqual(0n);
    expect(constructorResult.nextPrivateState).toEqual(privateStateZero);
    expect(constructorResult.nextZswapLocalState).toEqual(decodeZswapLocalState(emptyZswapLocalState(coinPublicKey)));

    const callResult = call({
      contract: api.counterContractInstance,
      coinPublicKey,
      circuitId: 'increment',
      contractAddress: sampleContractAddress(),
      initialContractState: constructorResult.nextContractState,
      initialZswapChainState: new ZswapChainState(),
      initialPrivateState: privateStateZero
    });

    expect(ledger(callResult.public.nextContractState).round).toEqual(1n);
    expect(callResult.private.nextPrivateState).toEqual(createPrivateState(1));
    expect(callResult.private.nextZswapLocalState).toEqual(decodeZswapLocalState(emptyZswapLocalState(coinPublicKey)));
  });

  /**
   * Test creating unproven call and deploy transactions for contract with private state.
   *
   * @given A contract with private state configuration
   * @and A signing key and initial private state
   * @when Creating unproven deploy and call transactions
   * @then Should properly set up transaction data with correct state initialization
   * @and Should maintain consistent state values and transaction structure
   */
  it('should create unproven call and deploy transactions for contract with private state', async () => {
    const signingKey = sampleSigningKey();
    const unprovenDeployTxResult = await createUnprovenDeployTx(providers, {
      contract: api.counterContractInstance,
      signingKey,
      initialPrivateState: privateStateZero
    });

    expect(ledger(unprovenDeployTxResult.public.initialContractState.data).round).toEqual(0n);
    expect(unprovenDeployTxResult.private.initialPrivateState).toEqual(privateStateZero);
    expect(unprovenDeployTxResult.private.initialZswapState).toEqual(
      decodeZswapLocalState(
        emptyZswapLocalState(parseCoinPublicKeyToHex(providers.walletProvider.coinPublicKey, getNetworkId()))
      )
    );
    expect(unprovenDeployTxResult.private.signingKey).toEqual(signingKey);
    expect(unprovenDeployTxResult.private.newCoins).toEqual([]);

    const unprovenCallTxData = createUnprovenCallTxFromInitialStates(
      {
        contract: api.counterContractInstance,
        circuitId: 'increment',
        contractAddress: unprovenDeployTxResult.public.contractAddress,
        coinPublicKey: providers.walletProvider.coinPublicKey,
        initialPrivateState: createPrivateState(1),
        initialContractState: unprovenDeployTxResult.public.initialContractState,
        initialZswapChainState: new ZswapChainState()
      },
      providers.walletProvider.coinPublicKey,
      providers.walletProvider.encryptionPublicKey
    );

    expect(ledger(unprovenCallTxData.public.nextContractState).round).toEqual(1n);
    expect(unprovenCallTxData.private.newCoins).toEqual([]);
    expect(unprovenCallTxData.private.nextZswapLocalState).toEqual(
      decodeZswapLocalState(
        emptyZswapLocalState(parseCoinPublicKeyToHex(providers.walletProvider.coinPublicKey, getNetworkId()))
      )
    );
    expect(unprovenCallTxData.private.nextPrivateState).toEqual(createPrivateState(2));
  });

  /**
   * Test contract deployment on the blockchain.
   *
   * @given A counter contract instance and private state configuration
   * @and Valid deployment transaction options
   * @when Deploying contract to the blockchain
   * @then Should successfully deploy contract and return valid deployment data
   * @and Should validate deployment transaction completion
   */
  it('should deploy contract on the chain [@slow]', async () => {
    const deployTxOptions = {
      contract: counterContractInstance,
      privateStateId: CounterPrivateStateId,
      initialPrivateState: privateStateZero
    };
    const deployedContractLocal = await deployContract(providers, deployTxOptions);
    await expectSuccessfulDeployTx(providers, deployedContractLocal.deployTxData, deployTxOptions);
  });

  /**
   * Test finding deployed contract by contract address.
   *
   * @given A deployed contract at a specific address
   * @and Valid contract configuration and private state ID
   * @when Finding the deployed contract with initial private state
   * @then Should return deployed contract with matching transaction data
   * @and Should maintain state consistency between found and deployed contract
   */
  it('should return deployed contract if it exists on specific address', async () => {
    const foundContract = await findDeployedContract(providers, {
      contract: counterContractInstance,
      contractAddress,
      privateStateId: CounterPrivateStateId,
      initialPrivateState: privateStateZero
    });
    expectFoundAndDeployedTxDataEqual(finalizedDeployTxData, foundContract.deployTxData);
    await expectFoundAndDeployedStatesEqual(
      providers,
      finalizedDeployTxData,
      foundContract.deployTxData,
      CounterPrivateStateId,
      privateStateZero
    );
  });

  /**
   * Test finding deployed contract without initial private state.
   *
   * @given A deployed contract at a specific address
   * @and Valid contract configuration without initial private state
   * @when Finding the deployed contract
   * @then Should return deployed contract with matching transaction data
   * @and Should maintain state consistency without initial private state
   */
  it('should return deployed contract if it exists on specific address without initialPrivateState', async () => {
    const foundContract = await findDeployedContract(providers, {
      contract: counterContractInstance,
      contractAddress,
      privateStateId: CounterPrivateStateId
    });
    expectFoundAndDeployedTxDataEqual(finalizedDeployTxData, foundContract.deployTxData);
    await expectFoundAndDeployedStatesEqual(
      providers,
      finalizedDeployTxData,
      foundContract.deployTxData,
      CounterPrivateStateId
    );
  });

  /**
   * Test error handling for invalid contract address format.
   *
   * @given An invalid contract address with wrong format
   * @and Valid contract configuration
   * @when Finding the deployed contract with invalid address
   * @then Should throw error with specific message about byte length
   */
  it('should throw error if contract address has wrong format', async () => {
    await expect(
      findDeployedContract(providers, {
        contract: counterContractInstance,
        contractAddress: INVALID_CONTRACT_ADDRESS_TOO_LONG,
        privateStateId: CounterPrivateStateId
      })
    ).rejects.toThrow('Expected an input string with byte length of 34, got 35.');
  });

  /**
   * Test finding deployed contract with empty local private state store.
   *
   * @given A deployed contract and empty private state store
   * @and Initial private state configuration
   * @when Finding the deployed contract with empty local store
   * @then Should return deployed contract with matching transaction data
   * @and Should validate state consistency despite empty local store
   */
  it('should return deployed contract if it exists on specific address with initialPrivateState and empty local private state store', async () => {
    const providersLocal = initializeMidnightProviders<CounterCircuits, CounterPrivateState>(
      wallet,
      environmentConfiguration,
      getConfigurationWithEmptyPrivateStore()
    );

    const foundContract = await findDeployedContract(providersLocal, {
      contract: counterContractInstance,
      contractAddress,
      privateStateId: CounterPrivateStateId,
      initialPrivateState: privateStateZero
    });
    expectFoundAndDeployedTxDataEqual(finalizedDeployTxData, foundContract.deployTxData);
    await expectFoundAndDeployedStatesEqual(
      providers,
      finalizedDeployTxData,
      foundContract.deployTxData,
      CounterPrivateStateId,
      privateStateZero
    );
  });

  /**
   * Test finding deployed contract with different initial private state.
   *
   * @given A deployed contract and different initial private state
   * @and Modified private state configuration
   * @when Finding the deployed contract with different initial state
   * @then Should return deployed contract with updated private state
   * @and Should maintain public data consistency while updating private data
   */
  it('should return deployed contract if it exists on specific address with different initialPrivateState', async () => {
    const privateStateLocal = createInitialPrivateState(5);
    const foundContract = await findDeployedContract(providers, {
      contract: counterContractInstance,
      contractAddress,
      privateStateId: CounterPrivateStateId,
      initialPrivateState: privateStateLocal
    });
    expectFoundAndDeployedTxPublicDataEqual(finalizedDeployTxData, foundContract.deployTxData);
    expect(foundContract.deployTxData.private.initialPrivateState).toEqual(privateStateLocal);
    await expectFoundAndDeployedStatesEqual(
      providers,
      finalizedDeployTxData,
      foundContract.deployTxData,
      CounterPrivateStateId,
      privateStateLocal
    );
  });

  /**
   * Test indefinite waiting for contract deployment.
   *
   * @given An undeployed contract address
   * @and Valid contract configuration
   * @when Finding the deployed contract at undeployed address
   * @then Should wait indefinitely without timing out
   * @and Should not resolve within the waiting timeout period
   */
  it('should wait indefinitely until contract exists on specific address [@slow]', async () => {
    const contractPromise = findDeployedContract(providers, {
      contract: counterContractInstance,
      contractAddress: UNDEPLOYED_CONTRACT_ADDRESS,
      privateStateId: CounterPrivateStateId
    });

    const timeoutPromise = new Promise((resolve) => {
      setTimeout(resolve, WAITING_PROMISE_TIMEOUT);
    });
    const result = await Promise.race([contractPromise, timeoutPromise]);
    expect(result).toBeUndefined();
  });

  /**
   * Test error handling for incompatible contract types with different circuit IDs.
   *
   * @given A deployed Counter contract at specific address
   * @and Simple contract configuration with different circuit IDs
   * @when Finding deployed contract with incompatible contract type
   * @then Should throw ContractTypeError for mismatched circuit IDs
   */
  it('should throw for incompatible contract types that differ by circuit ids', async () => {
    const providersLocal = initializeMidnightProviders<SimpleCircuits, unknown>(
      wallet,
      environmentConfiguration,
      new SimpleConfiguration()
    );

    // Use the address of the already deployed Counter contract to attempt a find on a Simple
    // contract. This should result in an error.
    await expect(
      findDeployedContract(providersLocal, {
        contract: simpleContractInstance,
        contractAddress
      })
    ).rejects.toThrow(ContractTypeError);
  });

  /**
   * Test error handling for incompatible contract types with same shape but different verifier keys.
   *
   * @given A deployed Counter contract at specific address
   * @and CounterClone contract with same shape but different verifier keys
   * @when Finding deployed contract with same shape but different keys
   * @then Should throw ContractTypeError for mismatched verifier keys
   */
  it('should throw for incompatible contract types with same shape but different verifier keys', async () => {
    const providersLocal = initializeMidnightProviders<CounterCloneCircuits, CounterPrivateState>(
      wallet,
      environmentConfiguration,
      new CounterCloneConfiguration()
    );

    // Use the address of the already deployed Counter contract to attempt a find on a contract that
    // has the "same shape" in terms of circuits ids, but with different verifier keys. This should
    // result in an error.
    await expect(
      findDeployedContract(providersLocal, {
        contract: cloneContractInstance,
        contractAddress,
        privateStateId: CounterClonePrivateStateId
      })
    ).rejects.toThrow(ContractTypeError);
  });

  /**
   * Test creating contract circuits interface for contract interactions.
   *
   * @given A deployed contract and circuits interface
   * @and Initial counter and private state values
   * @when Executing increment, decrement, and reset operations
   * @then Should properly update both ledger and private state values
   * @and Should return successful transaction status for all operations
   */
  it(
    'should return contract interface and execute circuit operations [@slow]',
    async () => {
      const contractCircuitsInterface = createCircuitCallTxInterface(
        providers,
        counterContractInstance,
        contractAddress,
        CounterPrivateStateId
      );
      const counterValue1 = await api.getCounterLedgerState(providers, contractAddress);
      const privateState1 = await api.getCounterPrivateState(providers, CounterPrivateStateId);

      const incrementSubmittedCallTx = await contractCircuitsInterface.increment();
      const counterValue2 = await api.getCounterLedgerState(providers, contractAddress);
      const privateState2 = await api.getCounterPrivateState(providers, CounterPrivateStateId);

      const increment2SubmittedCallTx = await contractCircuitsInterface.increment();
      const counterValue3 = await api.getCounterLedgerState(providers, contractAddress);
      const privateState3 = await api.getCounterPrivateState(providers, CounterPrivateStateId);

      const decrementSubmittedCallTx = await contractCircuitsInterface.decrement(1n);
      const counterValue4 = await api.getCounterLedgerState(providers, contractAddress);
      const privateState4 = await api.getCounterPrivateState(providers, CounterPrivateStateId);

      const resetSubmittedCallTx = await contractCircuitsInterface.reset();
      const counterValue5 = await api.getCounterLedgerState(providers, contractAddress);
      const privateState5 = await api.getCounterPrivateState(providers, CounterPrivateStateId);

      expect(counterValue1).not.toBeNull();
      if (counterValue1) {
        expect(counterValue2).toEqual(counterValue1 + 1n);
        expect(counterValue3).toEqual(counterValue1 + 2n);
        expect(counterValue4).toEqual(counterValue1 + 1n);
        expect(counterValue5).toEqual(0n);
      }
      expect(privateState1).not.toBeNull();
      expect(privateState1?.privateCounter).not.toBeUndefined();
      if (privateState1?.privateCounter) {
        const startValue = privateState1?.privateCounter;
        expect(privateState2?.privateCounter).toEqual(startValue + 1);
        expect(privateState3?.privateCounter).toEqual(startValue + 2);
        expect(privateState4?.privateCounter).toEqual(startValue + 3);
        expect(privateState5?.privateCounter).toEqual(startValue + 4);
      }
      expect(incrementSubmittedCallTx.public.status).toEqual(SucceedEntirely);
      expect(increment2SubmittedCallTx.public.status).toEqual(SucceedEntirely);
      expect(decrementSubmittedCallTx.public.status).toEqual(SucceedEntirely);
      expect(resetSubmittedCallTx.public.status).toEqual(SucceedEntirely);
    },
    SLOW_TEST_TIMEOUT
  );

  /**
   * Test error handling for undefined public state at wrong address.
   *
   * @given A contract circuits interface at undeployed address
   * @and Various circuit operations (increment, decrement, reset)
   * @when Executing circuits on non-existent contract
   * @then Should throw error about missing public state
   * @and Should fail for all circuit operations consistently
   */
  it('should throw error on undefined public state at wrong address', async () => {
    const contractCircuitsInterface = createCircuitCallTxInterface(
      providers,
      counterContractInstance,
      UNDEPLOYED_CONTRACT_ADDRESS,
      CounterPrivateStateId
    );

    await expect(contractCircuitsInterface.increment()).rejects.toThrow(
      `No public state found at contract address '${UNDEPLOYED_CONTRACT_ADDRESS}'`
    );
    await expect(contractCircuitsInterface.decrement(1n)).rejects.toThrow(
      `No public state found at contract address '${UNDEPLOYED_CONTRACT_ADDRESS}'`
    );
    await expect(contractCircuitsInterface.reset()).rejects.toThrow(
      `No public state found at contract address '${UNDEPLOYED_CONTRACT_ADDRESS}'`
    );
  });

  /**
   * Test submitting deploy transaction to blockchain.
   *
   * @given A signing key and deploy transaction options
   * @and Counter contract configuration with initial private state
   * @when Submitting deploy transaction to blockchain
   * @then Should successfully deploy and validate transaction
   * @and Should enable subsequent call transactions on deployed contract
   */
  it('should submit a deploy transaction [@slow]', async () => {
    const signingKey = sampleSigningKey();
    const deployTxOptions = {
      contract: api.counterContractInstance,
      signingKey,
      privateStateId: CounterPrivateStateId,
      initialPrivateState: privateStateZero
    };
    const deployTxData = await submitDeployTx(providers, deployTxOptions);
    await expectSuccessfulDeployTx(providers, deployTxData, deployTxOptions);
    const callTxOptions = {
      contract: api.counterContractInstance,
      contractAddress: deployTxData.public.contractAddress,
      circuitId: CIRCUIT_ID_INCREMENT,
      privateStateId: CounterPrivateStateId
    } as const;
    const callTxData = await submitCallTx(providers, callTxOptions);
    await expectSuccessfulCallTx(providers, callTxData, callTxOptions, createPrivateState(1));
  });

  /**
   * Test submitting call transaction that executes circuit in contract.
   *
   * @given A deployed contract with current state values
   * @and Valid call transaction options for increment circuit
   * @when Submitting call transaction to execute increment
   * @then Should successfully execute and update contract state
   * @and Should increment counter value by one and update private state
   */
  it('should submit transaction that calls circuit in contract [@slow]', async () => {
    const counterValue1 = await api.getCounterLedgerState(providers, contractAddress);
    expect(counterValue1).toBeDefined();

    const privateState1 = await api.getCounterPrivateState(providers, CounterPrivateStateId);
    expect(privateState1).toBeDefined();

    const callTxOptions = {
      contract: counterContractInstance,
      contractAddress,
      circuitId: CIRCUIT_ID_INCREMENT,
      privateStateId: CounterPrivateStateId
    } as const;
    const callTxData = await submitCallTx(providers, callTxOptions);
    await expectSuccessfulCallTx(
      providers,
      callTxData,
      callTxOptions,
      createPrivateState(privateState1!.privateCounter + 1)
    );

    const counterValue2 = await api.getCounterLedgerState(providers, contractAddress);
    expect(counterValue2).toBeDefined();
    expect(counterValue2!).toEqual(counterValue1! + 1n);
  });

  /**
   * Test error handling when private state is undefined.
   *
   * @given Providers with empty private state store
   * @and Valid contract and call transaction configuration
   * @when Submitting call transaction without private state
   * @then Should throw error about missing private state
   * @and Should reference specific private state ID in error message
   */
  it('should throw error if private state is undefined', async () => {
    const providersLocal = initializeMidnightProviders<CounterCircuits, CounterPrivateState>(
      wallet,
      environmentConfiguration,
      getConfigurationWithEmptyPrivateStore()
    );

    await expect(
      submitCallTx(providersLocal, {
        contract: counterContractInstance,
        circuitId: CIRCUIT_ID_INCREMENT,
        contractAddress,
        privateStateId: CounterPrivateStateId
      })
    ).rejects.toThrow(`No private state found at private state ID '${CounterPrivateStateId}'`);
  });

  /**
   * Test error handling when public state is undefined.
   *
   * @given Valid providers and call transaction configuration
   * @and Undeployed contract address without public state
   * @when Submitting call transaction to non-existent contract
   * @then Should throw error about missing public state
   * @and Should reference specific contract address in error message
   */
  it('should throw error if public state is undefined', async () => {
    await expect(
      submitCallTx(providers, {
        contract: counterContractInstance,
        circuitId: CIRCUIT_ID_INCREMENT,
        contractAddress: UNDEPLOYED_CONTRACT_ADDRESS,
        privateStateId: CounterPrivateStateId
      })
    ).rejects.toThrow(`No public state found at contract address '${UNDEPLOYED_CONTRACT_ADDRESS}'`);
  });

  /**
   * Test error handling for invalid contract address format.
   *
   * @given Valid providers and call transaction configuration
   * @and Invalid contract address with wrong hex format
   * @when Submitting call transaction with malformed address
   * @then Should throw error about incomplete byte in input string
   * @and Should reference the invalid address in error message
   */
  it('should throw error if contract address has wrong format', async () => {
    await expect(
      submitCallTx(providers, {
        contract: counterContractInstance,
        circuitId: CIRCUIT_ID_INCREMENT,
        contractAddress: INVALID_CONTRACT_ADDRESS_HEX_FORMAT,
        privateStateId: CounterPrivateStateId
      })
    ).rejects.toThrow(`The last byte of input string '${INVALID_CONTRACT_ADDRESS_HEX_FORMAT}' is incomplete.`);
  });

  /**
   * Test watching for contract state changes independently of chain state.
   *
   * @given A deployed contract with initial state
   * @and Contract state observation functionality
   * @when Incrementing contract and observing state changes
   * @then Should return latest observed state independent of chain state
   * @and Should maintain state consistency during observations
   */
  it('should return the latest observed state of a deployed contract and is independent of the chain state', async () => {
    await api.increment(deployedContract);
    const counterValue1 = await api.getCounterLedgerState(providers, contractAddress);
    expect(counterValue1).toBeDefined();

    const state = await providers.publicDataProvider.watchForContractState(
      deployedContract.deployTxData.public.contractAddress
    );
    expect(state).toBeDefined();

    // increment modifies state on the ledger, but not the state previously returned
    await api.increment(deployedContract);

    expect(ledger(state.data).round).toEqual(counterValue1);
  });

  /**
   * Test indefinite waiting for state changes with timeout behavior.
   *
   * @given A deployed contract with current state
   * @and Contract state watching with timeout configuration
   * @when Waiting for state changes within timeout period
   * @then Should wait indefinitely until stopped and return last contract state
   * @and Should return valid ContractState instance when timeout occurs
   */
  it('should wait indefinitely until state change, if stopped returns last contract state [@slow]', async () => {
    const counterValue1 = await api.getCounterLedgerState(providers, contractAddress);
    const contractPromise = providers.publicDataProvider.watchForContractState(
      deployedContract.deployTxData.public.contractAddress
    );
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(resolve, WAITING_PROMISE_TIMEOUT);
    });
    const result = await Promise.race([contractPromise, timeoutPromise]);

    expect(result).toBeInstanceOf(ContractState);
    expect(ledger((result as ContractState).data).round).toEqual(counterValue1);
  });
});
