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
import { COMMON_ERROR_CODES, PROTOCOL_ERROR_CODES } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { CostModel, Intent, type ProvingProvider, Transaction } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { type FinalizedTx, LedgerTransaction, type UnboundTx } from '@midnight-ntwrk/midnight-js-types';
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
  let unbound: UnboundTx;
  let finalized: FinalizedTx;
  let finalizedWithoutId: FinalizedTx;
  let ledger8Unbound: UnboundTx;
  let ledger8Finalized: FinalizedTx;
  let ledger8FinalizedWithoutId: FinalizedTx;
  let ledger8TxId: string;

  beforeAll(async () => {
    const ttl = new Date(Date.now() + 3_600_000);
    const ledger9Unbound = await Transaction.fromParts('undeployed', undefined, undefined, Intent.new(ttl)).prove(
      noCircuitsProver,
      CostModel.initialCostModel()
    );
    unbound = LedgerTransaction.seal('v9', 'Unbound', ledger9Unbound);
    finalized = LedgerTransaction.seal('v9', 'Finalized', ledger9Unbound.bind());
    finalizedWithoutId = LedgerTransaction.seal('v9', 'Finalized', Transaction.fromParts('undeployed').mockProve());

    const v8 = await loadLedger8Protocol();
    const ledger8UnboundTx = await v8.Transaction.fromParts('undeployed', undefined, undefined, v8.Intent.new(ttl)).prove(
      noCircuitsProver,
      v8.CostModel.initialCostModel()
    );
    const ledger8FinalizedTx = ledger8UnboundTx.bind();
    ledger8Unbound = LedgerTransaction.seal('v8', 'Unbound', ledger8UnboundTx);
    ledger8Finalized = LedgerTransaction.seal('v8', 'Finalized', ledger8FinalizedTx);
    ledger8FinalizedWithoutId = LedgerTransaction.seal('v8', 'Finalized', v8.Transaction.fromParts('undeployed').mockProve());
    [ledger8TxId] = ledger8FinalizedTx.identifiers();
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
    it.each([
      ['v9', () => unbound, () => finalized],
      ['v8', () => ledger8Unbound, () => ledger8Finalized]
    ] as const)(
      'sends a %s transaction to the wallet as hex and answers a finalized handle of that era',
      async (era, request, answer) => {
        const balanceUnsealedTransaction = vi.fn().mockResolvedValue({ tx: toHex(answer().serialize()) });
        const { walletProvider } = await dappConnectorWalletProviders(createApi({ balanceUnsealedTransaction }));

        const result = await walletProvider.balanceTx(request());

        expect(balanceUnsealedTransaction).toHaveBeenCalledWith(toHex(request().serialize()));
        expect([result.era, result.stage]).toEqual([era, 'Finalized']);
        expect(result.serialize()).toEqual(answer().serialize());
      }
    );

    it('accepts upper-case hex from the wallet', async () => {
      const balanceUnsealedTransaction = vi.fn().mockResolvedValue({ tx: toHex(ledger8Finalized.serialize()).toUpperCase() });
      const { walletProvider } = await dappConnectorWalletProviders(createApi({ balanceUnsealedTransaction }));

      const result = await walletProvider.balanceTx(ledger8Unbound);

      expect(result.serialize()).toEqual(ledger8Finalized.serialize());
    });

    it.each([
      ['an odd number of digits', 'abc'],
      ['a non-hex character', 'zz'],
      ['a 0x prefix', '0x00']
    ])('rejects a wallet answer with %s', async (_, tx) => {
      const balanceUnsealedTransaction = vi.fn().mockResolvedValue({ tx });
      const { walletProvider } = await dappConnectorWalletProviders(createApi({ balanceUnsealedTransaction }));

      const failure = await walletProvider.balanceTx(ledger8Unbound).catch((e: unknown) => e);

      expect(hasErrorCode(failure, COMMON_ERROR_CODES.INVALID_ARGUMENT)).toBe(true);
    });

    // The era of the answer is the era of the request: the bytes are never
    // sniffed, so a valid transaction of the other era is refused, not adopted.
    it.each([
      ['ledger 8', 'an empty answer', () => ledger8Unbound, () => ''],
      ['ledger 8', 'a ledger 9 transaction', () => ledger8Unbound, () => toHex(finalized.serialize())],
      ['ledger 9', 'an empty answer', () => unbound, () => ''],
      ['ledger 9', 'a ledger 8 transaction', () => unbound, () => toHex(ledger8Finalized.serialize())],
      ['ledger 9', 'the unbound transaction it was sent', () => unbound, () => toHex(unbound.serialize())]
    ])('rejects a %s wallet answer that is %s as not a transaction, keeping the code', async (_era, _label, request, answer) => {
      const balanceUnsealedTransaction = vi.fn().mockResolvedValue({ tx: answer() });
      const { walletProvider } = await dappConnectorWalletProviders(createApi({ balanceUnsealedTransaction }));

      const failure = await walletProvider.balanceTx(request()).catch((e: unknown) => e);

      expect(hasErrorCode(failure, PROTOCOL_ERROR_CODES.PAYLOAD_NOT_A_TRANSACTION)).toBe(true);
    });

    it.each([
      ['v8', () => ledger8Unbound],
      ['v9', () => unbound]
    ])('lets a %s wallet rejection reach the caller unchanged', async (_era, request) => {
      const rejection = Object.assign(new Error('User rejected'), { code: 'Rejected' });
      const balanceUnsealedTransaction = vi.fn().mockRejectedValue(rejection);
      const { walletProvider } = await dappConnectorWalletProviders(createApi({ balanceUnsealedTransaction }));

      await expect(walletProvider.balanceTx(request())).rejects.toBe(rejection);
    });
  });

  describe('submitTx', () => {
    it('submits a ledger 9 transaction as hex and returns its identifier', async () => {
      const submitTransaction = vi.fn().mockResolvedValue(undefined);
      const { midnightProvider } = await dappConnectorWalletProviders(createApi({ submitTransaction }));

      const txId = await midnightProvider.submitTx(finalized);

      expect(submitTransaction).toHaveBeenCalledWith(toHex(finalized.serialize()));
      expect(txId).toBe(LedgerTransaction.unwrap(finalized, 'v9').identifiers()[0]);
    });

    it('submits a ledger 8 transaction as hex and returns its identifier', async () => {
      const submitTransaction = vi.fn().mockResolvedValue(undefined);
      const { midnightProvider } = await dappConnectorWalletProviders(createApi({ submitTransaction }));

      const txId = await midnightProvider.submitTx(ledger8Finalized);

      expect(submitTransaction).toHaveBeenCalledWith(toHex(ledger8Finalized.serialize()));
      expect(txId).toBe(ledger8TxId);
    });

    it.each([
      ['ledger 9', () => finalizedWithoutId],
      ['ledger 8', () => ledger8FinalizedWithoutId]
    ])('refuses a %s transaction without an identifier before submitting it', async (_era, request) => {
      const submitTransaction = vi.fn().mockResolvedValue(undefined);
      const { midnightProvider } = await dappConnectorWalletProviders(createApi({ submitTransaction }));

      const failure = await midnightProvider.submitTx(request()).catch((e: unknown) => e);

      expect(hasErrorCode(failure, COMMON_ERROR_CODES.INVALID_ARGUMENT)).toBe(true);
      expect(submitTransaction).not.toHaveBeenCalled();
    });

    it.each([
      ['v8', () => ledger8Finalized],
      ['v9', () => finalized]
    ])('lets a %s wallet rejection reach the caller unchanged', async (_era, request) => {
      const rejection = Object.assign(new Error('Disconnected'), { code: 'Disconnected' });
      const submitTransaction = vi.fn().mockRejectedValue(rejection);
      const { midnightProvider } = await dappConnectorWalletProviders(createApi({ submitTransaction }));

      await expect(midnightProvider.submitTx(request())).rejects.toBe(rejection);
    });
  });
});
