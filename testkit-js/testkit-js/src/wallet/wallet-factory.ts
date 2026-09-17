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

import { LedgerParameters } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  type DefaultConfiguration,
  type DefaultDustConfiguration,
  type DefaultShieldedConfiguration,
  type DefaultUnshieldedConfiguration,
  DustWallet,
  type DustWalletAPI,
  InMemoryTransactionHistoryStorage,
  mergeWalletEntries,
  PublicKey,
  ShieldedWallet,
  type ShieldedWalletAPI,
  type UnshieldedKeystore,
  UnshieldedWallet,
  type UnshieldedWalletAPI,
  WalletEntrySchema,
  WalletFacade,
  type WalletSeeds
} from '@midnightntwrk/wallet-sdk';

import { logger } from '../logger';

export interface DustWalletOptions {
  ledgerParams: LedgerParameters;
  additionalFeeOverhead: bigint;
  feeBlocksMargin: number;
}

export const DEFAULT_DUST_OPTIONS: DustWalletOptions = {
  ledgerParams: LedgerParameters.initialParameters(),
  additionalFeeOverhead: 0n,
  feeBlocksMargin: 5
};

export class WalletFactory {
  static createShieldedWallet(
    config: DefaultShieldedConfiguration,
    seed: Uint8Array
  ): Promise<ShieldedWalletAPI> {
    const Shielded = ShieldedWallet(config);
    return Shielded.startWithSeed(seed);
  }

  static createUnshieldedWallet(
    config: DefaultUnshieldedConfiguration,
    unshieldedKeystore: UnshieldedKeystore
  ): Promise<UnshieldedWalletAPI> {
    return UnshieldedWallet({
      ...config,
      txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries)
    }).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore));
  }

  static createDustWallet(
    config: DefaultDustConfiguration,
    seed: Uint8Array,
    dustOptions: DustWalletOptions = DEFAULT_DUST_OPTIONS
  ): Promise<DustWalletAPI> {
    const dustConfig = {
      ...config,
      costParameters: {
        ledgerParams: dustOptions.ledgerParams,
        additionalFeeOverhead: dustOptions.additionalFeeOverhead,
        feeBlocksMargin: dustOptions.feeBlocksMargin
      }
    };
    logger.info(`Creating dust wallet with params: ${JSON.stringify(dustConfig)}`);
    const Dust = DustWallet(dustConfig);
    return Dust.startWithSeed(seed);
  }

  static async createWalletFacade(
    config: DefaultConfiguration,
    shieldedWallet: ShieldedWalletAPI,
    unshieldedWallet: UnshieldedWalletAPI,
    dustWallet: DustWalletAPI
  ): Promise<WalletFacade> {
    return WalletFacade.init({
      configuration: config,
      shielded: () => shieldedWallet,
      unshielded: () => unshieldedWallet,
      dust: () => dustWallet
    });
  }

  static async startWalletFacade(wallet: WalletFacade, seeds: WalletSeeds): Promise<WalletFacade> {
    logger.info('Starting wallet facade...');
    await wallet.start(seeds);
    return wallet;
  }

  static async restoreShieldedWallet(
    config: DefaultShieldedConfiguration,
    serializedState: string
  ): Promise<ShieldedWallet> {
    return ShieldedWallet(config).restore(serializedState);
  }
}
