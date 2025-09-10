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
import { type TransactionHistoryEntry, type Wallet, type WalletState } from '@midnight-ntwrk/wallet-api';
import * as Rx from 'rxjs';

import { type EnvironmentConfiguration } from '@/infrastructure';

import { FaucetClient } from '../client';
import { logger } from '../logger';
import { delay } from '../utils';
import type { MidnightWallet, TxOutput } from './wallet-types';

/**
 * Gets the initial state of a wallet.
 * @param {MidnightWallet} wallet - The wallet to get the state from
 * @returns {Promise<WalletState>} The initial wallet state
 */
export const getInitialState = async (wallet: Wallet) => {
  logger.info('Getting initial state of wallet...');
  return Rx.firstValueFrom(wallet.state());
};

const logState = (state: WalletState) => {
  if (state.syncProgress?.synced) {
    return 'Wallet is fully synced';
  }
  const indexerLag = state.syncProgress?.lag?.sourceGap.toString() ?? 'unknown';
  const walletLag = state.syncProgress?.lag?.applyGap.toString() ?? 'unknown';
  return `Wallet lag: ${walletLag}, Indexer lag: ${indexerLag}`;
};

/**
 * Waits for the wallet to fully synchronize with the network.
 * @param {Wallet} wallet - The wallet to wait for
 * @param {number} [throttleTime=5000] - Throttle time in milliseconds
 * @returns {Promise<WalletState>} The synchronized wallet state
 */
export const waitForFullSync = (wallet: Wallet, throttleTime = 3_000) => {
  logger.info('Waiting for full sync...');
  return Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(throttleTime),
      Rx.tap((state) => {
        const txs = state.transactionHistory.length;
        logger.info(`${logState(state)}, transactions=${txs}`);
      }),
      Rx.filter((state) => {
        return state.syncProgress !== undefined && !state.syncProgress.synced;
      })
    )
  );
};

/**
 * Waits for the wallet's sync progress to be defined.
 * @param {Wallet} wallet - The wallet to wait for
 * @param {number} [throttleTime=5000] - Throttle time in milliseconds
 * @returns {Promise<WalletState>} The wallet state with defined sync progress
 */
export const waitForSyncProgressDefined = async (wallet: Wallet, throttleTime = 3_000) => {
  logger.info('Waiting for sync progress to be defined...');
  return Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.timeout(30_000),
      Rx.throttleTime(throttleTime),
      Rx.tap((state) => logger.info(logState(state))),
      Rx.filter((state) => {
        return state.syncProgress !== undefined;
      })
    )
  );
};

/**
 * Synchronizes the wallet with the network and waits for a non-zero balance.
 * @param {Wallet} wallet - The wallet to synchronize
 * @param tokenType
 * @param {number} [throttleTime=3000] - Throttle time in milliseconds
 * @returns {Promise<bigint>} A promise that resolves to the wallet balance when sync is close enough and balance is non-zero
 */
export const syncWallet = (wallet: Wallet, tokenType: TokenType = shieldedToken(), throttleTime = 3_000) => {
  logger.info('Syncing wallet...');
  return Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(throttleTime),
      Rx.tap((state) => logger.info(logState(state))),
      Rx.filter((state) => state.syncProgress !== undefined && state.syncProgress.lag.applyGap < 100n),
      Rx.map((s) => s.balances[tokenType.tag] ?? 0n),
      Rx.filter((balance) => balance > 0n)
    )
  );
};

/**
 * Waits for funds to be available in the wallet.
 * If a faucet is configured, requests tokens from it.
 * @param {Wallet} wallet - The wallet to check for funds
 * @param {EnvironmentConfiguration} env - Environment configuration containing faucet details
 * @param tokenType
 * @param {boolean} [fundFromFaucet=false] - Whether to request tokens from the faucet
 * @returns {Promise<bigint>} A promise that resolves to the wallet balance
 */
