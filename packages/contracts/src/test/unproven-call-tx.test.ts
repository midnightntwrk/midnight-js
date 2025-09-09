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

import { StateValue, type ZswapLocalState } from '@midnight-ntwrk/compact-runtime';
import { type AlignedValue } from '@midnight-ntwrk/ledger';
import { type Contract, type ImpureCircuitId } from '@midnight-ntwrk/midnight-js-types';
import { describe, expect, it, vi } from 'vitest';

import { type CallResult } from '../call';
import { createUnprovenCallTx, createUnprovenCallTxFromInitialStates } from '../unproven-call-tx';
import {
  createMockCallOptions,
  createMockCallOptionsWithPrivateState,
  createMockContract,
  createMockContractAddress,
  createMockContractState,
  createMockEncryptionPublicKey,
  createMockPrivateStateId,
  createMockProviders
} from './test-mocks';

// Mock the call function and utility functions
vi.mock('../call', () => ({
  call: vi.fn()
}));

vi.mock('../get-states', () => ({
  getStates: vi.fn(),
  getPublicStates: vi.fn()
}));

vi.mock('../utils', () => ({
  createUnprovenLedgerCallTx: vi.fn().mockReturnValue({ test: 'unproven-tx' }),
  encryptionPublicKeyForZswapState: vi.fn().mockReturnValue('encrypted-key'),
  zswapStateToNewCoins: vi.fn().mockReturnValue([{ test: 'coin' }])
}));

describe('unproven-call-tx', () => {
  describe('createUnprovenCallTxFromInitialStates', () => {
    it('should create unproven call tx from initial states without private state', async () => {
      const { call } = await import('../call');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockCall = call as any;

      const callResult = {
        public: {
          nextContractState: StateValue.newNull(),
          publicTranscript: [{ noop: { n: 1 } }],
          partitionedTranscript: [undefined, undefined]
        },
        private: {
          result: 'test-result',
          input: {} as AlignedValue,
          output: {} as AlignedValue,
          privateTranscriptOutputs: [],
          nextPrivateState: undefined,
          nextZswapLocalState: {} as ZswapLocalState
        }
      } as CallResult<Contract, ImpureCircuitId>;

      mockCall.mockReturnValue(callResult);

      const options = createMockCallOptions();
      const walletCoinPublicKey = 'wallet-coin-key';
      const walletEncryptionPublicKey = createMockEncryptionPublicKey();

      const result = createUnprovenCallTxFromInitialStates(
        options,
        walletCoinPublicKey,
        walletEncryptionPublicKey
      );

      expect(result).toBeDefined();
      expect(result.public).toBeDefined();
      expect(result.private).toBeDefined();
      expect(result.private.unprovenTx).toBeDefined();
      expect(result.private.newCoins).toBeDefined();
      expect(mockCall).toHaveBeenCalledWith(options);
    });

    it('should create unproven call tx from initial states with private state', async () => {
      const { call } = await import('../call');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockCall = call as any;

      const callResult = {
        public: {
          nextContractState: StateValue.newNull(),
          publicTranscript: [{ noop: { n: 1 } }],
          partitionedTranscript: [undefined, undefined]
        },
        private: {
          result: 'test-result',
          input: { test: 'input' },
          output: { test: 'output' },
          privateTranscriptOutputs: [],
          nextPrivateState: { test: 'next-private-state' },
          nextZswapLocalState: { test: 'zswap-state' }
        }
      };

      mockCall.mockReturnValue(callResult);

      const options = createMockCallOptionsWithPrivateState();
      const walletCoinPublicKey = 'wallet-coin-key';
      const walletEncryptionPublicKey = createMockEncryptionPublicKey();

      const result = createUnprovenCallTxFromInitialStates(
        options,
        walletCoinPublicKey,
        walletEncryptionPublicKey
      );

      expect(result).toBeDefined();
      expect(result.public).toBeDefined();
      expect(result.private).toBeDefined();
      expect(result.private.nextPrivateState).toEqual({ test: 'next-private-state' });
      expect(mockCall).toHaveBeenCalledWith(options);
    });
  });

  describe('createUnprovenCallTx', () => {
    it('should create unproven call tx without private state provider', async () => {
      const { getPublicStates } = await import('../get-states');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockGetPublicStates = getPublicStates as any;

      mockGetPublicStates.mockResolvedValue({
        zswapChainState: { test: 'zswap-chain-state' },
        contractState: createMockContractState()
      });

      const providers = {
        publicDataProvider: createMockProviders().publicDataProvider,
        walletProvider: createMockProviders().walletProvider
      };

      const options = {
        contract: createMockContract(),
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
        contractState: createMockContractState(),
        privateState: { test: 'private-state' }
      });

      const providers = {
        publicDataProvider: createMockProviders().publicDataProvider,
        walletProvider: createMockProviders().walletProvider,
        privateStateProvider: createMockProviders().privateStateProvider
      };

      const options = {
        contract: createMockContract(),
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
