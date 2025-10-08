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
  type Binding,
  type Proof,
  type SignatureEnabled,
  type Transaction,
  type UnprovenTransaction
} from '@midnight-ntwrk/ledger-v6';

import type { ZKConfig } from './midnight-types';

export type ProvenTransaction = Transaction<SignatureEnabled, Proof, Binding>;

/**
 * The configuration for the proof request to the proof provider.
 */
export interface ProveTxConfig<K extends string> {
  /**
   * The timeout for the request.
   */
  readonly timeout?: number;
  /**
   * The zero-knowledge configuration for the circuit that was called in `tx`.
   * Undefined if `tx` is a deployment transaction.
   */
  readonly zkConfig?: ZKConfig<K>;
}

/**
 * Interface for a proof server running in a trusted environment.
 * @typeParam K - The type of the circuit ID used by the provider.
 */
export interface ProofProvider<K extends string> {
  /**
   * Creates call proofs for an unproven transaction. The resulting transaction is unbalanced and
   * must be balanced using the {@link WalletProvider} interface.
   *           contain a single contract call.
   * @param unprovenTx
   * @param proveTxConfig The configuration for the proof request to the proof provider. Empty in case
   *                      a deploy transaction is being proved with no user-defined timeout.
   */
  proveTx(unprovenTx: UnprovenTransaction, proveTxConfig?: ProveTxConfig<K>): Promise<ProvenTransaction>;
}
