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

import { type ContractState, StateValue } from '@midnight-ntwrk/compact-runtime';
import { describe, expect, it, vi } from 'vitest';

import { createUnprovenCallTx, createUnprovenCallTxFromInitialStates } from '../unproven-call-tx';
import { createUnprovenDeployTxFromVerifierKeys } from '../unproven-deploy-tx';
import {
  createMockCallOptions,
  createMockCallOptionsWithPrivateState,
  createMockCompiledContract,
  createMockContract,
  createMockContractAddress,
  createMockEncryptionPublicKey,
  createMockPrivateStateId,
  createMockProviders,
  createMockSigningKey,
  createMockZKConfigProvider
} from './test-mocks';

// Mock the call function and utility functions
// vi.mock('../call', () => ({
//   call: vi.fn()
// }));

vi.mock('../get-states', () => ({
  getStates: vi.fn(),
  getPublicStates: vi.fn()
}));

vi.mock('../utils', () => ({
    createUnprovenLedgerDeployTx: vi.fn().mockReturnValue([
      'mock-contract-address',
      StateValue.newNull(),
      { test: 'unproven-tx' }
    ]),
    // createUnprovenLedgerDeployTx: (...args: any[]) => (originalModule as any).createUnprovenLedgerDeployTx(...args),
    createUnprovenLedgerCallTx: vi.fn().mockReturnValue({ test: 'unproven-tx' }),
    encryptionPublicKeyForZswapState: vi.fn().mockReturnValue('encrypted-key'),
    zswapStateToNewCoins: vi.fn().mockReturnValue([{ test: 'coin' }])
}));

const VALID_COIN_PUBLIC_KEY = 'd2dc8d175c0ef7d1f7e5b7f32bd9da5fcd4c60fa1b651f1d312986269c2d3c79';

