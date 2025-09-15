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

import type { Logger } from 'pino';

import type { ProofServerContainer } from '../proof-server-container';
import type { MidnightWalletProvider } from '../wallet';
import type { EnvironmentConfiguration } from './environment-configuration';

/**
 * Abstract base class for test environments.
 * Provides common functionality for managing test wallets and environments.
 */
export abstract class TestEnvironment {
  /** Logger instance for recording operations */
  protected readonly logger: Logger;
  /** Unique identifier for this test environment instance */
  protected readonly uid: string;

  /**
   * Creates a new TestEnvironment instance.
   * @param {Logger} logger - Logger instance for recording operations
   */
  constructor(logger: Logger) {
    this.logger = logger;
    this.uid = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();
  }

  /**
   * Starts a single wallet instance.
   * @returns {Promise<MidnightWalletProvider>} A promise that resolves to the started wallet
   * @throws {Error} If no wallet could be started
   */
  getMidnightWalletProvider = async () => {
    const [walletProvider] = await this.startMidnightWalletProviders();
    if (!walletProvider) {
      throw Error('Undefined walletProvider found, but expected to have one');
    }
    return walletProvider;
  };

  /**
   * Shuts down the test environment and cleans up resources.
   * @param {boolean} [saveWalletState] - Optional flag to save the wallet state before shutdown
   * @returns {Promise<void>} A promise that resolves when shutdown is complete
   */
  abstract shutdown(saveWalletState?: boolean): Promise<void>;
  /**
   * Start the test environment.
   *
   * @param maybeProofServerContainer If defined, a container representing an already
   *                                  running proof server. If undefined, a proof server
   *                                  will be started automatically.
   * @returns {Promise<EnvironmentConfiguration>} A promise that resolves to the environment configuration
   */
  abstract start(maybeProofServerContainer?: ProofServerContainer): Promise<EnvironmentConfiguration>;

  /**
   * Starts multiple wallet instances.
   * @param {number} [amount] - Optional number of wallet instances to start
   * @param {string[]} [seeds] - Optional array of seeds for the wallets
   * @returns {Promise<MidnightWalletProvider[]>} A promise that resolves to an array of started wallets
   */
  abstract startMidnightWalletProviders(amount?: number, seeds?: string[]): Promise<MidnightWalletProvider[]>;
}