export const waitForFunds = async (
  wallet: MidnightWallet,
  env: EnvironmentConfiguration,
  tokenType: TokenType = shieldedToken(),
  fundFromFaucet = false
) => {
  const initialState = await getInitialState(wallet);
  logger.info(`Your wallet address is: ${initialState.address}, waiting for funds...`);
  if (fundFromFaucet && env.faucet) {
    logger.info('Requesting tokens from faucet...');
    await new FaucetClient(env.faucet, logger).requestTokens(initialState.address);
  }
  const initialBalance = initialState.balances[tokenType.tag];
  if (initialBalance === undefined || initialBalance === 0n) {
    logger.info(`Your wallet balance is: 0`);
    logger.info(`Waiting to receive tokens...`);
    return syncWallet(wallet);
  }
  return initialBalance;
};

/**
 * Waits for the wallet to have pending coins.
 * @param {Wallet} wallet - The wallet to check for pending coins
 * @param {number} [throttleTime=1000] - Throttle time in milliseconds
 * @returns {Promise<WalletState>} The wallet state with pending coins
 */
export const waitForPending = (wallet: Wallet, throttleTime = 1_000) => {
  logger.info('Waiting for pending coins...');
  return Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(throttleTime),
      Rx.tap((state) => {
        const pending = state.pendingCoins.length;
        logger.info(`Wallet pending coins: ${pending}, waiting for pending coins...`);
      }),
      Rx.filter((state) => state.pendingCoins.length > 0)
    )
  );
};

/**
 * Waits for all pending coins to be finalized.
 * @param {Wallet} wallet - The wallet to check for finalized balance
 * @param {number} [throttleTime=5000] - Throttle time in milliseconds
 * @returns {Promise<WalletState>} The wallet state with no pending coins
 */
export const waitForFinalizedBalance = (wallet: Wallet, throttleTime = 5_000) => {
  logger.info('Waiting for pending coins to be finalized...');
  return Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(throttleTime),
      Rx.tap((state) => {
        const pending = state.pendingCoins.length;
        logger.info(`Wallet pending coins: ${pending}, waiting for pending coins cleared...`);
      }),
      Rx.filter((state) => {
        const pending = state.pendingCoins.length;
        return pending === 0;
      })
    )
  );
};

/**
 * Waits for a specific transaction ID to appear in the wallet's transaction history.
 * @param {string} txId - The transaction ID to wait for
 * @param {Wallet} wallet - The wallet to check
 * @param {number} [delayTime=1000] - Delay time in milliseconds
 * @returns {Promise<void>} Resolves when the transaction is found in history
 */
export const waitForTxInHistory = async (txId: string, wallet: Wallet, delayTime = 1_000) => {
  logger.info(`Waiting for txId ${txId} in history...`);
  const checkTxId = async (): Promise<boolean> => {
    const state = await waitForFullSync(wallet);
    return state.transactionHistory.flatMap((tx) => tx.identifiers).includes(txId);
  };

  const pollTxId = async () => {
    logger.info('Waiting for a txId...');
    const foundTxId = await checkTxId();

    if (foundTxId) {
      logger.info(`TxId ${txId} found`);
    } else {
      await delay(delayTime);
      await pollTxId();
    }
  };

  await pollTxId();
};

/**
 * Returns a wallet state object without transaction history and coin data.
 * @param {WalletState} state - The wallet state to filter
 * @returns {Partial<WalletState>} Filtered wallet state
 */
export const walletStateWithoutHistoryAndCoins = (state: WalletState): Partial<WalletState> => {

  const { transactionHistory: _, coins: __, availableCoins: ___, ...rest } = state;
  return rest;
};

/**
 * Normalizes a wallet state by removing transaction details and sync progress.
 * @param {WalletState} state - The wallet state to normalize
 * @returns {object} Normalized wallet state
 */
export const normalizeWalletState = (state: WalletState): Record<string, unknown> => {

  const normalized = state.transactionHistory.map((txHistoryEntry: TransactionHistoryEntry) => {

    const { transaction: _, ...otherProps } = txHistoryEntry;
    return otherProps;
  });

  const { transactionHistory: _, syncProgress: __, ...otherProps } = state;
  return { ...otherProps, normalized };
};

/**
 * Compares two wallet states for equality after normalization.
 * @param {WalletState} state1 - First wallet state to compare
 * @param {WalletState} state2 - Second wallet state to compare
 */
export const expectStatesEqual = (state1: WalletState, state2: WalletState) => {
  expect(normalizeWalletState(state2)).toStrictEqual(normalizeWalletState(state1));
};

