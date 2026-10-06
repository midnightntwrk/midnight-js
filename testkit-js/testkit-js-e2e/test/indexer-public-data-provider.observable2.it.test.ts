/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
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

import { type ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  type All,
  type FinalizedTxData,
  type Latest,
  type PositionedRecord,
  type PublicDataProvider
} from '@midnight-ntwrk/midnight-js-types';
import {
  createLogger,
  getTestEnvironment,
  initializeMidnightProviders,
  type TestEnvironment
} from '@midnight-ntwrk/testkit-js';
import path from 'path';
import { firstValueFrom, type Observable, ReplaySubject, take, timeout, toArray } from 'rxjs';

import { SLOW_TEST_TIMEOUT, VERY_SLOW_TEST_TIMEOUT } from '../src/constants';
import { CompiledCounter } from '../src/contract';
import * as api from '../src/counter-api';
import { CONTRACT_CIRCUITS, CounterConfiguration } from '../src/counter-api';
import { type CounterProviders, type DeployedCounterContract, privateStateZero } from '../src/types/counter-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `indexer_${new Date().toISOString()}.log`)
);

const { ledger } = CompiledCounter;

const STATE_WAIT_MS = 120_000;

describe('Indexer API', () => {
  let publicDataProvider: PublicDataProvider;
  let providers: CounterProviders;
  let testEnvironment: TestEnvironment;

  let deployedContractObserved: DeployedCounterContract;
  let incrementFinalizedTxData: FinalizedTxData;

  const expectObservedContractStatesToEqual = async (
    observable$: Observable<PositionedRecord<ContractState>>,
    expectedStates: bigint[]
  ): Promise<void> => {
    const records = await firstValueFrom(
      observable$.pipe(timeout({ each: STATE_WAIT_MS }), take(expectedStates.length), toArray())
    );
    for (const { value } of records) {
      expect([...value.operations()].sort()).toEqual([...CONTRACT_CIRCUITS].sort());
    }
    expect(records.map(({ value }) => ledger(value.data).round)).toEqual(expectedStates);
    for (const { blockHeight, blockHash } of records) {
      expect(blockHeight).toBeGreaterThan(0);
      expect(blockHash).toMatch(/^[0-9a-f]{64}$/);
    }
  };

  const observeFromFirstState = async (
    observable$: Observable<PositionedRecord<ContractState>>
  ): Promise<{ observed$: Observable<PositionedRecord<ContractState>>; stop: () => void }> => {
    const observed = new ReplaySubject<PositionedRecord<ContractState>>();
    const subscription = observable$.subscribe(observed);
    try {
      await firstValueFrom(observed.pipe(timeout({ first: STATE_WAIT_MS })));
    } catch (error) {
      subscription.unsubscribe();
      throw error;
    }
    return { observed$: observed.asObservable(), stop: () => subscription.unsubscribe() };
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
  test.each([
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

      await expectObservedContractStatesToEqual(observable$, expectedStates);
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
  const expectStatesObservedAcrossAnIncrement = async (config: All | Latest, expectedStates: bigint[]) => {
    const { observed$, stop } = await observeFromFirstState(
      publicDataProvider.contractStateObservable(deployedContractObserved.deployTxData.public.contractAddress, config)
    );
    try {
      await api.increment(deployedContractObserved);

      await expectObservedContractStatesToEqual(observed$, expectedStates);
    } finally {
      stop();
    }
  };

  // Known defect #1398: `all` subscribes from the latest block, not from the deploy.
  test.fails(
    'should return the entire history of states of the contract with the given address (config:all, expected states:0,1,2) [@slow]',
    () => expectStatesObservedAcrossAnIncrement({ type: 'all' }, [0n, 1n, 2n]),
    SLOW_TEST_TIMEOUT
  );

  test(
    'should return the history of states of the contract with the given address, starting with the most recent state (config:latest, expected states:1,2) [@slow]',
    () => expectStatesObservedAcrossAnIncrement({ type: 'latest' }, [1n, 2n]),
    SLOW_TEST_TIMEOUT
  );

  /**
   * Test resuming a contract state observable from an emitted position.
   *
   * @given A deployed contract with incremented state
   * @and A record emitted by an observable started at the increment's block
   * @when Creating a new observable from that record's blockHeight
   * @and Executing additional increment operation
   * @then Should return every state from the record's block onward, with no gap
   */
  test(
    'should resume from an emitted blockHeight without a gap [@slow]',
    async () => {
      const contractAddress = deployedContractObserved.deployTxData.public.contractAddress;
      const first = await firstValueFrom(
        publicDataProvider.contractStateObservable(contractAddress, {
          type: 'blockHash',
          blockHash: incrementFinalizedTxData.blockHash
        })
      );

      const resumed$ = publicDataProvider.contractStateObservable(contractAddress, {
        type: 'blockHeight',
        blockHeight: first.blockHeight
      });
      await api.increment(deployedContractObserved);

      await expectObservedContractStatesToEqual(resumed$, [1n, 2n]);
    },
    SLOW_TEST_TIMEOUT
  );
});
