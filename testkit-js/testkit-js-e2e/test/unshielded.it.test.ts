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

import { type ContractAddress, sampleSigningKey } from '@midnight-ntwrk/compact-runtime';
import { deployContract, submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import {
  type ContractConfiguration,
  createLogger,
  type EnvironmentConfiguration,
  expectSuccessfulDeployTx,
  getTestEnvironment,
  initializeMidnightProviders,
  type MidnightWalletProvider,
  type TestEnvironment
} from '@midnight-ntwrk/testkit-js';
import { afterAll, beforeAll, beforeEach,describe, test } from '@vitest/runner';
import path from 'path';
import { expect } from 'vitest';

import {
  createUnshieldedContract,
  type UnshieldedContract,
  type UnshieldedContractCircuits,
  type UnshieldedContractProviders
} from '@/unshielded-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `unshielded_${new Date().toISOString()}.log`)
);

class UnshieldedConfiguration implements ContractConfiguration {
  constructor(private suffix = Date.now().toString()) {}

  get privateStateStoreName(): string {
    return `unshielded-private-store-${this.suffix}`;
  }

  get zkConfigPath(): string {
    return path.resolve(__dirname, '../../e2e/contract/managed/unshielded');
  }
}

describe('Unshielded tokens', () => {
  const TEST_TOKEN_AMOUNT = 1000n;
  const TEST_DOMAIN_SEP = new Uint8Array(32).fill(1);
  const SLOW_TEST_TIMEOUT = 60000;

  let testEnvironment: TestEnvironment;
  let wallet: MidnightWalletProvider;
  let environmentConfiguration: EnvironmentConfiguration;
  let providers: UnshieldedContractProviders;
  let contractAddress: ContractAddress;
  let unshieldedContract: UnshieldedContract;
  let contractConfiguration: UnshieldedConfiguration;

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    wallet = await testEnvironment.getMidnightWalletProvider();
    contractConfiguration = new UnshieldedConfiguration();

    providers = initializeMidnightProviders(wallet, environmentConfiguration, contractConfiguration);

    unshieldedContract = createUnshieldedContract();

    const deployTxOptions = {
      contract: unshieldedContract,
      signingKey: sampleSigningKey(),
      initialPrivateState: undefined
    };

    const deployedContract = await deployContract(providers, deployTxOptions);
    await expectSuccessfulDeployTx(providers, deployedContract.deployTxData, deployTxOptions);
    contractAddress = deployedContract.deployTxData.public.contractAddress;

    logger.info(`Deployed unshielded contract at address: ${contractAddress}`);
  }, SLOW_TEST_TIMEOUT);

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  test('should mint tokens', async () => {
    // Act & Assert - Mint unshielded token to self
    const mintTxData = await submitCallTx(providers, {
      contract: unshieldedContract,
      contractAddress,
      circuitId: 'mintUnshieldedToSelfTest' as UnshieldedContractCircuits,
      args: [TEST_DOMAIN_SEP, TEST_TOKEN_AMOUNT]
    });

    expect(mintTxData.public.status).toBe(SucceedEntirely);
    expect(mintTxData.public.unshielded).toBeDefined();

    const mintedToken = mintTxData.public.unshielded.created;
    expect(mintedToken.length).toEqual(1);
    expect(mintedToken.at(0)?.value).toEqual(TEST_TOKEN_AMOUNT);
    expect(mintedToken.at(0)?.owner).toEqual(TEST_DOMAIN_SEP);

    logger.info(`Minted token: ${JSON.stringify(mintedToken)}`);
  });
});
