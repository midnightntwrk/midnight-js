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

import { createLogger } from '@/logger';
import {
  getTestEnvironment
} from '@/test-environment';
import {
  EnvVarRemoteTestEnvironment,
  LocalTestEnvironment,
  QanetTestEnvironment,
  Testnet2TestEnvironment} from '@/test-environment/test-environments';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `ut_${new Date().toISOString().replace(/:/g, '-')}.log`)
);

// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

describe.concurrent('[Unit tests] Testing API', () => {
  beforeEach(() => {
    logger.info(`Starting test... ${expect.getState().currentTestName}`);
  });

  it.each([
    ['local environment reference', undefined, LocalTestEnvironment],
    ['qanet environment reference', 'qanet', QanetTestEnvironment],
    ['testnet2 environment reference', 'testnet-02', Testnet2TestEnvironment]
  ])('test environment should return %s', async (_, envVar, expectedInstance) => {
    process.env.MN_TEST_ENVIRONMENT = envVar;
    expect(getTestEnvironment(logger)).toBeInstanceOf(expectedInstance);
  });

  it('test environment should return env var remote test environment reference', () => {
    process.env.MN_TEST_ENVIRONMENT = 'env-var-remote';
    process.env.MN_TEST_INDEXER = 'https://test.url';
    process.env.MN_TEST_INDEXER_WS = 'wss://test.url';
    process.env.MN_TEST_NODE = 'http://test.url';
    process.env.MN_TEST_NETWORK_ID = 'TestNet';
    expect(getTestEnvironment(logger)).toBeInstanceOf(EnvVarRemoteTestEnvironment);
  });

  // it('should not fail on wrong MN_TEST_NETWORK_ID for env var remote test environment', () => {
  //   process.env.MN_TEST_ENVIRONMENT = 'env-var-remote';
  //   process.env.MN_TEST_NETWORK_ID = 'something';
  //   expect(() => getTestEnvironment(logger)).not.toThrow();
  // });

  it('should fail on wrong MN_TEST_NETWORK_ID for env var remote test environment', () => {
    process.env.MN_TEST_ENVIRONMENT = 'env-var-remote';
    delete process.env.MN_TEST_NETWORK_ID;
    expect(() => getTestEnvironment(logger)).toThrow(`Environment variable 'MN_TEST_NETWORK_ID' is required`);
  });
});
