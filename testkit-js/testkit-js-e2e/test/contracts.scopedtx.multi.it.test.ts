/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  type CallTxOptionsWithPrivateStateId,
  deployContract,
  submitCallTx,
  withContractScopedTransaction
} from '@midnightntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnightntwrk/midnight-js-http-client-proof-provider';
import { nodeZkConfigRegistry } from '@midnightntwrk/midnight-js-node-zk-config-provider';
import { type ContractAddress, Transaction } from '@midnightntwrk/midnight-js-protocol/v9';
import { sampleSigningKey } from '@midnightntwrk/midnight-js-protocol/v9/compact-runtime';
import { SucceedEntirely } from '@midnightntwrk/midnight-js-types';
import {
  createLogger,
  type EnvironmentConfiguration,
  expectSuccessfulDeployTx,
  getTestEnvironment,
  initializeMidnightProviders,
  type MidnightWalletProvider,
  type TestEnvironment
} from '@midnightntwrk/testkit-js';
import path from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import {
  CompiledCounterContract,
  CompiledScopeShapesContract
} from '../src/contract';
import * as counterApi from '../src/counter-api';
import { type CounterContract, type CounterProviders } from '../src/types/counter-types';
import { CounterPrivateStateId, privateStateZero } from '../src/types/double-counter-types';
import { type ScopeShapesContract, type ScopeShapesContractProviders } from '../src/types/scope-shapes-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `scoped_tx_multi_${new Date().toISOString()}.log`)
);

const COMPILED_ROOT = path.resolve(__dirname, '../dist/contract/compiled');

describe('Scoped transactions over several calls and contracts', () => {
  const DEPENDENT_RUNS = 5;
  const MINT_AMOUNT = 1_000n;
  const DOMAIN_SEPARATOR = new Uint8Array(32).fill(11);

  let testEnvironment: TestEnvironment;
  let environmentConfiguration: EnvironmentConfiguration;
  let wallet: MidnightWalletProvider;
  let counterProviders: CounterProviders;
  let scopeShapesProviders: ScopeShapesContractProviders;
  let counterAddress: ContractAddress;
  let scopeShapesAddress: ContractAddress;

  const incrementOptions = (): CallTxOptionsWithPrivateStateId<CounterContract, 'increment'> => ({
    compiledContract: CompiledCounterContract,
    contractAddress: counterAddress,
    circuitId: 'increment',
    privateStateId: CounterPrivateStateId
  });

  const decrementOptions = (amount: bigint): CallTxOptionsWithPrivateStateId<CounterContract, 'decrement'> => ({
    compiledContract: CompiledCounterContract,
    contractAddress: counterAddress,
    circuitId: 'decrement',
    privateStateId: CounterPrivateStateId,
    args: [amount]
  });

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    wallet = await testEnvironment.getMidnightWalletProvider();
    counterApi.setLogger(logger);
    const suffix = Date.now().toString();

    // One proof provider that resolves the keys of every contract a scope reaches.
    const proofProvider = httpClientProofProvider({
      url: environmentConfiguration.proofServer,
      zkConfigProvider: await nodeZkConfigRegistry(COMPILED_ROOT)
    });
    counterProviders = {
      ...initializeMidnightProviders(
        wallet,
        environmentConfiguration,
        new counterApi.CounterConfiguration(`counter-private-state-${suffix}`)
      ),
      proofProvider
    };
    scopeShapesProviders = {
      ...initializeMidnightProviders(wallet, environmentConfiguration, {
        privateStateStoreName: `scope-shapes-private-state-${suffix}`,
        zkConfigPath: path.join(COMPILED_ROOT, 'scope-shapes')
      }),
      proofProvider
    };

    counterAddress = (await counterApi.deploy(counterProviders, privateStateZero)).deployTxData.public.contractAddress;
    const scopeShapesDeployOptions = {
      compiledContract: CompiledScopeShapesContract,
      signingKey: sampleSigningKey(),
      initialPrivateState: undefined
    };
    const scopeShapes = await deployContract(scopeShapesProviders, scopeShapesDeployOptions);
    await expectSuccessfulDeployTx(scopeShapesProviders, scopeShapes.deployTxData, scopeShapesDeployOptions);
    scopeShapesAddress = scopeShapes.deployTxData.public.contractAddress;
  });

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  test.each(Array.from({ length: DEPENDENT_RUNS }, (_, run) => run))(
    'should land a call that only succeeds on the state the call before it left, run %i of 5 [@slow]',
    async () => {
      expect(await counterApi.getCounterLedgerState(counterProviders, counterAddress)).toEqual(0n);
      const privateState1 = await counterApi.getCounterPrivateState(
        counterProviders,
        counterAddress,
        CounterPrivateStateId
      );

      // The counter is at zero: the decrement is valid only on the state the increment left.
      const callTxData = await withContractScopedTransaction<CounterContract>(counterProviders, async (txCtx) => {
        await submitCallTx(counterProviders, incrementOptions(), txCtx);
        await submitCallTx(counterProviders, decrementOptions(1n), txCtx);
      });

      expect(callTxData.public.status).toBe(SucceedEntirely);
      expect(await counterApi.getCounterLedgerState(counterProviders, counterAddress)).toEqual(0n);
      const privateState2 = await counterApi.getCounterPrivateState(
        counterProviders,
        counterAddress,
        CounterPrivateStateId
      );
      expect(privateState2!.privateCounter).toEqual(privateState1!.privateCounter + 2);
    }
  );

  test('should spend, in the next call of the scope, a coin a call minted to the contract [@slow]', async () => {
    const walletKey = { bytes: new Uint8Array(Buffer.from(wallet.getCoinPublicKey(), 'hex')) };

    const callTxData = await withContractScopedTransaction<ScopeShapesContract>(scopeShapesProviders, async (txCtx) => {
      const minted = await submitCallTx(
        scopeShapesProviders,
        {
          compiledContract: CompiledScopeShapesContract,
          contractAddress: scopeShapesAddress,
          circuitId: 'mintToSelf',
          args: [DOMAIN_SEPARATOR, MINT_AMOUNT, new Uint8Array(32).fill(12)]
        },
        txCtx
      );
      await submitCallTx(
        scopeShapesProviders,
        {
          compiledContract: CompiledScopeShapesContract,
          contractAddress: scopeShapesAddress,
          circuitId: 'sendMinted',
          args: [minted.private.result, walletKey, MINT_AMOUNT]
        },
        txCtx
      );
    });

    expect(callTxData.public.status).toBe(SucceedEntirely);
    // The scope's result is its last call's, typed by every circuit of the contract.
    const { result } = callTxData.private;
    if (!('sent' in result)) throw new Error('the last call returned no ShieldedSendResult');
    expect(callTxData.private.newCoins).toEqual([
      {
        nonce: Buffer.from(result.sent.nonce).toString('hex'),
        type: Buffer.from(result.sent.color).toString('hex'),
        value: MINT_AMOUNT
      }
    ]);
    // The coin minted to the contract is spent inside the transaction, as a transient: it is never left unspent.
    const transaction = callTxData.private.unprovenTx.deserialize({ v9: Transaction });
    expect(transaction.guaranteedOffer!.transients).toHaveLength(1);
    expect(transaction.fallibleOffer).toBeUndefined();
  });
});
