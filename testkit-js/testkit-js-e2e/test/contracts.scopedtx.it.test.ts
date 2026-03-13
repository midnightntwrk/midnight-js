/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import { type ContractAddress } from '@midnight-ntwrk/ledger-v7';
import {
  type CallTxOptionsWithPrivateStateId,
  type FinalizedDeployTxData,
  submitCallTx,
  withContractScopedTransaction
} from '@midnight-ntwrk/midnight-js-contracts';
import type { EnvironmentConfiguration, MidnightWalletProvider, TestEnvironment } from '@midnight-ntwrk/testkit-js';
import { createLogger, getTestEnvironment, initializeMidnightProviders } from '@midnight-ntwrk/testkit-js';
import path from 'path';

import { CompiledDoubleCounterContract } from '@/contract';
import * as api from '@/double-counter-api';
import { CounterConfiguration } from '@/double-counter-api';
import {
  CounterPrivateStateId,
  type CounterProviders,
  type DeployedCounterContract,
  type DoubleCounterContract,
  privateStateZero
} from '@/double-counter-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `scoped_tx_contracts_${new Date().toISOString()}.log`)
);

describe('Scoped Transaction Contract Tests', () => {
  let providers: CounterProviders;
  let finalizedDeployTxData: FinalizedDeployTxData<DoubleCounterContract>;
  let deployedContract: DeployedCounterContract;
  let contractAddress: ContractAddress;
  let testEnvironment: TestEnvironment;
  let wallet: MidnightWalletProvider;
  let environmentConfiguration: EnvironmentConfiguration;
  let contractConfiguration: CounterConfiguration;

  beforeEach(() => {
    logger.info(`Running test=${expect.getState().currentTestName}`);
  });

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    contractConfiguration = new CounterConfiguration();
    api.setLogger(logger);
    logger.info(`Private state: ${JSON.stringify(privateStateZero)}`);
    wallet = await testEnvironment.getMidnightWalletProvider();

    providers = initializeMidnightProviders(wallet, environmentConfiguration, contractConfiguration);
    deployedContract = await api.deploy(providers, privateStateZero);
    finalizedDeployTxData = deployedContract.deployTxData;
    contractAddress = finalizedDeployTxData.public.contractAddress;
  });

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  test('should submit scoped transaction that calls circuit in contract [@slow]', async () => {
    const counterValue1 = await api.getCounterLedgerState(providers, contractAddress);
    expect(counterValue1).toBeDefined();
    expect(counterValue1?.at(0)).toBeDefined();

    const privateState1 = await api.getCounterPrivateState(providers, CounterPrivateStateId);
    expect(privateState1).toBeDefined();

    const callTxOptions: CallTxOptionsWithPrivateStateId<DoubleCounterContract, 'increment1'> = {
      compiledContract: CompiledDoubleCounterContract,
      contractAddress,
      circuitId: 'increment1',
      privateStateId: CounterPrivateStateId,
      args: [1n] as [bigint]
    };
    const callTxData = await withContractScopedTransaction<DoubleCounterContract>(providers, async (txCtx) => {
      await submitCallTx(providers, callTxOptions, txCtx);
      await submitCallTx(providers, callTxOptions, txCtx);
    });
    expect(callTxData.private.nextPrivateState.privateCounter).toEqual(privateState1!.privateCounter + 2);

    const counterValue2 = await api.getCounterLedgerState(providers, contractAddress);
    expect(counterValue2).toBeDefined();
    const ticker1 = counterValue1?.at(0);
    expect(counterValue2!.at(0)!).toEqual(ticker1! + 2n);
    const ticker2 = counterValue1?.at(1);
    expect(counterValue2!.at(1)!).toEqual(ticker2!);

    const counterPS = await api.getCounterPrivateState(providers, CounterPrivateStateId);
    expect(counterPS).toBeDefined();
    expect(counterPS!.privateCounter).toEqual(privateState1!.privateCounter + 2);
  });

  test('should submit scoped transaction that calls 2 different circuits in contract [@slow]', async () => {
    const counterValue1 = await api.getCounterLedgerState(providers, contractAddress);
    expect(counterValue1).toBeDefined();
    expect(counterValue1?.at(0)).toBeDefined();

    const privateState1 = await api.getCounterPrivateState(providers, CounterPrivateStateId);
    expect(privateState1).toBeDefined();

    const callTxOptions1: CallTxOptionsWithPrivateStateId<DoubleCounterContract, 'increment1'> = {
      compiledContract: CompiledDoubleCounterContract,
      contractAddress,
      circuitId: 'increment1',
      privateStateId: CounterPrivateStateId,
      args: [1n] as [bigint]
    } as CallTxOptionsWithPrivateStateId<DoubleCounterContract, 'increment1'>;
    const callTxOptions2: CallTxOptionsWithPrivateStateId<DoubleCounterContract, 'increment2'> = {
      compiledContract: CompiledDoubleCounterContract,
      contractAddress,
      circuitId: 'increment2',
      privateStateId: CounterPrivateStateId,
      args: [5n] as [bigint]
    };
    const callTxData = await withContractScopedTransaction<DoubleCounterContract>(providers, async (txCtx) => {
      await submitCallTx(providers, callTxOptions1, txCtx);
      await submitCallTx(providers, callTxOptions2, txCtx);
    });
    expect(callTxData.private.nextPrivateState.privateCounter).toEqual(privateState1!.privateCounter + 2);

    const counterValue2 = await api.getCounterLedgerState(providers, contractAddress);
    expect(counterValue2).toBeDefined();
    const ticker1 = counterValue1?.at(0);
    expect(counterValue2!.at(0)).toEqual(ticker1! + 1n);
    const ticker2 = counterValue1?.at(1);
    expect(counterValue2!.at(1)).toEqual(ticker2! + 5n);

    const counterPS = await api.getCounterPrivateState(providers, CounterPrivateStateId);
    expect(counterPS).toBeDefined();
    expect(counterPS!.privateCounter).toEqual(privateState1!.privateCounter + 2);
  });

  test('should submit scoped transaction that calls 2 circuits in contract and DOES NOT preserve execution order [@slow]', async () => {
    const counterValue1 = await api.getCounterLedgerState(providers, contractAddress);
    expect(counterValue1).toBeDefined();
    expect(counterValue1?.at(0)).toBeDefined();

    const privateState1 = await api.getCounterPrivateState(providers, CounterPrivateStateId);
    expect(privateState1).toBeDefined();

    const callTxOptions1: CallTxOptionsWithPrivateStateId<DoubleCounterContract, 'increment2'> = {
      compiledContract: CompiledDoubleCounterContract,
      contractAddress,
      circuitId: 'increment2',
      privateStateId: CounterPrivateStateId,
      args: [1n] as [bigint]
    };
    const callTxOptions2: CallTxOptionsWithPrivateStateId<DoubleCounterContract, 'reset'> = {
      compiledContract: CompiledDoubleCounterContract,
      contractAddress,
      circuitId: 'reset',
      privateStateId: CounterPrivateStateId
    };
    const callTxData = await withContractScopedTransaction<DoubleCounterContract>(providers, async (txCtx) => {
      await submitCallTx(providers, callTxOptions1, txCtx);
      await submitCallTx(providers, callTxOptions2, txCtx);
    });
    expect(callTxData.private.nextPrivateState.privateCounter).toEqual(privateState1!.privateCounter + 2);

    const counterValue2 = await api.getCounterLedgerState(providers, contractAddress);
    expect(counterValue2).toBeDefined();
    expect(counterValue2!.at(0)).toEqual(0n);
    // We don't know the order of execution, so the second ticker can be either reset to 0 or incremented by 1
    expect([0n, 1n]).toContain(counterValue2!.at(1));

    const counterPS = await api.getCounterPrivateState(providers, CounterPrivateStateId);
    expect(counterPS).toBeDefined();
    expect(counterPS!.privateCounter).toEqual(privateState1!.privateCounter + 2);
  });

  test('should not submit scoped transaction when one circuit call fails [@slow]', async () => {
    const aboveMaxValue = 65535n + 1n;
    const counterValue1 = await api.getCounterLedgerState(providers, contractAddress);
    expect(counterValue1?.at(0)).toBeDefined();

    const privateState1 = await api.getCounterPrivateState(providers, CounterPrivateStateId);
    expect(privateState1).toBeDefined();

    const callTxOptions: CallTxOptionsWithPrivateStateId<DoubleCounterContract, 'increment1'> = {
      compiledContract: CompiledDoubleCounterContract,
      contractAddress,
      circuitId: 'increment1',
      privateStateId: CounterPrivateStateId,
      args: [1n] as [bigint]
    };

    const invalidCallTxOptions: CallTxOptionsWithPrivateStateId<DoubleCounterContract, 'increment1'> = {
      compiledContract: CompiledDoubleCounterContract,
      contractAddress: contractAddress,
      circuitId: 'increment1',
      privateStateId: CounterPrivateStateId,
      args: [aboveMaxValue] as [bigint]
    };

    await expect(
      withContractScopedTransaction<DoubleCounterContract>(providers, async (txCtx) => {
        await submitCallTx(providers, callTxOptions, txCtx);
        await submitCallTx(providers, invalidCallTxOptions, txCtx);
      })
    ).rejects.toThrow(
      "Unexpected error executing scoped transaction '<unnamed>': Error: type error: increment1 argument 1 (argument 2 as invoked from Typescript) at double-counter.compact line 8 char 1; expected value of type Uint<0..65536> but received 65536n"
    );

    const counterValue2 = await api.getCounterLedgerState(providers, contractAddress);
    expect(counterValue2).toBeDefined();
    const ticker1 = counterValue1?.at(0);
    expect(counterValue2!.at(0)).toEqual(ticker1);

    const counterPS = await api.getCounterPrivateState(providers, CounterPrivateStateId);
    expect(counterPS).toBeDefined();
    expect(counterPS!.privateCounter).toEqual(privateState1!.privateCounter);
  });
});
