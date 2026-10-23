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
import type { WalletConnectedAPI } from '@midnightntwrk/dapp-connector-api';

/** The part of the DApp Connector's `ConnectedAPI` that {@link dappConnectorWalletProviders} calls. */
export type DAppConnectorWalletAPI = Pick<
  WalletConnectedAPI,
  'getShieldedAddresses' | 'balanceUnsealedTransaction' | 'submitTransaction'
>;

type Assert<T extends true> = T;
type Identical<A, B> = (<T>() => T extends A ? 1 : 0) extends <T>() => T extends B ? 1 : 0 ? true : false;

// The typecheck fails here once these connector methods change shape, for example when balancing
// gains a TTL option. See https://github.com/midnightntwrk/midnight-dapp-connector-api/issues/102
type _WalletAPIUnchanged = Assert<
  Identical<
    DAppConnectorWalletAPI,
    {
      getShieldedAddresses(): Promise<{
        shieldedAddress: string;
        shieldedCoinPublicKey: string;
        shieldedEncryptionPublicKey: string;
      }>;
      balanceUnsealedTransaction(tx: string, options?: { payFees?: boolean }): Promise<{ tx: string }>;
      submitTransaction(tx: string): Promise<void>;
    }
  >
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

const decodeWalletAnswer = <T>(era: string, decode: () => T): T => {
  try {
    return decode();
  } catch (error) {
    throw new InvalidArgumentError(`The wallet returned bytes that are not a balanced ledger ${era} transaction.`, {
      cause: error
    });
  }
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
 * forwarded and the wallet picks the expiry. See https://github.com/midnightntwrk/midnight-dapp-connector-api/issues/102
 *
 * A rejection from the wallet leaves these providers unchanged, with the connector's own `code`.
 * `deployContract` and the `callTx` functions wrap it in `ProviderFailedError`, and that copy does not keep the `code`.
 *
 * @param api - The DApp Connector's `ConnectedAPI`, or any object with the methods in {@link DAppConnectorWalletAPI}.
 * @returns The wallet provider and the midnight provider, both serving `v8` and `v9`.
 * @throws InvalidArgumentError raised by `balanceTx` if the wallet answer is not even-length hex without a `0x`
 * prefix, or is not a balanced transaction of the requested ledger. Raised by `submitTx`, before anything is
 * submitted, if the transaction has no identifier.
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
    currentEra: async (tx) => {
      const balanced = await balance(tx.serialize());
      return decodeWalletAnswer('9', () => Transaction.deserialize('signature', 'proof', 'binding', balanced));
    },
    retainedEras: {
      v8: async (txBytes) => {
        const balanced = await balance(txBytes);
        const v8 = await loadLedger8Protocol();
        decodeWalletAnswer('8', () => v8.Transaction.deserialize('signature', 'proof', 'binding', balanced));
        return balanced;
      }
    }
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
