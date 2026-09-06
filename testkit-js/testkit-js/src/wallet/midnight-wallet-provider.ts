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
  DustSecretKey,
  type EncPublicKey,
  type FinalizedTransaction,
  ZswapSecretKeys
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  createMidnightProvider,
  createWalletProvider,
  type MidnightProvider,
  type UnboundTransaction,
  type VersionedFinalizedTransaction,
  type VersionedUnboundTransaction,
  type WalletProvider
} from '@midnight-ntwrk/midnight-js-types';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import { type UnshieldedKeystore, type WalletFacade } from '@midnightntwrk/wallet-sdk';
import type { Logger } from 'pino';

import { type EnvironmentConfiguration } from '../index';
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
  // The version tag lives in the adapters, never in this class — see
  // ADR 0006. The wallet underneath is v9-only, so the two adapters fit it
  // exactly: refusing a v8 payload is the right answer for a v9-only wallet,
  // not a gap in it.
  private readonly walletProvider: WalletProvider;
  private readonly midnightProvider: MidnightProvider;

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
    this.walletProvider = createWalletProvider({
      balanceTx: (tx, ttl = ttlOneHour()) => this.balanceThroughWallet(tx, ttl),
      getCoinPublicKey: () => this.zswapSecretKeys.coinPublicKey,
      getEncryptionPublicKey: () => this.zswapSecretKeys.encryptionPublicKey
    });
    this.midnightProvider = createMidnightProvider((tx) => this.wallet.submitTransaction(tx));
  }

  getCoinPublicKey(): CoinPublicKey {
    return this.walletProvider.getCoinPublicKey();
  }

  getEncryptionPublicKey(): EncPublicKey {
    return this.walletProvider.getEncryptionPublicKey();
  }

  async balanceTx(tx: VersionedUnboundTransaction, ttl?: Date): Promise<VersionedFinalizedTransaction> {
    return this.walletProvider.balanceTx(tx, ttl);
  }

  async submitTx(tx: VersionedFinalizedTransaction): Promise<string> {
    return this.midnightProvider.submitTx(tx);
  }

  /** Balances, signs and finalizes one transaction through the v9-only wallet. */
  private async balanceThroughWallet(tx: UnboundTransaction, ttl: Date): Promise<FinalizedTransaction> {
    const recipe = await this.wallet.balanceUnboundTransaction(
      tx,
      { shieldedSecretKeys: this.zswapSecretKeys, dustSecretKey: this.dustSecretKey },
      { ttl }
    );
    const signed = await this.wallet.signRecipe(recipe, (payload) => this.unshieldedKeystore.signDataAsync(payload));
    return this.wallet.finalizeRecipe(signed);
  }

  async start(waitForFundsInWallet = true): Promise<void> {
    this.logger.info('Starting wallet...');
    await this.wallet.start(this.zswapSecretKeys, this.dustSecretKey);
    if (waitForFundsInWallet) {
      const balance = await waitForFunds(this.wallet, this.env, true, this.unshieldedKeystore);
      this.logger.info(`Your wallet NIGHT balance is: ${balance}`);
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
