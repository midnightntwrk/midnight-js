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

import fs from 'node:fs';

import { type LogLevel, WalletBuilder } from '@midnight-ntwrk/wallet';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import { generateRandomSeed } from '@midnight-ntwrk/wallet-sdk-hd';

import type { EnvironmentConfiguration } from '@/infrastructure';
import {
  DEFAULT_WALLET_STATE_DIRECTORY,
  getWalletStateFilename,
  WalletSaveStateProvider
} from '@/infrastructure';

import { logger } from '../logger';
import type { MidnightWallet, SerializedWalletState } from './wallet-types';
import { waitForFullSync, waitForSyncProgressDefined } from './wallet-utils';

export const DEFAULT_WALLET_LOG_LEVEL: LogLevel = 'info';

export class WalletFactory {
  /**
   * Builds a wallet instance based on the provided environment configuration and optional seed.
   * @param {EnvironmentConfiguration} env - Configuration for the wallet environment
   * @param {string} [seed] - Optional seed for wallet generation. If not provided, a new random wallet will be created
   * @param {LogLevel} [walletLogLevel] - Optional log level for wallet operations
   * @returns {Promise<Wallet>} A promise that resolves to the new wallet instance
   */
  static buildFromEnvContext = async (
    env: EnvironmentConfiguration,
    seed?: string,
    walletLogLevel: LogLevel = DEFAULT_WALLET_LOG_LEVEL
  ): Promise<MidnightWallet> => {
    logger.info('Building wallet based on environment context');
    return seed
      ? WalletFactory.buildFromSeedAndTryToRestoreState(
          env,
          seed,
          DEFAULT_WALLET_STATE_DIRECTORY,
          getWalletStateFilename(seed),
          walletLogLevel
        )
      : WalletFactory.build(env, walletLogLevel);
  };

  /**
   * Builds a wallet instance based on the provided environment configuration.
   * @param {EnvironmentConfiguration} env - Configuration for the wallet environment
   * @param {LogLevel} [walletLogLevel=DEFAULT_WALLET_LOG_LEVEL] - Optional log level for wallet operations
   * @returns {Promise<MidnightWallet>} A promise that resolves to the new wallet instance
   */
  static build = async (
    env: EnvironmentConfiguration,
    walletLogLevel: LogLevel = DEFAULT_WALLET_LOG_LEVEL
  ): Promise<MidnightWallet> => {
    logger.info('Building wallet from scratch');
    const { indexer, indexerWS, node, proofServer } = env;
    return WalletBuilder.build(
      indexer,
      indexerWS,
      proofServer,
      node,
      Buffer.from(generateRandomSeed()).toString('hex'),
      walletLogLevel
    );
  };

  /**
   * Builds a wallet instance from a seed based on the provided environment configuration.
   * @param {EnvironmentConfiguration} env - Configuration for the wallet environment
   * @param {string} seed - Seed for wallet generation
   * @param {LogLevel} [walletLogLevel=DEFAULT_WALLET_LOG_LEVEL] - Optional log level for wallet operations
   * @returns {Promise<MidnightWallet>} A promise that resolves to the new wallet instance
   */
  static buildFromSeed = async (
    env: EnvironmentConfiguration,
    seed: string,
    walletLogLevel: LogLevel = DEFAULT_WALLET_LOG_LEVEL
  ): Promise<MidnightWallet> => {
    logger.info(`Building wallet from seed: ${seed}`);
    const { indexer, indexerWS, node, proofServer } = env;
    return WalletBuilder.buildFromSeed(
      indexer,
      indexerWS,
      proofServer,
      node,
      seed,
      walletLogLevel
    );
  };

