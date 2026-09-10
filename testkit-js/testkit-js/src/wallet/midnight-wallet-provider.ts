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
  ZswapSecretKeys
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  type MidnightProvider,
  type VersionedFinalizedTransaction,
  type VersionedUnboundTransaction,
  type WalletProvider
} from '@midnight-ntwrk/midnight-js-types';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import { type UnshieldedKeystore, type WalletFacade, type WalletSeeds } from '@midnightntwrk/wallet-sdk';
import type { Logger } from 'pino';

import { type EnvironmentConfiguration } from '../index';
import { FluentWalletBuilder } from './fluent-wallet-builder';
import { adoptVersionedFinalized, adoptVersionedUnbound, unwrapVersionedFinalized } from './wallet-transaction';
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
  readonly seeds: WalletSeeds;

  private constructor(
    logger: Logger,
    environmentConfiguration: EnvironmentConfiguration,
    wallet: WalletFacade,
    seeds: WalletSeeds,
    unshieldedKeystore: UnshieldedKeystore
  ) {
    this.logger = logger;
    this.env = environmentConfiguration;
    this.wallet = wallet;
    this.seeds = seeds;
    this.zswapSecretKeys = ZswapSecretKeys.fromSeed(seeds.shielded);
    this.dustSecretKey = DustSecretKey.fromSeed(seeds.dust);
    this.unshieldedKeystore = unshieldedKeystore;
  }

  getCoinPublicKey(): CoinPublicKey {
    return this.zswapSecretKeys.coinPublicKey;
  }

  getEncryptionPublicKey(): EncPublicKey {
    return this.zswapSecretKeys.encryptionPublicKey;
  }

  async balanceTx(
    tx: VersionedUnboundTransaction,
    ttl: Date = ttlOneHour()
  ): Promise<VersionedFinalizedTransaction> {
    // Both eras balance through the same call. The wallet SDK adopts a
    // transaction AT a protocol version and unwraps it WITHIN an epoch, so the
    // era is data flowing through rather than a branch in the balancing itself;
    // what differs per era is only how the payload is carried (a live object, or
    // serialized bytes -- ADR 0007).
    const finalizedTransactionRecipe = await this.wallet.balanceUnboundTransaction(
      await adoptVersionedUnbound(this.wallet, tx),
      { ttl }
    );
    const signed = await this.wallet.signRecipe(finalizedTransactionRecipe, (payload) => this.unshieldedKeystore.signDataAsync(payload));
    return unwrapVersionedFinalized(this.wallet, tx.version, await this.wallet.finalizeRecipe(signed));
  }

  async submitTx(tx: VersionedFinalizedTransaction): Promise<string> {
    return this.wallet.submitTransaction(await adoptVersionedFinalized(this.wallet, tx));
  }

  async start(waitForFundsInWallet = true): Promise<void> {
    this.logger.info('Starting wallet...');
    await this.wallet.start(this.seeds);
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

    return new MidnightWalletProvider(logger, env, wallet, seeds, keystore);
  }

  static async withWallet(
    logger: Logger,
    env: EnvironmentConfiguration,
    wallet: WalletFacade,
    seeds: WalletSeeds,
    unshieldedKeystore: UnshieldedKeystore
  ): Promise<MidnightWalletProvider> {
    return new MidnightWalletProvider(logger, env, wallet, seeds, unshieldedKeystore);
  }
}
