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

import { deployContract, submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { type ContractAddress, sampleSigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
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
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `unshielded_mint_and_send_${new Date().toISOString()}.log`)
);

class UnshieldedConfiguration implements ContractConfiguration {
  constructor(private suffix = Date.now().toString()) {}

  get privateStateStoreName(): string {
    return `unshielded-mint-send-store-${this.suffix}`;
  }

  get zkConfigPath(): string {
    return path.resolve(__dirname, '../dist/contract/compiled/unshielded');
  }
}

describe('Unshielded tokens - mint and send variants', () => {
  const MINT_AMOUNT = 1_000_000n;
  const DOMAIN_SEPARATOR = new Uint8Array(32).fill(1);

  let testEnvironment: TestEnvironment;
  let wallet: MidnightWalletProvider;
  let environmentConfiguration: EnvironmentConfiguration;
  let providers: UnshieldedContractProviders;
  let contractAddress: ContractAddress;
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

    providers = initializeMidnightProviders(wallet, environmentConfiguration, new UnshieldedConfiguration());

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

  test('should mint tokens to contract address (self)', async () => {
    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'mintUnshieldedToContractTest' as UnshieldedContractCircuit,
      args: [DOMAIN_SEPARATOR, { bytes: new Uint8Array(Buffer.from(contractAddress, 'hex')) }, MINT_AMOUNT]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.private.result).toBeInstanceOf(Uint8Array);
    expect(txData.private.result).toHaveLength(32);
    expect(txData.public.unshielded).toBeDefined();

    const created = txData.public.unshielded.created;
    const spent = txData.public.unshielded.spent;
    expect(created.length).toEqual(0);
    expect(spent.length).toEqual(0);
  });

  test('should mint tokens to user address', async () => {
    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'mintUnshieldedToUserTest' as UnshieldedContractCircuit,
      args: [DOMAIN_SEPARATOR, { bytes: unshieldedAddressBytes }, MINT_AMOUNT]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.private.result).toBeInstanceOf(Uint8Array);
    expect(txData.private.result).toHaveLength(32);
    expect(txData.public.unshielded).toBeDefined();

    const created = txData.public.unshielded.created;
    expect(created.length).toEqual(1);
  });

  test('should send tokens to self', async () => {
    const mintTxData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'mintUnshieldedToSelfTest' as UnshieldedContractCircuit,
      args: [DOMAIN_SEPARATOR, MINT_AMOUNT]
    });
    const color = mintTxData.private.result as Uint8Array;

    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'sendUnshieldedToSelfTest' as UnshieldedContractCircuit,
      args: [color, MINT_AMOUNT / 10n]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.public.unshielded).toBeDefined();

    const created = txData.public.unshielded.created;
    const spent = txData.public.unshielded.spent;
    expect(created.length).toEqual(0);
    expect(spent.length).toEqual(0);
  });

  test('should send tokens to contract address (self)', async () => {
    const mintTxData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'mintUnshieldedToSelfTest' as UnshieldedContractCircuit,
      args: [DOMAIN_SEPARATOR, MINT_AMOUNT]
    });
    const color = mintTxData.private.result as Uint8Array;

    const txData = await submitCallTx(providers, {
      compiledContract: CompiledUnshieldedContract,
      contractAddress,
      circuitId: 'sendUnshieldedToContractTest' as UnshieldedContractCircuit,
      args: [color, MINT_AMOUNT / 10n, { bytes: new Uint8Array(Buffer.from(contractAddress, 'hex')) }]
    });

    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.public.unshielded).toBeDefined();

    const created = txData.public.unshielded.created;
    const spent = txData.public.unshielded.spent;
    expect(created.length).toEqual(0);
    expect(spent.length).toEqual(0);
  });
});
