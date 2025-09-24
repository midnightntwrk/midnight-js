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

import type { CoinPublicKey, EncPublicKey,ShieldedCoinInfo } from '@midnight-ntwrk/ledger-v6';

import type { BalancedTransaction, UnbalancedTransaction } from './midnight-types';

/**
 * Interface for a wallet
 */
export interface WalletProvider {
  /**
   * Wallet public coin key
   */
  readonly coinPublicKey: CoinPublicKey;

  /**
   * Wallet EncryptionPublicKey
   */
  readonly encryptionPublicKey: EncPublicKey;

  /**
   * Balances select coins, create spend proofs, and pay fees for a transaction with call proofs.
   * @param tx The transaction to balance.
   * @param newCoins The outputs created during a transaction.
   */
  balanceTx(tx: UnbalancedTransaction, newCoins: ShieldedCoinInfo[]): Promise<BalancedTransaction>;
}
