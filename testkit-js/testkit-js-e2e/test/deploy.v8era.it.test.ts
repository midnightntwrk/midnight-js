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

import { deployContract, EraMismatchError } from '@midnight-ntwrk/midnight-js-contracts';
import {
  createLogger,
  type EnvironmentConfiguration,
  getTestEnvironment,
  initializeMidnightProviders,
  type MidnightWalletProvider,
  type TestEnvironment
} from '@midnight-ntwrk/testkit-js';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import { SLOW_TEST_TIMEOUT, VERY_SLOW_TEST_TIMEOUT } from '../src/constants';
import * as api from '../src/counter-api';
import type { SimpleProviders } from '../src/types/simple-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `deploy_v8era_${new Date().toISOString()}.log`)
);

describe('Ledger 9 deploy on a pre-fork (ledger v8) network', () => {
  let testEnvironment: TestEnvironment;
  let environmentConfiguration: EnvironmentConfiguration;
  let wallet: MidnightWalletProvider;

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    wallet = await testEnvironment.getMidnightWalletProvider();
  }, VERY_SLOW_TEST_TIMEOUT);

  afterAll(async () => {
    await testEnvironment?.shutdown();
  }, VERY_SLOW_TEST_TIMEOUT);

  test(
    'refuses the deploy before proving it',
    async () => {
      // Arrange.
      const providers: SimpleProviders = initializeMidnightProviders(
        wallet,
        environmentConfiguration,
        new api.SimpleConfiguration(`deploy-v8era-private-store-${Date.now()}`)
      );
      const proveTx = vi.spyOn(providers.proofProvider, 'proveTx');

      // Act.
      const deploying = deployContract(providers, { compiledContract: api.CompiledSimpleContract });

      // Assert.
      await expect(deploying).rejects.toBeInstanceOf(EraMismatchError);
      await expect(deploying).rejects.toMatchObject({ reason: 'ledger9-artifact-on-ledger8-network' });
      expect(proveTx).not.toHaveBeenCalled();
    },
    SLOW_TEST_TIMEOUT
  );
});
