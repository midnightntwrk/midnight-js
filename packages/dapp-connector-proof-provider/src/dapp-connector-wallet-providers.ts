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

import { InvalidArgumentError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { deserializeTransactionAtStage, type LedgerTransactionTypes } from '@midnight-ntwrk/midnight-js-protocol/transaction';
import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';
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

const decodeWalletAnswer = async <E extends LedgerVersion>(
  era: E,
  balanced: Uint8Array
): Promise<LedgerTransactionTypes[E]['Finalized']> => {
  try {
    return await deserializeTransactionAtStage(era, 'Finalized', balanced);
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
  const balance = async <E extends LedgerVersion>(
    era: E,
    tx: LedgerTransactionTypes[E]['Unbound']
  ): Promise<LedgerTransactionTypes[E]['Finalized']> =>
    decodeWalletAnswer(era, fromWalletHex((await api.balanceUnsealedTransaction(toHex(tx.serialize()))).tx));

  const submit = async (tx: LedgerTransactionTypes[LedgerVersion]['Finalized']): Promise<string> => {
    const txId = firstIdentifier(tx.identifiers());
    await api.submitTransaction(toHex(tx.serialize()));
    return txId;
  };

  const walletProvider = createWalletProviderFromHandlers({
    getCoinPublicKey: () => shieldedCoinPublicKey,
    getEncryptionPublicKey: () => shieldedEncryptionPublicKey,
    v8: (tx) => balance('v8', tx),
    v9: (tx) => balance('v9', tx)
  });

  const midnightProvider = createMidnightProviderFromHandlers({ v8: submit, v9: submit });

  return { walletProvider, midnightProvider };
};
