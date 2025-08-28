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

import path from 'path';
import { WebSocket } from 'ws';

import { ProofServerClient } from '@/infrastructure/client';
import {
  defaultContainersConfiguration,
  getContainersConfiguration,
  setContainersConfiguration
} from '@/infrastructure/configuration';
import type { ContainersConfiguration } from '@/infrastructure/configuration-types';
import { createLogger } from '@/infrastructure/logger';
import { DynamicProofServerContainer } from '@/infrastructure/proof-server-container';
import { getTestEnvironment, LocalTestEnvironment } from '@/infrastructure/test-environment';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `it_${new Date().toISOString().replace(/:/g, '-')}.log`)
);

// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

describe.concurrent('[Integration tests] Testing API', () => {
  beforeEach(() => {
    logger.info(`Starting test... ${expect.getState().currentTestName}`);
  });

  it.each([
    ['local environment configuration', undefined],
    ['testnet-02 environment configuration', 'testnet-02'],
    ['qanet environment configuration', 'qanet']
  ])(
    'test environment should start and stop %s',
    async (_, envVar) => {
      process.env.MN_TEST_ENVIRONMENT = envVar;
      const testEnvironment = getTestEnvironment(logger);
      const configuration = await testEnvironment.start();
      await testEnvironment.shutdown();

      if (testEnvironment instanceof LocalTestEnvironment) {
        expect(configuration.faucet).toBeUndefined();
      } else {
        expect(configuration.faucet).not.toBeUndefined();
      }
      expect(configuration.indexer).not.toBeUndefined();
      expect(configuration.indexerWS).not.toBeUndefined();
      expect(configuration.node).not.toBeUndefined();
    },
    2 * 60_000
  );

  it(
    'test environment should retrieve a wallet with tokens on local environment configuration',
    async () => {
      process.env.MN_TEST_ENVIRONMENT = undefined;
      const testEnvironment = getTestEnvironment(logger);
      await testEnvironment.start();
      const wallet = await testEnvironment.getMidnightWalletProvider();
      await testEnvironment.shutdown();

      expect(wallet.coinPublicKey).not.toBeUndefined();
    },
    2 * 60_000
  );

  it(
    'test environment should retrieve multiple wallets on local environment configuration',
    async () => {
      process.env.MN_TEST_ENVIRONMENT = undefined;
      const testEnvironment = getTestEnvironment(logger);
      await testEnvironment.start();
      await testEnvironment.startMidnightWalletProviders(2);
      await testEnvironment.shutdown();
    },
    3 * 60_000
  );

  it(
    'test environment should retrieve not get more wallets than allowed',
    async () => {
      process.env.MN_TEST_ENVIRONMENT = undefined;
      const testEnvironment = getTestEnvironment(logger);
      await testEnvironment.start();
      await expect(testEnvironment.startMidnightWalletProviders(5)).rejects.toThrow(
        `Maximum supported number of wallets for this environment reached: ${LocalTestEnvironment.MAX_NUMBER_OF_WALLETS}`
      );
      await testEnvironment.shutdown();
    },
    2 * 60_000
  );

  it('proof server - should fail on wrong configuration set', async () => {
    const oldConfig = getContainersConfiguration();
    try {
      const broken: ContainersConfiguration = {
        ...defaultContainersConfiguration,
        proofServer: {
          ...defaultContainersConfiguration.proofServer,
          fileName: 'proof-server-invalid.yml'
        }
      };
      setContainersConfiguration(broken);
      await expect(DynamicProofServerContainer.start(logger)).rejects.toThrow('no such file or directory');
    } finally {
      setContainersConfiguration(oldConfig);
    }
  });

  it('proof server - should get health check', async () => {
    let server;
    try {
      server = await DynamicProofServerContainer.start(logger);
      const client = new ProofServerClient(server.getUrl(), logger);
      await client.health();
    } finally {
      await server?.stop();
    }
  });

  it('proof server - should prove some buffer', async () => {
    let server;
    try {
      server = await DynamicProofServerContainer.start(logger);
      const client = new ProofServerClient(server.getUrl(), logger);
      await client.proveTx(Buffer.from('test').buffer);
    } finally {
      await server?.stop();
    }
  });
});
