/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
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

import { bundledContractModuleProvider } from '@midnight-ntwrk/midnight-js-bundled-contract-module-provider';
import { deployContract, submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { nodeZkConfigRegistry } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { type ContractAddress, sampleSigningKey } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
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
import path from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { CompiledVault, CompiledVaultCallerContract, CompiledVaultContract } from '../src/contract';
import {
  type VaultCallerContractProviders,
  type VaultContractProviders
} from '../src/types/vault-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `cross_contract_call_${new Date().toISOString()}.log`)
);

const COMPILED_ROOT = path.resolve(__dirname, '../dist/contract/compiled');

class CompiledContractConfiguration implements ContractConfiguration {
  constructor(
    private readonly name: string,
    private readonly suffix = Date.now().toString()
  ) {}

  get privateStateStoreName(): string {
    return `${this.name}-private-store-${this.suffix}`;
  }

  get zkConfigPath(): string {
    return path.join(COMPILED_ROOT, this.name);
  }
}

describe('Cross-contract calls', () => {
  const MINT_AMOUNT = 1_000_000n;
  const SEND_AMOUNT = 1_000n;
  const DOMAIN_SEPARATOR = new Uint8Array(32).fill(7);

  let testEnvironment: TestEnvironment;
  let wallet: MidnightWalletProvider;
  let environmentConfiguration: EnvironmentConfiguration;
  let callerProviders: VaultCallerContractProviders;
  let callerAddress: ContractAddress;

  const mintAndSendFromVault = async (mintNonce: Uint8Array) => {
    const txData = await submitCallTx(callerProviders, {
      compiledContract: CompiledVaultCallerContract,
      contractAddress: callerAddress,
      circuitId: 'mintAndSendFromVault',
      args: [
        DOMAIN_SEPARATOR,
        MINT_AMOUNT,
        mintNonce,
        { bytes: new Uint8Array(Buffer.from(wallet.getCoinPublicKey(), 'hex')) },
        SEND_AMOUNT
      ]
    });
    const { result } = txData.private;
    if (!('sent' in result)) throw new Error('mintAndSendFromVault returned no ShieldedSendResult');
    return { txData, sent: result.sent };
  };

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    wallet = await testEnvironment.getMidnightWalletProvider();

    const vaultProviders: VaultContractProviders = initializeMidnightProviders(
      wallet,
      environmentConfiguration,
      new CompiledContractConfiguration('vault')
    );
    const vaultDeployOptions = {
      compiledContract: CompiledVaultContract,
      signingKey: sampleSigningKey(),
      initialPrivateState: undefined
    };
    const vault = await deployContract(vaultProviders, vaultDeployOptions);
    await expectSuccessfulDeployTx(vaultProviders, vault.deployTxData, vaultDeployOptions);
    const vaultAddress = vault.deployTxData.public.contractAddress;
    logger.info(`Deployed Vault contract at address: ${vaultAddress}`);

    callerProviders = {
      ...initializeMidnightProviders(wallet, environmentConfiguration, new CompiledContractConfiguration('vault-caller')),
      proofProvider: httpClientProofProvider({
        url: environmentConfiguration.proofServer,
        zkConfigProvider: await nodeZkConfigRegistry(COMPILED_ROOT)
      }),
      contractModuleProvider: bundledContractModuleProvider(
        new Map([[vaultAddress, () => Promise.resolve(CompiledVault)]])
      )
    };
    const vaultReference: [{ bytes: Uint8Array }] = [{ bytes: new Uint8Array(Buffer.from(vaultAddress, 'hex')) }];
    const callerDeployOptions = {
      compiledContract: CompiledVaultCallerContract,
      signingKey: sampleSigningKey(),
      initialPrivateState: undefined,
      args: vaultReference
    };
    const caller = await deployContract(callerProviders, callerDeployOptions);
    await expectSuccessfulDeployTx(callerProviders, caller.deployTxData, callerDeployOptions);
    callerAddress = caller.deployTxData.public.contractAddress;
    logger.info(`Deployed VaultCaller contract at address: ${callerAddress}`);
  });

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  test('hands the wallet a shielded coin that the callee mints and sends', async () => {
    // Act
    const { txData, sent } = await mintAndSendFromVault(new Uint8Array(32).fill(1));

    // Assert
    expect(txData.public.status).toBe(SucceedEntirely);
    expect(txData.private.newCoins).toEqual([
      {
        nonce: Buffer.from(sent.nonce).toString('hex'),
        type: Buffer.from(sent.color).toString('hex'),
        value: SEND_AMOUNT
      }
    ]);
  });

  test('lets the callee receive a shielded coin sent through the caller', async () => {
    // Arrange
    const minted = await mintAndSendFromVault(new Uint8Array(32).fill(2));
    expect(minted.txData.public.status).toBe(SucceedEntirely);
    await syncWallet(wallet.wallet);
    const coin = { nonce: new Uint8Array(32).fill(3), color: minted.sent.color, value: 100n };

    // Act
    const txData = await submitCallTx(callerProviders, {
      compiledContract: CompiledVaultCallerContract,
      contractAddress: callerAddress,
      circuitId: 'depositToVault',
      args: [coin]
    });

    // Assert
    expect(txData.public.status).toBe(SucceedEntirely);
  });
});
