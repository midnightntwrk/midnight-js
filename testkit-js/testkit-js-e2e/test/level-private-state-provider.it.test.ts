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

import type { ContractAddress } from '@midnight-ntwrk/ledger-v8';
import { createCircuitCallTxInterface, deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { PrivateStateExport, SigningKeyExport } from '@midnight-ntwrk/midnight-js-types';
import type { EnvironmentConfiguration, MidnightWalletProvider, TestEnvironment } from '@midnight-ntwrk/testkit-js';
import { createLogger, getTestEnvironment, initializeMidnightProviders } from '@midnight-ntwrk/testkit-js';
import * as fs from 'fs/promises';
import path from 'path';

import { SLOW_TEST_TIMEOUT } from '@/constants';
import { CompiledCounterContract } from '@/contract';
import { type CounterPrivateState } from '@/contract/witnesses';
import * as api from '@/counter-api';
import { CounterConfiguration } from '@/counter-api';
import { type CounterCircuit, CounterPrivateStateId, privateStateZero } from '@/types/counter-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `level-private-state-provider_${new Date().toISOString()}.log`)
);

const MIDNIGHT_LEVEL_DB_PATH = path.resolve(process.cwd(), 'midnight-level-db');
const EXPORT_PASSWORD = 'SecureExportPassword123!';

describe('Level Private State Provider - Export/Import Integration', () => {
  let testEnvironment: TestEnvironment;
  let wallet: MidnightWalletProvider;
  let environmentConfiguration: EnvironmentConfiguration;

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    api.setLogger(logger);
    wallet = await testEnvironment.getMidnightWalletProvider();
  });

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  /**
   * Test private state persistence through database recreation.
   *
   * @given A deployed counter contract with private state
   * @and Private state exported after first increment
   * @when Database is deleted and recreated with imported state
   * @then Second increment should correctly update the imported private state
   * @and Final private state should reflect both increments
   */
  test(
    'should preserve private state after database recreation [@slow]',
    async () => {
      const privateStateStoreName = `counter-export-import-test-${Date.now()}`;
      const contractConfiguration = new CounterConfiguration(privateStateStoreName);

      // ARRANGE - Phase 1: Deploy contract and perform first increment
      logger.info('Phase 1: Deploying contract and performing first increment');
      const providers = initializeMidnightProviders<CounterCircuit, CounterPrivateState>(
        wallet,
        environmentConfiguration,
        contractConfiguration
      );

      const deployedContract = await deployContract(providers, {
        compiledContract: CompiledCounterContract,
        privateStateId: CounterPrivateStateId,
        initialPrivateState: privateStateZero
      });
      const contractAddress: ContractAddress = deployedContract.deployTxData.public.contractAddress;
      logger.info(`Contract deployed at address: ${contractAddress}`);

      providers.privateStateProvider.setContractAddress(contractAddress);

      const circuitsInterface = createCircuitCallTxInterface(
        providers,
        CompiledCounterContract,
        contractAddress,
        CounterPrivateStateId
      );

      await circuitsInterface.increment();
      const privateStateAfterFirstIncrement = await api.getCounterPrivateState(providers, CounterPrivateStateId);
      logger.info(`Private state after first increment: ${privateStateAfterFirstIncrement?.privateCounter}`);
      expect(privateStateAfterFirstIncrement?.privateCounter).toBe(1);

      // ACT - Phase 2: Export private state and signing keys
      logger.info('Phase 2: Exporting private state and signing keys');
      const exportedPrivateStates: PrivateStateExport = await providers.privateStateProvider.exportPrivateStates({
        password: EXPORT_PASSWORD
      });
      const exportedSigningKeys: SigningKeyExport = await providers.privateStateProvider.exportSigningKeys({
        password: EXPORT_PASSWORD
      });
      logger.info('Export completed successfully');

      // ACT - Phase 3: Delete database
      logger.info(`Phase 3: Deleting database ${MIDNIGHT_LEVEL_DB_PATH}`);
      const result = await fs.rm(MIDNIGHT_LEVEL_DB_PATH, { recursive: true, force: true });
      expect(result).toBeUndefined();
      logger.info('Database deleted');

      // ACT - Phase 4: Create new providers and import state
      logger.info('Phase 4: Creating new providers and importing state');
      const newProviders = initializeMidnightProviders<CounterCircuit, CounterPrivateState>(
        wallet,
        environmentConfiguration,
        contractConfiguration
      );

      newProviders.privateStateProvider.setContractAddress(contractAddress);

      const importPrivateStatesResult = await newProviders.privateStateProvider.importPrivateStates(
        exportedPrivateStates,
        {
          password: EXPORT_PASSWORD,
          conflictStrategy: 'overwrite'
        }
      );
      logger.info(`Imported ${importPrivateStatesResult.imported} private states`);

      const importSigningKeysResult = await newProviders.privateStateProvider.importSigningKeys(exportedSigningKeys, {
        password: EXPORT_PASSWORD,
        conflictStrategy: 'overwrite'
      });
      logger.info(`Imported ${importSigningKeysResult.imported} signing keys`);

      // Verify import was successful
      const privateStateAfterImport = await newProviders.privateStateProvider.get(CounterPrivateStateId);
      logger.info(`Private state after import: ${privateStateAfterImport?.privateCounter}`);
      expect(privateStateAfterImport?.privateCounter).toBe(1);

      // ACT - Phase 5: Perform second increment with new providers
      logger.info('Phase 5: Performing second increment with new providers');
      const newCircuitsInterface = createCircuitCallTxInterface(
        newProviders,
        CompiledCounterContract,
        contractAddress,
        CounterPrivateStateId
      );

      await newCircuitsInterface.increment();

      // ASSERT - Final private state verification
      const finalPrivateState = await api.getCounterPrivateState(newProviders, CounterPrivateStateId);
      logger.info(`Final private state: ${finalPrivateState?.privateCounter}`);
      expect(finalPrivateState?.privateCounter).toBe(2);
    },
    SLOW_TEST_TIMEOUT
  );
});
