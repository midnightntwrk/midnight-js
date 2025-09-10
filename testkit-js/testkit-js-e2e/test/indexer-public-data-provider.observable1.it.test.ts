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
import { type FinalizedTxData, type PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';
import path from 'path';
import { type Observable, toArray } from 'rxjs';

import { SLOW_TEST_TIMEOUT, VERY_SLOW_TEST_TIMEOUT } from '@/constants';
import { CompiledCounter } from '@/e2e/contract';
import * as api from '@/counter-api';
import { CONTRACT_CIRCUITS, CounterConfiguration } from '@/counter-api';
import { type CounterProviders, type DeployedCounterContract, privateStateZero } from '@/counter-types';
import {
  createLogger,
  getTestEnvironment,
  initializeMidnightProviders,
  type TestEnvironment
} from '@midnight-ntwrk/testkit-js';

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
   * Test contract state observable with block hash starting point.
   *
   * @given A deployed contract with incremented state
   * @and A specific block hash as starting point
   * @when Creating observable from defined block hash with inclusive/exclusive options
   * @and Executing additional increment operation
   * @then Should return correct state history based on inclusive flag
   * @and Should observe states in proper chronological order
   */
  it.each([
    [true, [1n, 2n]],
    [false, [2n]]
  ])(
    'should return the history of states starting from defined blockHash (inclusive:%s, expected:%s) [@slow]',
    async (inclusive, expectedStates) => {
      const observable$ = publicDataProvider.contractStateObservable(
        deployedContractObserved.deployTxData.public.contractAddress,
        {
          type: 'blockHash',
          blockHash: incrementFinalizedTxData.blockHash,
          inclusive
        }
      );
      await api.increment(deployedContractObserved);

      expectObservedContractStatesToEqual(observable$, expectedStates);
    },
    SLOW_TEST_TIMEOUT
  );

  /**
   * Test contract state observable with transaction ID starting point.
   *
   * @given A deployed contract with incremented state
   * @and A specific transaction ID as starting point
   * @when Creating observable from defined transaction ID with inclusive/exclusive options
   * @and Executing additional increment operation
   * @then Should return correct state history based on inclusive flag
   * @and Should observe states matching transaction-based filtering
   */
  it.each([
    [true, [1n, 2n]],
    [false, [2n]]
  ])(
    'should return the history of states starting from defined txId (inclusive:%s, expected states:%s) [@slow]',
    async (inclusive, expectedStates) => {
      const observable$ = publicDataProvider.contractStateObservable(
        deployedContractObserved.deployTxData.public.contractAddress,
        { type: 'txId', txId: incrementFinalizedTxData.txId, inclusive }
      );
      await api.increment(deployedContractObserved);

      expectObservedContractStatesToEqual(observable$, expectedStates);
    },
    SLOW_TEST_TIMEOUT
  );
});
