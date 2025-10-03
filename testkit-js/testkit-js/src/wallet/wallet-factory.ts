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

import { ZswapSecretKeys } from '@midnight-ntwrk/ledger-v6';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { generateRandomSeed } from '@midnight-ntwrk/wallet-sdk-hd';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { type DefaultV1Configuration } from '@midnight-ntwrk/wallet-sdk-shielded/v1';
import { createKeystore, PublicKey, WalletBuilder } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';

import type { EnvironmentConfiguration } from '@/index';
import { logger } from '@/logger';
import { mapEnvironmentToConfiguration } from '@/wallet/wallet-configuration-mapper';
import { getShieldedSeed, getUnshieldedSeed } from '@/wallet/wallet-new-utils';

export class WalletFactory {
  static createShieldedWallet = (
    envConfiguration: EnvironmentConfiguration,
    seed: string
  ) => {
    logger.info('Create shielded wallet...');
    const configuration: DefaultV1Configuration = mapEnvironmentToConfiguration(envConfiguration);
    const shieldedSenderSeed = getShieldedSeed(seed);
    const Shielded = ShieldedWallet(configuration);
    return Shielded.startWithShieldedSeed(shieldedSenderSeed);
  }

  static createUnshieldedWallet = async (
    envConfiguration: EnvironmentConfiguration,
    seed: string
  ) => {
    logger.info('Create unshielded wallet...');
    const configuration: DefaultV1Configuration = mapEnvironmentToConfiguration(envConfiguration);
    const unshieldedSenderSeed = getUnshieldedSeed(seed);
    const unshieldedSenderKeystore = createKeystore(unshieldedSenderSeed, getNetworkId());
    return await WalletBuilder.build({
      publicKey: PublicKey.fromKeyStore(unshieldedSenderKeystore),
      networkId: getNetworkId(),
      indexerUrl: configuration.indexerClientConnection.indexerWsUrl!,
    });
  }

  static createWallet = async (envConfiguration: EnvironmentConfiguration, seed: string) => {
    logger.info('Create wallet facade...');
    return new WalletFacade(
      WalletFactory.createShieldedWallet(envConfiguration, seed),
      await WalletFactory.createUnshieldedWallet(envConfiguration, seed)
    );
  }

  static startWallet = async (
    walletFacade: WalletFacade,
    seed: string
  ) => {
    logger.info('Starting wallet...');
    const shieldedSeed = getShieldedSeed(seed);
    walletFacade.start(ZswapSecretKeys.fromSeed(shieldedSeed));
  }

  static createStartedWallet = async (
    envConfiguration: EnvironmentConfiguration,
    seed?: string,
  ) => {
    logger.info('Creating and starting wallet facade...');
    if (!seed) {
      logger.info('No seed provided, generating a new random seed for the wallet...');
      seed = generateRandomSeed().toString();
    }
    const walletFacade = WalletFactory.createWallet(envConfiguration, seed);
    await WalletFactory.startWallet(await walletFacade, seed);
    return walletFacade;
  }

  static restoreShieldedWallet = async (
    envConfiguration: EnvironmentConfiguration,
    seed: string,
    serializedState: string,
  ) => {
    logger.info('Restoring wallet from state...');
    const configuration: DefaultV1Configuration = mapEnvironmentToConfiguration(envConfiguration);
    return ShieldedWallet(configuration).restore(getShieldedSeed(seed), serializedState);
  }

  static restoreUnshieldedWallet = async (
  ) => {
    throw new Error('Method not implemented.');
  }
}
