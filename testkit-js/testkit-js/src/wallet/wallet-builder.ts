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

import { DustParameters, DustSecretKey, LedgerParameters, ZswapSecretKeys } from '@midnight-ntwrk/ledger-v6';
import { type NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { generateRandomSeed } from '@midnight-ntwrk/wallet-sdk-hd';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { type DefaultV1Configuration } from '@midnight-ntwrk/wallet-sdk-shielded/v1';
import {
  createKeystore,
  PublicKey,
  type UnshieldedWallet,
  WalletBuilder as UnshieldedWalletBuilder
} from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';

import type { EnvironmentConfiguration } from '@/index';
import { mapEnvironmentToConfiguration } from '@/wallet/wallet-configuration-mapper';
import { getDustSeed, getShieldedSeed, getUnshieldedSeed } from '@/wallet/wallet-seed-utils';

export const DustOptions = {
  ledgerParams: LedgerParameters.initialParameters(),
  costParametersAdditionalFeeOverhead: 300_000_000_000_000n,
  nightDustRatio: 5_000_000_000n,
  generationDecayDate: 8_267n,
  dustGracePeriodSeconds: 3n * 60n * 60n
};

export class WalletBuilder {
  static buildShieldedWallet(config: DefaultV1Configuration, seed: Uint8Array): ShieldedWallet {
    const Shielded = ShieldedWallet(config);
    return Shielded.startWithShieldedSeed(seed);
  }

  static async buildUnshieldedWallet(
    config: DefaultV1Configuration,
    seed: Uint8Array,
    networkId: NetworkId.NetworkId
  ): Promise<UnshieldedWallet> {
    const keystore = createKeystore(seed, networkId);
    return await UnshieldedWalletBuilder.build({
      publicKey: PublicKey.fromKeyStore(keystore),
      networkId,
      indexerUrl: config.indexerClientConnection.indexerWsUrl!,
    });
  }

  static buildDustWallet(
    config: DefaultV1Configuration,
    seed: Uint8Array,
    networkId: NetworkId.NetworkId,
    dustOptions = DustOptions
  ): DustWallet {
    const Dust = DustWallet({
      ...config,
      costParameters: {
        ledgerParams: dustOptions.ledgerParams,
        additionalFeeOverhead: dustOptions.costParametersAdditionalFeeOverhead,
      },
    });
    const dustParameters = new DustParameters(dustOptions.nightDustRatio, dustOptions.generationDecayDate, dustOptions.dustGracePeriodSeconds);
    return Dust.startWithSeed(seed, dustParameters, networkId);
  }

  static async restoreShieldedWallet(
    config: DefaultV1Configuration,
    serializedState: string
  ): Promise<ShieldedWallet> {
    return ShieldedWallet(config).restore(serializedState);
  }

  static async buildWallet(
    envConfig: EnvironmentConfiguration,
    shieldedSeed: Uint8Array,
    unshieldedSeed: Uint8Array,
    dustSeed: Uint8Array
  ): Promise<WalletFacade> {
    const config = mapEnvironmentToConfiguration(envConfig);
    return new WalletFacade(
      this.buildShieldedWallet(config, shieldedSeed),
      await this.buildUnshieldedWallet(config, unshieldedSeed, envConfig.walletNetworkId),
      this.buildDustWallet(config, dustSeed, envConfig.walletNetworkId, DustOptions)
    );
  }

  static async startWallet(wallet: WalletFacade, seed: Uint8Array): Promise<WalletFacade> {
    await wallet.start(ZswapSecretKeys.fromSeed(seed), DustSecretKey.fromSeed(seed));
    return wallet;
  }

  static async buildAndStartWallet(
    envConfig: EnvironmentConfiguration,
    seed?: string
  ): Promise<WalletFacade> {
    const walletSeed = seed ?? generateRandomSeed().toString();
    const shieldedSeed = getShieldedSeed(walletSeed);
    const unshieldedSeed = getUnshieldedSeed(walletSeed);
    const dustSeed = getDustSeed(walletSeed);

    const wallet = await this.buildWallet(envConfig, shieldedSeed, unshieldedSeed, dustSeed);
    return this.startWallet(wallet, shieldedSeed);
  }
}
