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

import {
  type CircuitContext,
  type ContractModuleProvider,
  type ContractState,
  type ContractStateProvider,
  StateValue
} from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { LedgerParameters, type ZswapChainState } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { describe, expect, it, vi } from 'vitest';

import { createUnprovenLedgerCallTx, makeCalleeStateResolver } from '../internal/utils';
import { createUnprovenCallTx, createUnprovenCallTxFromInitialStates } from '../unproven-call-tx';
import { createUnprovenDeployTxFromVerifierKeys } from '../unproven-deploy-tx';
import {
  createDefaultCircuit,
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
  createMockZKConfigProvider,
  MOCK_CONFIG
} from './test-mocks';

vi.mock('../get-states', () => ({
  getStates: vi.fn(),
  getPublicStates: vi.fn()
}));

vi.mock('../internal/utils', () => ({
    createUnprovenLedgerDeployTx: vi.fn().mockReturnValue([
      'mock-contract-address',
      StateValue.newNull(),
      { test: 'unproven-tx' }
    ]),
    createUnprovenLedgerCallTx: vi.fn().mockReturnValue({ test: 'unproven-tx' }),
    createEncryptionPublicKeyResolver: vi.fn().mockReturnValue(() => 'encrypted-key'),
    encryptionPublicKeyResolverForZswapState: vi.fn().mockReturnValue(() => 'encrypted-key'),
    // Both: the call path uses zswapCallsToNewCoins, and the deploy this file sets up with reaches
    // zswapStateToNewCoins through unproven-deploy-tx.
    zswapCallsToNewCoins: vi.fn().mockReturnValue([{ test: 'coin' }]),
    zswapStateToNewCoins: vi.fn().mockReturnValue([{ test: 'coin' }]),
    makeCalleeStateResolver: vi.fn()
}));

const BECH32M_UNDEPLOYED_COIN_PUBLIC_KEY = 'mn_shield-cpk_undeployed1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sn7kq7h';

