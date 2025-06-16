// This file is part of MIDNIGHT-JS.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import type { TransactionId } from '@midnight-ntwrk/ledger';
import type { BalancedTransaction } from './midnight-types';

/**
 * Interface for Midnight transaction submission logic. It could be implemented, e.g., by a wallet,
 * a third-party service, or a node itself.
 */
export interface MidnightProvider {
  /**
   * Submit a transaction to the network to be consensed upon.
   * @param tx A balanced and proven transaction.
   * @returns The transaction identifier of the submitted transaction.
   */
  submitTx(tx: BalancedTransaction): Promise<TransactionId>;
}
