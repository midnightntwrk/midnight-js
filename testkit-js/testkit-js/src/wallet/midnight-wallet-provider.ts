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

import { type FinalizedTransaction, shieldedToken, type TokenType, ZswapSecretKeys } from '@midnight-ntwrk/ledger-v6';
import {
  type MidnightProvider,
  type UnbalancedTransaction,
  type WalletProvider
} from '@midnight-ntwrk/midnight-js-types';
import { type WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { generateRandomSeed } from '@midnight-ntwrk/wallet-sdk-hd';
import type { Logger } from 'pino';

import { type EnvironmentConfiguration } from '@/index';
import { getShieldedSeed } from '@/wallet/wallet-seed-utils';

import { WalletFactory } from './wallet-factory';
import { getInitialShieldedState, waitForFunds } from './wallet-utils';

/**
 * Provider class that implements wallet functionality for the Midnight network.
 * Handles transaction balancing, submission, and wallet state management.
 */
export class MidnightWalletProvider implements MidnightProvider, WalletProvider {
  logger: Logger;
  readonly env: EnvironmentConfiguration;
  readonly wallet: WalletFacade;
  readonly zswapSecretKeys: ZswapSecretKeys;

  private constructor(
    logger: Logger,
    environmentConfiguration: EnvironmentConfiguration,
    wallet: WalletFacade,
    zswapSecretKeys: ZswapSecretKeys
  ) {
    this.logger = logger;
    this.env = environmentConfiguration;
    this.wallet = wallet;
    this.zswapSecretKeys = zswapSecretKeys;
  }

  async finalizeTransaction(tx: UnbalancedTransaction): Promise<FinalizedTransaction> {
    const recipe = await this.wallet.balanceTransaction(this.zswapSecretKeys, tx);
    //TODO: temporary - consult
    if (recipe.type !== 'TransactionToProve') {
      throw new Error(`Failed to balance transaction: ${recipe.type}`);
    }
    return this.wallet.finalizeTransaction(recipe);
  }

  submitTx(tx: FinalizedTransaction): Promise<string> {
    return this.wallet.submitTransaction(tx);
  }

  async start(waitForFundsInWallet = true, tokenType: TokenType = shieldedToken()): Promise<void> {
    this.logger.info('Starting wallet...');
    this.wallet.start(this.zswapSecretKeys);
    if (waitForFundsInWallet) {
      const balance = await waitForFunds(this.wallet, this.env, tokenType, true);
      this.logger.info(`Your wallet balance is: ${balance}`);
    }
  }

  async stop(): Promise<void> {
    return this.wallet.stop();
  }

  static async build(
    logger: Logger,
    env: EnvironmentConfiguration,
    seed?: string | undefined
  ): Promise<MidnightWalletProvider> {
    const walletSeed = seed ?? Buffer.from(generateRandomSeed()).toString('hex');
    const wallet = await WalletFactory.createStartedWallet(env, walletSeed);
    const initialState = await getInitialShieldedState(wallet.shielded);
    logger.info(`Your wallet seed is: ${seed} and your address is: ${initialState.address.coinPublicKeyString()}`);
    return new MidnightWalletProvider(logger, env, wallet, ZswapSecretKeys.fromSeed(getShieldedSeed(walletSeed)));
  }

  static async withWallet(
    logger: Logger,
    env: EnvironmentConfiguration,
    wallet: WalletFacade,
    zswapSecretKeys: ZswapSecretKeys
  ): Promise<MidnightWalletProvider> {
    return new MidnightWalletProvider(logger, env, wallet, zswapSecretKeys);
  }
}
