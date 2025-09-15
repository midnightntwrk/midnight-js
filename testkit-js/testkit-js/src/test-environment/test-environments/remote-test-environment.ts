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

import { FaucetClient, NodeClient } from '../../client';
import { IndexerClient } from '../../client/indexer-client';
import { ProofServerClient } from '../../client/proof-server-client';
import { getEnvVarWalletSeeds } from '../../env-vars';
import { logger } from '../../logger';
import type { ProofServerContainer } from '../../proof-server-container';
import { DynamicProofServerContainer } from '../../proof-server-container';
import { MidnightWalletProvider, WalletSaveStateProvider } from '../../wallet';
import type { EnvironmentConfiguration } from '../environment-configuration';
import { TestEnvironment } from '../test-environment';

/**
 * Base class for remote test environments that connect to external network services.
 * Provides functionality for managing walletProviders and a proof server container.
 */
export abstract class RemoteTestEnvironment extends TestEnvironment {
  protected proofServerContainer: ProofServerContainer;
  private environmentConfiguration: EnvironmentConfiguration;
  private walletProviders: MidnightWalletProvider[] | undefined = undefined;

  /**
   * Abstract method that must be implemented by subclasses to provide environment configuration.
   * @returns {EnvironmentConfiguration} Configuration object containing service URLs and endpoints
   */
  protected abstract getEnvironmentConfiguration(): EnvironmentConfiguration;

  /**
   * Creates and starts the specified number of wallet providers.
   * @returns {Promise<MidnightWalletProvider[]>} Array of started wallet providers
   */
  startMidnightWalletProviders = async (
    amount = 1,
    seeds: string[] | undefined = getEnvVarWalletSeeds()
  ): Promise<MidnightWalletProvider[]> => {
    if (amount > 1 && seeds && seeds.length !== amount) {
      throw new Error(
        `Number of seeds provided (${seeds.length}) does not match the amount of wallets requested (${amount})`
      );
    }
    this.logger.info(`Getting ${amount} wallets...`);
    const buildWallet = (seed?: string) =>
      MidnightWalletProvider.build(this.logger, this.environmentConfiguration, seed);
    const seeds2 = seeds || Array(amount).fill(undefined);
    this.walletProviders = await Promise.all(seeds2.map(buildWallet));
    await Promise.all(this.walletProviders.map((wallet) => wallet.start()));
    return this.walletProviders;
  };

  /**
   * Shuts down the test environment by closing all walletProviders and stopping the proof server.
   */
  shutdown = async (saveWalletState?: boolean) => {
    this.logger.info(`Shutting down test environment...`);
    if (this.walletProviders) {
      if (saveWalletState) {
        await Promise.all(
          this.walletProviders.map((midnightWallet) =>
            new WalletSaveStateProvider(logger, midnightWallet.coinPublicKey).save(midnightWallet.wallet)
          )
        );
      }
      await Promise.all(this.walletProviders.map((wallet) => wallet.close()));
    }
    if (this.proofServerContainer) {
      await this.proofServerContainer.stop();
    }
  };

  /**
   * Performs a health check for the environment.
   * Checks the health of the node, indexer, and optionally the faucet services.
   * @returns {Promise<void>} A promise that resolves when the health check is complete.
   */
  healthCheck = async () => {
    this.logger.info('Performing env health check');
    await new NodeClient(this.environmentConfiguration.node, this.logger).health();
    await new IndexerClient(this.environmentConfiguration.indexer, this.logger).health();
    await new ProofServerClient(this.environmentConfiguration.proofServer, this.logger).health();
    if (this.environmentConfiguration.faucet) {
      await new FaucetClient(this.environmentConfiguration.faucet, this.logger).health();
    }
  };

  /**
   * Starts the test environment by initializing the proof server and environment configuration.
   * @param {ProofServerContainer} maybeProofServerContainer Optional proof server container to use instead of creating a new one
   * @returns {Promise<EnvironmentConfiguration>} The environment configuration
   */
  start = async (maybeProofServerContainer?: ProofServerContainer) => {
    this.logger.info(`Starting test environment... `);
    this.proofServerContainer =
      maybeProofServerContainer ?? (await DynamicProofServerContainer.start(this.logger, this.uid));
    this.environmentConfiguration = this.getEnvironmentConfiguration();
    this.logger.info(`Test environment configuration: ${JSON.stringify(this.environmentConfiguration)}`);
    await this.healthCheck();
    return this.environmentConfiguration;
  };
}
