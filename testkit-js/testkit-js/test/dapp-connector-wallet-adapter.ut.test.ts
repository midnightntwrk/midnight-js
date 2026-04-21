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

import type { ProvingProvider as ZkirProvingProvider } from '@midnight-ntwrk/zkir-v2';
import { of } from 'rxjs';

import type { EnvironmentConfiguration } from '@/test-environment/environment-configuration';
import { DAppConnectorWalletAdapter } from '@/wallet/dapp-connector-wallet-adapter';
import type { MidnightWalletProvider } from '@/wallet/midnight-wallet-provider';

vi.mock('@midnight-ntwrk/wallet-sdk-address-format', () => ({
  MidnightBech32m: {
    encode: vi.fn().mockReturnValue({ asString: () => 'mn1shielded-bech32m-address' }),
  },
  ShieldedAddress: {
    codec: { encode: vi.fn().mockReturnValue({ asString: () => 'mn1shielded-bech32m-address' }) },
  },
  DustAddress: {
    encodePublicKey: vi.fn().mockReturnValue('mn1dust-bech32m-address'),
  },
}));

vi.mock('@midnight-ntwrk/zkir-v2', () => ({
  provingProvider: vi.fn().mockReturnValue({
    check: vi.fn(),
    prove: vi.fn(),
  } satisfies ZkirProvingProvider),
}));

vi.mock('@midnight-ntwrk/wallet-sdk-prover-client/effect', () => ({
  WasmProver: {
    makeDefaultKeyMaterialProvider: vi.fn().mockReturnValue({
      lookupKey: vi.fn().mockResolvedValue({ ir: new Uint8Array(), proverKey: new Uint8Array(), verifierKey: new Uint8Array() }),
      getParams: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    }),
  },
}));

vi.mock('@midnight-ntwrk/midnight-js-protocol/ledger', () => ({
  Transaction: {
    deserialize: vi.fn(),
  },
}));

vi.mock('@midnight-ntwrk/midnight-js-utils', () => ({
  fromHex: vi.fn().mockReturnValue(new Uint8Array()),
  toHex: vi.fn().mockReturnValue('aabb'),
  ttlOneHour: vi.fn().mockReturnValue(new Date('2026-01-01T00:00:00Z')),
}));

const mockShieldedState = {
  address: {
    coinPublicKeyString: () => 'coin-pub-key-hex',
    encryptionPublicKeyString: () => 'enc-pub-key-hex',
  },
  balances: { '0x01': 100n, '0x02': 200n },
};

const mockUnshieldedState = {
  balances: { '0x03': 300n },
};

const mockDustState = {
  balance: vi.fn().mockReturnValue(500n),
};

const mockWalletFacade = {
  shielded: { state: of(mockShieldedState) },
  unshielded: { state: of(mockUnshieldedState) },
  dust: { state: of(mockDustState) },
  balanceUnboundTransaction: vi.fn(),
  balanceFinalizedTransaction: vi.fn(),
  signRecipe: vi.fn(),
  finalizeRecipe: vi.fn(),
  submitTransaction: vi.fn(),
};

const mockUnshieldedKeystore = {
  getBech32Address: vi.fn().mockReturnValue({ asString: () => 'mn1unshielded-bech32m-address' }),
  signData: vi.fn().mockReturnValue('mock-signature'),
  getPublicKey: vi.fn().mockReturnValue('mock-public-key'),
  getSecretKey: vi.fn(),
  getAddress: vi.fn(),
};

const mockEnvironmentConfiguration: EnvironmentConfiguration = {
  walletNetworkId: 'undeployed' as EnvironmentConfiguration['walletNetworkId'],
  networkId: 'testnet',
  indexer: 'http://localhost:8080/indexer',
  indexerWS: 'ws://localhost:8080/indexer',
  node: 'http://localhost:9944',
  nodeWS: 'ws://localhost:9944',
  proofServer: 'http://localhost:6300',
  faucet: 'http://localhost:8080/faucet',
};

const mockWalletProvider = {
  wallet: mockWalletFacade as MidnightWalletProvider['wallet'],
  unshieldedKeystore: mockUnshieldedKeystore as MidnightWalletProvider['unshieldedKeystore'],
  zswapSecretKeys: {} as MidnightWalletProvider['zswapSecretKeys'],
  dustSecretKey: { publicKey: 12345n } as MidnightWalletProvider['dustSecretKey'],
};

