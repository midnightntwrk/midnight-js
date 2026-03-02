/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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
  createUnprovenCallTx,
  type FinalizedDeployTxData,
  submitTx
} from '@midnight-ntwrk/midnight-js-contracts';
import { FailEntirely, SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import {
  type EnvironmentConfiguration,
  type MidnightWalletProvider,
  syncWallet,
  type TestEnvironment
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
import { CompiledBlockTimeContract } from '@/contract';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `block_time_${new Date().toISOString()}.log`)
);

const currentTimeSeconds = () => BigInt(Math.floor(Date.now() / 1_000));

// We don't want to use vitest virtual time because we want time to proceed relatively
// uniformly on the node and the local device for testing and advancing local device time
// without advancing time on node container risks them being unintentionally inconsistent.
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe('Block Time Contract Tests 2', () => {
  const SLOW_TEST_TIMEOUT = 240_000;

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
    logger.info(`Sync wallet: ${syncWallet(wallet.wallet)}`);
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
    describe('should demonstrate different failure points for Lt check', async () => {
      test(
        'Immediate past time - fails on device',
        async () => {
          const pastTime = currentTimeSeconds() - 5n;
          await expect(() => api.testBlockTimeLt(deployedContract, pastTime)).rejects.toThrow('Block time is >= time');
        },
        SLOW_TEST_TIMEOUT
      );

      // TODO: Uncomment once PM-19372 is resolved
      test.skip(
        'Near future time with delay - succeeds on device, fails on node',
        async () => {
          const nearFutureTime = currentTimeSeconds() + 2n;
          const unprovenCallTxOptions = {
            compiledContract: CompiledBlockTimeContract,
            circuitId: api.CIRCUIT_ID_TEST_BLOCK_TIME_LT,
            contractAddress,
            args: [nearFutureTime] as [bigint]
          };
          const unprovenCallTx = await createUnprovenCallTx(providers, unprovenCallTxOptions);
          await sleep(3000);
          const finalizedCallTx = await submitTx(providers, {
            unprovenTx: unprovenCallTx.private.unprovenTx,
            circuitId: unprovenCallTxOptions.circuitId
          });
          expect(finalizedCallTx.status).toEqual(FailEntirely);
        },
        SLOW_TEST_TIMEOUT
      );

      test(
        'Far future time - succeeds on both device and node',
        async () => {
          const farFutureTime = currentTimeSeconds() + 120n;
          const finalizedTx = await api.testBlockTimeLt(deployedContract, farFutureTime);
          expect(finalizedTx.status).toEqual(SucceedEntirely);
        },
        SLOW_TEST_TIMEOUT
      );
    });

    test('should handle maximum time values', async () => {
      const maxTime = 2n ** 63n - 1n; // Max value for Uint<64>
      // Lt should succeed with max time (current time is always less)
      const finalizedTx = await api.testBlockTimeLt(deployedContract, maxTime);
      expect(finalizedTx.status).toEqual(SucceedEntirely);
    }, SLOW_TEST_TIMEOUT);

    test('should handle zero time value', async () => {
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
