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

import type { Logger } from 'pino';
import { NetworkId, setNetworkId, stringToNetworkId, NetworkIdTypeError } from '@midnight-ntwrk/midnight-js-network-id';
import {
  DevnetTestEnvironment,
  EnvVarRemoteTestEnvironment,
  LocalTestEnvironment,
  QanetTestEnvironment,
  Testnet2TestEnvironment,
  TestnetTestEnvironment
} from './test-environments';
import { MissingEnvironmentVariable } from '../errors';
import { getEnvVarEnvironment, getEnvVarNetworkId } from '../env-vars';

/**
 * Parses the network ID from the environment variable.
 * @throws {MissingEnvironmentVariable} If MN_TEST_NETWORK_ID is not set.
 * @throws {NetworkIdTypeError} If the network ID is invalid.
 * @returns {NetworkId} The parsed network ID.
 */
const parseNetworkIdEnvVar = () => {
  const networkIdEnv = getEnvVarNetworkId();
  if (!networkIdEnv) {
    throw new MissingEnvironmentVariable('MN_TEST_NETWORK_ID');
  }
  const networkId = stringToNetworkId(networkIdEnv);
  if (!networkId) {
    throw new NetworkIdTypeError(networkIdEnv);
  }
  return networkId;
};

/**
 * Returns the appropriate test environment based on the MN_TEST_ENVIRONMENT variable.
 * @param {Logger} logger - The logger instance to be used by the test environment.
 * @returns {TestnetTestEnvironment | DevnetTestEnvironment | QanetTestEnvironment | EnvVarRemoteTestEnvironment | LocalTestEnvironment} The selected test environment instance.
 */
export const getTestEnvironment = (logger: Logger) => {
  const testEnv = getEnvVarEnvironment().toLowerCase();
  switch (testEnv) {
    case 'testnet':
      setNetworkId(NetworkId.TestNet);
      return new TestnetTestEnvironment(logger);
    case 'testnet-02':
      setNetworkId(NetworkId.TestNet);
      return new Testnet2TestEnvironment(logger);
    case 'devnet':
      setNetworkId(NetworkId.DevNet);
      return new DevnetTestEnvironment(logger);
    case 'qanet':
      setNetworkId(NetworkId.DevNet);
      return new QanetTestEnvironment(logger);
    case 'env-var-remote':
      setNetworkId(parseNetworkIdEnvVar());
      return new EnvVarRemoteTestEnvironment(logger);
    default:
      setNetworkId(NetworkId.Undeployed);
      return new LocalTestEnvironment(logger);
  }
};
