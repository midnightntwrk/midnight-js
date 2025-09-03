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

import { type Resource } from '@midnight-ntwrk/wallet';
import { type Wallet } from '@midnight-ntwrk/wallet-api';

/**
 * Represents the serialized state of a wallet that can be saved to and loaded from storage.
 * @property {number} offset - The block height/offset up to which the wallet has been synced
 * @property {string} protocolVersion - Version of the protocol being used
 * @property {string[]} txHistory - Array of serialized transaction history entries
 * @property {string} state - Serialized wallet state data
 */
export type SerializedWalletState = {
  offset: number;
  protocolVersion: string;
  txHistory: string[];
  state: string;
}

/**
 * Represents a transaction output with token type, amount and receiver details.
 * @property {string} type - The type/identifier of the token being transferred
 * @property {bigint} amount - The amount of tokens to transfer
 * @property {string} receiverAddress - The address of the recipient who will receive the tokens
 */
export type TxOutput = {
  type: string;
  amount: bigint;
  receiverAddress: string;
}

/**
 * Represents a wallet that inherits from both Wallet and Resource.
 */
export type MidnightWallet = Wallet & Resource;
