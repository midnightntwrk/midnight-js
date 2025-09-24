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
  createCircuitMaintenanceTxInterfaces,
  findDeployedContract,
  submitRemoveVerifierKeyTx,
  submitReplaceAuthorityTx
} from '@midnight-ntwrk/midnight-js-contracts';
import { SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import {
  createLogger,
  type EnvironmentConfiguration,
  getTestEnvironment,
  initializeMidnightProviders,
  type MidnightWalletProvider,
  type TestEnvironment} from '@midnight-ntwrk/testkit-js';
import path from 'path';

import { VERY_SLOW_TEST_TIMEOUT } from '@/constants';
import { type CounterPrivateState } from '@/contract';
import * as api from '@/counter-api';
import {
  CIRCUIT_ID_RESET,
  cloneContractInstance,
  CounterCloneConfiguration,
  counterContractInstance
} from '@/counter-api';
import { CounterClonePrivateStateId } from '@/counter-clone-types';
import { type CounterProviders } from '@/counter-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `contracts_snark_upgrade_${new Date().toISOString()}.log`)
);

describe('Contracts API Snark Upgrade [@slow][@smoke]', () => {
  let testEnvironment: TestEnvironment;
  let wallet: MidnightWalletProvider;
  let environmentConfiguration: EnvironmentConfiguration;
  let counterCloneContractProviders: CounterProviders;
  let counterProviders: CounterProviders;
  let contractAddress: ContractAddress;
  let privateState: CounterPrivateState;

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
  });

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  beforeEach(async () => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
    ({ counterProviders, contractAddress, privateState } = await api.deployCounterContract(
      wallet,
      environmentConfiguration
    ));
  });

  /**
   * Test updating verifier keys from one contract to another.
   *
   * @given A deployed counter contract with original verifier keys
   * @and Clone contract providers with different verifier keys
   * @when Removing all original verifier keys
   * @and Inserting new verifier keys from clone contract
   * @and Interacting with contract using new keys
   * @then Should successfully remove all original keys
   * @and Should successfully insert all new keys
   * @and Should enable contract operations with new verifier keys
   *
   * @smoke Test validates complete verifier key replacement workflow
   */
  it(
    'should update verifier keys from one contract to another [@smoke]',
    async () => {
      const circuitMaintenanceTxInterfaces = createCircuitMaintenanceTxInterfaces(
        counterProviders,
        counterContractInstance,
        contractAddress
      );

      logger.info('Remove keys');
      const finalizedTxDataReset = await circuitMaintenanceTxInterfaces.reset.removeVerifierKey();
      const finalizedTxDataIncrement = await circuitMaintenanceTxInterfaces.increment.removeVerifierKey();
      const finalizedTxDataDecrement = await circuitMaintenanceTxInterfaces.decrement.removeVerifierKey();

      expect(finalizedTxDataReset.status).toEqual(SucceedEntirely);
      expect(finalizedTxDataIncrement.status).toEqual(SucceedEntirely);
      expect(finalizedTxDataDecrement.status).toEqual(SucceedEntirely);

      logger.info('Insert keys');
      const vkReset = await counterCloneContractProviders.zkConfigProvider.getVerifierKey('reset');
      const vkIncrement = await counterCloneContractProviders.zkConfigProvider.getVerifierKey('increment');
      const vkDecrement = await counterCloneContractProviders.zkConfigProvider.getVerifierKey('decrement');

      const finalizedTxDataReset2 = await circuitMaintenanceTxInterfaces.reset.insertVerifierKey(vkReset);
      const finalizedTxDataIncrement2 = await circuitMaintenanceTxInterfaces.increment.insertVerifierKey(vkIncrement);
      const finalizedTxDataDecrement2 = await circuitMaintenanceTxInterfaces.decrement.insertVerifierKey(vkDecrement);

      expect(finalizedTxDataReset2.status).toEqual(SucceedEntirely);
      expect(finalizedTxDataIncrement2.status).toEqual(SucceedEntirely);
      expect(finalizedTxDataDecrement2.status).toEqual(SucceedEntirely);

      logger.info('Interact with contract');
      const contract = await findDeployedContract(counterCloneContractProviders, {
        contract: cloneContractInstance,
        contractAddress,
        privateStateId: CounterClonePrivateStateId,
        initialPrivateState: privateState
      });

      const finalizedTxDataIncrement3 = await contract.callTx.increment();
      const finalizedTxDataDecrement3 = await contract.callTx.decrement(1n);
      const finalizedTxDataReset3 = await contract.callTx.reset();

      expect(finalizedTxDataReset3.public.status).toEqual(SucceedEntirely);
      expect(finalizedTxDataIncrement3.public.status).toEqual(SucceedEntirely);
      expect(finalizedTxDataDecrement3.public.status).toEqual(SucceedEntirely);
    },
    VERY_SLOW_TEST_TIMEOUT
  );

  /**
   * Test authority replacement and access control validation.
   *
   * @given A deployed contract with original authority
   * @and Old authority signing key stored in private state provider
   * @when Replacing authority with new signing key
   * @and Attempting to use old authority for operations
   * @then Should successfully replace authority
   * @and Should fail when using old authority for maintenance operations
   */
  it(
    'should fail on operate with previous authority after replacement',
    async () => {
      const oldAuthority = await counterProviders.privateStateProvider.getSigningKey(contractAddress);
      expect(oldAuthority).not.toBeNull();

      if (oldAuthority) {
        const newAuthority = sampleSigningKey();
        const finalizedTxData = await submitReplaceAuthorityTx(counterProviders, contractAddress)(newAuthority);

        expect(finalizedTxData.status).toEqual(SucceedEntirely);

        await counterProviders.privateStateProvider.setSigningKey(contractAddress, oldAuthority);

        await expect(submitRemoveVerifierKeyTx(counterProviders, contractAddress, CIRCUIT_ID_RESET)).rejects.toThrow(
          'Invalid Transaction'
        );
      }
    },
    VERY_SLOW_TEST_TIMEOUT
  );
});
