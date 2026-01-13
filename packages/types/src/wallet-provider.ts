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

import {
  type CoinPublicKey,
  type EncPublicKey,
  type FinalizedTransaction,
  type ShieldedCoinInfo,
  type UnprovenTransaction,
} from '@midnight-ntwrk/ledger-v7';

export const TRANSACTION_TO_PROVE = 'TransactionToProve';
export const BALANCE_TRANSACTION_TO_PROVE = 'BalanceTransactionToProve';
export const NOTHING_TO_PROVE = 'NothingToProve';

export type TransactionToProve = {
  readonly type: typeof TRANSACTION_TO_PROVE;
  readonly transaction: UnprovenTransaction;
};

export type BalanceTransactionToProve<TTransaction> = {
  readonly type: typeof BALANCE_TRANSACTION_TO_PROVE;
  readonly transactionToProve: UnprovenTransaction;
  readonly transactionToBalance: TTransaction;
};

export type NothingToProve<TTransaction> = {
  readonly type: typeof NOTHING_TO_PROVE;
  readonly transaction: TTransaction;
};

export type ProvingRecipe<TTransaction> =
  | TransactionToProve
  | BalanceTransactionToProve<TTransaction>
  | NothingToProve<TTransaction>;

export type BalancedProvingRecipe = ProvingRecipe<UnprovenTransaction | FinalizedTransaction>;

/**
 * Interface representing a WalletProvider that handles operations such as
 * transaction balancing and finalization, and provides access to cryptographic secret keys.
 */
export interface WalletProvider {

  /**
   * Balances a transaction
   * @param tx The transaction to balance.
   * @param newCoins
   * @param ttl
   */
  balanceTx(tx: UnprovenTransaction, newCoins?: ShieldedCoinInfo[], ttl?: Date): Promise<BalancedProvingRecipe>;

  getCoinPublicKey(): CoinPublicKey;

  getEncryptionPublicKey(): EncPublicKey;
}
