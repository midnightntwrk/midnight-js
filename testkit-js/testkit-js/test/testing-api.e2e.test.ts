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

import { nativeToken } from '@midnight-ntwrk/ledger';
import path from 'path';
import * as Rx from 'rxjs';
import { WebSocket } from 'ws';

import { createLogger } from '@/logger';
import { getTestEnvironment } from '@/test-environment';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `e2e_${new Date().toISOString().replace(/:/g, '-')}.log`)
);

// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

describe.concurrent('[E2E] Testing API', () => {
  beforeEach(() => {
    logger.info(`Starting test... ${expect.getState().currentTestName}`);
  });

  it.each([
    ['devnet environment', 'devnet'],
    ['qanet environment', 'qanet']
  ])(
    'test environment should start multiple wallets on %s [@slow]',
    async (_, envVar) => {
      if (process.env.RUN_E2E_TESTS === 'true') {
        process.env.MN_TEST_ENVIRONMENT = envVar;
        const testEnvironment = getTestEnvironment(logger);
        await testEnvironment.start();
        const wallets = await testEnvironment.startMidnightWalletProviders(2);
        await testEnvironment.shutdown();

        expect(wallets).toHaveLength(2);

        const promises = wallets.map(async (walletProvider) => {
          expect(walletProvider.coinPublicKey).not.toBeUndefined();
          const initialState = await Rx.firstValueFrom(walletProvider.wallet.state());
          const initialBalance = initialState.balances[nativeToken()];
          expect(initialBalance).toBeGreaterThan(0);
        });

        await Promise.all(promises);
      }
    },
    10 * 60_000
  );
});
