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

import { createContractAdapter } from '@midnight-ntwrk/midnight-js-contract-builder';
import type {
  EnvironmentConfiguration,
  MidnightWalletProvider,
  TestEnvironment
} from '@midnight-ntwrk/testkit-js';
import { createLogger, getTestEnvironment, initializeMidnightProviders } from '@midnight-ntwrk/testkit-js';
import path from 'path';

import { SLOW_TEST_TIMEOUT } from '@/constants';
import {
  CompiledCounter,
  type CounterPrivateState,
  createInitialPrivateState,
  witnesses
} from '@/contract';
import type { Ledger } from '@/contract/managed/counter/contract/index.js';
import { CounterConfiguration } from '@/counter-api';
import type { CounterContract, CounterProviders, DeployedCounterContract } from '@/counter-types';

const logger = createLogger(
  path.resolve(`${process.cwd()}`, 'logs', 'tests', `contract-builder-e2e_${new Date().toISOString()}.log`)
);

describe('Contract Builder E2E Tests', () => {
  let testEnvironment: TestEnvironment;
  let wallet: MidnightWalletProvider;
  let providers: CounterProviders;
  let environmentConfiguration: EnvironmentConfiguration;

  beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    wallet = await testEnvironment.getMidnightWalletProvider();

    const contractConfiguration = new CounterConfiguration();
    providers = initializeMidnightProviders(wallet, environmentConfiguration, contractConfiguration);
  }, SLOW_TEST_TIMEOUT);

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  describe('Test 1: Deploy and increment counter using contract-builder', () => {
    it('should deploy counter contract and increment the value', async () => {
      const contractInstance: CounterContract = new CompiledCounter.Contract(witnesses);

      const adapter = await createContractAdapter<CounterContract, Ledger, CounterPrivateState>(
        contractInstance
      )
        .withWitnesses(witnesses)
        .withPrivateState({
          stateId: 'test-counter-1',
          initialState: createInitialPrivateState(0)
        })
        .withLogger(logger)
        .deploy(providers);

      expect(adapter.address).toBeDefined();
      expect(adapter.address).toMatch(/^[0-9a-f]{64}$/);

      const stateId = adapter.getPrivateStateId();
      expect(stateId).toBe('test-counter-1');

      const initialState = await adapter.getPrivateState();
      expect(initialState).toBeDefined();
      expect(initialState?.privateCounter).toBe(0);

      await adapter.increment();

      const updatedState = await adapter.getPrivateState();
      expect(updatedState?.privateCounter).toBe(1);
    }, SLOW_TEST_TIMEOUT);
  });

  describe('Test 2: Private state management with contract-builder', () => {
    it('should manage private state updates correctly', async () => {
      const contractInstance: CounterContract = new CompiledCounter.Contract(witnesses);

      const adapter = await createContractAdapter<CounterContract, Ledger, CounterPrivateState>(
        contractInstance
      )
        .withWitnesses(witnesses)
        .withPrivateState({
          stateId: 'test-counter-2',
          initialState: createInitialPrivateState(10)
        })
        .withPrivateStateDebug(true)
        .deploy(providers);

      const initialState = await adapter.getPrivateState();
      expect(initialState?.privateCounter).toBe(10);

      await adapter.setPrivateState({ privateCounter: 42 });

      const updatedState = await adapter.getPrivateState();
      expect(updatedState?.privateCounter).toBe(42);

      await adapter.increment();

      const finalState = await adapter.getPrivateState();
      expect(finalState?.privateCounter).toBe(43);
    }, SLOW_TEST_TIMEOUT);

    it('should handle multiple increments correctly', async () => {
      const contractInstance: CounterContract = new CompiledCounter.Contract(witnesses);

      const adapter = await createContractAdapter<CounterContract, Ledger, CounterPrivateState>(
        contractInstance
      )
        .withWitnesses(witnesses)
        .withPrivateState({
          stateId: 'test-counter-3',
          initialState: createInitialPrivateState(0)
        })
        .deploy(providers);

      for (let i = 0; i < 5; i++) {
        await adapter.increment();
      }

      const state = await adapter.getPrivateState();
      expect(state?.privateCounter).toBe(5);
    }, SLOW_TEST_TIMEOUT);
  });

  describe('Test 3: Connect to deployed contract', () => {
    it('should connect to existing contract and maintain state', async () => {
      const contractInstance1: CounterContract = new CompiledCounter.Contract(witnesses);

      // Deploy contract first
      const adapter1 = await createContractAdapter<CounterContract, Ledger, CounterPrivateState>(
        contractInstance1
      )
        .withWitnesses(witnesses)
        .withPrivateState({
          stateId: 'shared-counter-state',
          initialState: createInitialPrivateState(0)
        })
        .withLogger(logger)
        .deploy(providers);

      const deployedAddress = adapter1.address;
      expect(deployedAddress).toBeDefined();
      expect(deployedAddress).toMatch(/^[0-9a-f]{64}$/);

      // Increment counter in first instance
      await adapter1.increment();
      await adapter1.increment();
      await adapter1.increment();

      const state1 = await adapter1.getPrivateState();
      expect(state1?.privateCounter).toBe(3);

      // Connect to the same contract with a new adapter instance
      const contractInstance2: CounterContract = new CompiledCounter.Contract(witnesses);

      const adapter2 = await createContractAdapter<CounterContract, Ledger, CounterPrivateState>(
        contractInstance2
      )
        .withWitnesses(witnesses)
        .withPrivateState({
          stateId: 'shared-counter-state',
          initialState: createInitialPrivateState(0)
        })
        .withLogger(logger)
        .connect(deployedAddress, providers);

      expect(adapter2.address).toBe(deployedAddress);

      // Verify we can access the same state
      const state2 = await adapter2.getPrivateState();
      expect(state2?.privateCounter).toBe(3);

      // Increment via second adapter
      await adapter2.increment();

      const finalState = await adapter2.getPrivateState();
      expect(finalState?.privateCounter).toBe(4);
    }, SLOW_TEST_TIMEOUT);
  });
});
