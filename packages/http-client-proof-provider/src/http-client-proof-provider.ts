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

import { CostModel, type ProvingProvider, type UnprovenTransaction } from '@midnight-ntwrk/ledger-v8';
import type {
  ProofProvider,
  ProveTxConfig,
  UnboundTransaction,
  ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';

import { httpClientProvingProvider, type ProvingProviderConfig } from './http-client-proving-provider';

export const DEFAULT_CONFIG = {
  timeout: 300000,
  zkConfig: undefined
};

/**
 * Creates a high-level {@link ProofProvider} that implements transaction-level proving
 * using the low-level circuit-by-circuit {@link ProvingProvider} as its foundation.
 *
 * This adapter bridges the gap between:
 * - High-level ProofProvider interface (works with complete transactions)
 * - Low-level ProvingProvider interface (works with individual circuits)
 *
 * @param url The URL of the proof server
 * @param zkConfigProvider Provider for zero-knowledge configuration artifacts
 * @param config Optional configuration for the underlying ProvingProvider
 * @returns A ProofProvider instance that uses ProvingProvider internally
 *
 * @remarks
 * **Architecture:**
 * ```
 * ProofProvider (Transaction-level)
 *     ↓ (adapter)
 * ProvingProvider (Circuit-level)
 *     ↓ (HTTP client)
 * Proof Server (/check, /prove endpoints)
 * ```
 *
 * **Note:** The /prove-tx endpoint is NOT used. All proving is done through
 * individual circuit operations using /check and /prove endpoints.
 */
export const httpClientProofProvider = <K extends string>(
  url: string,
  zkConfigProvider: ZKConfigProvider<K>,
  config?: ProvingProviderConfig
): ProofProvider => {
  const baseProvingProvider = httpClientProvingProvider(url, zkConfigProvider, config);

  return {
    async proveTx(
      unprovenTx: UnprovenTransaction,
      _partialProveTxConfig?: ProveTxConfig
    ): Promise<UnboundTransaction> {
      const costModel = CostModel.initialCostModel();
      return unprovenTx.prove(baseProvingProvider, costModel);
    }
  };
};