describe('unproven-call-tx', () => {
  let initialContractState: Promise<ContractState> | null = null;
  const getInitialContractState = async () => {
    const _ = async () => {
      const a = await createUnprovenDeployTxFromVerifierKeys(
        createMockZKConfigProvider(),
        VALID_COIN_PUBLIC_KEY,
        {
          // contract: createMockContract(),
          compiledContract: createMockCompiledContract(),
          signingKey: createMockSigningKey(),
          // initialPrivateState: { test: 'initial-private-state' },
          // args: ['deploy-arg']
        },
        createMockEncryptionPublicKey()
      );

      return a.public.initialContractState;
    }
    return initialContractState || (initialContractState = _());
  }

  describe('createUnprovenCallTxFromInitialStates', () => {
    it('should create unproven call tx from initial states without private state', async () => {
      // const { call } = await import('../call');
      // // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // const mockCall = call as any;

      // const callResult = {
      //   public: {
      //     nextContractState: StateValue.newNull(),
      //     publicTranscript: [{ noop: { n: 1 } }],
      //     partitionedTranscript: [undefined, undefined]
      //   },
      //   private: {
      //     result: 'test-result',
      //     input: {} as AlignedValue,
      //     output: {} as AlignedValue,
      //     privateTranscriptOutputs: [],
      //     nextPrivateState: undefined,
      //     nextZswapLocalState: {} as ZswapLocalState
      //   }
      // } as CallResult<Contract.Any, Contract.ImpureCircuitId<Contract.Any>>;

      // mockCall.mockReturnValue(callResult);

      const options = createMockCallOptions({
        initialContractState: await getInitialContractState()
      });
      // const walletCoinPublicKey = 'wallet-coin-key';
      const walletEncryptionPublicKey = createMockEncryptionPublicKey();

      const result = await createUnprovenCallTxFromInitialStates(
        createMockZKConfigProvider(),
        options,
        VALID_COIN_PUBLIC_KEY,
        walletEncryptionPublicKey
      );

      expect(result).toBeDefined();
      expect(result.public).toBeDefined();
      expect(result.private).toBeDefined();
      expect(result.private.unprovenTx).toBeDefined();
      expect(result.private.newCoins).toBeDefined();
      // expect(mockCall).toHaveBeenCalledWith(options);
    });

    it('should create unproven call tx from initial states with private state', async () => {
      // const { call } = await import('../call');
      // // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // const mockCall = call as any;

      // const callResult = {
      //   public: {
      //     nextContractState: StateValue.newNull(),
      //     publicTranscript: [{ noop: { n: 1 } }],
      //     partitionedTranscript: [undefined, undefined]
      //   },
      //   private: {
      //     result: 'test-result',
      //     input: { test: 'input' },
      //     output: { test: 'output' },
      //     privateTranscriptOutputs: [],
      //     nextPrivateState: { test: 'next-private-state' },
      //     nextZswapLocalState: { test: 'zswap-state' }
      //   }
      // };

      // mockCall.mockReturnValue(callResult);

      const options = createMockCallOptionsWithPrivateState({
        initialContractState: await getInitialContractState()
      });
      // const walletCoinPublicKey = 'wallet-coin-key';
      const walletEncryptionPublicKey = createMockEncryptionPublicKey();

      const result = await createUnprovenCallTxFromInitialStates(
        createMockZKConfigProvider(),
        options,
        VALID_COIN_PUBLIC_KEY,
        walletEncryptionPublicKey
      );

      expect(result).toBeDefined();
      expect(result.public).toBeDefined();
      expect(result.private).toBeDefined();
      expect(result.private.nextPrivateState).toEqual({ test: 'next-private-state' });
      // expect(mockCall).toHaveBeenCalledWith(options);
    });
  });

  describe('createUnprovenCallTx', () => {
    it('should create unproven call tx without private state provider', async () => {
      const { getPublicStates } = await import('../get-states');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockGetPublicStates = getPublicStates as any;

      mockGetPublicStates.mockResolvedValue({
        zswapChainState: { test: 'zswap-chain-state' },
        // contractState: createMockContractState()
        contractState: await getInitialContractState()
      });

      const providers = {
        zkConfigProvider: createMockZKConfigProvider(),
        publicDataProvider: createMockProviders().publicDataProvider,
        walletProvider: createMockProviders().walletProvider
      };

      const options = {
        contract: createMockContract(),
        compiledContract: createMockCompiledContract(),
        circuitId: 'testCircuit',
        contractAddress: createMockContractAddress(),
        args: ['test-arg']
      };

      const result = await createUnprovenCallTx(providers, options);

      expect(result).toBeDefined();
      expect(mockGetPublicStates).toHaveBeenCalledWith(
        providers.publicDataProvider,
        options.contractAddress
      );
    });

    it('should create unproven call tx with private state provider', async () => {
      const { getStates } = await import('../get-states');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockGetStates = getStates as any;

      mockGetStates.mockResolvedValue({
        zswapChainState: { test: 'zswap-chain-state' },
        // contractState: createMockContractState(),
        contractState: await getInitialContractState(),
        privateState: { test: 'private-state' }
      });

      const providers = {
        zkConfigProvider: createMockZKConfigProvider(),
        publicDataProvider: createMockProviders().publicDataProvider,
        walletProvider: createMockProviders().walletProvider,
        privateStateProvider: createMockProviders().privateStateProvider
      };

      const options = {
        contract: createMockContract(),
        compiledContract: createMockCompiledContract(),
        circuitId: 'testCircuit',
        contractAddress: createMockContractAddress(),
        privateStateId: createMockPrivateStateId(),
        args: ['test-arg']
      };

      const result = await createUnprovenCallTx(providers, options);

      expect(result).toBeDefined();
      expect(mockGetStates).toHaveBeenCalledWith(
        providers.publicDataProvider,
        providers.privateStateProvider,
        options.contractAddress,
        options.privateStateId
      );
    });
  });
});
