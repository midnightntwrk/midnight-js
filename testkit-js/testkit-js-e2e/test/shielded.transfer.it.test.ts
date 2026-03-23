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
  syncWallet,
  type TestEnvironment
} from '@midnight-ntwrk/testkit-js';
import { afterAll, beforeAll, beforeEach,describe, test } from '@vitest/runner';
import path from 'path';
import { expect } from 'vitest';

import { CompiledShieldedContract } from '@/contract';
import {
  type ShieldedContractCircuit,
  type ShieldedContractProviders
} from '@/types/shielded-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `shielded_${new Date().toISOString()}.log`)
);

class ShieldedConfiguration implements ContractConfiguration {
  constructor(private suffix = Date.now().toString()) {}

  get privateStateStoreName(): string {
    return `shielded-private-store-${this.suffix}`;
  }

  get zkConfigPath(): string {
    return path.resolve(__dirname, '../dist/contract/compiled/shielded');
  }
}

describe('Shielded tokens', () => {
  const MINT_AMOUNT = 1_000_000n;
  const DOMAIN_SEPARATOR = new Uint8Array(32).fill(1);

  let testEnvironment: TestEnvironment;
  let wallet: MidnightWalletProvider;
  let environmentConfiguration: EnvironmentConfiguration;
  let providers: ShieldedContractProviders;
  let contractAddress: ContractAddress;
  let contractConfiguration: ShieldedConfiguration;

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    wallet = await testEnvironment.getMidnightWalletProvider();
    contractConfiguration = new ShieldedConfiguration();

    providers = initializeMidnightProviders(wallet, environmentConfiguration, contractConfiguration);

    const deployTxOptions = {
      compiledContract: CompiledShieldedContract,
      signingKey: sampleSigningKey(),
      initialPrivateState: undefined
    };

    const deployedContract = await deployContract(providers, deployTxOptions);
    await expectSuccessfulDeployTx(providers, deployedContract.deployTxData, deployTxOptions);
    contractAddress = deployedContract.deployTxData.public.contractAddress;

    logger.info(`Deployed Shielded contract at address: ${contractAddress}`);
  });

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  test('should mint tokens', async () => {
    const txData = await submitCallTx(providers, {
      compiledContract: CompiledShieldedContract,
      contractAddress,
      circuitId: 'mintShieldedTokens' as ShieldedContractCircuit,
      args: [DOMAIN_SEPARATOR, MINT_AMOUNT]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
  });

  test('should deposit shielded coin via receiveShielded (issue #686)', async () => {
    const userKeyHex = wallet.getCoinPublicKey();
    const userKeyBytes = new Uint8Array(Buffer.from(userKeyHex, 'hex'));
    const mintNonce = new Uint8Array(32).fill(42);

    // Step 1: Mint shielded tokens to self, then sendShielded to wallet
    // (matches midnight-wallet-dapp's mintAndSendShielded pattern)
    const mintTxData = await submitCallTx(providers, {
      compiledContract: CompiledShieldedContract,
      contractAddress,
      circuitId: 'mintAndSendShielded' as ShieldedContractCircuit,
      args: [DOMAIN_SEPARATOR, MINT_AMOUNT, mintNonce, { bytes: userKeyBytes }, MINT_AMOUNT]
    });

    expect(mintTxData.public.status).toBe(SucceedEntirely);

    // Parse the ShieldedSendResult to get the actual coin color
    const result = mintTxData.private.result as {
      change: { is_some: boolean; value: { nonce: Uint8Array; color: Uint8Array; value: bigint } };
      sent: { nonce: Uint8Array; color: Uint8Array; value: bigint };
    };

    // Wait for wallet to sync and discover the new shielded coins
    await syncWallet(wallet.wallet);

    // Step 2: Deposit a shielded coin into the contract via receiveShielded
    // The color must come from the mint result, not the domain separator
    const coin = {
      nonce: new Uint8Array(32).fill(1),
      color: result.sent.color,
      value: 100n
    };

    const txData = await submitCallTx(providers, {
      compiledContract: CompiledShieldedContract,
      contractAddress,
      circuitId: 'depositShielded' as ShieldedContractCircuit,
      args: [coin]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
  });
});
