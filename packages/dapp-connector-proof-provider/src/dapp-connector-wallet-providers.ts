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
import { InvalidArgumentError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { Transaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  createMidnightProviderFromHandlers,
  createWalletProviderFromHandlers,
  type MidnightProvider,
  type WalletProvider
} from '@midnight-ntwrk/midnight-js-types';
import type { ConnectedAPI } from '@midnightntwrk/dapp-connector-api';

/** The part of the DApp Connector's `ConnectedAPI` that {@link dappConnectorWalletProviders} calls. */
export type DAppConnectorWalletAPI = Pick<
  ConnectedAPI,
  'getShieldedAddresses' | 'balanceUnsealedTransaction' | 'submitTransaction'
>;

const toHex = (bytes: Uint8Array): string => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const fromWalletHex = (hex: string): Uint8Array => {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) {
    throw new InvalidArgumentError(
      `The wallet returned a transaction that is not an even-length hex string without a 0x prefix (length ${hex.length}).`
    );
  }
  return Uint8Array.from({ length: hex.length / 2 }, (_, index) => parseInt(hex.slice(index * 2, index * 2 + 2), 16));
};

const firstIdentifier = (identifiers: string[]): string => {
  const [txId] = identifiers;
  if (txId === undefined) {
    throw new InvalidArgumentError('Refusing to submit a transaction without an identifier: it could not be tracked.');
  }
  return txId;
};

/**
 * Creates the {@link WalletProvider} and {@link MidnightProvider} of a browser dApp from a DApp Connector
 * wallet, for ledger 8 and ledger 9 transactions.
 *
 * @remarks
 * The shielded keys are read once, here. Balancing goes through `balanceUnsealedTransaction` and submission
 * through `submitTransaction`. The connector takes no TTL, so the `ttl` argument of `balanceTx` is not
 * forwarded. A rejection from the wallet reaches the caller unchanged, with the connector's own `code`.
 *
 * @param api - The DApp Connector's `ConnectedAPI`, or any object with the methods in {@link DAppConnectorWalletAPI}.
 * @returns The wallet provider and the midnight provider, both serving `v8` and `v9`.
 * @throws InvalidArgumentError raised by `balanceTx` if the wallet returns something that is not hex, and by
 * `submitTx`, before anything is submitted, if the transaction has no identifier.
 */
export const dappConnectorWalletProviders = async (
  api: DAppConnectorWalletAPI
): Promise<{ walletProvider: WalletProvider; midnightProvider: MidnightProvider }> => {
  const { shieldedCoinPublicKey, shieldedEncryptionPublicKey } = await api.getShieldedAddresses();
  const balance = async (txBytes: Uint8Array): Promise<Uint8Array> =>
    fromWalletHex((await api.balanceUnsealedTransaction(toHex(txBytes))).tx);

  const walletProvider = createWalletProviderFromHandlers({
    getCoinPublicKey: () => shieldedCoinPublicKey,
    getEncryptionPublicKey: () => shieldedEncryptionPublicKey,
    currentEra: async (tx) => Transaction.deserialize('signature', 'proof', 'binding', await balance(tx.serialize())),
    retainedEras: { v8: balance }
  });

  const midnightProvider = createMidnightProviderFromHandlers({
    currentEra: async (tx) => {
      const txId = firstIdentifier(tx.identifiers());
      await api.submitTransaction(toHex(tx.serialize()));
      return txId;
    },
    retainedEras: {
      v8: async (txBytes) => {
        const v8 = await loadLedger8Protocol();
        const txId = firstIdentifier(v8.Transaction.deserialize('signature', 'proof', 'binding', txBytes).identifiers());
        await api.submitTransaction(toHex(txBytes));
        return txId;
      }
    }
  });

  return { walletProvider, midnightProvider };
};
