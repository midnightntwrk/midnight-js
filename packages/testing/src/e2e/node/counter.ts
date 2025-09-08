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

import path from 'path';

import { CounterPrivateStateId, type CounterProviders, currentDir, privateStateZero } from '@/e2e';
import {
  type ContractConfiguration,
  type EnvironmentConfiguration,
  getTestEnvironment,
  initializeMidnightProviders,
  logger,
  type MidnightWalletProvider,
  type TestEnvironment
} from '@/infrastructure';

import * as api from '../counter-api';

export class CounterConfiguration implements ContractConfiguration {
  readonly privateStateStoreName;
  readonly zkConfigPath;
  constructor(privateStateStoreName?: string, zkConfigPath?: string) {
    this.privateStateStoreName = privateStateStoreName || 'counter-private-state';
    this.zkConfigPath = zkConfigPath || path.resolve(currentDir, '..', 'dist', 'contract', 'managed', 'counter');
  }
}

async function counter() {
  let providers: CounterProviders;
  let testEnvironment: TestEnvironment;
  let environmentConfiguration: EnvironmentConfiguration;
  let wallet: MidnightWalletProvider;
  let contractConfiguration: CounterConfiguration;

  logger.info('Starting counter...');
  try {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    contractConfiguration = new CounterConfiguration();
    api.setLogger(logger);
    wallet = await testEnvironment.getMidnightWalletProvider();
    providers = initializeMidnightProviders(wallet, environmentConfiguration, contractConfiguration);

    // Deploy the contract and call its methods
    const deployedCounterContract = await api.deploy(providers, privateStateZero);
    await api.increment(deployedCounterContract);
    await api.getCounterLedgerState(providers, deployedCounterContract.deployTxData.public.contractAddress);
    await api.getCounterPrivateState(providers, CounterPrivateStateId);
  } finally {
    await testEnvironment!.shutdown();
  }
}

counter().then((r) => logger.info('Counter test completed', r));
