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

import { CostModel, type ProvingProvider, type UnprovenTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type {
  ProofProvider,
  ProveTxConfig,
  UnboundTransaction,
  ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';

import {
  DEFAULT_TIMEOUT,
  httpClientProvingProvider,
  type ProvingProviderConfig
} from './http-client-proving-provider';

export const DEFAULT_CONFIG = {
  timeout: DEFAULT_TIMEOUT,
  zkConfig: undefined
};

/**
 * Resolves the timeout to use for a proveTx call.
 *
 * Precedence: per-call `proveTxConfig.timeout` > construction-time
 * `config.timeout` > `DEFAULT_TIMEOUT`. This was previously collapsed to the
 * construction-time value because the per-call `ProveTxConfig` was ignored
 * (see https://github.com/midnightntwrk/midnight-js/issues/974).
 */
const resolveTimeout = (
  constructionConfig: ProvingProviderConfig | undefined,
  proveTxConfig: ProveTxConfig | undefined
): number => proveTxConfig?.timeout ?? constructionConfig?.timeout ?? DEFAULT_TIMEOUT;

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
  // Build the underlying ProvingProvider once at construction time. The URL
  // validation (InvalidProtocolSchemeError) and the insecure-URL warning both
  // fire here, eagerly, so a misconfigured URL surfaces at provider wiring
  // time rather than on the first proveTx call — see PR #983 review.
  const provingProvider = httpClientProvingProvider(url, zkConfigProvider, config);

  return {
    async proveTx(
      unprovenTx: UnprovenTransaction,
      proveTxConfig?: ProveTxConfig
    ): Promise<UnboundTransaction> {
      // Resolve the per-call timeout. Precedence:
      //   per-call `proveTxConfig.timeout` > construction-time `config.timeout`
      //   > `DEFAULT_TIMEOUT`. See https://github.com/midnightntwrk/midnight-js/issues/974.
      const perCallTimeout = resolveTimeout(config, proveTxConfig);

      // Wrap the per-construction provider so every circuit-level check/prove
      // call inside this proveTx uses the per-call timeout, without rebuilding
      // the underlying provider (which would re-run URL validation and the
      // insecure-URL warning on every transaction).
      //
      // The wrapper structurally matches the `ProvingProvider` interface from
      // `@midnight-ntwrk/midnight-js-protocol/ledger` (same `check` / `prove`
      // signatures, just with the per-call timeout pre-bound); the cast keeps
      // callers in lockstep with the upstream type without forcing us to
      // re-export the type here.
      const perCallProvingProvider = {
        check: (preimage: Uint8Array, keyLocation: string) =>
          provingProvider.check(preimage, keyLocation, perCallTimeout),
        prove: (
          preimage: Uint8Array,
          keyLocation: string,
          overwriteBindingInput?: bigint
        ) => provingProvider.prove(preimage, keyLocation, overwriteBindingInput, perCallTimeout)
      } as ProvingProvider;

      const costModel = CostModel.initialCostModel();
      return unprovenTx.prove(perCallProvingProvider, costModel);
    }
  };
};
