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

import type { CostModel } from '@midnight-ntwrk/ledger-v8';
import { createProofProvider, type ProofProvider, type ZKConfigProvider } from '@midnight-ntwrk/midnight-js-types';

import { type DAppConnectorProvingAPI, dappConnectorProvingProvider } from './dapp-connector-proving-provider';

/**
 * Creates a {@link ProofProvider} that delegates proving to a DApp Connector wallet.
 *
 * @remarks
 * Combines a wallet-backed {@link dappConnectorProvingProvider} with the given `costModel`
 * to produce a transaction-level proof provider. The wallet's proving provider is obtained
 * once during initialization and reused for all subsequent `proveTx` calls.
 *
 * @typeParam K - Union of circuit identifier strings defined by the contract.
 * @param api - DApp Connector wallet API exposing `getProvingProvider`.
 * @param zkConfigProvider - Provider that supplies ZK configuration artifacts and key material.
 * @param costModel - Cost model applied during transaction proving.
 * @returns A {@link ProofProvider} whose `proveTx` method delegates to the wallet.
 */
export const dappConnectorProofProvider = async <K extends string>(
  api: DAppConnectorProvingAPI,
  zkConfigProvider: ZKConfigProvider<K>,
  costModel: CostModel,
): Promise<ProofProvider> => {
  const provingProvider = await dappConnectorProvingProvider(api, zkConfigProvider);
  return createProofProvider(provingProvider, costModel);
};
