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

import type { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type {
  ContractAddress,
  LedgerParameters,
  TransactionId,
  ZswapChainState
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type {
  BlockHashConfig,
  BlockHeightConfig,
  ContractStateObservableConfig,
  FinalizedTxData,
  PublicDataProvider,
  UnshieldedBalances
} from '@midnight-ntwrk/midnight-js-types';
import { assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';
import * as ws from 'isomorphic-ws';
import type * as Rx from 'rxjs';

import { indexerPublicDataProviderInternal } from './provider';

export {
  correlateDeployTxId,
  type IndexerUtxo,
  parseHexContractState,
  parseHexLedgerParameters,
  parseHexTransaction,
  parseHexZswapState,
  toSegmentStatus,
  toSegmentStatusMap,
  toTxStatus,
  toUnshieldedBalances,
  toUnshieldedUtxos
} from './codec';
export * from './errors';
export { isRegularTransaction } from './mapping';

/**
 * Constructs a {@link PublicDataProvider} based on an Apollo Client.
 *
 * Wraps the internal factory to assert that input contract addresses are
 * valid before forwarding the call. The duplicated `assertIsContractAddress`
 * calls below are removed in Phase 3 by moving the assertion into the class
 * methods themselves.
 *
 * @param queryURL The URL of a GraphQL server query endpoint.
 * @param subscriptionURL The URL of a GraphQL server subscription (websocket) endpoint.
 * @param webSocketImpl An optional websocket implementation for the Apollo client to use.
 */
export const indexerPublicDataProvider = (
  queryURL: string,
  subscriptionURL: string,
  webSocketImpl: typeof ws.WebSocket = ws.WebSocket
): PublicDataProvider => {
  const publicDataProvider = indexerPublicDataProviderInternal(queryURL, subscriptionURL, webSocketImpl);
  return {
    contractStateObservable(
      contractAddress: ContractAddress,
      config: ContractStateObservableConfig
    ): Rx.Observable<ContractState> {
      assertIsContractAddress(contractAddress);
      return publicDataProvider.contractStateObservable(contractAddress, config);
    },
    queryContractState(
      contractAddress: ContractAddress,
      config?: BlockHeightConfig | BlockHashConfig
    ): Promise<ContractState | null> {
      assertIsContractAddress(contractAddress);
      return publicDataProvider.queryContractState(contractAddress, config);
    },
    queryDeployContractState(contractAddress: ContractAddress): Promise<ContractState | null> {
      assertIsContractAddress(contractAddress);
      return publicDataProvider.queryDeployContractState(contractAddress);
    },
    queryZSwapAndContractState(
      contractAddress: ContractAddress,
      config?: BlockHeightConfig | BlockHashConfig
    ): Promise<[ZswapChainState, ContractState, LedgerParameters] | null> {
      assertIsContractAddress(contractAddress);
      return publicDataProvider.queryZSwapAndContractState(contractAddress, config);
    },
    queryUnshieldedBalances(
      contractAddress: ContractAddress,
      config?: BlockHeightConfig | BlockHashConfig
    ): Promise<UnshieldedBalances | null> {
      assertIsContractAddress(contractAddress);
      return publicDataProvider.queryUnshieldedBalances(contractAddress, config);
    },
    watchForContractState(contractAddress: ContractAddress): Promise<ContractState> {
      assertIsContractAddress(contractAddress);
      return publicDataProvider.watchForContractState(contractAddress);
    },
    watchForUnshieldedBalances(contractAddress: ContractAddress): Promise<UnshieldedBalances> {
      assertIsContractAddress(contractAddress);
      return publicDataProvider.watchForUnshieldedBalances(contractAddress);
    },
    watchForDeployTxData(contractAddress: ContractAddress): Promise<FinalizedTxData> {
      assertIsContractAddress(contractAddress);
      return publicDataProvider.watchForDeployTxData(contractAddress);
    },
    watchForTxData(txId: TransactionId): Promise<FinalizedTxData> {
      return publicDataProvider.watchForTxData(txId);
    },
    unshieldedBalancesObservable(
      contractAddress: ContractAddress,
      config: ContractStateObservableConfig
    ): Rx.Observable<UnshieldedBalances> {
      assertIsContractAddress(contractAddress);
      return publicDataProvider.unshieldedBalancesObservable(contractAddress, config);
    }
  };
};
