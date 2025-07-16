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
import {
  type ShieldedCoinInfo,
  shieldedToken,
  type TokenType,
  type EncPublicKey,
} from '@midnight-ntwrk/ledger';
import { type LogLevel, type Resource } from '@midnight-ntwrk/wallet';
import {
  type BalancedTransaction,
  createBalancedTx,
  type MidnightProvider,
  type UnbalancedTransaction,
  type WalletProvider
} from '@midnight-ntwrk/midnight-js-types';
import { generateRandomSeed } from '@midnight-ntwrk/wallet-sdk-hd';
import type { CoinPublicKey } from '@midnight-ntwrk/compact-runtime';
import type { EnvironmentConfiguration } from '@/infrastructure';
import { getInitialState, waitForFunds } from './wallet-utils';
import { type MidnightWallet } from './wallet-types';
import { DEFAULT_WALLET_LOG_LEVEL, WalletFactory } from './wallet-factory';

/**
 * Provider class that implements wallet functionality for the Midnight network.
 * Handles transaction balancing, submission, and wallet state management.
 * @implements {MidnightProvider}
 * @implements {WalletProvider}
 * @implements {Resource}
 */
export class MidnightWalletProvider implements MidnightProvider, WalletProvider, Resource {
  logger: Logger;
  readonly env: EnvironmentConfiguration;
  readonly wallet: MidnightWallet;
  readonly coinPublicKey: CoinPublicKey;
  readonly encryptionPublicKey: EncPublicKey;

  /**
   * Creates a new MidnightWalletProvider instance.
   * @param {Logger} logger - Logger instance for recording operations
   * @param {EnvironmentConfiguration} environmentConfiguration - Configuration for the wallet environment
   * @param {MidnightWallet} wallet - Wallet instance
   * @param {CoinPublicKey} coinPublicKey - Public key for the wallet's coins
   * @param encryptionPublicKey
   * @private
   */
  private constructor(
    logger: Logger,
    environmentConfiguration: EnvironmentConfiguration,
    wallet: MidnightWallet,
    coinPublicKey: CoinPublicKey,
    encryptionPublicKey: EncPublicKey
  ) {
    this.logger = logger;
    this.env = environmentConfiguration;
    this.wallet = wallet;
    this.coinPublicKey = coinPublicKey;
    this.encryptionPublicKey = encryptionPublicKey;
  }

  /**
   * Balances an unbalanced transaction by adding the necessary inputs and change outputs.
   * @param {UnbalancedTransaction} tx - The unbalanced transaction to balance
   * @param {ShieldedCoinInfo[]} newCoins - Array of new coins to include in the transaction
   * @returns {Promise<BalancedTransaction>} A promise that resolves to the balanced transaction
   */
  balanceTx(tx: UnbalancedTransaction, newCoins: ShieldedCoinInfo[]): Promise<BalancedTransaction> {
    return this.wallet
      .balanceTransaction(
          tx,
          newCoins
      )
      .then((utx) => this.wallet.proveTransaction(utx))
      .then(createBalancedTx);
  }

  /**
   * Submits a balanced transaction to the network.
   * @param {BalancedTransaction} tx - The balanced transaction to submit
   * @returns {Promise<string>} A promise that resolves to the transaction hash
   */
  submitTx(tx: BalancedTransaction): Promise<string> {
    return this.wallet.submitTransaction(tx);
  }

  /**
   * Starts the wallet and optionally waits for funds to be available.
   * @param {boolean} waitForFundsInWallet - Whether to wait for funds to be available (default: true)
   * @param tokenType
   * @returns {Promise<void>} A promise that resolves when the wallet is started and funds are available if requested
   */
  async start(waitForFundsInWallet = true, tokenType: TokenType = shieldedToken()): Promise<void> {
    this.logger.info('Starting wallet...');
    this.wallet.start();
    if (waitForFundsInWallet) {
      const balance = await waitForFunds(this.wallet, this.env, tokenType, true);
      this.logger.info(`Your wallet balance is: ${balance}`);
    }
  }

  /**
   * Closes the wallet and releases resources.
   * @returns {Promise<void>} A promise that resolves when the wallet is closed
   */
  async close(): Promise<void> {
    return this.wallet.close();
  }

  /**
   * Creates a new MidnightWalletProvider instance.
   * @param {Logger} logger - Logger instance for recording operations
   * @param {EnvironmentConfiguration} env - Configuration for the wallet environment
   * @param {string} [seed] - Optional seed for wallet generation. If not provided, a new random wallet will be created
   * @param {string} [walletLogLevel='info'] - Optional log level for wallet operations
   * @returns {Promise<MidnightWalletProvider>} A promise that resolves to the new wallet provider
   * @static
   */
  static async build(
    logger: Logger,
    env: EnvironmentConfiguration,
    seed?: string | undefined,
    walletLogLevel: LogLevel = DEFAULT_WALLET_LOG_LEVEL
  ) {
    const wallet = await WalletFactory.buildFromEnvContext(
      env,
      seed ?? Buffer.from(generateRandomSeed()).toString('hex'),
      walletLogLevel
    );
    const initialState = await getInitialState(wallet);
    logger.info(`Your wallet seed is: ${seed} and your address is: ${initialState.address}`);
    return new MidnightWalletProvider(
      logger,
      env,
      wallet,
      initialState.coinPublicKey,
      initialState.encryptionPublicKey
    );
  }

  /**
   * Creates a new MidnightWalletProvider instance using an existing wallet.
   * @param {Logger} logger - Logger instance for recording operations
   * @param {EnvironmentConfiguration} env - Configuration for the wallet environment
   * @param {MidnightWallet} wallet - Existing wallet instance to use
   * @returns {Promise<MidnightWalletProvider>} A promise that resolves to the new wallet provider using the existing wallet
   * @static
   */
  static async withWallet(logger: Logger, env: EnvironmentConfiguration, wallet: MidnightWallet) {
    const initialState = await getInitialState(wallet);
    return new MidnightWalletProvider(
      logger,
      env,
      wallet,
      initialState.coinPublicKey,
      initialState.encryptionPublicKey
    );
  }
}
