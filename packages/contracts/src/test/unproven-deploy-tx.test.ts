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

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { createUnprovenDeployTx, createUnprovenDeployTxFromVerifierKeys } from '../unproven-deploy-tx';
import {
  createMockCoinPublicKey,
  createMockCompiledContract,
  createMockEncryptionPublicKey,
  createMockProviders,
  createMockSigningKey,
  createMockZKConfigProvider
} from './test-mocks';

vi.mock('../call-constructor', () => ({
  callContractConstructor: vi.fn()
}));

vi.mock('../utils', () => ({
  createUnprovenLedgerDeployTx: vi.fn().mockReturnValue([
    'mock-contract-address',
    { test: 'initial-contract-state' },
    { test: 'unproven-tx' }
  ]),
  zswapStateToNewCoins: vi.fn().mockReturnValue([{ test: 'coin' }])
}));

describe('unproven-deploy-tx', () => {
  beforeAll(() => {
    setNetworkId('testnet');
  });

  describe('createUnprovenDeployTxFromVerifierKeys', () => {
    it('should create unproven deploy tx from verifier keys without private state', async () => {
      const encryptionPublicKey = createMockEncryptionPublicKey();

      const options = {
        compiledContract: createMockCompiledContract(),
        signingKey: createMockSigningKey(),
        args: ['deploy-arg']
      };

      const result = await createUnprovenDeployTxFromVerifierKeys(
        createMockZKConfigProvider(),
        createMockCoinPublicKey(),
        options,
        encryptionPublicKey
      );

      expect(result).toBeDefined();
      expect(result.public).toBeDefined();
      expect(result.private).toBeDefined();
      expect(result.public.contractAddress).toBe('mock-contract-address');
      expect(result.public.initialContractState).toEqual({ test: 'initial-contract-state' });
      expect(result.private.signingKey).toBe(options.signingKey);
      expect(result.private.unprovenTx).toEqual({ test: 'unproven-tx' });
    });

    it('should create unproven deploy tx from verifier keys with private state', async () => {
      const encryptionPublicKey = createMockEncryptionPublicKey();

      const options = {
        compiledContract: createMockCompiledContract(),
        signingKey: createMockSigningKey(),
        initialPrivateState: { test: 'initial-private-state' },
        args: ['deploy-arg']
      };

      const result = await createUnprovenDeployTxFromVerifierKeys(
        createMockZKConfigProvider(),
        createMockCoinPublicKey(),
        options,
        encryptionPublicKey
      );

      expect(result).toBeDefined();
      expect(result.public).toBeDefined();
      expect(result.private).toBeDefined();
      expect(result.private.signingKey).toBe(options.signingKey);
    });

    it('should fail when contract initialState function throws CompactError', async () => {
      const encryptionPublicKey = createMockEncryptionPublicKey();

      const options = {
        compiledContract: createMockCompiledContract({
          initialStateErrorMessage: 'FAIL'
        }),
        signingKey: createMockSigningKey(),
        initialPrivateState: { test: 'initial-private-state' },
        args: ['deploy-arg']
      };

      await expect(
        createUnprovenDeployTxFromVerifierKeys(
          createMockZKConfigProvider(),
          createMockCoinPublicKey(),
          options,
          encryptionPublicKey
        )
      ).rejects.toThrow('Failed to configure constructor context with coin public key');
    });
  });

  describe('createUnprovenDeployTx', () => {
    it('should create unproven deploy tx without private state', async () => {
      const providers = {
        zkConfigProvider: createMockZKConfigProvider(),
        walletProvider: createMockProviders().walletProvider
      };

      vi.spyOn(providers.zkConfigProvider, 'getVerifierKey');

      const options = {
        compiledContract: createMockCompiledContract(),
        signingKey: createMockSigningKey(),
        args: ['deploy-arg']
      };

      const result = await createUnprovenDeployTx(providers, options);

      expect(result).toBeDefined();
      expect(providers.zkConfigProvider.getVerifierKey).toHaveBeenCalledWith('testCircuit');
    });

    it('should create unproven deploy tx with private state', async () => {
      const providers = {
        zkConfigProvider: createMockZKConfigProvider(),
        walletProvider: createMockProviders().walletProvider
      };

      vi.spyOn(providers.zkConfigProvider, 'getVerifierKey');

      const options = {
        compiledContract: createMockCompiledContract(),
        signingKey: createMockSigningKey(),
        initialPrivateState: { test: 'initial-private-state' },
        args: ['deploy-arg']
      };

      const result = await createUnprovenDeployTx(providers, options);

      expect(result).toBeDefined();
      expect(providers.zkConfigProvider.getVerifierKey).toHaveBeenCalledWith('testCircuit');
    });
  });
});
