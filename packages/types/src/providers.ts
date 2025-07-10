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

import type { PrivateStateId, PrivateStateProvider } from './private-state-provider';
import type { PublicDataProvider } from './public-data-provider';
import type { ProofProvider } from './proof-provider';
import type { WalletProvider } from './wallet-provider';
import type { MidnightProvider } from './midnight-provider';
import type { ZKConfigProvider } from './zk-config-provider';
import type { LoggerProvider } from './logger-provider';
import { type ImpureCircuitId } from './contract';

/**
 * Set of providers needed for transaction construction and submission.
 *
 * @typeParam ICK - A union of string literal types representing the callable circuits.
 * @typeParam PSI - Parameter indicating the private state ID, sometimes a union of string literals.
 * @typeParam PS - Parameter indicating the private state type stored, sometimes a union of private state types.
 */
export interface MidnightProviders<
  ICK extends ImpureCircuitId = ImpureCircuitId,
  PSI extends PrivateStateId = PrivateStateId,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PS = any
> {
  /**
   * Manages the private state of a contract.
   */
  readonly privateStateProvider: PrivateStateProvider<PSI, PS>;
  /**
   * Retrieves public data from the blockchain.
   */
  readonly publicDataProvider: PublicDataProvider;
  /**
   * Retrieves the ZK artifacts of a contract needed to create proofs.
   */
  readonly zkConfigProvider: ZKConfigProvider<ICK>;
  /**
   * Creates proven, unbalanced transactions.
   */
  readonly proofProvider: ProofProvider<ICK>;
  /**
   * Creates proven, balanced transactions.
   */
  readonly walletProvider: WalletProvider;
  /**
   * Submits proven, balanced transactions to the network.
   */
  readonly midnightProvider: MidnightProvider;
  /**
   * An optional logger that provides utilities for logging at given levels.
   */
  readonly loggerProvider?: LoggerProvider;
}
