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
  ZKConfigProvider,
  ZKConfigRegistry
} from '@midnight-ntwrk/midnight-js-types';

import { DEFAULT_TIMEOUT, httpClientProvingProvider, type ProvingProviderConfig } from './http-client-proving-provider';

export const DEFAULT_CONFIG = {
  timeout: DEFAULT_TIMEOUT,
  zkConfig: undefined
};

/**
 * Resolves the timeout for a `proveTx` call. Precedence: per-call `proveTxConfig.timeout` >
 * construction-time `config.timeout` > `DEFAULT_TIMEOUT`. The per-call value was previously
 * discarded, so a caller-supplied timeout had no effect — see
 * https://github.com/midnightntwrk/midnight-js/issues/974.
 */
const resolveTimeout = (
  constructionConfig: ProvingProviderConfig | undefined,
  proveTxConfig: ProveTxConfig | undefined
): number => proveTxConfig?.timeout ?? constructionConfig?.timeout ?? DEFAULT_TIMEOUT;

/**
 * Options for {@link httpClientProofProvider}. The connection fields (`url`, `zkConfigProvider`)
 * are combined with the underlying {@link ProvingProviderConfig} into a single flat object.
 */
export interface HttpClientProofProviderOptions<K extends string> extends ProvingProviderConfig {
  /** The URL of the proof server. */
  readonly url: string;
  /** Provider for zero-knowledge configuration artifacts. */
  readonly zkConfigProvider: ZKConfigProvider<K> | ZKConfigRegistry;
}

/**
 * Creates a high-level {@link ProofProvider} that implements transaction-level proving
 * using the low-level circuit-by-circuit {@link ProvingProvider} as its foundation.
 *
 * This adapter bridges the gap between:
 * - High-level ProofProvider interface (works with complete transactions)
 * - Low-level ProvingProvider interface (works with individual circuits)
 *
 * @param options Connection and proving configuration — see {@link HttpClientProofProviderOptions}
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
export function httpClientProofProvider<K extends string>(
  options: HttpClientProofProviderOptions<K>
): ProofProvider;
/**
 * @deprecated Use the {@link HttpClientProofProviderOptions} object form:
 * `httpClientProofProvider({ url, zkConfigProvider })`.
 *
 * @param url The URL of the proof server
 * @param zkConfigProvider Provider for zero-knowledge configuration artifacts
 * @param config Optional configuration for the underlying ProvingProvider
 * @returns A ProofProvider instance that uses ProvingProvider internally
 */
export function httpClientProofProvider<K extends string>(
  url: string,
  zkConfigProvider: ZKConfigProvider<K> | ZKConfigRegistry,
  config?: ProvingProviderConfig
): ProofProvider;
export function httpClientProofProvider<K extends string>(
  optionsOrUrl: HttpClientProofProviderOptions<K> | string,
  zkConfigProvider?: ZKConfigProvider<K> | ZKConfigRegistry,
  config?: ProvingProviderConfig
): ProofProvider {
  let url: string;
  let resolvedZkConfigProvider: ZKConfigProvider<K> | ZKConfigRegistry;
  let resolvedConfig: ProvingProviderConfig | undefined;

  if (typeof optionsOrUrl === 'string') {
    if (zkConfigProvider === undefined) {
      throw new Error('zkConfigProvider is required when calling the positional httpClientProofProvider overload');
    }
    url = optionsOrUrl;
    resolvedZkConfigProvider = zkConfigProvider;
    resolvedConfig = config;
  } else {
    const { url: optionsUrl, zkConfigProvider: optionsZkConfigProvider, ...rest } = optionsOrUrl;
    url = optionsUrl;
    resolvedZkConfigProvider = optionsZkConfigProvider;
    resolvedConfig = rest;
  }

  // Build the underlying ProvingProvider once at construction time so URL validation
  // (InvalidProtocolSchemeError) and the insecure-URL warning fire eagerly here — at wiring time —
  // rather than being deferred to (and repeated on) every proveTx call.
  const baseProvingProvider = httpClientProvingProvider(url, resolvedZkConfigProvider, resolvedConfig);

  return {
    async proveTx(
      unprovenTx: UnprovenTransaction,
      proveTxConfig?: ProveTxConfig
    ): Promise<UnboundTransaction> {
      const perCallTimeout = resolveTimeout(resolvedConfig, proveTxConfig);

      // Wrap the construction-time provider so every circuit-level check/prove in this proveTx uses
      // the per-call timeout, without rebuilding the underlying provider. The timeout override is
      // exposed by TimeoutAwareProvingProvider, so this needs no cast.
      const perCallProvingProvider: ProvingProvider = {
        check: (serializedPreimage, keyLocation) =>
          baseProvingProvider.check(serializedPreimage, keyLocation, perCallTimeout),
        prove: (serializedPreimage, keyLocation, overwriteBindingInput) =>
          baseProvingProvider.prove(serializedPreimage, keyLocation, overwriteBindingInput, perCallTimeout),
        lookupKey: (keyLocation) => baseProvingProvider.lookupKey(keyLocation)
      };

      const costModel = CostModel.initialCostModel();
      return unprovenTx.prove(perCallProvingProvider, costModel);
    }
  };
};
