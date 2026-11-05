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

import path from 'node:path';

import {
  deployContract,
  type Ledger8CallTxOptions,
  type Ledger8ContractProviders,
  type Ledger8TransactionContext,
  submitCallTx,
  withContractScopedTransaction,
  withLedger8ContractScopedTransaction
} from '@midnight-ntwrk/midnight-js-contracts';
import { versionOfRecord } from '@midnight-ntwrk/midnight-js-protocol';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { type PrivateStateId, SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import type { ZkConfigIntegrityOptions } from '@midnight-ntwrk/midnight-js-utils';
import {
  type ContractConfiguration,
  createLogger,
  type EnvironmentConfiguration,
  getTestEnvironment,
  initializeMidnightProviders,
  type MidnightWalletProvider,
  type TestEnvironment
} from '@midnight-ntwrk/testkit-js';
import { ContractState } from 'compact-runtime-ledger8';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { SLOW_TEST_TIMEOUT, VERY_SLOW_TEST_TIMEOUT } from '../src/constants';
import {
  Contract as RetainedDoubleCounterContract,
  ledger
} from '../src/contract/compiled-retained/double-counter/contract/index.js';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `scoped_tx_v8era_${new Date().toISOString()}.log`)
);

interface CounterPrivateState {
  readonly privateCounter: number;
}

const PRIVATE_STATE_ID: PrivateStateId = 'retained-double-counter';
const RUN_SUFFIX = Date.now().toString();

class RetainedDoubleCounterConfiguration implements ContractConfiguration {
  get privateStateStoreName(): string {
    return `retained-double-counter-private-store-${RUN_SUFFIX}`;
  }

  get zkConfigPath(): string {
    return path.resolve(__dirname, '../src/contract/compiled-retained/double-counter');
  }

  /** `compactc` 0.31.1 emits no manifest, so the default `require` mode has nothing to read. */
  get zkConfigIntegrity(): ZkConfigIntegrityOptions {
    return { verify: 'warn' };
  }
}

const contract = new RetainedDoubleCounterContract<CounterPrivateState>({
  privateCircuitCall: ({ privateState }) => [{ privateCounter: privateState.privateCounter + 1 }, []]
});

type DoubleCounter = typeof contract;
type Circuit = 'increment1' | 'increment2' | 'reset';
type Providers = Ledger8ContractProviders<DoubleCounter, Circuit>;

describe('Contract-scoped transactions on a pre-fork (ledger v8) network', () => {
  let testEnvironment: TestEnvironment;
  let environmentConfiguration: EnvironmentConfiguration;
  let wallet: MidnightWalletProvider;
  let providers: Providers;
  let contractAddress: ContractAddress;

  const tickers = async (): Promise<readonly [bigint, bigint]> => {
    const read = await providers.publicDataProvider.queryContractState(contractAddress);
    if (read === null) {
      throw new Error(`no contract state at ${contractAddress}`);
    }
    const state = ledger(read.contractState.deserialize({ v8: ContractState }).data);
    return [state.ticker1, state.ticker2];
  };

  const increment = (circuitId: 'increment1' | 'increment2', amount: bigint): Ledger8CallTxOptions<DoubleCounter, Circuit> => ({
    compiledContract: contract,
    contractAddress,
    circuitId,
    privateStateId: PRIVATE_STATE_ID,
    args: [amount]
  });

  const storedPrivateCounter = async (): Promise<number | undefined> =>
    (await providers.privateStateProvider.forContract(contractAddress).get(PRIVATE_STATE_ID))?.privateCounter;

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    wallet = await testEnvironment.getMidnightWalletProvider();
    providers = initializeMidnightProviders(wallet, environmentConfiguration, new RetainedDoubleCounterConfiguration());

    const protocolVersion = await providers.publicDataProvider.queryLatestProtocolVersion();
    expect(versionOfRecord({ protocolVersion })).toBe('v8');

    const deployed = await deployContract(providers, {
      compiledContract: contract,
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState: { privateCounter: 0 }
    });
    contractAddress = deployed.deployTxData.public.contractAddress;
    logger.info(`Deployed retained double-counter twin at address: ${contractAddress}`);
  }, VERY_SLOW_TEST_TIMEOUT);

  afterAll(async () => {
    await testEnvironment?.shutdown();
  }, VERY_SLOW_TEST_TIMEOUT);

  test(
    'submits two calls of one circuit as one transaction, the second built on the first',
    async () => {
      // Arrange
      const [ticker1, ticker2] = await tickers();
      const privateCounter = await storedPrivateCounter();

      // Act
      const finalized = await withLedger8ContractScopedTransaction<DoubleCounter, Circuit>(providers, async (txCtx) => {
        await submitCallTx(providers, increment('increment1', 1n), txCtx);
        await submitCallTx(providers, increment('increment1', 1n), txCtx);
      });

      // Assert
      expect(finalized.public.status).toBe(SucceedEntirely);
      expect(finalized.private.nextPrivateState.privateCounter).toBe(privateCounter! + 2);
      expect(await tickers()).toEqual([ticker1 + 2n, ticker2]);
      expect(await storedPrivateCounter()).toBe(privateCounter! + 2);
    },
    SLOW_TEST_TIMEOUT
  );

  test(
    'submits calls of two circuits as one transaction through withContractScopedTransaction',
    async () => {
      // Arrange
      const [ticker1, ticker2] = await tickers();
      const privateCounter = await storedPrivateCounter();

      // Act
      const finalized = await withContractScopedTransaction(providers, async (txCtx: Ledger8TransactionContext<DoubleCounter, Circuit>) => {
        await submitCallTx(providers, increment('increment1', 1n), txCtx);
        await submitCallTx(providers, increment('increment2', 5n), txCtx);
      });

      // Assert
      expect(finalized.public.status).toBe(SucceedEntirely);
      expect(await tickers()).toEqual([ticker1 + 1n, ticker2 + 5n]);
      expect(await storedPrivateCounter()).toBe(privateCounter! + 2);
    },
    SLOW_TEST_TIMEOUT
  );

  test(
    'does not preserve the order of the calls it merged',
    async () => {
      // Arrange
      const privateCounter = await storedPrivateCounter();

      // Act
      await withLedger8ContractScopedTransaction<DoubleCounter, Circuit>(providers, async (txCtx) => {
        await submitCallTx(providers, increment('increment2', 1n), txCtx);
        await submitCallTx(
          providers,
          { compiledContract: contract, contractAddress, circuitId: 'reset', privateStateId: PRIVATE_STATE_ID, args: [] },
          txCtx
        );
      });

      // Assert
      const [ticker1, ticker2] = await tickers();
      expect(ticker1).toBe(0n);
      expect([0n, 1n]).toContain(ticker2);
      expect(await storedPrivateCounter()).toBe(privateCounter! + 2);
    },
    SLOW_TEST_TIMEOUT
  );

  test(
    'submits nothing and stores nothing when one call of the scope fails',
    async () => {
      // Arrange
      const before = await tickers();
      const privateCounter = await storedPrivateCounter();

      // Act
      const error = await withLedger8ContractScopedTransaction<DoubleCounter, Circuit>(providers, async (txCtx) => {
        await submitCallTx(providers, increment('increment1', 1n), txCtx);
        await submitCallTx(providers, increment('increment1', 65_536n), txCtx);
      }).catch((e: unknown) => e);

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(await tickers()).toEqual(before);
      expect(await storedPrivateCounter()).toBe(privateCounter);
    },
    SLOW_TEST_TIMEOUT
  );
});
