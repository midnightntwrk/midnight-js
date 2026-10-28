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

import { submitTx } from '@midnight-ntwrk/midnight-js-contracts';
import { loadLedger8Protocol } from '@midnight-ntwrk/midnight-js-protocol';
import { LedgerTransaction, SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
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
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { SLOW_TEST_TIMEOUT, VERY_SLOW_TEST_TIMEOUT } from '../src/constants';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `submit_tx_v8era_${new Date().toISOString()}.log`)
);

class NoCircuitConfiguration implements ContractConfiguration {
  readonly privateStateStoreName = `submit-tx-v8era-private-store-${Date.now()}`;

  readonly zkConfigPath = path.resolve(__dirname, '../src/contract/compiled-retained/unshielded');

  get zkConfigIntegrity(): ZkConfigIntegrityOptions {
    return { verify: 'warn' };
  }
}

describe('submitTx on a pre-fork (ledger v8) network', () => {
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
    'proves, balances and submits a v8 transaction, and reads back a v8 record',
    async () => {
      // Arrange.
      const providers = initializeMidnightProviders(wallet, environmentConfiguration, new NoCircuitConfiguration());
      const v8 = await loadLedger8Protocol();
      const unprovenTx = LedgerTransaction.seal('v8', 'Unproven', v8.Transaction.fromParts(providers.config.networkId));

      // Act.
      const record = await submitTx(providers, { unprovenTx });

      // Assert.
      expect({ version: record.version, status: record.status }).toEqual({ version: 'v8', status: SucceedEntirely });
    },
    SLOW_TEST_TIMEOUT
  );
});
