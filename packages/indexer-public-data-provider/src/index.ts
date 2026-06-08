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
import type * as ws from 'isomorphic-ws';
import type * as Rx from 'rxjs';

import { type IndexerProviderConfig, validateConfig } from './config';
import { IndexerProviderConfigError } from './errors';
import { IndexerPublicDataProvider } from './provider';
import { createApolloClient } from './transport';

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
export { DEFAULT_POLL_INTERVAL, type IndexerProviderConfig } from './config';
export * from './errors';
export { isRegularTransaction } from './mapping';

/**
 * Constructs an indexer-backed {@link PublicDataProvider}.
 *
 * Two call forms:
 * 1. Object-config (preferred): `indexerPublicDataProvider({ queryURL, subscriptionURL, webSocket?, pollInterval? })`.
 * 2. Positional (deprecated, retained for backward compatibility): `indexerPublicDataProvider(queryURL, subscriptionURL, webSocket?)`.
 *
 * The returned object exposes `dispose()` to release the WebSocket
 * connection and Apollo state. Always call it on long-running providers.
 *
 * The current implementation wraps the inner class with
 * `assertIsContractAddress` calls on every method that accepts a
 * `ContractAddress`. The wrapper is removed in Phase 3 by moving the
 * assertions into the class methods themselves.
 */
export function indexerPublicDataProvider(config: IndexerProviderConfig): PublicDataProvider;
/** @deprecated Use the `IndexerProviderConfig` overload. */
export function indexerPublicDataProvider(
  queryURL: string,
  subscriptionURL: string,
  webSocket?: typeof ws.WebSocket
): PublicDataProvider;
export function indexerPublicDataProvider(
  configOrQueryURL: IndexerProviderConfig | string,
  subscriptionURL?: string,
  webSocket?: typeof ws.WebSocket
): PublicDataProvider {
  let config: IndexerProviderConfig;
  if (typeof configOrQueryURL === 'string') {
    if (subscriptionURL === undefined) {
      throw new IndexerProviderConfigError(
        'subscriptionURL is required when calling the positional indexerPublicDataProvider overload'
      );
    }
    config = { queryURL: configOrQueryURL, subscriptionURL, webSocket };
  } else {
    config = configOrQueryURL;
  }

  const validated = validateConfig(config);
  const handle = createApolloClient(validated);
  const inner = new IndexerPublicDataProvider(handle, validated.pollInterval);

  return {
    contractStateObservable(
      contractAddress: ContractAddress,
      contractStateConfig: ContractStateObservableConfig
    ): Rx.Observable<ContractState> {
      assertIsContractAddress(contractAddress);
      return inner.contractStateObservable(contractAddress, contractStateConfig);
    },
    queryContractState(
      contractAddress: ContractAddress,
      queryConfig?: BlockHeightConfig | BlockHashConfig
    ): Promise<ContractState | null> {
      assertIsContractAddress(contractAddress);
      return inner.queryContractState(contractAddress, queryConfig);
    },
    queryDeployContractState(contractAddress: ContractAddress): Promise<ContractState | null> {
      assertIsContractAddress(contractAddress);
      return inner.queryDeployContractState(contractAddress);
    },
    queryZSwapAndContractState(
      contractAddress: ContractAddress,
      queryConfig?: BlockHeightConfig | BlockHashConfig
    ): Promise<[ZswapChainState, ContractState, LedgerParameters] | null> {
      assertIsContractAddress(contractAddress);
      return inner.queryZSwapAndContractState(contractAddress, queryConfig);
    },
    queryUnshieldedBalances(
      contractAddress: ContractAddress,
      queryConfig?: BlockHeightConfig | BlockHashConfig
    ): Promise<UnshieldedBalances | null> {
      assertIsContractAddress(contractAddress);
      return inner.queryUnshieldedBalances(contractAddress, queryConfig);
    },
    watchForContractState(contractAddress: ContractAddress): Promise<ContractState> {
      assertIsContractAddress(contractAddress);
      return inner.watchForContractState(contractAddress);
    },
    watchForUnshieldedBalances(contractAddress: ContractAddress): Promise<UnshieldedBalances> {
      assertIsContractAddress(contractAddress);
      return inner.watchForUnshieldedBalances(contractAddress);
    },
    watchForDeployTxData(contractAddress: ContractAddress): Promise<FinalizedTxData> {
      assertIsContractAddress(contractAddress);
      return inner.watchForDeployTxData(contractAddress);
    },
    watchForTxData(txId: TransactionId): Promise<FinalizedTxData> {
      return inner.watchForTxData(txId);
    },
    unshieldedBalancesObservable(
      contractAddress: ContractAddress,
      contractStateConfig: ContractStateObservableConfig
    ): Rx.Observable<UnshieldedBalances> {
      assertIsContractAddress(contractAddress);
      return inner.unshieldedBalancesObservable(contractAddress, contractStateConfig);
    },
    dispose(): Promise<void> {
      return inner.dispose();
    }
  };
}