describe('unproven-call-tx', () => {
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
        createMockEncryptionPublicKey(),
        MOCK_CONFIG
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

    it('forwards the executor log events onto the public result as logEvents (empty when the circuit emits no logs)', async () => {
      const options = createMockCallOptions({
        initialContractState: await getInitialContractState()
      });
      const walletEncryptionPublicKey = createMockEncryptionPublicKey();

      const result = await createUnprovenCallTxFromInitialStates(
        createMockZKConfigProvider(),
        options,
        walletEncryptionPublicKey
      );

      expect(result.public.logEvents).toEqual([]);
    });

    it('publishes the post-call state as an ENCODED value beside the handle, as the retained era does', async () => {
      const options = createMockCallOptions({
        initialContractState: await getInitialContractState()
      });

      const result = await createUnprovenCallTxFromInitialStates(
        createMockZKConfigProvider(),
        options,
        createMockEncryptionPublicKey()
      );

      // The handle is valid only inside this process; the encoded form is the
      // one that survives a `structuredClone`, a worker transfer and storage,
      // and it is pinned identical across the ledger runtimes -- so it is the
      // member era-agnostic code can read in either era. Asserting it EQUALS
      // the handle's own encoding is the point: a second, independently
      // derived value could disagree with the state actually published.
      expect(result.public.nextContractStateEncoded).toEqual(result.public.nextContractState.encode());
    });

    const BLOCK_HASH = 'ab'.repeat(32);

    const createContextRecordingCircuit = (seen: CircuitContext[]) => {
      const circuit = createDefaultCircuit();
      return vi.fn().mockImplementation((ctx: CircuitContext) => {
        seen.push(ctx);
        return circuit(ctx);
      });
    };

    it('pins the call to the block without enabling callees when no module provider is given', async () => {
      // Arrange
      const seen: CircuitContext[] = [];
      const options = createMockCallOptions({
        compiledContract: createMockCompiledContract({ testCircuit: createContextRecordingCircuit(seen) }),
        initialContractState: await getInitialContractState()
      });

      // Act
      await createUnprovenCallTxFromInitialStates(createMockZKConfigProvider(), options, createMockEncryptionPublicKey(), {
        publicDataProvider: createMockProviders().publicDataProvider,
        blockHash: BLOCK_HASH
      });

      // Assert
      expect(seen).toHaveLength(1);
      expect(seen[0]!.callContext.parentBlockHash).toBe(BLOCK_HASH);
      expect(seen[0]!.stateProvider).toBeUndefined();
      expect(seen[0]!.moduleProvider).toBeUndefined();
    });

    it('hands the callee state and module providers to the runtime together when a module provider is given', async () => {
      // Arrange
      const seen: CircuitContext[] = [];
      const stateProvider: ContractStateProvider = { getContractState: vi.fn() };
      const moduleProvider: ContractModuleProvider = { resolve: vi.fn() };
      vi.mocked(makeCalleeStateResolver).mockReturnValueOnce({
        stateProvider,
        resolvedStates: new Map(),
        blockHash: BLOCK_HASH
      });
      const options = createMockCallOptions({
        compiledContract: createMockCompiledContract({ testCircuit: createContextRecordingCircuit(seen) }),
        initialContractState: await getInitialContractState()
      });

      // Act
      await createUnprovenCallTxFromInitialStates(createMockZKConfigProvider(), options, createMockEncryptionPublicKey(), {
        publicDataProvider: createMockProviders().publicDataProvider,
        blockHash: BLOCK_HASH,
        moduleProvider
      });

      // Assert
      expect(seen).toHaveLength(1);
      expect(seen[0]!.callContext.parentBlockHash).toBe(BLOCK_HASH);
      expect(seen[0]!.stateProvider).toBe(stateProvider);
      expect(seen[0]!.moduleProvider).toBe(moduleProvider);
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

    it('rejects an invalid TTL before running the circuit', async () => {
      const options = createMockCallOptions({
        compiledContract: createMockCompiledContract({
          testCircuit: createFailingCircuit('FAIL')
        }),
        initialContractState: await getInitialContractState(),
        config: { networkId: 'preview', ttlSeconds: 0 }
      });

      await expect(createUnprovenCallTxFromInitialStates(
        createMockZKConfigProvider(),
        options,
        createMockEncryptionPublicKey()
      )).rejects.toThrow(RangeError);
    });
  });

  describe('createUnprovenCallTx', () => {
    it('decodes a Bech32m wallet key with providers.config.networkId', async () => {
      const { getPublicStates } = await import('../get-states');
      vi.mocked(getPublicStates, { partial: true }).mockResolvedValue({
        zswapChainState: { test: 'zswap-chain-state' } as unknown as ZswapChainState,
        contractState: await getInitialContractState(),
        ledgerParameters: LedgerParameters.initialParameters()
      });
      const walletProvider = { ...createMockProviders().walletProvider, getCoinPublicKey: () => BECH32M_UNDEPLOYED_COIN_PUBLIC_KEY };
      const providers = {
        zkConfigProvider: createMockZKConfigProvider(),
        publicDataProvider: createMockProviders().publicDataProvider,
        walletProvider,
        config: { networkId: 'preview', ttlSeconds: 60 }
      };
      const options = {
        contract: createMockContract(),
        compiledContract: createMockCompiledContract(),
        circuitId: 'testCircuit',
        contractAddress: createMockContractAddress(),
        args: ['test-arg']
      };

      await expect(createUnprovenCallTx(providers, options)).rejects.toThrow('Expected preview address, got undeployed one');
    });

    it('refuses a missing providers.config before reading chain state', async () => {
      const publicDataProvider = createMockProviders().publicDataProvider;
      const providers = Object.assign(
        {
          zkConfigProvider: createMockZKConfigProvider(),
          publicDataProvider,
          walletProvider: createMockProviders().walletProvider,
          config: MOCK_CONFIG
        },
        { config: undefined }
      );
      const options = {
        contract: createMockContract(),
        compiledContract: createMockCompiledContract(),
        circuitId: 'testCircuit',
        contractAddress: createMockContractAddress(),
        args: ['test-arg']
      };

      await expect(createUnprovenCallTx(providers, options)).rejects.toThrow(/^providers\.config is missing/);
      expect(publicDataProvider.queryBlock).not.toHaveBeenCalled();
    });

    it('rejects an invalid TTL before reading chain state', async () => {
      const { getPublicStates } = await import('../get-states');
      const publicDataProvider = createMockProviders().publicDataProvider;
      const providers = {
        zkConfigProvider: createMockZKConfigProvider(),
        publicDataProvider,
        walletProvider: createMockProviders().walletProvider,
        config: { networkId: 'preview', ttlSeconds: 0 }
      };
      const options = {
        contract: createMockContract(),
        compiledContract: createMockCompiledContract(),
        circuitId: 'testCircuit',
        contractAddress: createMockContractAddress(),
        args: ['test-arg']
      };
      vi.mocked(getPublicStates).mockClear();

      await expect(createUnprovenCallTx(providers, options)).rejects.toThrow(RangeError);
      expect(publicDataProvider.queryBlock).not.toHaveBeenCalled();
      expect(getPublicStates).not.toHaveBeenCalled();
    });

    it('throws when the latest block cannot be fetched from the public data provider', async () => {
      const publicDataProvider = createMockProviders().publicDataProvider;
      publicDataProvider.queryBlock = vi.fn().mockResolvedValue(null);

      const providers = {
        zkConfigProvider: createMockZKConfigProvider(),
        publicDataProvider,
        walletProvider: createMockProviders().walletProvider,
        config: MOCK_CONFIG
      };
      const options = {
        contract: createMockContract(),
        compiledContract: createMockCompiledContract(),
        circuitId: 'testCircuit',
        contractAddress: createMockContractAddress(),
        args: ['test-arg']
      };

      await expect(createUnprovenCallTx(providers, options)).rejects.toThrow(
        'Failed to fetch the latest block from the public data provider'
      );
    });

    it('should create unproven call tx without private state provider', async () => {
      const { getPublicStates } = await import('../get-states');
      const mockGetPublicStates = vi.mocked(getPublicStates, { partial: true });

      mockGetPublicStates.mockResolvedValue({
        zswapChainState: { test: 'zswap-chain-state' } as unknown as ZswapChainState,
        contractState: await getInitialContractState(),
        ledgerParameters: LedgerParameters.initialParameters()
      });

      const providers = {
        zkConfigProvider: createMockZKConfigProvider(),
        publicDataProvider: createMockProviders().publicDataProvider,
        walletProvider: createMockProviders().walletProvider,
        config: MOCK_CONFIG
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
        options.contractAddress,
        '00'.repeat(32)
      );
    });

    it('should create unproven call tx with private state provider', async () => {
      const { getStates } = await import('../get-states');
      const mockGetStates = vi.mocked(getStates, { partial: true });

      mockGetStates.mockResolvedValue({
        zswapChainState: { test: 'zswap-chain-state' } as unknown as ZswapChainState,
        contractState: await getInitialContractState(),
        privateState: { test: 'private-state' },
        ledgerParameters: LedgerParameters.initialParameters()
      });

      const providers = {
        zkConfigProvider: createMockZKConfigProvider(),
        publicDataProvider: createMockProviders().publicDataProvider,
        walletProvider: createMockProviders().walletProvider,
        privateStateProvider: createMockProviders().privateStateProvider,
        config: MOCK_CONFIG
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
        options.privateStateId,
        '00'.repeat(32)
      );
    });

    it('forwards providers.config to the ledger builder', async () => {
      const { getPublicStates } = await import('../get-states');
      vi.mocked(getPublicStates, { partial: true }).mockResolvedValue({
        zswapChainState: { test: 'zswap-chain-state' } as unknown as ZswapChainState,
        contractState: await getInitialContractState(),
        ledgerParameters: LedgerParameters.initialParameters()
      });
      const config = { networkId: 'preview', ttlSeconds: 45 };
      const providers = {
        zkConfigProvider: createMockZKConfigProvider(),
        publicDataProvider: createMockProviders().publicDataProvider,
        walletProvider: createMockProviders().walletProvider,
        config
      };

      const options = {
        contract: createMockContract(),
        compiledContract: createMockCompiledContract(),
        circuitId: 'testCircuit',
        contractAddress: createMockContractAddress(),
        args: ['test-arg']
      };

      await createUnprovenCallTx(providers, options);

      expect(vi.mocked(createUnprovenLedgerCallTx)).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        config
      );
    });
  });
});
