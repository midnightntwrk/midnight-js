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

import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  type ShieldedWalletAPI,
  type ShieldedWalletState,
  type UnshieldedKeystore,
  type UnshieldedWalletAPI,
  type UnshieldedWalletState,
  type WalletFacade
} from '@midnight-ntwrk/wallet-sdk';
import axios from 'axios';
import * as Rx from 'rxjs';

import { FaucetClient } from '@/client';
import { type EnvironmentConfiguration } from '@/index';
import { logger } from '@/logger';

export const getInitialState = async (
  wallet: ShieldedWalletAPI | UnshieldedWalletAPI
): Promise<ShieldedWalletState | UnshieldedWalletState> => {
  return Rx.firstValueFrom(wallet.state as Rx.Observable<ShieldedWalletState | UnshieldedWalletState>);
};

export const getInitialShieldedState = async (wallet: ShieldedWalletAPI): Promise<ShieldedWalletState> => {
  logger.info('Getting initial state of wallet...');
  return Rx.firstValueFrom(wallet.state);
};

export const getInitialUnshieldedState = async (wallet: UnshieldedWalletAPI): Promise<UnshieldedWalletState> => {
  logger.info('Getting initial state of wallet...');
  return Rx.firstValueFrom(wallet.state);
};

export const syncWallet = (wallet: WalletFacade, throttleTime = 2_000, timeout = 90_000) => {
  logger.info('Syncing wallet...');

  return Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.tap((state) => {
        logger.info(
          `Wallet synced state emission: { shielded=${state.shielded.state.progress.isStrictlyComplete()}, unshielded=${state.unshielded.progress.isStrictlyComplete()}, dust=${state.dust.state.progress.isStrictlyComplete()} }`
        );
      }),
      Rx.throttleTime(throttleTime),
      Rx.tap((state) => {
        const isSynced =
          state.shielded.state.progress.isStrictlyComplete() &&
          state.dust.state.progress.isStrictlyComplete() &&
          state.unshielded.progress?.isStrictlyComplete() === true;

        logger.info(
          `Wallet synced state emission (synced=${isSynced}): { shielded=${state.shielded.state.progress.isStrictlyComplete()}, unshielded=${state.unshielded.progress.isStrictlyComplete()}, dust=${state.dust.state.progress.isStrictlyComplete()} }`
        );
      }),
      Rx.filter(
        (state) =>
          state.shielded.state.progress.isStrictlyComplete() &&
          state.dust.state.progress.isStrictlyComplete() &&
          state.unshielded.progress.isStrictlyComplete() === true
      ),
      Rx.tap(() => logger.info('Sync complete')),
      Rx.tap((state) => {
        const shieldedBalances = state.shielded.balances || {};
        const unshieldedBalances = state.unshielded.balances || {};
        const dustBalances = state.dust.balance(new Date(Date.now())) || {};

        logger.info(
          `Wallet balances after sync - Shielded: ${JSON.stringify(shieldedBalances)}, Unshielded: ${JSON.stringify(unshieldedBalances)}, Dust: ${JSON.stringify(dustBalances)}`
        );
      }),
      Rx.timeout({
        each: timeout,
        with: () => Rx.throwError(() => new Error(`Wallet sync timeout after ${timeout}ms`))
      })
    )
  );
};

const registerNightUtxosForDust = async (
  wallet: WalletFacade,
  unshieldedKeystore: UnshieldedKeystore
): Promise<string | undefined> => {
  const state = await Rx.firstValueFrom(wallet.state());
  const unshieldedRaw = unshieldedToken().raw;
  const unregistered = state.unshielded.availableCoins.filter(
    (coin) => coin.utxo.type === unshieldedRaw && coin.meta.registeredForDustGeneration === false
  );
  if (unregistered.length === 0) {
    logger.warn('No unregistered NIGHT UTXOs available to register for dust generation');
    return undefined;
  }
  logger.info(`Registering ${unregistered.length} NIGHT UTXO(s) for dust generation...`);
  const recipe = await wallet.registerNightUtxosForDustGeneration(
    unregistered,
    unshieldedKeystore.getPublicKey(),
    (payload) => unshieldedKeystore.signData(payload)
  );
  const finalized = await wallet.finalizeRecipe(recipe);
  const txId = await wallet.submitTransaction(finalized);
  logger.info(`Dust registration tx submitted: ${txId}`);
  return txId;
};

export const waitForFunds = async (
  wallet: WalletFacade,
  env: EnvironmentConfiguration,
  fundFromFaucet = false,
  unshieldedKeystore: UnshieldedKeystore
): Promise<bigint> => {
  const unshieldedAddress = unshieldedKeystore.getBech32Address().asString();
  const nightTokenRaw = unshieldedToken().raw;
  logger.info(`Your wallet address is: ${unshieldedAddress}, waiting for NIGHT funds...`);

  let syncedState = await syncWallet(wallet);
  const alreadyFunded = (syncedState.unshielded.balances[nightTokenRaw] ?? 0n) > 0n;

  if (!alreadyFunded && fundFromFaucet && env.faucet) {
    logger.info('Wallet has no NIGHT; requesting tokens from faucet...');
    try {
      await new FaucetClient(env.faucet, logger).requestTokens(unshieldedAddress);
    } catch (error) {
      if (!(axios.isAxiosError(error) && error.response?.status === 429)) {
        throw error;
      }
    }
    syncedState = await syncWallet(wallet);
  }

  if (unshieldedKeystore && syncedState.dust.balance(new Date()) === 0n) {
    logger.info('Wallet has no dust; registering NIGHT UTXOs for dust generation...');
    const registrationTxId = await registerNightUtxosForDust(wallet, unshieldedKeystore);
    if (registrationTxId !== undefined) {
      syncedState = await syncWallet(wallet);
    }
  }

  const balance = syncedState.unshielded.balances[nightTokenRaw] ?? 0n;
  logger.info(`Your wallet NIGHT balance is: ${balance}`);
  return balance;
};
