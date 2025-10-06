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

import { type NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { Logger } from 'pino';

import { getEnvVarEnvironment, MN_TEST_NETWORK_ID } from '@/env-vars';
import { MissingEnvironmentVariable } from '@/errors';
import { type TestEnvironment } from '@/test-environment/test-environments/test-environment';

import {
  EnvVarRemoteTestEnvironment,
  LocalTestEnvironment,
  QanetTestEnvironment,
  Testnet2TestEnvironment,
} from './test-environments';

/**
 * Parses the network ID from the environment variable.
 * @throws {MissingEnvironmentVariable} If MN_TEST_NETWORK_ID is not set.
 * @returns {NetworkId} The parsed network ID.
 */
const parseNetworkIdEnvVar = () : NetworkId => {
  const networkIdEnv = MN_TEST_NETWORK_ID;
  if (!networkIdEnv) {
    throw new MissingEnvironmentVariable(`MN_TEST_NETWORK_ID=${networkIdEnv}`);
  }
  return networkIdEnv;
};

/**
 * Returns the appropriate test environment based on the MN_TEST_ENVIRONMENT variable.
 * @param {Logger} logger - The logger instance to be used by the test environment.
 * @returns { TestEnvironment} The selected test environment instance.
 */
export const getTestEnvironment = (logger: Logger): TestEnvironment => {
  const testEnv = getEnvVarEnvironment().toLowerCase();
  let env;
  switch (testEnv) {
    case 'testnet':
    case 'testnet-02':
      env = new Testnet2TestEnvironment(logger);
      break;
    case 'qanet':
      env = new QanetTestEnvironment(logger);
      break;
    case 'env-var-remote':
      parseNetworkIdEnvVar();
      env = new EnvVarRemoteTestEnvironment(logger);
      break;
    default:
      env = new LocalTestEnvironment(logger);
  }
  setNetworkId('testnet');
  return env;
};
