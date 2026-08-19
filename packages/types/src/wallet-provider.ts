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

import {
  type CoinPublicKey,
  type EncPublicKey,
  type FinalizedTransaction,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';

import { type VersionedUnboundTransaction } from './proof-provider';
import { type VersionedTx } from './versioned';

/**
 * A balanced, signed transaction ready for submission: either the live v9
 * ledger object, or the serialized bytes of a v8-era transaction.
 */
export type VersionedFinalizedTransaction = VersionedTx<FinalizedTransaction>;

/**
 * Interface representing a WalletProvider that handles operations such as
 * transaction balancing and finalization, and provides access to cryptographic secret keys.
 */
export interface WalletProvider {

  /**
   * Balances a transaction
   * @param tx The transaction to balance.
   * @param ttl
   */
  balanceTx(tx: VersionedUnboundTransaction, ttl?: Date): Promise<VersionedFinalizedTransaction>;

  getCoinPublicKey(): CoinPublicKey;

  getEncryptionPublicKey(): EncPublicKey;
}
