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

import { CompiledShieldedContract } from '@/contract';
import {
  type ShieldedContractCircuit,
  type ShieldedContractProviders
} from '@/types/shielded-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `shielded_advanced_${new Date().toISOString()}.log`)
);

class ShieldedConfiguration implements ContractConfiguration {
  constructor(private suffix = Date.now().toString()) {}

  get privateStateStoreName(): string {
    return `shielded-advanced-store-${this.suffix}`;
  }

  get zkConfigPath(): string {
    return path.resolve(__dirname, '../dist/contract/compiled/shielded');
  }
}

describe('Shielded tokens - advanced operations', () => {
  const MINT_AMOUNT = 1_000_000n;
  const DOMAIN_SEPARATOR = new Uint8Array(32).fill(1);

  let testEnvironment: TestEnvironment;
  let wallet: MidnightWalletProvider;
  let environmentConfiguration: EnvironmentConfiguration;
  let providers: ShieldedContractProviders;
  let contractAddress: ContractAddress;

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    wallet = await testEnvironment.getMidnightWalletProvider();

    providers = initializeMidnightProviders(wallet, environmentConfiguration, new ShieldedConfiguration());

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

  test('should mint and send immediate shielded tokens', async () => {
    const userKeyHex = wallet.getCoinPublicKey();
    const userKeyBytes = new Uint8Array(Buffer.from(userKeyHex, 'hex'));
    const mintNonce = new Uint8Array(32).fill(10);
    const sendValue = BigInt(MINT_AMOUNT) / 2n;

    const txData = await submitCallTx(providers, {
      compiledContract: CompiledShieldedContract,
      contractAddress,
      circuitId: 'mintAndSendImmediateShielded' as ShieldedContractCircuit,
      args: [DOMAIN_SEPARATOR, MINT_AMOUNT, mintNonce, { bytes: userKeyBytes }, sendValue]
    });

    expect(txData.public.status).toBe(SucceedEntirely);

    const result = txData.private.result as {
      change: { is_some: boolean; value: { nonce: Uint8Array; color: Uint8Array; value: bigint } };
      sent: { nonce: Uint8Array; color: Uint8Array; value: bigint };
    };

    expect(result.sent).toBeDefined();
    expect(result.sent.value).toEqual(sendValue);
    expect(result.sent.color).toBeInstanceOf(Uint8Array);
    expect(result.sent.color).toHaveLength(32);
  });

  test('should mint and burn shielded tokens', async () => {
    const mintNonce = new Uint8Array(32).fill(20);
    const burnValue = BigInt(MINT_AMOUNT) / 2n;

    const txData = await submitCallTx(providers, {
      compiledContract: CompiledShieldedContract,
      contractAddress,
      circuitId: 'mintAndBurnShielded' as ShieldedContractCircuit,
      args: [DOMAIN_SEPARATOR, MINT_AMOUNT, mintNonce, burnValue]
    });

    expect(txData.public.status).toBe(SucceedEntirely);

    const result = txData.private.result as {
      change: { is_some: boolean; value: { nonce: Uint8Array; color: Uint8Array; value: bigint } };
      sent: { nonce: Uint8Array; color: Uint8Array; value: bigint };
    };

    expect(result.sent).toBeDefined();
    expect(result.sent.value).toEqual(burnValue);
  });
});
