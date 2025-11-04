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
  type DustSecretKey,
  type FinalizedTransaction,
  type ShieldedCoinInfo,
  type UnprovenTransaction,
  type ZswapSecretKeys
} from '@midnight-ntwrk/ledger-v6';

import { type ProvingRecipe } from './midnight-types';

/**
 * Interface representing a WalletProvider that handles operations such as
 * transaction balancing and finalization, and provides access to cryptographic secret keys.
 */
export interface WalletProvider {
  /**
   * Represents a readonly property that stores secret keys used for Zswap encryption or authentication.
   *
   * @type {ZswapSecretKeys}
   */
  readonly zswapSecretKeys: ZswapSecretKeys;

  /**
   * A readonly property that stores the secret key used for dust operations.
   *
   * @type {DustSecretKey}
   */
  readonly dustSecretKey: DustSecretKey;

  /**
   * Balances a transaction
   * @param tx The transaction to balance.
   * @param newCoins
   * @param ttl
   */
  balanceTx(tx: UnprovenTransaction, newCoins?: ShieldedCoinInfo[], ttl?: Date): Promise<ProvingRecipe<UnprovenTransaction | FinalizedTransaction>>;

  /**
   * Finalizes the given transaction to complete its processing.
   *
   * @param {FinalizedTransaction} tx - The transaction object that needs to be finalized.
   * @return {Promise<FinalizedTransaction>} A promise that resolves to the finalized transaction object.
   */
  finalizeTx(tx: ProvingRecipe<FinalizedTransaction>): Promise<FinalizedTransaction>;
}
