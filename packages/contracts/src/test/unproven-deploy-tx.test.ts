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

import { describe, expect, it, vi } from 'vitest';
import { createUnprovenDeployTx, createUnprovenDeployTxFromVerifierKeys } from '../unproven-deploy-tx';
import {
  createMockConstructorResult,
  createMockContract,
  createMockEncryptionPublicKey,
  createMockProviders,
  createMockSigningKey,
  createMockVerifierKeys
} from './test-mocks';

// Mock the callContractConstructor function and utility functions
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

vi.mock('@midnight-ntwrk/midnight-js-types', () => ({
  getImpureCircuitIds: vi.fn().mockReturnValue(['testCircuit'])
}));

describe('unproven-deploy-tx', () => {
  describe('createUnprovenDeployTxFromVerifierKeys', () => {
    it('should create unproven deploy tx from verifier keys without private state', async () => {
      const { callContractConstructor } = await import('../call-constructor');
      const mockCallContractConstructor = callContractConstructor as any;

      const constructorResult = createMockConstructorResult();
      mockCallContractConstructor.mockReturnValue(constructorResult);

      const verifierKeys = createMockVerifierKeys();
      const coinPublicKey = 'test-coin-public-key';
      const encryptionPublicKey = createMockEncryptionPublicKey();

      const options = {
        contract: createMockContract(),
        signingKey: createMockSigningKey(),
        args: ['deploy-arg']
      };

      const result = createUnprovenDeployTxFromVerifierKeys(
        verifierKeys,
        coinPublicKey,
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
      expect(mockCallContractConstructor).toHaveBeenCalledOnce();
    });

    it('should create unproven deploy tx from verifier keys with private state', async () => {
      const { callContractConstructor } = await import('../call-constructor');
      const mockCallContractConstructor = callContractConstructor as any;

      const constructorResult = createMockConstructorResult();
      mockCallContractConstructor.mockReturnValue(constructorResult);

      const verifierKeys = createMockVerifierKeys();
      const coinPublicKey = 'test-coin-public-key';
      const encryptionPublicKey = createMockEncryptionPublicKey();

      const options = {
        contract: createMockContract(),
        signingKey: createMockSigningKey(),
        initialPrivateState: { test: 'initial-private-state' },
        args: ['deploy-arg']
      };

      const result = createUnprovenDeployTxFromVerifierKeys(
        verifierKeys,
        coinPublicKey,
        options,
        encryptionPublicKey
      );

      expect(result).toBeDefined();
      expect(result.public).toBeDefined();
      expect(result.private).toBeDefined();
      expect(result.private.initialPrivateState).toBe(constructorResult.nextPrivateState);
      expect(result.private.signingKey).toBe(options.signingKey);
      expect(mockCallContractConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          contract: options.contract,
          coinPublicKey,
          initialPrivateState: options.initialPrivateState,
          args: options.args
        })
      );
    });
  });

  describe('createUnprovenDeployTx', () => {
    it('should create unproven deploy tx without private state', async () => {
      const providers = {
        zkConfigProvider: createMockProviders().zkConfigProvider,
        walletProvider: createMockProviders().walletProvider
      };

      providers.zkConfigProvider.getVerifierKeys.mockResolvedValue(createMockVerifierKeys());

      const options = {
        contract: createMockContract(),
        signingKey: createMockSigningKey(),
        args: ['deploy-arg']
      };

      const result = await createUnprovenDeployTx(providers, options);

      expect(result).toBeDefined();
      expect(providers.zkConfigProvider.getVerifierKeys).toHaveBeenCalledWith(['testCircuit']);
    });

    it('should create unproven deploy tx with private state', async () => {
      const providers = {
        zkConfigProvider: createMockProviders().zkConfigProvider,
        walletProvider: createMockProviders().walletProvider
      };

      providers.zkConfigProvider.getVerifierKeys.mockResolvedValue(createMockVerifierKeys());

      const options = {
        contract: createMockContract(),
        signingKey: createMockSigningKey(),
        initialPrivateState: { test: 'initial-private-state' },
        args: ['deploy-arg']
      };

      const result = await createUnprovenDeployTx(providers, options);

      expect(result).toBeDefined();
      expect(providers.zkConfigProvider.getVerifierKeys).toHaveBeenCalledWith(['testCircuit']);
    });
  });
});
