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

import { sampleSigningKey } from '@midnight-ntwrk/compact-runtime';
import type { ContractAddress } from '@midnight-ntwrk/ledger-v6';
import {
  createCircuitMaintenanceTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface,
  submitInsertVerifierKeyTx,
  submitRemoveVerifierKeyTx,
  submitReplaceAuthorityTx
} from '@midnight-ntwrk/midnight-js-contracts';
import { SucceedEntirely, type VerifierKey } from '@midnight-ntwrk/midnight-js-types';
import path from 'path';

import { UNDEPLOYED_CONTRACT_ADDRESS } from '@/e2e/constants';
import * as api from '@/e2e/counter-api';
import {
  CIRCUIT_ID_DECREMENT,
  CIRCUIT_ID_RESET,
  CounterCloneConfiguration,
  counterContractInstance,
  SimpleConfiguration
} from '@/e2e/counter-api';
import { type CounterProviders, type DeployedCounterContract } from '@/e2e/counter-types';
import {
  createLogger,
  type EnvironmentConfiguration,
  getTestEnvironment,
  initializeMidnightProviders,
  type MidnightWalletProvider,
  type TestEnvironment} from '@/infrastructure';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `contracts_snark_upgrade_${new Date().toISOString()}.log`)
);

describe('Contracts API Snark Upgrade [single contract]', () => {
  let testEnvironment: TestEnvironment;
  let wallet: MidnightWalletProvider;
  let environmentConfiguration: EnvironmentConfiguration;
  let counterCloneContractProviders: CounterProviders;
  let simpleContractProviders: CounterProviders;
  let counterProviders: CounterProviders;
  let contractAddress: ContractAddress;
  let deployedCounterContract: DeployedCounterContract;

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    api.setLogger(logger);
    wallet = await testEnvironment.getMidnightWalletProvider();
    counterCloneContractProviders = initializeMidnightProviders(
      wallet,
      environmentConfiguration,
      new CounterCloneConfiguration()
    );
    simpleContractProviders = initializeMidnightProviders(wallet, environmentConfiguration, new SimpleConfiguration());
    ({ counterProviders, deployedCounterContract, contractAddress } = await api.deployCounterContract(
      wallet,
      environmentConfiguration
    ));
  });

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  it('submitReplaceAuthorityTx - successful replace authority with new key[@slow]', async () => {
    const newAuthority = sampleSigningKey();
    const finalizedTxData = await submitReplaceAuthorityTx(counterProviders, contractAddress)(newAuthority);

    expect(finalizedTxData.status).toEqual(SucceedEntirely);
  });

  it('submitReplaceAuthorityTx - successful replace authority with same key [@slow]', async () => {
    const authority = await counterProviders.privateStateProvider.getSigningKey(contractAddress);
    expect(authority).not.toBeNull();
    if (authority) {
      const finalizedTxData = await submitReplaceAuthorityTx(counterProviders, contractAddress)(authority);

      expect(finalizedTxData.status).toEqual(SucceedEntirely);
    }
  });

  it('submitReplaceAuthorityTx - should fail on replace contract that is not deployed to contract address', async () => {
    const authority = sampleSigningKey();

    await expect(submitReplaceAuthorityTx(counterProviders, UNDEPLOYED_CONTRACT_ADDRESS)(authority)).rejects.toThrow(
      `No contract state found on chain for contract address '${UNDEPLOYED_CONTRACT_ADDRESS}'`
    );
  });

  it('submitReplaceAuthorityTx - should fail when signing key for contract address does not exist', async () => {
    const authority = sampleSigningKey();

    await expect(submitReplaceAuthorityTx(counterCloneContractProviders, contractAddress)(authority)).rejects.toThrow(
      `Signing key for contract address '${contractAddress}' not found`
    );
  });

  it('submitInsertVerifierKeyTx - should fail on invalid verifier key', async () => {
    const vk = new Uint8Array(1) as VerifierKey;

    await expect(submitInsertVerifierKeyTx(counterProviders, contractAddress, CIRCUIT_ID_RESET, vk)).rejects.toThrow(
      `Circuit 'reset' is already defined for contract at address '${contractAddress}`
    );
  });

  it('submitInsertVerifierKeyTx - successful insert on not present circuitId [@slow]', async () => {
    const vk = await counterProviders.zkConfigProvider.getVerifierKey(CIRCUIT_ID_RESET);
    const finalizedTxData = await submitInsertVerifierKeyTx(
      counterProviders,
      contractAddress,
      api.randomCircuitId(),
      vk
    );

    expect(finalizedTxData.status).toEqual(SucceedEntirely);
  });

  it('submitInsertVerifierKeyTx - should fail on contract not present on contract address', async () => {
    const vk = await counterProviders.zkConfigProvider.getVerifierKey(CIRCUIT_ID_RESET);

    await expect(
      submitInsertVerifierKeyTx(counterProviders, UNDEPLOYED_CONTRACT_ADDRESS, CIRCUIT_ID_RESET, vk)
    ).rejects.toThrow(`No contract state found on chain for contract address '${UNDEPLOYED_CONTRACT_ADDRESS}'`);
  });

  it('submitInsertVerifierKeyTx - should fail on providers for different contract with different API', async () => {
    const vk = await counterProviders.zkConfigProvider.getVerifierKey(CIRCUIT_ID_RESET);

    await expect(
      submitInsertVerifierKeyTx(simpleContractProviders, UNDEPLOYED_CONTRACT_ADDRESS, CIRCUIT_ID_RESET, vk)
    ).rejects.toThrow(`No contract state found on chain for contract address '${UNDEPLOYED_CONTRACT_ADDRESS}'`);
  });

  it('submitRemoveVerifierKeyTx - should fail on not present circuitId', async () => {
    const circuitId = api.randomCircuitId();
    await expect(submitRemoveVerifierKeyTx(counterProviders, contractAddress, circuitId)).rejects.toThrow(
      `Circuit '${circuitId}' not found for contract at address '${contractAddress}'`
    );
  });

  it('submitRemoveVerifierKeyTx - should fail on contract not present on contract address', async () => {
    await expect(
      submitRemoveVerifierKeyTx(counterProviders, UNDEPLOYED_CONTRACT_ADDRESS, CIRCUIT_ID_RESET)
    ).rejects.toThrow(`No contract state found on chain for contract address '${UNDEPLOYED_CONTRACT_ADDRESS}'`);
  });

  it('submitRemoveVerifierKeyTx - should fail on providers for different contract with different API ', async () => {
    await expect(submitRemoveVerifierKeyTx(simpleContractProviders, contractAddress, CIRCUIT_ID_RESET)).rejects.toThrow(
      `Signing key for contract address '${contractAddress}' not found`
    );
  });

  it('createContractMaintenanceTxInterface - replaceAuthority - successful replace authority with the new one [@slow]', async () => {
    const authority = sampleSigningKey();
    // TODO: Remove extra log statements
    logger.info(`Signing key for 'Counter' is ${authority}`);
    const contractMaintenanceTxInterface = createContractMaintenanceTxInterface(counterProviders, contractAddress);
    const finalizedTxData = await contractMaintenanceTxInterface.replaceAuthority(authority);

    expect(finalizedTxData.status).toEqual(SucceedEntirely);

    logger.info('Remove key');
    const finalizedTxData1 = await submitRemoveVerifierKeyTx(counterProviders, contractAddress, CIRCUIT_ID_DECREMENT);

    expect(finalizedTxData1.status).toEqual(SucceedEntirely);
  });

  it('createContractMaintenanceTxInterface - replaceAuthority - successful replace authority with the same one [@slow]', async () => {
    const authority = await counterProviders.privateStateProvider.getSigningKey(contractAddress);
    logger.info(`Signing key for 'Counter' is ${authority}`);
    if (authority) {
      const contractMaintenanceTxInterface = createContractMaintenanceTxInterface(counterProviders, contractAddress);
      const finalizedTxData = await contractMaintenanceTxInterface.replaceAuthority(authority);

      expect(finalizedTxData.status).toEqual(SucceedEntirely);
    }
  });

  it('createContractMaintenanceTxInterface - replaceAuthority - should fail on contract not present on contract address', async () => {
    const authority = await counterProviders.privateStateProvider.getSigningKey(contractAddress);
    if (authority) {
      const contractMaintenanceTxInterface = createContractMaintenanceTxInterface(
        counterProviders,
        UNDEPLOYED_CONTRACT_ADDRESS
      );

      await expect(contractMaintenanceTxInterface.replaceAuthority(authority)).rejects.toThrow(
        `No contract state found on chain for contract address '${UNDEPLOYED_CONTRACT_ADDRESS}'`
      );
    }
  });

  it('createContractMaintenanceTxInterface - insertVerifierKey - fail when key is still present', async () => {
    const vk = await counterProviders.zkConfigProvider.getVerifierKey(CIRCUIT_ID_RESET);
    const circuitMaintenanceTxInterface = createCircuitMaintenanceTxInterface(
      counterProviders,
      CIRCUIT_ID_RESET,
      contractAddress
    );

    await expect(() => circuitMaintenanceTxInterface.insertVerifierKey(vk)).rejects.toThrow(
      `Circuit 'reset' is already defined for contract at address '${contractAddress}'`
    );
  });

  it('createContractMaintenanceTxInterface - insertVerifierKey - success when no key present [@slow]', async () => {
    const vk = await counterProviders.zkConfigProvider.getVerifierKey(CIRCUIT_ID_RESET);
    const circuitMaintenanceTxInterface = createCircuitMaintenanceTxInterface(
      counterProviders,
      CIRCUIT_ID_RESET,
      contractAddress
    );
    await circuitMaintenanceTxInterface.removeVerifierKey();
    const finalizedTxData = await circuitMaintenanceTxInterface.insertVerifierKey(vk);

    expect(finalizedTxData.status).toEqual(SucceedEntirely);
    await api.increment(deployedCounterContract);
  });

  it('createCircuitMaintenanceTxInterfaces - insertVerifierKey - fail when key is already present', async () => {
    const vk = await counterProviders.zkConfigProvider.getVerifierKey(CIRCUIT_ID_RESET);
    const circuitMaintenanceTxInterfaces = createCircuitMaintenanceTxInterfaces(
      counterProviders,
      counterContractInstance,
      contractAddress
    );

    await expect(() => circuitMaintenanceTxInterfaces.reset.insertVerifierKey(vk)).rejects.toThrow(
      `Circuit 'reset' is already defined for contract at address '${contractAddress}'`
    );
  });

  it('createCircuitMaintenanceTxInterfaces - insertVerifierKey - success when no key present [@slow]', async () => {
    const vk = await counterProviders.zkConfigProvider.getVerifierKey(CIRCUIT_ID_RESET);
    const circuitMaintenanceTxInterfaces = createCircuitMaintenanceTxInterfaces(
      counterProviders,
      counterContractInstance,
      contractAddress
    );
    await circuitMaintenanceTxInterfaces.reset.removeVerifierKey();
    const finalizedTxData = await circuitMaintenanceTxInterfaces.reset.insertVerifierKey(vk);

    expect(finalizedTxData.status).toEqual(SucceedEntirely);
    await api.increment(deployedCounterContract);
  });

  it('createCircuitMaintenanceTxInterfaces - removeVerifierKey - should fail on contract not present on contract address', async () => {
    const circuitMaintenanceTxInterfaces = createCircuitMaintenanceTxInterfaces(
      counterProviders,
      counterContractInstance,
      UNDEPLOYED_CONTRACT_ADDRESS
    );

    await expect(circuitMaintenanceTxInterfaces.reset.removeVerifierKey()).rejects.toThrow(
      `No contract state found on chain for contract address '${UNDEPLOYED_CONTRACT_ADDRESS}'`
    );
  });
});
