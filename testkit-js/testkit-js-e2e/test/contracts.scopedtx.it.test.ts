/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



import { type ContractAddress } from '@midnight-ntwrk/ledger-v7';
import {
  type FinalizedDeployTxData,
  submitCallTx,  withContractScopedTransaction} from '@midnight-ntwrk/midnight-js-contracts';
import type {
  EnvironmentConfiguration,
  MidnightWalletProvider,
  TestEnvironment} from '@midnight-ntwrk/testkit-js';
import {
  createLogger,
  getTestEnvironment,
  initializeMidnightProviders} from '@midnight-ntwrk/testkit-js';
import path from 'path';

import * as api from '@/counter-api';
import {
  CIRCUIT_ID_INCREMENT,
  CounterConfiguration
} from '@/counter-api';
import {
  type CounterContract,
  CounterPrivateStateId,
  type CounterProviders,
  type DeployedCounterContract,
  privateStateZero
} from '@/counter-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `scoped_tx_contracts_${new Date().toISOString()}.log`)
);

describe('Scoped Transaction Contract Tests', () => {
  let providers: CounterProviders;
  let finalizedDeployTxData: FinalizedDeployTxData<CounterContract>;
  let deployedContract: DeployedCounterContract;
  let contractAddress: ContractAddress;
  let testEnvironment: TestEnvironment;
  let wallet: MidnightWalletProvider;
  let environmentConfiguration: EnvironmentConfiguration;
  let contractConfiguration: CounterConfiguration;

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

  it('should submit scoped transaction that calls circuit in contract [@slow]', async () => {
    const counterValue1 = await api.getCounterLedgerState(providers, contractAddress);
    expect(counterValue1).toBeDefined();

    const privateState1 = await api.getCounterPrivateState(providers, CounterPrivateStateId);
    expect(privateState1).toBeDefined();

    const callTxOptions = {
      contract: api.counterContractInstance,
      contractAddress,
      circuitId: CIRCUIT_ID_INCREMENT,
      privateStateId: CounterPrivateStateId
    } as const;
    const callTxData = await withContractScopedTransaction<CounterContract>(
      providers,
      async (txCtx) => {
        await submitCallTx(providers, callTxOptions, txCtx);
        await submitCallTx(providers, callTxOptions, txCtx);
      }
    );
    expect(callTxData.private.nextPrivateState.privateCounter).toEqual(privateState1!.privateCounter + 2);

    const counterValue2 = await api.getCounterLedgerState(providers, contractAddress);
    expect(counterValue2).toBeDefined();
    expect(counterValue2!).toEqual(counterValue1! + 2n);

    const counterPS = await api.getCounterPrivateState(providers, CounterPrivateStateId);
    expect(counterPS).toBeDefined();
    expect(counterPS!.privateCounter).toEqual(privateState1!.privateCounter + 2);
  });
});