describe('[Unit tests] DAppConnectorWalletAdapter', () => {
  let adapter: DAppConnectorWalletAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new DAppConnectorWalletAdapter(mockWalletProvider, mockEnvironmentConfiguration);
  });

  describe('getConfiguration', () => {
    it('should map EnvironmentConfiguration fields to Configuration', async () => {
      const config = await adapter.getConfiguration();

      expect(config).toEqual({
        indexerUri: 'http://localhost:8080/indexer',
        indexerWsUri: 'ws://localhost:8080/indexer',
        proverServerUri: 'http://localhost:6300',
        substrateNodeUri: 'http://localhost:9944',
        networkId: 'testnet',
      });
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connected status with correct networkId', async () => {
      const status = await adapter.getConnectionStatus();

      expect(status).toEqual({ status: 'connected', networkId: 'testnet' });
    });
  });

  describe('hintUsage', () => {
    it('should resolve without error', async () => {
      await expect(adapter.hintUsage(['getShieldedBalances', 'submitTransaction'])).resolves.toBeUndefined();
    });
  });

  describe('stubbed methods', () => {
    it('makeTransfer should throw not implemented', async () => {
      await expect(adapter.makeTransfer([])).rejects.toThrow('Not implemented in DAppConnectorWalletAdapter');
    });

    it('makeIntent should throw not implemented', async () => {
      await expect(
        adapter.makeIntent([], [], { intentId: 'random', payFees: true }),
      ).rejects.toThrow('Not implemented in DAppConnectorWalletAdapter');
    });

    it('getTxHistory should throw not implemented', async () => {
      await expect(adapter.getTxHistory(0, 10)).rejects.toThrow('Not implemented in DAppConnectorWalletAdapter');
    });
  });

  describe('getShieldedAddresses', () => {
    it('should return Bech32m-encoded address and key strings from wallet state', async () => {
      const { MidnightBech32m } = await import('@midnight-ntwrk/wallet-sdk-address-format');

      const result = await adapter.getShieldedAddresses();

      expect(MidnightBech32m.encode).toHaveBeenCalledWith('testnet', mockShieldedState.address);
      expect(result).toEqual({
        shieldedAddress: 'mn1shielded-bech32m-address',
        shieldedCoinPublicKey: 'coin-pub-key-hex',
        shieldedEncryptionPublicKey: 'enc-pub-key-hex',
      });
    });
  });

  describe('getUnshieldedAddress', () => {
    it('should return Bech32m-encoded address from keystore', async () => {
      const result = await adapter.getUnshieldedAddress();

      expect(mockUnshieldedKeystore.getBech32Address).toHaveBeenCalled();
      expect(result).toEqual({ unshieldedAddress: 'mn1unshielded-bech32m-address' });
    });
  });

  describe('getDustAddress', () => {
    it('should return encoded dust address from DustSecretKey public key', async () => {
      const { DustAddress } = await import('@midnight-ntwrk/wallet-sdk-address-format');

      const result = await adapter.getDustAddress();

      expect(DustAddress.encodePublicKey).toHaveBeenCalledWith('testnet', 12345n);
      expect(result).toEqual({ dustAddress: 'mn1dust-bech32m-address' });
    });
  });

  describe('getShieldedBalances', () => {
    it('should return balances from shielded wallet state', async () => {
      const result = await adapter.getShieldedBalances();

      expect(result).toEqual({ '0x01': 100n, '0x02': 200n });
    });
  });

  describe('getUnshieldedBalances', () => {
    it('should return balances from unshielded wallet state', async () => {
      const result = await adapter.getUnshieldedBalances();

      expect(result).toEqual({ '0x03': 300n });
    });
  });

  describe('getDustBalance', () => {
    it('should return balance from dust wallet state', async () => {
      const result = await adapter.getDustBalance();

      expect(mockDustState.balance).toHaveBeenCalled();
      expect(result).toEqual({ balance: 500n, cap: 0n });
    });
  });

  describe('signData', () => {
    it('should decode hex data and return signature', async () => {
      const result = await adapter.signData('abcd', { encoding: 'hex', keyType: 'unshielded' });

      expect(mockUnshieldedKeystore.signData).toHaveBeenCalled();
      expect(result).toEqual({
        data: 'abcd',
        signature: 'mock-signature',
        verifyingKey: 'mock-public-key',
      });
    });

    it('should decode base64 data and return signature', async () => {
      const result = await adapter.signData('aGVsbG8=', { encoding: 'base64', keyType: 'unshielded' });

      const callArg = mockUnshieldedKeystore.signData.mock.calls[0][0] as Buffer;
      expect(Buffer.from(callArg).toString('utf-8')).toBe('hello');
      expect(result.data).toBe('aGVsbG8=');
    });

    it('should decode text data and return signature', async () => {
      const result = await adapter.signData('hello world', { encoding: 'text', keyType: 'unshielded' });

      const callArg = mockUnshieldedKeystore.signData.mock.calls[0][0] as Buffer;
      expect(Buffer.from(callArg).toString('utf-8')).toBe('hello world');
      expect(result.data).toBe('hello world');
    });
  });

  describe('balanceUnsealedTransaction', () => {
    it('should deserialize as preBinding, balance, sign, finalize, and return hex transaction', async () => {
      const { Transaction } = await import('@midnight-ntwrk/midnight-js-protocol/ledger');
      mockWalletFacade.balanceUnboundTransaction.mockResolvedValue({});
      mockWalletFacade.signRecipe.mockResolvedValue({});
      mockWalletFacade.finalizeRecipe.mockResolvedValue({ serialize: () => new Uint8Array() });

      const result = await adapter.balanceUnsealedTransaction('abcd');

      expect(Transaction.deserialize).toHaveBeenCalledWith('signature', 'proof', 'preBinding', expect.any(Uint8Array));
      expect(mockWalletFacade.balanceUnboundTransaction).toHaveBeenCalled();
      expect(mockWalletFacade.balanceUnboundTransaction.mock.calls[0][2]).toEqual(
        expect.objectContaining({ tokenKindsToBalance: 'all' }),
      );
      expect(result).toEqual({ tx: 'aabb' });
    });

    it('should exclude fees from balancing when payFees is false', async () => {
      mockWalletFacade.balanceUnboundTransaction.mockResolvedValue({});
      mockWalletFacade.signRecipe.mockResolvedValue({});
      mockWalletFacade.finalizeRecipe.mockResolvedValue({ serialize: () => new Uint8Array() });

      await adapter.balanceUnsealedTransaction('abcd', { payFees: false });

      expect(mockWalletFacade.balanceUnboundTransaction).toHaveBeenCalled();
      expect(mockWalletFacade.balanceUnboundTransaction.mock.calls[0][2]).toEqual(
        expect.objectContaining({ tokenKindsToBalance: ['shielded', 'unshielded'] }),
      );
    });
  });

  describe('balanceSealedTransaction', () => {
    it('should deserialize as binding, balance finalized, sign, finalize, and return hex transaction', async () => {
      const { Transaction } = await import('@midnight-ntwrk/midnight-js-protocol/ledger');
      mockWalletFacade.balanceFinalizedTransaction.mockResolvedValue({});
      mockWalletFacade.signRecipe.mockResolvedValue({});
      mockWalletFacade.finalizeRecipe.mockResolvedValue({ serialize: () => new Uint8Array() });

      const result = await adapter.balanceSealedTransaction('abcd');

      expect(Transaction.deserialize).toHaveBeenCalledWith('signature', 'proof', 'binding', expect.any(Uint8Array));
      expect(mockWalletFacade.balanceFinalizedTransaction).toHaveBeenCalled();
      expect(mockWalletFacade.balanceFinalizedTransaction.mock.calls[0][2]).toEqual(
        expect.objectContaining({ tokenKindsToBalance: 'all' }),
      );
      expect(result).toEqual({ tx: 'aabb' });
    });
  });

  describe('submitTransaction', () => {
    it('should deserialize as binding and submit to wallet', async () => {
      const { Transaction } = await import('@midnight-ntwrk/midnight-js-protocol/ledger');

      await adapter.submitTransaction('abcd');

      expect(Transaction.deserialize).toHaveBeenCalledWith('signature', 'proof', 'binding', expect.anything());
      expect(mockWalletFacade.submitTransaction).toHaveBeenCalled();
    });
  });

  describe('getProvingProvider', () => {
    it('should return a ProvingProvider by adapting KeyMaterialProvider types', async () => {
      const { provingProvider: createLocalProvingProvider } = await import('@midnight-ntwrk/zkir-v2');

      const mockDAppKMP = {
        getZKIR: vi.fn().mockResolvedValue(new Uint8Array([1])),
        getProverKey: vi.fn().mockResolvedValue(new Uint8Array([2])),
        getVerifierKey: vi.fn().mockResolvedValue(new Uint8Array([3])),
      };

      const result = await adapter.getProvingProvider(mockDAppKMP);

      expect(createLocalProvingProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          lookupKey: expect.any(Function),
          getParams: expect.any(Function),
        }),
      );
      expect(result).toBeDefined();
      expect(result.check).toBeDefined();
      expect(result.prove).toBeDefined();
    });

    it('should try dApp keys first in lookupKey, then fall back to default provider', async () => {
      const { provingProvider: createLocalProvingProvider } = await import('@midnight-ntwrk/zkir-v2');
      const { WasmProver } = await import('@midnight-ntwrk/wallet-sdk-prover-client/effect');

      const failingDAppKMP = {
        getZKIR: vi.fn().mockRejectedValue(new Error('not found')),
        getProverKey: vi.fn().mockRejectedValue(new Error('not found')),
        getVerifierKey: vi.fn().mockRejectedValue(new Error('not found')),
      };

      await adapter.getProvingProvider(failingDAppKMP);

      const zkirProviderArg = vi.mocked(createLocalProvingProvider).mock.calls[0][0];
      const keyMaterial = await zkirProviderArg.lookupKey('midnight/zswap/spend');
      const defaultProvider = vi.mocked(WasmProver.makeDefaultKeyMaterialProvider).mock.results[0].value;

      expect(defaultProvider.lookupKey).toHaveBeenCalledWith('midnight/zswap/spend');
      expect(keyMaterial).toBeDefined();
    });

    it('should delegate getParams to default provider', async () => {
      const { provingProvider: createLocalProvingProvider } = await import('@midnight-ntwrk/zkir-v2');

      const mockDAppKMP = {
        getZKIR: vi.fn(),
        getProverKey: vi.fn(),
        getVerifierKey: vi.fn(),
      };

      await adapter.getProvingProvider(mockDAppKMP);

      const zkirProviderArg = vi.mocked(createLocalProvingProvider).mock.calls[0][0];
      const params = await zkirProviderArg.getParams(16);

      expect(params).toEqual(new Uint8Array([1, 2, 3]));
    });
  });
});
