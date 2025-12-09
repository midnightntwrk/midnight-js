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

import { createContractAdapter } from '@midnight-ntwrk/contract-builder';
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
import type { CounterContract, CounterProviders } from '@/counter-types';

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

      await (adapter as any).increment();

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

      await (adapter as any).increment();

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
        await (adapter as any).increment();
      }

      const state = await adapter.getPrivateState();
      expect(state?.privateCounter).toBe(5);
    }, SLOW_TEST_TIMEOUT);
  });

  describe('Test 3: Event handling and monitoring with contract-builder', () => {
    it('should emit and capture call, success, and witnessCall events', async () => {
      const callEvents: any[] = [];
      const successEvents: any[] = [];
      const witnessCallEvents: any[] = [];

      const contractInstance: CounterContract = new CompiledCounter.Contract(witnesses);

      const adapter = await createContractAdapter<CounterContract, Ledger, CounterPrivateState>(
        contractInstance
      )
        .withWitnesses(witnesses)
        .withPrivateState({
          stateId: 'test-counter-4',
          initialState: createInitialPrivateState(0)
        })
        .on('call', (event) => {
          callEvents.push(event);
          logger.info(`Method called: ${event.methodName}`);
        })
        .on('success', (event) => {
          successEvents.push(event);
          logger.info(`Method succeeded: ${event.methodName}`);
        })
        .on('witnessCall', (event) => {
          witnessCallEvents.push(event);
          logger.info(`Witness called: ${event.witnessName}`);
        })
        .deploy(providers);

      await adapter.increment();

      expect(callEvents.length).toBeGreaterThan(0);
      expect(callEvents[0].methodName).toBe('increment');
      expect(callEvents[0].timestamp).toBeDefined();

      expect(successEvents.length).toBeGreaterThan(0);
      expect(successEvents[0].methodName).toBe('increment');
      expect(successEvents[0].duration).toBeDefined();

      expect(witnessCallEvents.length).toBeGreaterThan(0);
      expect(witnessCallEvents[0].witnessName).toBe('privateIncrement');
    }, SLOW_TEST_TIMEOUT);

    it('should handle error events gracefully', async () => {
      const errorEvents: any[] = [];

      const contractInstance: CounterContract = new CompiledCounter.Contract(witnesses);

      const adapter = await createContractAdapter<CounterContract, Ledger, CounterPrivateState>(
        contractInstance
      )
        .withWitnesses(witnesses)
        .withPrivateState({
          stateId: 'test-counter-5',
          initialState: createInitialPrivateState(0)
        })
        .on('error', (event) => {
          errorEvents.push(event);
          logger.error(`Method failed: ${event.methodName}, Error: ${event.error}`);
        })
        .deploy(providers);

      try {
        await (adapter as any).nonExistentMethod?.();
      } catch (error) {
        // Expected error for non-existent method
      }

      expect(adapter.address).toBeDefined();
    }, SLOW_TEST_TIMEOUT);
  });
});
