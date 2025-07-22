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

import type { ContractAddress, TransactionId, ZswapChainState } from '@midnight-ntwrk/ledger';
import type { ContractState } from '@midnight-ntwrk/compact-runtime';
import type { Observable } from 'rxjs';
import type { FinalizedTxData, UnshieldedBalances } from './midnight-types';

/**
 * Streams all previous states of a contract.
 */
export type All = {
  readonly type: 'all';
}

/**
 * Streams all states of a contract starting with the most recent.
 */
export type Latest = {
  readonly type: 'latest';
}

/**
 * Starts a contract state stream at the given transaction identifier.
 */
export type TxIdConfig = {
  readonly type: 'txId';
  /**
   * The transaction identifier indicating where to begin the state stream.
   */
  readonly txId: TransactionId;
}

/**
 * Starts a contract state stream at the given block height.
 * @type
 */
export type BlockHeightConfig = {
  readonly type: 'blockHeight';
  /**
   * The block height indicating where to begin the state stream.
   */
  readonly blockHeight: number;
}

/**
 * Starts a contract state stream at the given block hash.
 */
export type BlockHashConfig = {
  readonly type: 'blockHash';
  /**
   * The block height indicating where to begin the state stream.
   */
  readonly blockHash: string;
}

/**
 * The configuration for a contract state observable. The corresponding observables may begin at different
 * places (e.g. after a specific transaction identifier / block height) depending on the configuration, but
 * all state updates after the beginning are always included.
 */
export type ContractStateObservableConfig =
  | ((TxIdConfig | BlockHashConfig | BlockHeightConfig) & {
      /**
       * If `true`, the state of the contract after the last block or transaction specified by the configuration
       * is the first value emitted. If `false`, the state of the contract after the next state update is the
       * first value emitted. If `undefined`, defaults to `true`.
       */
      readonly inclusive?: boolean;
    })
  | Latest
  | All;

/**
 * Interface for a public data service. This service retrieves public data from the blockchain.
 * TODO: Add timeouts or retry limits to 'watchFor' queries.
 */
export interface PublicDataProvider {
  /**
   * Retrieves the on-chain state of a contract. If no block hash or block height are provided, the
   * contract state at the address in the latest block is returned.
   * Immediately returns null if no matching data is found.
   * @param contractAddress The address of the contract of interest.
   * @param config The configuration of the query.
   *               If `undefined` returns the latest states.
   */
  queryContractState(
    contractAddress: ContractAddress,
    config?: BlockHeightConfig | BlockHashConfig
  ): Promise<ContractState | null>;

  /**
   * Retrieves the zswap chain state (token balances) and the contract state of the contract at the
   * given address. Both states are retrieved in a single query to ensure consistency between the two.
   * Immediately returns null if no matching data is found.
   * @param contractAddress The address of the contract of interest.
   * @param config The configuration of the query.
   *               If `undefined` returns the latest states.
   */
  queryZSwapAndContractState(
    contractAddress: ContractAddress,
    config?: BlockHeightConfig | BlockHashConfig
  ): Promise<[ZswapChainState, ContractState] | null>;

  /**
   * Retrieves the contract state included in the deployment of the contract at the given contract address.
   * Immediately returns null if no matching data is found.
   * @param contractAddress The address of the contract of interest.
   */
  queryDeployContractState(contractAddress: ContractAddress): Promise<ContractState | null>;

  /**
   * Retrieves the unshielded balances associated with a specific contract address.
   * @param contractAddress The address of the contract of interest.
   * @param config The configuration of the query.
   *               If `undefined` returns the latest states.
   */
  queryUnshieldedBalances(
    contractAddress: ContractAddress,
    config?: BlockHeightConfig | BlockHashConfig
  ): Promise<UnshieldedBalances | null>;

  /**
   * Retrieves the contract state of the contract with the given address.
   * Waits indefinitely for matching data to appear.
   * @param contractAddress The address of the contract of interest.
   */
  watchForContractState(contractAddress: ContractAddress): Promise<ContractState>;

  /**
   * Monitors for any unshielded balances associated with a specific contract address.
   *
   * @param {ContractAddress} contractAddress - The address of the contract to monitor for unshielded balances.
   * @return {Promise<UnshieldedBalances>} A promise that resolves to the detected unshielded balances.
   */
  watchForUnshieldedBalances(contractAddress: ContractAddress): Promise<UnshieldedBalances>;

  /**
   * Retrieves data of the deployment transaction for the contract at the given contract address.
   * Waits indefinitely for matching data to appear.
   * @param contractAddress The address of the contract of interest.
   */
  watchForDeployTxData(contractAddress: ContractAddress): Promise<FinalizedTxData>;

  /**
   * Retrieves data of the transaction containing the call or deployment with the given identifier.
   * Waits indefinitely for matching data to appear.
   * @param txId The identifier of the call or deployment of interest.
   */
  watchForTxData(txId: TransactionId): Promise<FinalizedTxData>;

  /**
   * Creates a stream of contract states. The observable emits a value every time a state is either
   * created or updated at the given address.
   * Waits indefinitely for matching data to appear.
   * @param address The address of the contract of interest.
   * @param config The configuration for the observable.
   */
  contractStateObservable(address: ContractAddress, config: ContractStateObservableConfig): Observable<ContractState>;

  /**
   * Retrieves an observable that tracks the unshielded balances for a specific contract address.
   *
   * @param {ContractAddress} address - The contract address for which unshielded balances are being observed.
   * @param {ContractStateObservableConfig} config - The configuration object for observing contract state changes.
   * @return {Observable<UnshieldedBalances>} An observable that emits the unshielded balances for the provided address.
   */
  unshieldedBalancesObservable(address: ContractAddress, config: ContractStateObservableConfig): Observable<UnshieldedBalances>;
}
