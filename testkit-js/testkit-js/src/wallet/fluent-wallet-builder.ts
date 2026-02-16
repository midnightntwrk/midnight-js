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

import { type NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { type DefaultConfiguration, type WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { createKeystore, type UnshieldedKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';

import { logger } from '@/logger';
import { type EnvironmentConfiguration } from '@/test-environment/environment-configuration';
import { mapEnvironmentToConfiguration } from '@/wallet/wallet-configuration-mapper';
import { DEFAULT_DUST_OPTIONS, type DustWalletOptions, WalletFactory } from '@/wallet/wallet-factory';
import { WalletSeeds } from '@/wallet/wallet-seed';

export class FluentWalletBuilder {
  private constructor(
    private readonly config: DefaultConfiguration,
    private readonly networkId: NetworkId.NetworkId,
    private seeds?: WalletSeeds,
    private dustOptions: DustWalletOptions = DEFAULT_DUST_OPTIONS
  ) {}

  static forEnvironment(envConfig: EnvironmentConfiguration): FluentWalletBuilder {
    if (!envConfig) {
      throw new Error('Environment configuration is required');
    }

    logger.info(`Initializing wallet builder for ${envConfig.walletNetworkId}`);
    const config = mapEnvironmentToConfiguration(envConfig);
    return new FluentWalletBuilder(config, envConfig.walletNetworkId);
  }

  withSeed(seed: string): FluentWalletBuilder {
    if (!seed || seed.length === 0) {
      throw new Error('Seed cannot be empty');
    }

    this.seeds = WalletSeeds.fromMasterSeed(seed);
    return this;
  }

  withRandomSeed(): FluentWalletBuilder {
    this.seeds = WalletSeeds.generateRandom();
    logger.info(`Generated random wallet seed: ${this.seeds.masterSeed}`);
    return this;
  }

  withDustOptions(options: DustWalletOptions): FluentWalletBuilder {
    if (!options) {
      throw new Error('Dust options cannot be null or undefined');
    }

    this.dustOptions = options;
    return this;
  }

  async build(): Promise<WalletFacade> {
    if (!this.seeds) {
      logger.info('No seed provided, generating random seed');
      this.seeds = WalletSeeds.generateRandom();
      logger.info(`Generated random wallet seed: ${this.seeds.masterSeed}`);
    }

    logger.info(`Building wallet with configuration: ${JSON.stringify(this.config)}`);

    const unshieldedKeystore = createKeystore(this.seeds.unshielded, this.networkId);

    const shieldedWallet = WalletFactory.createShieldedWallet(this.config, this.seeds.shielded);
    const unshieldedWallet = WalletFactory.createUnshieldedWallet(
      this.config,
      unshieldedKeystore
    );
    const dustWallet = WalletFactory.createDustWallet(
      this.config,
      this.seeds.dust,
      this.dustOptions
    );

    const walletFacade = await WalletFactory.createWalletFacade(this.config, shieldedWallet, unshieldedWallet, dustWallet);

    return WalletFactory.startWalletFacade(walletFacade, this.seeds.shielded, this.seeds.dust);
  }

  async buildWithoutStarting(): Promise<{
    wallet: WalletFacade;
    seeds: WalletSeeds;
    keystore: UnshieldedKeystore;
  }> {
    if (!this.seeds) {
      logger.info('No seed provided, generating random seed');
      this.seeds = WalletSeeds.generateRandom();
      logger.info(`Generated random wallet seed: ${this.seeds.masterSeed}`);
    }

    logger.info(`Building wallet without starting with configuration: ${JSON.stringify(this.config)}`);

    const unshieldedKeystore = createKeystore(this.seeds.unshielded, this.networkId);

    const shieldedWallet = WalletFactory.createShieldedWallet(this.config, this.seeds.shielded);
    const unshieldedWallet = WalletFactory.createUnshieldedWallet(
      this.config,
      unshieldedKeystore
    );
    const dustWallet = WalletFactory.createDustWallet(
      this.config,
      this.seeds.dust,
      this.dustOptions
    );

    const walletFacade = await WalletFactory.createWalletFacade(this.config, shieldedWallet, unshieldedWallet, dustWallet);

    return {
      wallet: walletFacade,
      seeds: this.seeds,
      keystore: unshieldedKeystore
    };
  }
}
