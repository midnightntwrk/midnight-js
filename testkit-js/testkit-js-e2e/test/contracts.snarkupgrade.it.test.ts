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

import type { ContractAddress } from '@midnight-ntwrk/ledger';
import {
  createCircuitCallTxInterface,
  createCircuitMaintenanceTxInterface,
  createCircuitMaintenanceTxInterfaces,
  submitRemoveVerifierKeyTx
} from '@midnight-ntwrk/midnight-js-contracts';
import { SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import type {
  EnvironmentConfiguration,
  MidnightWalletProvider,
  TestEnvironment
} from '@midnight-ntwrk/testkit-js';
import { createLogger, getTestEnvironment } from '@midnight-ntwrk/testkit-js';
import path from 'path';

import * as api from '@/counter-api';
import { CIRCUIT_ID_RESET, counterContractInstance } from '@/counter-api';
import { type CounterProviders } from '@/counter-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `contracts_snark_upgrade_${new Date().toISOString()}.log`)
);

describe('Contracts API Snark Upgrade [dedicated contract] [@slow]', () => {
  let testEnvironment: TestEnvironment;
  let wallet: MidnightWalletProvider;
  let environmentConfiguration: EnvironmentConfiguration;
  let counterProviders: CounterProviders;
  let contractAddress: ContractAddress;

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    api.setLogger(logger);
    wallet = await testEnvironment.getMidnightWalletProvider();
  });

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  beforeEach(async () => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
    ({ counterProviders, contractAddress } = await api.deployCounterContract(wallet, environmentConfiguration));
  });

  /**
   * Test successful verifier key removal using submitRemoveVerifierKeyTx.
   *
   * @given A deployed counter contract with verifier keys
   * @and Valid counter providers and contract address
   * @when Submitting remove verifier key transaction for reset circuit
   * @then Should successfully remove verifier key
   * @and Should return transaction with SucceedEntirely status
   */
  it('should successfully remove verifier key using submitRemoveVerifierKeyTx', async () => {
    const finalizedTxData = await submitRemoveVerifierKeyTx(counterProviders, contractAddress, CIRCUIT_ID_RESET);

    expect(finalizedTxData.status).toEqual(SucceedEntirely);
  });

  /**
   * Test successful verifier key removal using circuit maintenance interface.
   *
   * @given A deployed contract and circuit maintenance interface
   * @and Reset circuit identifier and contract address
   * @when Creating maintenance interface and removing verifier key
   * @then Should successfully remove verifier key
   * @and Should return transaction with SucceedEntirely status
   */
  it('should successfully remove verifier key using createContractMaintenanceTxInterface', async () => {
    const circuitMaintenanceTxInterface = createCircuitMaintenanceTxInterface(
      counterProviders,
      CIRCUIT_ID_RESET,
      contractAddress
    );
    const finalizedTxData = await circuitMaintenanceTxInterface.removeVerifierKey();

    expect(finalizedTxData.status).toEqual(SucceedEntirely);
  });

  /**
   * Test verifier key removal and contract interaction behavior.
   *
   * @given A deployed contract with multiple circuits
   * @and Circuit maintenance interfaces for all circuits
   * @when Removing verifier key for reset circuit
   * @and Attempting to interact with removed circuit
   * @then Should successfully remove verifier key
   * @and Should throw error when trying to use removed circuit operation
   */
  it('should successfully remove verifier key and disable circuit operation', async () => {
    const circuitMaintenanceTxInterfaces = createCircuitMaintenanceTxInterfaces(
      counterProviders,
      counterContractInstance,
      contractAddress
    );
    const finalizedTxData = await circuitMaintenanceTxInterfaces.reset.removeVerifierKey();
    expect(finalizedTxData.status).toEqual(SucceedEntirely);

    logger.info('Interact with contract');
    const contractCircuitsInterface = createCircuitCallTxInterface(
      counterProviders,
      counterContractInstance,
      contractAddress,
      'counterPrivateState'
    );

    await expect(() => contractCircuitsInterface.reset()).rejects.toThrow(
      "Operation 'reset' is undefined for contract state ContractState (Array(1) [\n" +
        '    <[-]: b8>,\n' +
        ']{\n' +
        '    increment: <verifier key>,\n' +
        '    decrement: <verifier key>,\n' +
        '}ContractState )'
    );
  });

  /**
   * Test verifier key insertion after removal.
   *
   * @given A deployed contract with existing verifier keys
   * @and Circuit maintenance interfaces and verifier key
   * @when Attempting to insert existing key (should fail)
   * @and Removing verifier key then inserting it back
   * @then Should fail on duplicate key insertion
   * @and Should succeed on insertion after removal with SucceedEntirely status
   */
  it('should succeed on verifier key insertion retry after removal', async () => {
    const vk = await counterProviders.zkConfigProvider.getVerifierKey(CIRCUIT_ID_RESET);
    const circuitMaintenanceTxInterfaces = createCircuitMaintenanceTxInterfaces(
      counterProviders,
      counterContractInstance,
      contractAddress
    );
    await expect(() => circuitMaintenanceTxInterfaces.reset.insertVerifierKey(vk)).rejects.toThrow(
      `Circuit 'reset' is already defined for contract at address '${contractAddress}'`
    );
    await circuitMaintenanceTxInterfaces.reset.removeVerifierKey();
    const finalizedTxData = await circuitMaintenanceTxInterfaces.reset.insertVerifierKey(vk);

    expect(finalizedTxData.status).toEqual(SucceedEntirely);
  });

  /**
   * Test verifier key insertion error handling for wrong circuit.
   *
   * @given A deployed contract with multiple circuits
   * @and Reset circuit verifier key and maintenance interfaces
   * @when Removing reset circuit verifier key
   * @and Attempting to insert reset key into increment circuit
   * @then Should fail with error about increment circuit already being defined
   * @and Should properly validate circuit-key correspondence
   */
  it('should fail when inserting verifier key for wrong circuit after removal', async () => {
    const vk = await counterProviders.zkConfigProvider.getVerifierKey(CIRCUIT_ID_RESET);
    const circuitMaintenanceTxInterfaces = createCircuitMaintenanceTxInterfaces(
      counterProviders,
      counterContractInstance,
      contractAddress
    );
    await circuitMaintenanceTxInterfaces.reset.removeVerifierKey();

    await expect(() => circuitMaintenanceTxInterfaces.increment.insertVerifierKey(vk)).rejects.toThrow(
      `Circuit 'increment' is already defined for contract at address '${contractAddress}'`
    );
  });
});
