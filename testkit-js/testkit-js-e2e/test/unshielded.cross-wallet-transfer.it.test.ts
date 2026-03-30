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
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `unshielded_cross_wallet_${new Date().toISOString()}.log`)
);

class UnshieldedConfiguration implements ContractConfiguration {
  constructor(private suffix = Date.now().toString()) {}

  get privateStateStoreName(): string {
    return `unshielded-cross-wallet-store-${this.suffix}`;
  }

  get zkConfigPath(): string {
    return path.resolve(__dirname, '../dist/contract/compiled/unshielded');
  }
}

describe('Unshielded cross-wallet transfer (issue #720)', () => {
  const FUND_AMOUNT = 2_000n;
  const SEND_AMOUNT = 1_000n;

  let testEnvironment: TestEnvironment;
  let wallet1: MidnightWalletProvider;
  let wallet2: MidnightWalletProvider;
  let environmentConfiguration: EnvironmentConfiguration;
  let providers: UnshieldedContractProviders;
  let contractAddress: ContractAddress;

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();

    [wallet1, wallet2] = await testEnvironment.startMidnightWalletProviders(2);

    providers = initializeMidnightProviders(wallet1, environmentConfiguration, new UnshieldedConfiguration());

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

  let wallet2AddressBytes: Uint8Array;

  beforeAll(async () => {
    wallet2AddressBytes = new Uint8Array(
      Buffer.from((await wallet2.wallet.unshielded.getAddress()).hexString, 'hex')
    );

    await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'receiveNightTokens' as UnshieldedContractCircuit,
      args: [FUND_AMOUNT]
    });
  });

  test('should send night tokens to different wallet via right<>(disclose(addr))', async () => {
    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'sendNightTokensToUser' as UnshieldedContractCircuit,
      args: [SEND_AMOUNT, { bytes: wallet2AddressBytes }]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.public.unshielded).toBeDefined();
    expect(txData.public.unshielded.created.length).toEqual(1);
  });

  test('should send night tokens to different wallet via disclose(recipient) (issue #720)', async () => {
    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'sendNightTokensToRecipient' as UnshieldedContractCircuit,
      args: [SEND_AMOUNT, { is_left: false, left: { bytes: new Uint8Array(32) }, right: { bytes: wallet2AddressBytes } }]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.public.unshielded).toBeDefined();
    expect(txData.public.unshielded.created.length).toEqual(1);
  });
});
