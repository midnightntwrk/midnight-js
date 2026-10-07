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

import { describe, expect, it, vi } from 'vitest';

import { createUnprovenLedgerDeployTx, zswapStateToNewCoins } from '../internal/utils';
import { createUnprovenDeployTx, createUnprovenDeployTxFromVerifierKeys } from '../unproven-deploy-tx';
import {
  createMockCoinPublicKey,
  createMockCompiledContract,
  createMockEncryptionPublicKey,
  createMockProviders,
  createMockSigningKey,
  createMockZKConfigProvider,
  MOCK_CONFIG
} from './test-mocks';

vi.mock('../call-constructor', () => ({
  callContractConstructor: vi.fn()
}));

vi.mock('../internal/utils', () => ({
  createUnprovenLedgerDeployTx: vi.fn().mockReturnValue([
    'mock-contract-address',
    { test: 'initial-contract-state' },
    { test: 'unproven-tx' }
  ]),
  createEncryptionPublicKeyResolver: vi.fn().mockReturnValue(() => 'encrypted-key'),
  zswapStateToNewCoins: vi.fn().mockReturnValue([{ test: 'coin' }])
}));

const BECH32M_UNDEPLOYED_COIN_PUBLIC_KEY = 'mn_shield-cpk_undeployed1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sn7kq7h';
const BECH32M_UNDEPLOYED_COIN_PUBLIC_KEY_HEX = 'dca6896e7fe2f00a3d63be2168df8862cae24a770471e08c646d260db162675f';

describe('unproven-deploy-tx', () => {
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
        encryptionPublicKey,
        MOCK_CONFIG
      );

      expect(result).toBeDefined();
      expect(result.public).toBeDefined();
      expect(result.private).toBeDefined();
      expect(result.public.contractAddress).toBe('mock-contract-address');
      expect(result.public.initialContractState).toEqual({ test: 'initial-contract-state' });
      expect(result.private.signingKey).toEqual(options.signingKey);
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
        encryptionPublicKey,
        MOCK_CONFIG
      );

      expect(result).toBeDefined();
      expect(result.public).toBeDefined();
      expect(result.private).toBeDefined();
      expect(result.private.signingKey).toEqual(options.signingKey);
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
          encryptionPublicKey,
          MOCK_CONFIG
        )
      ).rejects.toThrow('FAIL');
    });

    it('rejects an invalid TTL before running the constructor', async () => {
      const options = {
        compiledContract: createMockCompiledContract({
          initialStateErrorMessage: 'FAIL'
        }),
        signingKey: createMockSigningKey(),
        args: ['deploy-arg']
      };

      await expect(
        createUnprovenDeployTxFromVerifierKeys(
          createMockZKConfigProvider(),
          createMockCoinPublicKey(),
          options,
          createMockEncryptionPublicKey(),
          { networkId: 'preview', ttlSeconds: 0 }
        )
      ).rejects.toThrow(RangeError);
    });
  });

  describe('createUnprovenDeployTx', () => {
    it('should create unproven deploy tx without private state', async () => {
      const providers = {
        zkConfigProvider: createMockZKConfigProvider(),
        walletProvider: createMockProviders().walletProvider,
        config: MOCK_CONFIG
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
        walletProvider: createMockProviders().walletProvider,
        config: MOCK_CONFIG
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

    it('refuses a missing providers.config before running the constructor', async () => {
      const zkConfigProvider = createMockZKConfigProvider();
      vi.spyOn(zkConfigProvider, 'getVerifierKey');
      const providers = Object.assign(
        { zkConfigProvider, walletProvider: createMockProviders().walletProvider, config: MOCK_CONFIG },
        { config: undefined }
      );
      const options = {
        compiledContract: createMockCompiledContract(),
        signingKey: createMockSigningKey(),
        args: ['deploy-arg']
      };

      await expect(createUnprovenDeployTx(providers, options)).rejects.toThrow(/^providers\.config is missing/);
      expect(zkConfigProvider.getVerifierKey).not.toHaveBeenCalled();
    });

    it.each([
      ['undeployed', true],
      ['preview', false]
    ])('decodes a Bech32m wallet key with providers.config.networkId = %s', async (networkId, accepted) => {
      const walletProvider = { ...createMockProviders().walletProvider, getCoinPublicKey: () => BECH32M_UNDEPLOYED_COIN_PUBLIC_KEY };
      const providers = { zkConfigProvider: createMockZKConfigProvider(), walletProvider, config: { networkId, ttlSeconds: 60 } };
      const options = {
        compiledContract: createMockCompiledContract(),
        signingKey: createMockSigningKey(),
        args: ['deploy-arg']
      };

      const deployed = createUnprovenDeployTx(providers, options);

      if (accepted) {
        await expect(deployed).resolves.toBeDefined();
        expect(vi.mocked(createUnprovenLedgerDeployTx)).toHaveBeenLastCalledWith(
          expect.anything(),
          expect.anything(),
          expect.anything(),
          providers.config
        );
        expect(vi.mocked(zswapStateToNewCoins)).toHaveBeenLastCalledWith(BECH32M_UNDEPLOYED_COIN_PUBLIC_KEY_HEX, expect.anything());
      } else {
        await expect(deployed).rejects.toThrow('Expected preview address, got undeployed one');
      }
    });

    it('forwards providers.config to the ledger builder', async () => {
      const config = { networkId: 'preview', ttlSeconds: 45 };
      const providers = {
        zkConfigProvider: createMockZKConfigProvider(),
        walletProvider: createMockProviders().walletProvider,
        config
      };

      const options = {
        compiledContract: createMockCompiledContract(),
        signingKey: createMockSigningKey(),
        args: ['deploy-arg']
      };

      await createUnprovenDeployTx(providers, options);

      expect(vi.mocked(createUnprovenLedgerDeployTx)).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        config
      );
    });
  });
});
