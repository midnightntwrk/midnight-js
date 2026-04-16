/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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
  DustSecretKey,
  type EncPublicKey,
  type FinalizedTransaction,
  shieldedToken,
  type TokenType,
  ZswapSecretKeys
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { type MidnightProvider, type UnboundTransaction, type WalletProvider } from '@midnight-ntwrk/midnight-js-types';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import { type WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { type UnshieldedKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import type { Logger } from 'pino';

import { type EnvironmentConfiguration } from '@/index';

import { FluentWalletBuilder } from './fluent-wallet-builder';
import { getInitialShieldedState, waitForFunds } from './wallet-utils';

/**
 * Provider class that implements wallet functionality for the Midnight network.
 * Handles transaction balancing, submission, and wallet state management.
 */
export class MidnightWalletProvider implements MidnightProvider, WalletProvider {
  logger: Logger;
  readonly env: EnvironmentConfiguration;
  readonly wallet: WalletFacade;
  readonly unshieldedKeystore: UnshieldedKeystore;
  readonly zswapSecretKeys: ZswapSecretKeys;
  readonly dustSecretKey: DustSecretKey;

  private constructor(
    logger: Logger,
    environmentConfiguration: EnvironmentConfiguration,
    wallet: WalletFacade,
    zswapSecretKeys: ZswapSecretKeys,
    dustSecretKey: DustSecretKey,
    unshieldedKeystore: UnshieldedKeystore
  ) {
    this.logger = logger;
    this.env = environmentConfiguration;
    this.wallet = wallet;
    this.zswapSecretKeys = zswapSecretKeys;
    this.dustSecretKey = dustSecretKey;
    this.unshieldedKeystore = unshieldedKeystore;
  }

  getCoinPublicKey(): CoinPublicKey {
    return this.zswapSecretKeys.coinPublicKey;
  }

  getEncryptionPublicKey(): EncPublicKey {
    return this.zswapSecretKeys.encryptionPublicKey;
  }

  async balanceTx(
    tx: UnboundTransaction,
    ttl: Date = ttlOneHour()
  ): Promise<FinalizedTransaction> {
    const finalizedTransactionRecipe = await this.wallet.balanceUnboundTransaction(tx, { shieldedSecretKeys: this.zswapSecretKeys, dustSecretKey: this.dustSecretKey}, { ttl });
    const signed = await this.wallet.signRecipe(finalizedTransactionRecipe, (payload) => this.unshieldedKeystore.signData(payload));
    return this.wallet.finalizeRecipe(signed);
  }

  submitTx(tx: FinalizedTransaction): Promise<string> {
    return this.wallet.submitTransaction(tx);
  }

  async start(waitForFundsInWallet = true, tokenType: TokenType = shieldedToken()): Promise<void> {
    this.logger.info('Starting wallet...');
    await this.wallet.start(this.zswapSecretKeys, this.dustSecretKey);
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
    const builder = FluentWalletBuilder.forEnvironment(env);
    const { wallet, seeds, keystore } = seed
      ? await builder.withSeed(seed).buildWithoutStarting()
      : await builder.withRandomSeed().buildWithoutStarting();

    const initialState = await getInitialShieldedState(wallet.shielded);
    logger.info(
      `Your wallet seed is: ${seeds.masterSeed} and your address is: ${initialState.address.coinPublicKeyString()}`
    );

    return new MidnightWalletProvider(
      logger,
      env,
      wallet,
      ZswapSecretKeys.fromSeed(seeds.shielded),
      DustSecretKey.fromSeed(seeds.dust),
      keystore
    );
  }

  static async withWallet(
    logger: Logger,
    env: EnvironmentConfiguration,
    wallet: WalletFacade,
    zswapSecretKeys: ZswapSecretKeys,
    dustSecretKey: DustSecretKey,
    unshieldedKeystore: UnshieldedKeystore
  ): Promise<MidnightWalletProvider> {
    return new MidnightWalletProvider(logger, env, wallet, zswapSecretKeys, dustSecretKey, unshieldedKeystore);
  }
}
