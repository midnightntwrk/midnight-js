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

import type { DeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import {
  createLogger,
  type EnvironmentConfiguration,
  expectSuccessfulDeployTx,
  getTestEnvironment,
  initializeMidnightProviders,
  type MidnightWalletProvider,
  type TestEnvironment
} from '@midnight-ntwrk/testkit-js';
import path from 'path';

import * as api from '@/adt-list-api';
import type { AdtListContract, AdtListProviders } from '@/adt-list-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `contracts_adtlist_${new Date().toISOString()}.log`)
);

describe('AdtList Contract Circuits', () => {
  let providers: AdtListProviders;
  let testEnvironment: TestEnvironment;
  let environmentConfiguration: EnvironmentConfiguration;
  let wallet: MidnightWalletProvider;
  let contractConfiguration: api.AdtListConfiguration;
  let deployedContract: DeployedContract<AdtListContract>;

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    contractConfiguration = new api.AdtListConfiguration();
    wallet = await testEnvironment.getMidnightWalletProvider();
    providers = initializeMidnightProviders(wallet, environmentConfiguration, contractConfiguration);

    deployedContract = await deployContract(providers, {
      compiledContract: api.CompiledAdtListContract
    });
    await expectSuccessfulDeployTx(providers, deployedContract.deployTxData);
  });

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  it('should call test circuit [@slow]', async () => {
    const result = await deployedContract.callTx.test();
    expect(result.public.txId).toBeDefined();
  });

  it.only('should call mint_coins_for_test circuit [@slow]', async () => {
    const result = await deployedContract.callTx.mint_coins_only_test();
    expect(result.public.txId).toBeDefined();
  });

  it('should call mint_coins_for_test circuit [@slow]', async () => {
    const result = await deployedContract.callTx.mint_coins_for_test();
    expect(result.public.txId).toBeDefined();
  });

  it('should call test_coin_operations circuit [@slow]', async () => {
    const result = await deployedContract.callTx.test_coin_operations();
    expect(result.public.txId).toBeDefined();
  });
});
