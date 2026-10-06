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
  type FinalizedTxData,
  type FinalizedTxRecord,
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
import { firstValueFrom, type Observable, take, timeout, timer, toArray } from 'rxjs';

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
const QUIET_WINDOW_MS = 30_000;

describe('Indexer API', () => {
  let publicDataProvider: PublicDataProvider;
  let providers: CounterProviders;
  let testEnvironment: TestEnvironment;

  let deployedContractObserved: DeployedCounterContract;
  let incrementFinalizedTxData: FinalizedTxData;

  const expectObservedContractStatesToEqual = async (
    observable$: Observable<PositionedRecord<ContractState>>,
    expected: readonly (readonly [round: bigint, writtenBy: FinalizedTxRecord])[]
  ): Promise<void> => {
    const records = await firstValueFrom(
      observable$.pipe(timeout({ each: STATE_WAIT_MS }), take(expected.length), toArray())
    );
    for (const { value } of records) {
      expect([...value.operations()].sort()).toEqual([...CONTRACT_CIRCUITS].sort());
    }
    expect(
      records.map(({ value, blockHeight, blockHash }) => ({ round: ledger(value.data).round, blockHeight, blockHash }))
    ).toEqual(
      expected.map(([round, { blockHeight, blockHash }]) => ({ round, blockHeight, blockHash }))
    );
  };

  const roundsObservedAcrossAnIncrement = async (
    observable$: Observable<PositionedRecord<ContractState>>
  ): Promise<bigint[]> => {
    const rounds: bigint[] = [];
    let failure: unknown;
    const subscription = observable$.subscribe({
      next: ({ value }) => rounds.push(ledger(value.data).round),
      error: (error: unknown) => {
        failure = error;
      }
    });
    try {
      await api.increment(deployedContractObserved);
      await firstValueFrom(timer(QUIET_WINDOW_MS));
    } finally {
      subscription.unsubscribe();
    }
    if (failure !== undefined) {
      throw failure;
    }
    return rounds;
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
  test.each([true, false])(
    'should return the history of states starting from defined blockHash (inclusive:%s) [@slow]',
    async (inclusive) => {
      const observable$ = publicDataProvider.contractStateObservable(
        deployedContractObserved.deployTxData.public.contractAddress,
        {
          type: 'blockHash',
          blockHash: incrementFinalizedTxData.blockHash,
          inclusive
        }
      );
      const secondIncrement = await api.increment(deployedContractObserved);

      await expectObservedContractStatesToEqual(
        observable$,
        inclusive
          ? [
              [1n, incrementFinalizedTxData],
              [2n, secondIncrement]
            ]
          : [[2n, secondIncrement]]
      );
    },
    SLOW_TEST_TIMEOUT
  );

  /**
   * Pins known defect #1424: against a real indexer the txId branch emits no state at all, not even
   * the named transaction's. When #1424 is fixed this test fails; replace it with the expected
   * history (inclusive: 1n, 2n; exclusive: 2n), asserted with expectObservedContractStatesToEqual.
   *
   * @given A deployed contract with incremented state
   * @and The increment's transaction ID as starting point
   * @when Observing from that transaction ID across an additional increment
   * @then No state arrives
   */
  test.each([true, false])(
    'known defect #1424: the txId stream emits no state (inclusive:%s) [@slow]',
    async (inclusive) => {
      const observable$ = publicDataProvider.contractStateObservable(
        deployedContractObserved.deployTxData.public.contractAddress,
        { type: 'txId', txId: incrementFinalizedTxData.txId, inclusive }
      );

      const rounds = await roundsObservedAcrossAnIncrement(observable$);

      expect(rounds).toEqual([]);
    },
    SLOW_TEST_TIMEOUT
  );
});
