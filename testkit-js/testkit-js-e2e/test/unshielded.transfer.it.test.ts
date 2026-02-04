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
  const MINT_AMOUNT = 1_000_000n;
  const DOMAIN_SEPARATOR = new Uint8Array(32).fill(1);

  let testEnvironment: TestEnvironment;
  let wallet: MidnightWalletProvider;
  let environmentConfiguration: EnvironmentConfiguration;
  let providers: UnshieldedContractProviders;
  let contractAddress: ContractAddress;
  let contractConfiguration: UnshieldedConfiguration;
  let mintedTokensColor: Uint8Array;
  let unshieldedAddressBytes: Uint8Array;

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    wallet = await testEnvironment.getMidnightWalletProvider();
    unshieldedAddressBytes = new Uint8Array(
      Buffer.from((await wallet.wallet.unshielded.getAddress()).hexString, 'hex')
    );
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

    logger.info('Minting tokens');
    const mintTxData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'mintUnshieldedToSelfAndReceiveTest' as UnshieldedContractCircuits,
      args: [DOMAIN_SEPARATOR, MINT_AMOUNT]
    });

    expect(mintTxData.public.status).toBe(SucceedEntirely);
    mintedTokensColor = mintTxData.private.result as Uint8Array;

    logger.info(`Minted initial tokens: ${JSON.stringify(mintTxData)}`);
  });

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  test('should mint different tokens', async () => {
    const ANOTHER_DOMAIN_SEPARATOR = new Uint8Array(32).fill(2);

    const mintTxData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'mintUnshieldedToSelfAndReceiveTest' as UnshieldedContractCircuits,
      args: [ANOTHER_DOMAIN_SEPARATOR, MINT_AMOUNT]
    });

    expect(mintTxData.public.status).toBe(SucceedEntirely);
    expect(mintTxData.public.unshielded).toBeDefined();
    expect(mintTxData.private.result).toBeInstanceOf(Uint8Array);
    expect(mintTxData.private.result).toHaveLength(32);

    const created = mintTxData.public.unshielded.created;
    const spent = mintTxData.public.unshielded.spent;
    expect(created.length).toEqual(0);
    expect(spent.length).toEqual(0);
  });

  test('should receive tokens - invalid', async () => {
    await expect(() =>
      submitCallTx(providers, {
        compiledContract: CompiledUnshieldedContract,
        contractAddress,
        circuitId: 'receiveUnshieldedTest' as UnshieldedContractCircuits,
        args: [DOMAIN_SEPARATOR, MINT_AMOUNT]
      })
    ).rejects.toThrow('InsufficientFunds: Insufficient funds');
  });

  //need to first move tokens to wallet to be able to receive them back
  test.skip('should receive tokens from wallet', async () => {
    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'receiveUnshieldedTest' as UnshieldedContractCircuits,
      args: [mintedTokensColor, MINT_AMOUNT / 10n]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.private.result).toEqual([]);
    expect(txData.public.unshielded).toBeDefined();

    const spent = txData.public.unshielded.spent;
    const created = txData.public.unshielded.created;
    expect(spent.length).toEqual(1);
    expect(created.length).toEqual(1);
  });

  //need to validate
  test.skip('should send tokens to wallet', async () => {
    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'sendUnshieldedToUserTest' as UnshieldedContractCircuits,
      args: [mintedTokensColor, MINT_AMOUNT/10n, { bytes: unshieldedAddressBytes }]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.private.result).toEqual(0n);
    expect(txData.public.unshielded).toBeDefined();

    const spent = txData.public.unshielded.spent;
    const created = txData.public.unshielded.created;
    expect(spent.length).toEqual(0);
    expect(created.length).toEqual(0);
  });

  test.todo('should transfer night from wallet to contract - receiveNightTokens');
  test.todo('should transfer night to wallet - sendNightTokensToUser');
});
