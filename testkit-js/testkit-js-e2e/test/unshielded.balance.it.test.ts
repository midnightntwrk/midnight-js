/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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
import path from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { CompiledUnshieldedContract } from '@/contract';
import {
  type UnshieldedContractCircuit,
  type UnshieldedContractProviders
} from '@/types/unshielded-types';

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

describe('Unshielded tokens - balance', () => {
  const MINT_DOMAIN_SEPARATOR = new Uint8Array(32).fill(1);
  const MINT_AMOUNT = 1_000_000n;

  let testEnvironment: TestEnvironment;
  let wallet: MidnightWalletProvider;
  let environmentConfiguration: EnvironmentConfiguration;
  let providers: UnshieldedContractProviders;
  let contractAddress: ContractAddress;
  let contractConfiguration: UnshieldedConfiguration;
  let mintedTokenColor: Uint8Array;

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

    logger.info('Minting and receiving tokens');
    const mintTxData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'mintUnshieldedToSelfTest' as UnshieldedContractCircuit,
      args: [MINT_DOMAIN_SEPARATOR, MINT_AMOUNT]
    });

    expect(mintTxData.public.status).toBe(SucceedEntirely);
    mintedTokenColor = mintTxData.private.result as Uint8Array;

    logger.info(`Minted initial tokens: ${JSON.stringify(mintTxData)}`);
  });

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  test('should get balance of tokens - 0 value', async () => {
    const notMintedTokens = new Uint8Array(32).fill(2);
    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'getUnshieldedBalanceTest' as UnshieldedContractCircuit,
      args: [notMintedTokens]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.private.result).toEqual(0n);
    expect(txData.public.unshielded).toBeDefined();

    const spent = txData.public.unshielded.spent;
    const created = txData.public.unshielded.created;
    expect(spent.length).toEqual(0);
    expect(created.length).toEqual(0);
  });

  test('should get balance of tokens - minted amount', async () => {
    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'getUnshieldedBalanceTest' as UnshieldedContractCircuit,
      args: [mintedTokenColor]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.private.result).toEqual(MINT_AMOUNT);
    expect(txData.public.unshielded).toBeDefined();

    const spent = txData.public.unshielded.spent;
    const created = txData.public.unshielded.created;
    expect(spent.length).toEqual(0);
    expect(created.length).toEqual(0);
  });

  test('should get balance of tokens - greater than - false', async () => {
    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'getUnshieldedBalanceGtTest' as UnshieldedContractCircuit,
      args: [mintedTokenColor, MINT_AMOUNT]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.private.result).toEqual(false);
    expect(txData.public.unshielded).toBeDefined();

    const spent = txData.public.unshielded.spent;
    const created = txData.public.unshielded.created;
    expect(spent.length).toEqual(0);
    expect(created.length).toEqual(0);
  });


  test('should get balance of tokens - greater than - true', async () => {
    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'getUnshieldedBalanceGtTest' as UnshieldedContractCircuit,
      args: [mintedTokenColor, MINT_AMOUNT - 1n]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.private.result).toEqual(true);
    expect(txData.public.unshielded).toBeDefined();

    const spent = txData.public.unshielded.spent;
    const created = txData.public.unshielded.created;
    expect(spent.length).toEqual(0);
    expect(created.length).toEqual(0);
  });

  test('should get balance of tokens - less than - false', async () => {
    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'getUnshieldedBalanceLtTest' as UnshieldedContractCircuit,
      args: [mintedTokenColor, MINT_AMOUNT - 1n]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.private.result).toEqual(false);
    expect(txData.public.unshielded).toBeDefined();

    const spent = txData.public.unshielded.spent;
    const created = txData.public.unshielded.created;
    expect(spent.length).toEqual(0);
    expect(created.length).toEqual(0);
  });


  test('should get balance of tokens - less than - true', async () => {
    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'getUnshieldedBalanceLtTest' as UnshieldedContractCircuit,
      args: [mintedTokenColor, MINT_AMOUNT + 1n]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.private.result).toEqual(true);
    expect(txData.public.unshielded).toBeDefined();

    const spent = txData.public.unshielded.spent;
    const created = txData.public.unshielded.created;
    expect(spent.length).toEqual(0);
    expect(created.length).toEqual(0);
  });

  test('should get balance of tokens - greater than or equal - true (equal)', async () => {
    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'getUnshieldedBalanceGteTest' as UnshieldedContractCircuit,
      args: [mintedTokenColor, MINT_AMOUNT]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.private.result).toEqual(true);
  });

  test('should get balance of tokens - greater than or equal - false', async () => {
    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'getUnshieldedBalanceGteTest' as UnshieldedContractCircuit,
      args: [mintedTokenColor, MINT_AMOUNT + 1n]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.private.result).toEqual(false);
  });

  test('should get balance of tokens - less than or equal - true (equal)', async () => {
    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'getUnshieldedBalanceLteTest' as UnshieldedContractCircuit,
      args: [mintedTokenColor, MINT_AMOUNT]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.private.result).toEqual(true);
  });

  test('should get balance of tokens - less than or equal - false', async () => {
    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'getUnshieldedBalanceLteTest' as UnshieldedContractCircuit,
      args: [mintedTokenColor, MINT_AMOUNT - 1n]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.private.result).toEqual(false);
  });
});
