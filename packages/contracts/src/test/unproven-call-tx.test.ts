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

import { type ContractState, StateValue } from '@midnight-ntwrk/compact-runtime';
import { LedgerParameters } from '@midnight-ntwrk/ledger-v8';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { createUnprovenCallTx, createUnprovenCallTxFromInitialStates } from '../unproven-call-tx';
import { createUnprovenDeployTxFromVerifierKeys } from '../unproven-deploy-tx';
import {
  createFailingCircuit,
  createMockCallOptions,
  createMockCallOptionsWithPrivateState,
  createMockCoinPublicKey,
  createMockCompiledContract,
  createMockContract,
  createMockContractAddress,
  createMockEncryptionPublicKey,
  createMockPrivateStateId,
  createMockProviders,
  createMockSigningKey,
  createMockZKConfigProvider
} from './test-mocks';

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
    createUnprovenLedgerCallTx: vi.fn().mockReturnValue({ test: 'unproven-tx' }),
    encryptionPublicKeyForZswapState: vi.fn().mockReturnValue('encrypted-key'),
    zswapStateToNewCoins: vi.fn().mockReturnValue([{ test: 'coin' }])
}));

describe('unproven-call-tx', () => {
  beforeAll(() => {
    setNetworkId('testnet');
  });

  let initialContractState: Promise<ContractState> | null = null;
  const getInitialContractState = async () => {
    const _ = async () => {
      const deploy = await createUnprovenDeployTxFromVerifierKeys(
        createMockZKConfigProvider(),
        createMockCoinPublicKey(),
        {
          compiledContract: createMockCompiledContract(),
          signingKey: createMockSigningKey(),
        },
        createMockEncryptionPublicKey()
      );

      return deploy.public.initialContractState;
    }
    return initialContractState || (initialContractState = _());
  }

  describe('createUnprovenCallTxFromInitialStates', () => {
    it('should create unproven call tx from initial states without private state', async () => {
      const options = createMockCallOptions({
        initialContractState: await getInitialContractState()
      });
      const walletEncryptionPublicKey = createMockEncryptionPublicKey();

      const result = await createUnprovenCallTxFromInitialStates(
        createMockZKConfigProvider(),
        options,
        walletEncryptionPublicKey
      );

      expect(result).toBeDefined();
      expect(result.public).toBeDefined();
      expect(result.private).toBeDefined();
      expect(result.private.unprovenTx).toBeDefined();
      expect(result.private.newCoins).toBeDefined();
    });

    it('should create unproven call tx from initial states with private state', async () => {
      const options = createMockCallOptionsWithPrivateState({
        initialContractState: await getInitialContractState()
      });
      const walletEncryptionPublicKey = createMockEncryptionPublicKey();

      const result = await createUnprovenCallTxFromInitialStates(
        createMockZKConfigProvider(),
        options,
        walletEncryptionPublicKey
      );

      expect(result).toBeDefined();
      expect(result.public).toBeDefined();
      expect(result.private).toBeDefined();
      expect(result.private.nextPrivateState).toEqual({ test: 'next-private-state' });
    });

    it('should fail when circuit fails at runtime', async () => {
      const options = createMockCallOptions({
        compiledContract: createMockCompiledContract({
          testCircuit: createFailingCircuit('FAIL')
        }),
        initialContractState: await getInitialContractState()
      });
      const walletEncryptionPublicKey = createMockEncryptionPublicKey();

      await expect(createUnprovenCallTxFromInitialStates(
        createMockZKConfigProvider(),
        options,
        walletEncryptionPublicKey
      )).rejects.toThrow('failed assert: FAIL');
    });
  });

  describe('createUnprovenCallTx', () => {
    it('should create unproven call tx without private state provider', async () => {
      const { getPublicStates } = await import('../get-states');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockGetPublicStates = getPublicStates as any;

      mockGetPublicStates.mockResolvedValue({
        zswapChainState: { test: 'zswap-chain-state' },
        contractState: await getInitialContractState(),
        ledgerParameters: LedgerParameters.initialParameters()
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
        contractState: await getInitialContractState(),
        privateState: { test: 'private-state' },
        ledgerParameters: LedgerParameters.initialParameters()
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
