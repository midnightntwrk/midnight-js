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

import type * as ws from 'isomorphic-ws';

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
export { DEFAULT_CONTRACT_EVENTS_PAGE_SIZE, DEFAULT_POLL_INTERVAL, type IndexerProviderConfig } from './config';
export * from './errors';
export { getAllContractEvents } from './get-all-contract-events';
export { isRegularTransaction } from './mapping';
export { IndexerPublicDataProvider } from './provider';

/**
 * Constructs an indexer-backed `PublicDataProvider`.
 *
 * Two call forms:
 * 1. Object-config (preferred): `indexerPublicDataProvider({ queryURL, subscriptionURL, webSocket?, pollInterval? })`.
 * 2. Positional (deprecated, retained for backward compatibility): `indexerPublicDataProvider(queryURL, subscriptionURL, webSocket?)`.
 *
 * The returned concrete `IndexerPublicDataProvider` exposes `dispose()` to
 * release the WebSocket connection and Apollo state. Always call it on
 * long-running providers.
 */
export function indexerPublicDataProvider(config: IndexerProviderConfig): IndexerPublicDataProvider;
/** @deprecated Use the `IndexerProviderConfig` overload. */
export function indexerPublicDataProvider(
  queryURL: string,
  subscriptionURL: string,
  webSocket?: typeof ws.WebSocket
): IndexerPublicDataProvider;
export function indexerPublicDataProvider(
  configOrQueryURL: IndexerProviderConfig | string,
  subscriptionURL?: string,
  webSocket?: typeof ws.WebSocket
): IndexerPublicDataProvider {
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
  return new IndexerPublicDataProvider(handle, validated.pollInterval);
}
