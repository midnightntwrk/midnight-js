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

import { CompiledUnshieldedContract } from '@/contract';
import {
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
    return path.resolve(__dirname, '../dist/contract/compiled/unshielded');
  }
}

describe('Unshielded tokens', () => {
  const TEST_TOKEN_AMOUNT = 1_000_000n;
  const TEST_DOMAIN_SEP = new Uint8Array(32).fill(1);

  let testEnvironment: TestEnvironment;
  let wallet: MidnightWalletProvider;
  let environmentConfiguration: EnvironmentConfiguration;
  let providers: UnshieldedContractProviders;
  let contractAddress: ContractAddress;
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

    const deployTxOptions = {
      compiledContract: CompiledUnshieldedContract,
      signingKey: sampleSigningKey(),
      initialPrivateState: undefined
    };

    const deployedContract = await deployContract(providers, deployTxOptions);
    await expectSuccessfulDeployTx(providers, deployedContract.deployTxData, deployTxOptions);
    contractAddress = deployedContract.deployTxData.public.contractAddress;

    logger.info(`Deployed unshielded contract at address: ${contractAddress}`);
  });

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  test('should mint tokens', async () => {
    const mintTxData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'mintToSelfReceive' as UnshieldedContractCircuits,
      args: [TEST_DOMAIN_SEP, TEST_TOKEN_AMOUNT]
    });

    expect(mintTxData.public.status).toBe(SucceedEntirely);
    expect(mintTxData.public.unshielded).toBeDefined();

    const created = mintTxData.public.unshielded.created;
    const spent = mintTxData.public.unshielded.spent;
    expect(created.length).toEqual(0);
    expect(spent.length).toEqual(0);

    logger.info(`Minted token: ${JSON.stringify(mintTxData)}`);
  });

  test('should get balance of tokens - 0 value', async () => {
    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'getUnshieldedBalanceTest' as UnshieldedContractCircuits,
      args: [TEST_DOMAIN_SEP]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.private.result).toEqual(0n);
    expect(txData.public.unshielded).toBeDefined();

    const spent = txData.public.unshielded.spent;
    const created = txData.public.unshielded.created;
    expect(spent.length).toEqual(0);
    expect(created.length).toEqual(0);
  });

  test.skip('should get balance of tokens - greater than', async () => {
    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'getUnshieldedBalanceGtTest' as UnshieldedContractCircuits,
      args: [TEST_DOMAIN_SEP, 1n]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.private.result).toEqual(false);
    expect(txData.public.unshielded).toBeDefined();

    const spent = txData.public.unshielded.spent;
    const created = txData.public.unshielded.created;
    expect(spent.length).toEqual(0);
    expect(created.length).toEqual(0);
  });

  test.skip('should get balance of tokens - less than', async () => {
    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'getUnshieldedBalanceGtTest' as UnshieldedContractCircuits,
      args: [TEST_DOMAIN_SEP, 1n]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.private.result).toEqual(true);
    expect(txData.public.unshielded).toBeDefined();

    const spent = txData.public.unshielded.spent;
    const created = txData.public.unshielded.created;
    expect(spent.length).toEqual(0);
    expect(created.length).toEqual(0);
  });

  //only temporary, next PR will re-enable with proper setup
  test.skip('should receive tokens - invalid', async () => {
    await expect(() =>
      submitCallTx(providers, {
        compiledContract: CompiledUnshieldedContract,
        contractAddress,
        circuitId: 'receiveUnshieldedTest' as UnshieldedContractCircuits,
        args: [TEST_DOMAIN_SEP, TEST_TOKEN_AMOUNT]
      })
    ).rejects.toThrow('Insufficient Funds: could not balance 0101010101010101010101010101010101010101010101010101010101010101');
  });

  //BUG: 21219
  test.skip('should receive tokens - wallet', async () => {
    const sep = new Uint8Array(32).fill(0);

    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'receiveUnshieldedTest' as UnshieldedContractCircuits,
      args: [sep, TEST_TOKEN_AMOUNT]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.private.result).toEqual([]);
    expect(txData.public.unshielded).toBeDefined();

    const spent = txData.public.unshielded.spent;
    const created = txData.public.unshielded.created;
    expect(spent.length).toEqual(1);
    expect(created.length).toEqual(1);
  });

  test.skip('should send tokens to wallet', async () => {
    const address = new Uint8Array(Buffer.from('0f09f9eb5538606c6490c0595b771ecb0c29ae71778f089a95e8465b84774aed', 'hex'));
    const sep = new Uint8Array(32).fill(0);

    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'sendUnshieldedToUserTest' as UnshieldedContractCircuits,
      args: [sep, 1_000_000n, { bytes: address } ]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.private.result).toEqual(0n);
    expect(txData.public.unshielded).toBeDefined();

    const spent = txData.public.unshielded.spent;
    const created = txData.public.unshielded.created;
    expect(spent.length).toEqual(0);
    expect(created.length).toEqual(0);
  });

  test('should mint native tokens', async () => {
    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'mintNativeTokens' as UnshieldedContractCircuits,
      args: [1_000_000n]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
  });
});