/**
 * Logs wallet state information.
 * @param {string} stateName - Name/identifier for the state being logged
 * @param {WalletState} state - The wallet state to log
 * @param {bigint} [balance] - Optional balance to log
 * @private
 */
const logWalletState = (stateName: string, state: WalletState, balance?: bigint) => {
  if (balance) {
    logger.info(`Wallet ${stateName}: ${balance}`);
  }
  logger.info(`Wallet ${stateName} available coins: ${state.availableCoins.length}`);
};

/**
 * Creates transaction outputs for a given address and amount.
 * @param {string} address - The receiver's address
 * @param {bigint} amount - The amount to send
 * @param tokenType
 * @returns {TxOutput[]} Array of transaction outputs
 */
export const createOutputs = (address: string, amount: bigint, tokenType: TokenType = shieldedToken()): TxOutput[] => {
  return [
    {
      type: tokenType.tag,
      amount,
      receiverAddress: address
    }
  ];
};

/**
 * Processes a transaction by proving and submitting it.
 * @param {MidnightWallet} wallet - The wallet to process the transaction with
 * @param {TxOutput[]} outputsToCreate - The outputs to create in the transaction
 * @returns {Promise<string>} The transaction ID
 * @private
 */
export const processTransaction = async (wallet: MidnightWallet, outputsToCreate: TxOutput[]) => {
  const txToProve = await wallet.transferTransaction(outputsToCreate);
  logger.info('Proving tx...');
  const provenTx = await wallet.proveTransaction(txToProve);
  logger.info('Submitting tx...');
  return wallet.submitTransaction(provenTx);
};

/**
 * Validates the final state of a transaction.
 * @param {WalletState} finalState - The final wallet state
 * @param {WalletState} initialState - The initial wallet state
 * @param {bigint} initialBalance - The initial balance
 * @param {bigint} outputValue - The transaction output value
 * @param tokenType
 * @private
 */
export const validateFinalState = (
  finalState: WalletState,
  initialState: WalletState,
  initialBalance: bigint,
  outputValue: bigint,
  tokenType: TokenType = shieldedToken()
) => {
  expect(finalState.balances[tokenType.tag] ?? 0n).toBeLessThan(initialBalance - outputValue);
  expect(finalState.pendingCoins.length).toBe(0);
  expect(finalState.transactionHistory.length).toBeGreaterThanOrEqual(initialState.transactionHistory.length + 1);
  logger.info(`Wallet balance: ${finalState.balances[tokenType.tag]}`);
};

/**
 * Sends a transaction to a specific address.
 * @param {MidnightWallet} walletWithFunds - The wallet to send funds from
 * @param {string} address - The recipient's address
 * @param {bigint} [outputValue=100_000_000n] - The amount to send
 * @param tokenType
 * @returns {Promise<void>}
 */
export const sendTransactionToAddress = async (
  walletWithFunds: MidnightWallet,
  address: string,
  tokenType: TokenType = shieldedToken(),
  outputValue = 100_000_000n
): Promise<void> => {
  logger.info(`Sending ${outputValue} to address: ${address}`);
  const initialState = await getInitialState(walletWithFunds);
  const initialBalance = initialState.balances[tokenType.tag] ?? 0n;
  logWalletState('Initial', initialState, initialBalance);

  const outputsToCreate = createOutputs(address, outputValue);
  const id = await processTransaction(walletWithFunds, outputsToCreate);
  logger.info(`Transaction id: ${id}`);

  const pendingState = await waitForPending(walletWithFunds);
  logWalletState('Pending', pendingState);

  const finalState = await waitForFinalizedBalance(walletWithFunds);
  logWalletState('Final', finalState);

  validateFinalState(finalState, initialState, initialBalance, outputValue);
};

/**
 * Sends a transaction from one wallet to another.
 * @param {MidnightWallet} walletWithFunds - The wallet to send funds from
 * @param {MidnightWallet} destination - The destination wallet
 * @returns {Promise<void>}
 */
export const sendTransactionToWallet = async (walletWithFunds: MidnightWallet, destination: MidnightWallet) => {
  const state = await getInitialState(destination);
  logger.info(`Sending funds to address ${state.address}`);
  return sendTransactionToAddress(walletWithFunds, state.address);
};
