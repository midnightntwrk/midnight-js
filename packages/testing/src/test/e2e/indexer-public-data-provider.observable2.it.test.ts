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

import { type ContractState } from '@midnight-ntwrk/compact-runtime';
import {
  type All,
  type FinalizedTxData,
  type Latest,
  type PublicDataProvider
} from '@midnight-ntwrk/midnight-js-types';
import path from 'path';
import { type Observable, toArray } from 'rxjs';

import * as api from '@/e2e/api';
import { CounterConfiguration } from '@/e2e/api';
import { CONTRACT_CIRCUITS, SLOW_TEST_TIMEOUT, VERY_SLOW_TEST_TIMEOUT } from '@/e2e/constants';
import { CompiledCounter } from '@/e2e/contract';
import { type CounterProviders, type DeployedCounterContract, privateStateZero } from '@/e2e/counter-types';
import {
  createLogger,
  getTestEnvironment,
  initializeMidnightProviders,
  type TestEnvironment
} from '@/infrastructure';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `indexer_${new Date().toISOString()}.log`)
);

const { ledger } = CompiledCounter;

describe('Indexer API', () => {
  let publicDataProvider: PublicDataProvider;
  let providers: CounterProviders;
  let testEnvironment: TestEnvironment;

  let deployedContractObserved: DeployedCounterContract;
  let incrementFinalizedTxData: FinalizedTxData;

  const expectObservedContractStatesToEqual = (observable$: Observable<ContractState>, expectedStates: bigint[]) => {
    observable$
      .pipe(toArray())
      .subscribe((states) => {
        const ledgerStates: bigint[] = [];
        states.forEach((state) => {
          expect(state).not.toBeNull();
          expect(state?.operations()).toEqual(CONTRACT_CIRCUITS);
          ledgerStates.push(ledger(state.data).round);
        });
        expect(ledgerStates).toEqual(expectedStates);
      })
      .unsubscribe();
  };

  beforeEach(async () => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
    deployedContractObserved = await api.deploy(providers, privateStateZero);
    incrementFinalizedTxData = await api.increment(deployedContractObserved);
  });

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    const environmentConfiguration = await testEnvironment.start();
    api.setLogger(logger);
    logger.info(`Private state: ${JSON.stringify(privateStateZero)}`);
    const wallet = await testEnvironment.getMidnightWalletProvider();
    providers = initializeMidnightProviders(wallet, environmentConfiguration, new CounterConfiguration());
    publicDataProvider = providers.publicDataProvider;
  }, VERY_SLOW_TEST_TIMEOUT);

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  /**
   * Test contract state observable with block height starting point.
   *
   * @given A deployed contract with incremented state
   * @and A specific block height as starting point
   * @when Creating observable from defined block height with inclusive/exclusive options
   * @and Executing additional increment operation
   * @then Should return correct state history based on inclusive flag
   * @and Should observe states in proper chronological order from block height
   */
  it.each([
    [true, [1n, 2n]],
    [false, [2n]]
  ])(
    'should return the history of states starting from defined blockHeight (inclusive:%s, expected states:%s) [@slow]',
    async (inclusive, expectedStates) => {
      const observable$ = publicDataProvider.contractStateObservable(
        deployedContractObserved.deployTxData.public.contractAddress,
        {
          type: 'blockHeight',
          blockHeight: incrementFinalizedTxData.blockHeight,
          inclusive
        }
      );
      await api.increment(deployedContractObserved);

      expectObservedContractStatesToEqual(observable$, expectedStates);
    },
    SLOW_TEST_TIMEOUT
  );

  /**
   * Test contract state observable with different configuration types.
   *
   * @given A deployed contract with incremented state
   * @and Different observable configuration types (all, latest)
   * @when Creating observable with all states or latest states configuration
   * @and Executing additional increment operation
   * @then Should return complete history for 'all' configuration
   * @and Should return recent history for 'latest' configuration
   * @and Should observe states matching the configuration type requirements
   */
  it.each([
    [
      'should return the entire history of states of the contract with the given address',
      { type: 'all' } as All,
      [0n, 1n, 2n]
    ],
    [
      'should return the history of states of the contract with the given address, starting with the most recent state',
      { type: 'latest' } as Latest,
      [1n, 2n]
    ]
  ])(
    '%s (config:%s, expected states:%s) [@slow]',
    async (_, configType, expectedStates) => {
      const observable$ = publicDataProvider.contractStateObservable(
        deployedContractObserved.deployTxData.public.contractAddress,
        configType
      );
      await api.increment(deployedContractObserved);

      expectObservedContractStatesToEqual(observable$, expectedStates);
    },
    SLOW_TEST_TIMEOUT
  );
});
