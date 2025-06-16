// This file is part of MIDNIGHT-JS.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { WebSocket } from 'ws';
import path from 'path';
import { createLogger } from '../logger';
import { getEnvVarWalletSeeds } from '../env-vars';

const logger = createLogger(
  path.resolve(
    `${process.cwd()}`,
    'logs',
    'tests',
    `ut_${new Date().toISOString().replace(/:/g, '-')}.log`
  )
);

// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

describe.concurrent('[Unit tests] EnvVars Testing API', () => {
  beforeEach(() => {
    logger.info(`Starting test... ${expect.getState().currentTestName}`);
  });

  it('should return wallet seeds from MN_TEST_WALLET_SEED', () => {
    process.env.MN_TEST_WALLET_SEED = '111,222';
    expect(getEnvVarWalletSeeds()).toEqual(['111', '222']);
    delete process.env.MN_TEST_WALLET_SEED;
  });

  it('should return wallet seeds from TEST_WALLET_SEED', () => {
    process.env.TEST_WALLET_SEED = '333';
    expect(getEnvVarWalletSeeds()).toEqual(['333']);
    delete process.env.TEST_WALLET_SEED;
  });

  it('should return undefined when no wallet seeds are set', () => {
    expect(getEnvVarWalletSeeds()).toEqual(undefined);
  });
});
