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

import { loadLedger8Protocol } from '@midnight-ntwrk/midnight-js-protocol';
import { COMMON_ERROR_CODES } from '@midnight-ntwrk/midnight-js-protocol/errors';
import {
  CostModel,
  type FinalizedTransaction,
  Intent,
  type ProvingProvider,
  Transaction
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';
import { hasErrorCode, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { type DAppConnectorWalletAPI, dappConnectorWalletProviders } from '../dapp-connector-wallet-providers';

const shieldedAddresses = {
  shieldedAddress: 'shielded-address',
  shieldedCoinPublicKey: 'coin-public-key',
  shieldedEncryptionPublicKey: 'encryption-public-key'
};

const createApi = (overrides: Partial<DAppConnectorWalletAPI> = {}): DAppConnectorWalletAPI => ({
  getShieldedAddresses: vi.fn().mockResolvedValue(shieldedAddresses),
  balanceUnsealedTransaction: vi.fn().mockResolvedValue({ tx: '' }),
  submitTransaction: vi.fn().mockResolvedValue(undefined),
  ...overrides
});

const noCircuitsProver: ProvingProvider = {
  check: () => Promise.reject(new Error('a transaction without calls needs no proof')),
  prove: () => Promise.reject(new Error('a transaction without calls needs no proof')),
  lookupKey: () => Promise.reject(new Error('a transaction without calls needs no proof'))
};

describe('dappConnectorWalletProviders', () => {
  let unbound: UnboundTransaction;
  let finalized: FinalizedTransaction;
  let finalizedWithoutId: FinalizedTransaction;
  let ledger8TxBytes: Uint8Array;
  let ledger8BalancedTxBytes: Uint8Array;
  let ledger8TxId: string;

  beforeAll(async () => {
    const ttl = new Date(Date.now() + 3_600_000);
    unbound = await Transaction.fromParts('undeployed', undefined, undefined, Intent.new(ttl)).prove(
      noCircuitsProver,
      CostModel.initialCostModel()
    );
    finalized = unbound.bind();
    finalizedWithoutId = Transaction.fromParts('undeployed').mockProve();

    const v8 = await loadLedger8Protocol();
    ledger8TxBytes = v8.Transaction.fromParts('undeployed').serialize();
    const ledger8Finalized = v8.Transaction.fromParts('undeployed', undefined, undefined, v8.Intent.new(ttl)).mockProve();
    ledger8BalancedTxBytes = ledger8Finalized.serialize();
    [ledger8TxId] = ledger8Finalized.identifiers();
  });

  it('reads the shielded keys from the connector once', async () => {
    const api = createApi();

    const { walletProvider } = await dappConnectorWalletProviders(api);

    expect(walletProvider.getCoinPublicKey()).toBe('coin-public-key');
    expect(walletProvider.getEncryptionPublicKey()).toBe('encryption-public-key');
    expect(api.getShieldedAddresses).toHaveBeenCalledTimes(1);
  });

  it('serves ledger 8 and ledger 9 on both providers', async () => {
    const { walletProvider, midnightProvider } = await dappConnectorWalletProviders(createApi());

    expect([...walletProvider.supportedEras].sort()).toEqual(['v8', 'v9']);
    expect([...midnightProvider.supportedEras].sort()).toEqual(['v8', 'v9']);
  });

  describe('balanceTx', () => {
    it('sends a ledger 9 transaction to the wallet as hex and returns the balanced transaction', async () => {
      const balanceUnsealedTransaction = vi.fn().mockResolvedValue({ tx: toHex(finalized.serialize()) });
      const { walletProvider } = await dappConnectorWalletProviders(createApi({ balanceUnsealedTransaction }));

      const result = await walletProvider.balanceTx({ version: 'v9', tx: unbound });

      expect(balanceUnsealedTransaction).toHaveBeenCalledWith(toHex(unbound.serialize()));
      expect(result.version).toBe('v9');
      expect(result.version === 'v9' && result.tx.serialize()).toEqual(finalized.serialize());
    });

    it('passes ledger 8 bytes through the wallet unchanged', async () => {
      const balanceUnsealedTransaction = vi.fn().mockResolvedValue({ tx: toHex(ledger8BalancedTxBytes) });
      const { walletProvider } = await dappConnectorWalletProviders(createApi({ balanceUnsealedTransaction }));

      const result = await walletProvider.balanceTx({ version: 'v8', txBytes: ledger8TxBytes });

      expect(balanceUnsealedTransaction).toHaveBeenCalledWith(toHex(ledger8TxBytes));
      expect(result).toEqual({ version: 'v8', txBytes: ledger8BalancedTxBytes });
    });

    it('accepts upper-case hex from the wallet', async () => {
      const balanceUnsealedTransaction = vi.fn().mockResolvedValue({ tx: toHex(ledger8BalancedTxBytes).toUpperCase() });
      const { walletProvider } = await dappConnectorWalletProviders(createApi({ balanceUnsealedTransaction }));

      const result = await walletProvider.balanceTx({ version: 'v8', txBytes: ledger8TxBytes });

      expect(result).toEqual({ version: 'v8', txBytes: ledger8BalancedTxBytes });
    });

    it.each([
      ['an odd number of digits', 'abc'],
      ['a non-hex character', 'zz'],
      ['a 0x prefix', '0x00']
    ])('rejects a wallet answer with %s', async (_, tx) => {
      const balanceUnsealedTransaction = vi.fn().mockResolvedValue({ tx });
      const { walletProvider } = await dappConnectorWalletProviders(createApi({ balanceUnsealedTransaction }));

      const failure = await walletProvider.balanceTx({ version: 'v8', txBytes: ledger8TxBytes }).catch((e: unknown) => e);

      expect(hasErrorCode(failure, COMMON_ERROR_CODES.INVALID_ARGUMENT)).toBe(true);
    });

    it.each(['v8', 'v9'] as const)('lets a %s wallet rejection reach the caller unchanged', async (version) => {
      const rejection = Object.assign(new Error('User rejected'), { code: 'Rejected' });
      const balanceUnsealedTransaction = vi.fn().mockRejectedValue(rejection);
      const { walletProvider } = await dappConnectorWalletProviders(createApi({ balanceUnsealedTransaction }));
      const payload = version === 'v9' ? { version, tx: unbound } : { version, txBytes: ledger8TxBytes };

      await expect(walletProvider.balanceTx(payload)).rejects.toBe(rejection);
    });
  });

  describe('submitTx', () => {
    it('submits a ledger 9 transaction as hex and returns its identifier', async () => {
      const submitTransaction = vi.fn().mockResolvedValue(undefined);
      const { midnightProvider } = await dappConnectorWalletProviders(createApi({ submitTransaction }));

      const txId = await midnightProvider.submitTx({ version: 'v9', tx: finalized });

      expect(submitTransaction).toHaveBeenCalledWith(toHex(finalized.serialize()));
      expect(txId).toBe(finalized.identifiers()[0]);
    });

    it('submits ledger 8 bytes as hex and returns the identifier read from them', async () => {
      const submitTransaction = vi.fn().mockResolvedValue(undefined);
      const { midnightProvider } = await dappConnectorWalletProviders(createApi({ submitTransaction }));

      const txId = await midnightProvider.submitTx({ version: 'v8', txBytes: ledger8BalancedTxBytes });

      expect(submitTransaction).toHaveBeenCalledWith(toHex(ledger8BalancedTxBytes));
      expect(txId).toBe(ledger8TxId);
    });

    it('refuses a ledger 9 transaction without an identifier before submitting it', async () => {
      const submitTransaction = vi.fn().mockResolvedValue(undefined);
      const { midnightProvider } = await dappConnectorWalletProviders(createApi({ submitTransaction }));

      const failure = await midnightProvider.submitTx({ version: 'v9', tx: finalizedWithoutId }).catch((e: unknown) => e);

      expect(hasErrorCode(failure, COMMON_ERROR_CODES.INVALID_ARGUMENT)).toBe(true);
      expect(submitTransaction).not.toHaveBeenCalled();
    });

    it('refuses ledger 8 bytes without an identifier before submitting them', async () => {
      const submitTransaction = vi.fn().mockResolvedValue(undefined);
      const { midnightProvider } = await dappConnectorWalletProviders(createApi({ submitTransaction }));
      const v8 = await loadLedger8Protocol();
      const withoutId = v8.Transaction.fromParts('undeployed').mockProve().serialize();

      const failure = await midnightProvider.submitTx({ version: 'v8', txBytes: withoutId }).catch((e: unknown) => e);

      expect(hasErrorCode(failure, COMMON_ERROR_CODES.INVALID_ARGUMENT)).toBe(true);
      expect(submitTransaction).not.toHaveBeenCalled();
    });

    it.each(['v8', 'v9'] as const)('lets a %s wallet rejection reach the caller unchanged', async (version) => {
      const rejection = Object.assign(new Error('Disconnected'), { code: 'Disconnected' });
      const submitTransaction = vi.fn().mockRejectedValue(rejection);
      const { midnightProvider } = await dappConnectorWalletProviders(createApi({ submitTransaction }));
      const payload = version === 'v9' ? { version, tx: finalized } : { version, txBytes: ledger8BalancedTxBytes };

      await expect(midnightProvider.submitTx(payload)).rejects.toBe(rejection);
    });
  });
});
