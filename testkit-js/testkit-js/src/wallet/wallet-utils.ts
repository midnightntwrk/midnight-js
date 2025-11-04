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

import { shieldedToken, type TokenType } from '@midnight-ntwrk/ledger-v6';
import { type WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { type UnshieldedWallet } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import * as Rx from 'rxjs';

import { FaucetClient } from '@/client';
import { type EnvironmentConfiguration } from '@/index';
import { logger } from '@/logger';

export const getInitialState = async (wallet: ShieldedWallet | UnshieldedWallet) => {
  if (wallet instanceof ShieldedWallet) {
    return Rx.firstValueFrom((wallet as ShieldedWallet).state);
  } else {
    return Rx.firstValueFrom((wallet as UnshieldedWallet).state());
  }
};

export const getInitialShieldedState = async (wallet: ShieldedWallet) => {
  logger.info('Getting initial state of wallet...');
  return Rx.firstValueFrom(wallet.state);
};

export const getInitialUnshieldedState = async (wallet: UnshieldedWallet) => {
  logger.info('Getting initial state of wallet...');
  return Rx.firstValueFrom(wallet.state());
};

export const syncWallet = (wallet: WalletFacade, throttleTime = 2_000, timeout = 90_000) => {
  logger.info('Syncing wallet...');

  return Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.tap((state) => {
        logger.info(
          `Wallet synced state emission: { shielded=${state.shielded.state.progress.isStrictlyComplete()}, unshielded=${state.unshielded.syncProgress?.synced}, dust=${state.dust.state.progress.isStrictlyComplete()} }`
        );
      }),
      Rx.throttleTime(throttleTime),
      Rx.tap((state) => {
        const isSynced =
            state.shielded.state.progress.isStrictlyComplete() &&
            state.dust.state.progress.isStrictlyComplete() &&
            state.unshielded.syncProgress?.synced === true;

        logger.info(
          `Wallet synced state emission (synced=${isSynced}): { shielded=${state.shielded.state.progress.isStrictlyComplete()}, unshielded=${state.unshielded.syncProgress?.synced}, dust=${state.dust.state.progress.isStrictlyComplete()} }`
        );
      }),
      Rx.filter(
        (state) =>
          state.shielded.state.progress.isStrictlyComplete() &&
          state.dust.state.progress.isStrictlyComplete() &&
          state.unshielded.syncProgress?.synced === true,
      ),
      Rx.tap(() => logger.info('Sync complete')),
      Rx.tap((state) => {
        const shieldedBalances = state.shielded.balances || {};
        const unshieldedBalances = state.unshielded.balances || {};
        const dustBalances = state.dust.walletBalance(new Date(Date.now())) || {};

        logger.info(`Wallet balances after sync - Shielded: ${JSON.stringify(shieldedBalances)}, Unshielded: ${JSON.stringify(Object.fromEntries(unshieldedBalances))}, Dust: ${dustBalances}`);
      }),
      Rx.timeout({
        each: timeout,
        with: () => Rx.throwError(() => new Error(`Wallet sync timeout after ${timeout}ms`))
      })
    )
  );
};

export const waitForFunds = async (
  wallet: WalletFacade,
  env: EnvironmentConfiguration,
  tokenType: TokenType = shieldedToken(),
  fundFromFaucet = false
) => {
  const initialState = await getInitialShieldedState(wallet.shielded);
  logger.info(`Your wallet address is: ${initialState.address.coinPublicKeyString()}, waiting for funds...`);
  if (fundFromFaucet && env.faucet) {
    logger.info('Requesting tokens from faucet...');
    await new FaucetClient(env.faucet, logger).requestTokens(initialState.address.coinPublicKeyString());
  }
  const initialBalance = initialState.balances[tokenType.tag];
  if (initialBalance === undefined || initialBalance === 0n) {
    logger.info(`Your wallet balance is: 0`);
    logger.info(`Waiting to receive tokens...`);
    return syncWallet(wallet);
  }
  return initialBalance;
};