  /**
   * Restores a wallet instance from a serialized state based on the provided environment configuration.
   * @param {EnvironmentConfiguration} env - Configuration for the wallet environment
   * @param {string} serialized - Serialized wallet state
   * @param seed
   * @param {boolean} [trimTxHistory=true] - Optional flag to trim the transaction history during restoration
   * @param {LogLevel} [walletLogLevel=DEFAULT_WALLET_LOG_LEVEL] - Optional log level for wallet operations
   * @returns {Promise<MidnightWallet>} A promise that resolves to the restored wallet instance
   */
  static restore = async (
    env: EnvironmentConfiguration,
    serialized: string,
    seed: string,
    trimTxHistory = true,
    walletLogLevel: LogLevel = DEFAULT_WALLET_LOG_LEVEL
  ): Promise<MidnightWallet> => {
    logger.info('Restoring wallet from state');
    const { indexer, indexerWS, node, proofServer } = env;
    return WalletBuilder.restore(
      indexer,
      indexerWS,
      proofServer,
      node,
      seed,
      serialized,
      walletLogLevel,
      trimTxHistory
    );
  };

  /**
   * Builds a wallet from a seed and attempts to restore its state from a saved file if available.
   * @param {EnvironmentConfiguration} env - Configuration containing indexer, node, and proof server details
   * @param {string} seed - The seed to build the wallet from
   * @param {string} [directoryPath=DEFAULT_WALLET_STATE_DIRECTORY] - Directory path for wallet state file
   * @param {string} [filename=getWalletStateFilename()] - Filename for wallet state file
   * @param {LogLevel} [walletLogLevel='info'] - Log level for wallet operations
   * @returns {Promise<MidnightWallet>} The built and initialized wallet
   */
  static buildFromSeedAndTryToRestoreState = async (
    env: EnvironmentConfiguration,
    seed: string,
    directoryPath: string = DEFAULT_WALLET_STATE_DIRECTORY,
    filename: string = getWalletStateFilename(seed),
    walletLogLevel: LogLevel = DEFAULT_WALLET_LOG_LEVEL
  ): Promise<MidnightWallet> => {
    let wallet: MidnightWallet | undefined;
    const isAnotherChain = async (newWallet: Wallet, offset: number) => {
      const state = await waitForSyncProgressDefined(newWallet);
      // allow for situations when there's no new index in the network between runs
      if (state.syncProgress !== undefined) {
        return state.syncProgress.lag.applyGap < offset - 1;
      }
      return false;
    };

    const handleWalletRestoration = async (serialized: string) => {
      wallet = await WalletFactory.restore(env, serialized, seed, true, walletLogLevel);
      const stateObjectFromFile = JSON.parse(serialized) as SerializedWalletState;

      if ((await isAnotherChain(wallet, stateObjectFromFile.offset)) ?? false) {
        logger.warn('The chain was reset, building wallet from scratch');
        wallet = await WalletFactory.build(env, walletLogLevel);
      } else {
        const newState = await waitForFullSync(wallet);
        if ((newState.syncProgress?.lag?.applyGap ?? 0n) < stateObjectFromFile.offset - 1) {
          logger.warn('Wallet was not able to sync from restored state after sync');
          wallet = await WalletFactory.build(env, walletLogLevel);
        } else {
          logger.info('Wallet was able to sync from restored state');
        }
      }
      return wallet;
    };

    const restoreWalletFromFile = async () => {
      logger.info(`Attempting to restore state from ${directoryPath}/${filename}`);
      try {
        const serialized = await new WalletSaveStateProvider(logger, seed, directoryPath, `${filename}`).load();
        if (serialized !== undefined) {
          wallet = await handleWalletRestoration(serialized);
        }
      } catch (error: unknown) {
        logger.error(error instanceof Error ? error.message : String(error));
        logger.warn('Wallet was not able to restore using the stored state, building wallet from scratch');
      }
    };

    logger.info(`Building wallet from seed ${seed} and trying to restore state`);
    logger.info(`Checking for wallet state file in ${directoryPath}/${filename}`);
    if (directoryPath != null && fs.existsSync(`${directoryPath}/${filename}`)) {
      await restoreWalletFromFile();
    } else {
      logger.info(directoryPath != null ? 'Wallet save file not found' : 'File path for save file not found');
    }

    if (wallet === undefined) {
      wallet = await WalletFactory.buildFromSeed(env, seed, walletLogLevel);
    }
    return wallet;
  };
}
