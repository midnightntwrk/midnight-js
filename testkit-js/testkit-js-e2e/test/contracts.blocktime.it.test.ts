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

import { type ContractAddress } from '@midnight-ntwrk/ledger';
import {
  createUnprovenCallTx,
  type FinalizedDeployTxData,
  submitTx
} from '@midnight-ntwrk/midnight-js-contracts';
import { FailEntirely, SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import type {
  EnvironmentConfiguration,
  MidnightWalletProvider,
  TestEnvironment
} from '@midnight-ntwrk/testkit-js';
import {
  createLogger,
  getTestEnvironment,
  initializeMidnightProviders
} from '@midnight-ntwrk/testkit-js';
import path from 'path';

import * as api from '@/block-time-api';
import { BlockTimeConfiguration } from '@/block-time-api';
import {
  type BlockTimeContract,
  type BlockTimeProviders,
  type DeployedBlockTimeContract
} from '@/block-time-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `block_time_${new Date().toISOString()}.log`)
);

const currentTimeSeconds = () => BigInt(Math.floor(Date.now() / 1_000));

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe('Block Time Contract Tests', () => {
  const SLOW_TEST_TIMEOUT = 240_000;
  const BLOCK_TIME_FUTURE_BUFFER = 60n;
  const BLOCK_TIME_PAST_BUFFER = 60n;

  let providers: BlockTimeProviders;
  let finalizedDeployTxData: FinalizedDeployTxData<BlockTimeContract>;
  let deployedContract: DeployedBlockTimeContract;
  let contractAddress: ContractAddress;
  let testEnvironment: TestEnvironment;
  let wallet: MidnightWalletProvider;
  let environmentConfiguration: EnvironmentConfiguration;
  let contractConfiguration: BlockTimeConfiguration;

  beforeEach(() => {
    logger.info(`Running test: ${expect.getState().currentTestName}`);
  });

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    contractConfiguration = new BlockTimeConfiguration();
    api.setLogger(logger);
    wallet = await testEnvironment.getMidnightWalletProvider();
    providers = initializeMidnightProviders(wallet, environmentConfiguration, contractConfiguration);
    deployedContract = await api.deploy(providers);
    finalizedDeployTxData = deployedContract.deployTxData;
    contractAddress = finalizedDeployTxData.public.contractAddress;
    logger.info(`Contract deployed at address: ${contractAddress}`);
  }, SLOW_TEST_TIMEOUT);

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  describe('blockTimeLt tests', () => {
    it('should succeed when both device time and node time are less than future time', async () => {
      const futureTime = currentTimeSeconds() + BLOCK_TIME_FUTURE_BUFFER;
      const finalizedTx = await api.testBlockTimeLt(deployedContract, futureTime);
      expect(finalizedTx.status).toEqual(SucceedEntirely);
    }, SLOW_TEST_TIMEOUT);

    it('should fail immediately on device when device time is already past the check time', async () => {
      const pastTime = currentTimeSeconds() - 10n;
      await expect(() => api.testBlockTimeLt(deployedContract, pastTime)).rejects.toThrow('Block time is >= time');
    });

    it('should succeed on device but fail on node when submission is delayed', async () => {
      const futureTime = currentTimeSeconds() + 3n; // Only 3 seconds in future
      const unprovenCallTxOptions = {
        contract: api.blockTimeContractInstance,
        circuitId: api.CIRCUIT_ID_TEST_BLOCK_TIME_LT,
        contractAddress,
        args: [futureTime] as [bigint]
      };
      const unprovenCallTx = await createUnprovenCallTx(providers, unprovenCallTxOptions);
      // Delay submission so node time exceeds futureTime
      await sleep(4000);
      // Should fail because node time > futureTime
      const finalizedCallTx = await submitTx(providers, {
        unprovenTx: unprovenCallTx.private.unprovenTx,
        newCoins: unprovenCallTx.private.newCoins,
        circuitId: unprovenCallTxOptions.circuitId
      });
      expect(finalizedCallTx.status).toEqual(FailEntirely);
    }, SLOW_TEST_TIMEOUT);

    it('should succeed when both device time and node time are greater than past time', async () => {
      const pastTime = currentTimeSeconds() - BLOCK_TIME_PAST_BUFFER;
      const finalizedTx = await api.testBlockTimeGte(deployedContract, pastTime);
      expect(finalizedTx.status).toEqual(SucceedEntirely);
    }, SLOW_TEST_TIMEOUT);

    it('should fail immediately on device when device time is less than check time', async () => {
      const futureTime = currentTimeSeconds() + BLOCK_TIME_FUTURE_BUFFER;
      await expect(() => api.testBlockTimeGte(deployedContract, futureTime)).rejects.toThrow('Block time is < time');
    });

    it('should succeed even with submission delay when checking past time', async () => {
      const pastTime = currentTimeSeconds() - 30n;
      const unprovenCallTxOptions = {
        contract: api.blockTimeContractInstance,
        circuitId: api.CIRCUIT_ID_TEST_BLOCK_TIME_GTE,
        contractAddress,
        args: [pastTime] as [bigint]
      };
      const unprovenCallTx = await createUnprovenCallTx(providers, unprovenCallTxOptions);
      // Delay submission
      await sleep(3000);
      // Should still succeed because node time is still >= pastTime
      const finalizedCallTx = await submitTx(providers, {
        unprovenTx: unprovenCallTx.private.unprovenTx,
        newCoins: unprovenCallTx.private.newCoins,
        circuitId: unprovenCallTxOptions.circuitId
      });
      expect(finalizedCallTx.status).toEqual(SucceedEntirely);
    }, SLOW_TEST_TIMEOUT);

    it('should succeed when both device time and node time are greater than past time', async () => {
      const pastTime = currentTimeSeconds() - BLOCK_TIME_PAST_BUFFER;
      const finalizedTx = await api.testBlockTimeGt(deployedContract, pastTime);
      expect(finalizedTx.status).toEqual(SucceedEntirely);
    }, SLOW_TEST_TIMEOUT);

    it('should fail when device time is not greater than check time', async () => {
      const futureTime = currentTimeSeconds() + BLOCK_TIME_FUTURE_BUFFER;
      await expect(() => api.testBlockTimeGt(deployedContract, futureTime)).rejects.toThrow('Block time is <= time');
    });

    it('should succeed when both device time and node time are less than or equal to future time', async () => {
      const futureTime = currentTimeSeconds() + BLOCK_TIME_FUTURE_BUFFER;
      const finalizedTx = await api.testBlockTimeLte(deployedContract, futureTime);
      expect(finalizedTx.status).toEqual(SucceedEntirely);
    }, SLOW_TEST_TIMEOUT);

    it('should fail immediately on device when device time exceeds check time', async () => {
      const pastTime = currentTimeSeconds() - BLOCK_TIME_PAST_BUFFER;
      await expect(() => api.testBlockTimeLte(deployedContract, pastTime)).rejects.toThrow('Block time is > time');
    });

    // TODO: Uncomment once PM-19372 is resolved
    // it('should succeed on device but fail on node when submission delay causes time to exceed threshold', async () => {
    //   const futureTime = currentTimeSeconds() + 2n; // Only 2 seconds in future
    //   const unprovenCallTxOptions = {
    //     contract: api.blockTimeContractInstance,
    //     circuitId: api.CIRCUIT_ID_TEST_BLOCK_TIME_LTE,
    //     contractAddress,
    //     args: [futureTime] as [bigint]
    //   };
    //   const unprovenCallTx = await createUnprovenCallTx(providers, unprovenCallTxOptions);
    //   // Delay so node time exceeds futureTime
    //   await sleep(4000);
    //   const finalizedCallTx = await submitTx(providers, {
    //     unprovenTx: unprovenCallTx.private.unprovenTx,
    //     newCoins: unprovenCallTx.private.newCoins,
    //     circuitId: unprovenCallTxOptions.circuitId
    //   });
    //   expect(finalizedCallTx.status).toEqual(FailEntirely);
    // }, SLOW_TEST_TIMEOUT);

    it('should demonstrate different failure points for Lt check', async () => {
      // Test 1: Immediate past time - fails on device
      const pastTime = currentTimeSeconds() - 5n;
      await expect(() => api.testBlockTimeLt(deployedContract, pastTime)).rejects.toThrow('Block time is >= time');

      // TODO: Uncomment once PM-19372 is resolved
      // Test 2: Near future time with delay - succeeds on device, fails on node
      // const nearFutureTime = currentTimeSeconds() + 2n;
      // const unprovenCallTxOptions = {
      //   contract: api.blockTimeContractInstance,
      //   circuitId: api.CIRCUIT_ID_TEST_BLOCK_TIME_LT,
      //   contractAddress,
      //   args: [nearFutureTime] as [bigint]
      // };
      // const unprovenCallTx = await createUnprovenCallTx(providers, unprovenCallTxOptions);
      // await sleep(3000);
      // const finalizedCallTx = await submitTx(providers, {
      //   unprovenTx: unprovenCallTx.private.unprovenTx,
      //   newCoins: unprovenCallTx.private.newCoins,
      //   circuitId: unprovenCallTxOptions.circuitId
      // });
      // expect(finalizedCallTx.status).toEqual(FailEntirely);

      // Test 3: Far future time - succeeds on both device and node
      const farFutureTime = currentTimeSeconds() + 120n;
      const finalizedTx = await api.testBlockTimeLt(deployedContract, farFutureTime);
      expect(finalizedTx.status).toEqual(SucceedEntirely);
    }, SLOW_TEST_TIMEOUT);

    it('should handle maximum time values', async () => {
      const maxTime = 2n ** 63n - 1n; // Max value for Uint<64>
      // Lt should succeed with max time (current time is always less)
      const finalizedTx = await api.testBlockTimeLt(deployedContract, maxTime);
      expect(finalizedTx.status).toEqual(SucceedEntirely);
    }, SLOW_TEST_TIMEOUT);

    it('should handle zero time value', async () => {
      const zeroTime = 0n;
      // Lt with 0 should fail (block time is always >= 0)
      await expect(() => api.testBlockTimeLt(deployedContract, zeroTime)).rejects.toThrow('Block time is >= time');

      // Lte with 0 should fail (block time is always > 0)
      await expect(() => api.testBlockTimeLte(deployedContract, zeroTime)).rejects.toThrow('Block time is > time');

      // Gte with 0 should succeed (block time is always >= 0)
      const gteTx = await api.testBlockTimeGte(deployedContract, zeroTime);
      expect(gteTx.status).toEqual(SucceedEntirely);

      // Gt with 0 should succeed (block time is always > 0)
      const gtTx = await api.testBlockTimeGt(deployedContract, zeroTime);
      expect(gtTx.status).toEqual(SucceedEntirely);
    }, SLOW_TEST_TIMEOUT);
  });
});
