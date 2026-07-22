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

import {
  CostModel,
  type PreBinding,
  type Proof,
  type ProvingProvider,
  type SignatureEnabled,
  type Transaction,
  type UnprovenTransaction
} from '@midnight-ntwrk/midnight-js-protocol/ledger';

export type UnboundTransaction = Transaction<SignatureEnabled, Proof, PreBinding>;

/**
 * The configuration for the proof request to the proof provider.
 */
export interface ProveTxConfig {
  /**
   * The timeout for the request, in milliseconds. This is a per-request timeout for the underlying
   * proof server call, not a hard wall-clock ceiling for the whole `proveTx` call — the proof
   * provider's internal retry/backoff means a `proveTx` call may take longer than this value when
   * retries occur. See https://github.com/midnightntwrk/midnight-js/issues/974.
   */
  readonly timeout?: number;
}

/**
 * Interface for a proof server running in a trusted environment.
 * @typeParam K - The type of the circuit ID used by the provider.
 */
export interface ProofProvider {
  /**
   * Creates call proofs for an unproven transaction. The resulting transaction is unbalanced and
   * must be balanced using the {@link WalletProvider} interface.
   *           contain a single contract call.
   * @param unprovenTx
   * @param proveTxConfig The configuration for the proof request to the proof provider. Empty in case
   *                      a deploy transaction is being proved with no user-defined timeout.
   */
  proveTx(unprovenTx: UnprovenTransaction, proveTxConfig?: ProveTxConfig): Promise<UnboundTransaction>;
}

/**
 * Brand symbol identifying a {@link ProvingProvider} whose per-circuit `check` / `prove` calls
 * accept an optional per-request timeout override.
 *
 * Replaces the prior `Function.prototype.length` arity heuristic, which was fragile against
 * default-value parameters (truncates the reported length) and unrelated trailing positional
 * parameters (false positives). The brand is an explicit opt-in: providers that extend
 * {@link TimeoutAwareProvingProvider} declare `[TIMEOUT_AWARE_BRAND]: true` on the returned
 * object, and the runtime check in `createProofProvider` tests for it.
 *
 * See PR #1063 review feedback by @sp-io: arity cannot reliably distinguish a
 * timeout-aware provider from one that happens to declare four positional parameters
 * or a default-valued trailing parameter.
 */
export const TIMEOUT_AWARE_BRAND: unique symbol = Symbol.for(
  '@midnight-ntwrk/midnight-js-types/timeout-aware-proving-provider'
);

/**
 * A {@link ProvingProvider} whose per-circuit `check` / `prove` calls accept an optional
 * per-request timeout override. The override is a trailing optional parameter so this
 * interface stays assignable to `ProvingProvider`; callers that don't need per-request
 * control can ignore it.
 *
 * Providers that conform to this interface MUST carry the {@link TIMEOUT_AWARE_BRAND} brand
 * on the returned object. This is an explicit opt-in — runtime detection in
 * `createProofProvider` tests the brand instead of inspecting `Function.prototype.length`.
 *
 * Used by `createProofProvider` and `httpClientProofProvider` to honor a per-`proveTx`
 * timeout without rebuilding the underlying provider. The Midnight `httpClientProvingProvider`
 * and `dappConnectorProvingProvider` conform; custom providers can opt in by extending
 * this interface and declaring the brand.
 *
 * See https://github.com/midnightntwrk/midnight-js/issues/974.
 */
export interface TimeoutAwareProvingProvider extends ProvingProvider {
  readonly [TIMEOUT_AWARE_BRAND]: true;
  check(
    serializedPreimage: Uint8Array,
    keyLocation: string,
    overrideTimeout?: number
  ): Promise<(bigint | undefined)[]>;
  prove(
    serializedPreimage: Uint8Array,
    keyLocation: string,
    overwriteBindingInput?: bigint,
    overrideTimeout?: number
  ): Promise<Uint8Array>;
}

/**
 * Returns true if the supplied {@link ProvingProvider} carries the
 * {@link TIMEOUT_AWARE_BRAND} brand — i.e., conforms structurally and by declaration to
 * {@link TimeoutAwareProvingProvider}.
 *
 * Detection is via the brand property; we deliberately do NOT use `Function.prototype.length`
 * because it stops counting at the first parameter with a default value or rest parameter,
 * which produces false negatives (timeout-aware providers with default-valued trailing
 * parameters) and false positives (providers with an unrelated 4th positional parameter).
 */
const isTimeoutAwareProvingProvider = (
  pp: ProvingProvider
): pp is TimeoutAwareProvingProvider => {
  return (pp as Partial<TimeoutAwareProvingProvider>)[TIMEOUT_AWARE_BRAND] === true;
};

/**
 * Creates a {@link ProofProvider} from a {@link ProvingProvider}.
 * The returned provider proves transactions using the initial cost model.
 *
 * @param provingProvider - The underlying proving provider used to generate proofs.
 * @param costModel - Optional cost model to use for proof generation. Defaults to the initial cost model if not provided.
 * @returns A {@link ProofProvider} that delegates proof generation to the given proving provider.
 *
 * @remarks
 * The returned `ProofProvider` honors the per-call `proveTxConfig.timeout` parameter on
 * `proveTx` — same contract as `httpClientProofProvider` (see issue #974 and PR #1054).
 * When the caller passes a `proveTxConfig.timeout`, the per-call timeout is wrapped onto
 * every circuit-level `check` / `prove` call inside the resulting `proveTx`. When the
 * caller omits `proveTxConfig`, the underlying `ProvingProvider` is used as-is.
 *
 * Per-call timeout threading requires the underlying `ProvingProvider` to conform to
 * {@link TimeoutAwareProvingProvider} — i.e., to carry the {@link TIMEOUT_AWARE_BRAND} brand
 * AND accept an optional trailing `overrideTimeout` parameter on `check` / `prove`. The
 * Midnight `httpClientProvingProvider` and `dappConnectorProvingProvider` conform; custom
 * providers that don't will receive the unmodified call shape (no per-call override
 * threaded) and the underlying provider's own default remains in effect.
 */
export const createProofProvider = (
  provingProvider: ProvingProvider,
  costModel: CostModel = CostModel.initialCostModel()
): ProofProvider => {
  const perCallTimeoutSupported = isTimeoutAwareProvingProvider(provingProvider);

  return {
    async proveTx(
      unprovenTx: UnprovenTransaction,
      proveTxConfig?: ProveTxConfig
    ): Promise<UnboundTransaction> {
      const perCallTimeout = proveTxConfig?.timeout;

      if (perCallTimeout === undefined || !perCallTimeoutSupported) {
        // Either the caller didn't supply an override, or the underlying provider doesn't
        // support per-call overrides — pass through unchanged.
        return unprovenTx.prove(provingProvider, costModel);
      }

      // Wrap the underlying provider so every circuit-level check/prove inside this proveTx
      // uses the per-call timeout, without rebuilding the underlying provider. The wrapper
      // structurally matches `ProvingProvider`; `isTimeoutAwareProvingProvider` above proves
      // the underlying `check` / `prove` accept the trailing `overrideTimeout` parameter
      // via the explicit TIMEOUT_AWARE_BRAND brand. `lookupKey` is forwarded unchanged so the
      // wrapper doesn't drop the upstream `ProvingProvider.lookupKey` surface that the
      // transaction prover may call.
      const perCallProvingProvider: ProvingProvider = {
        check: (serializedPreimage, keyLocation) =>
          provingProvider.check(serializedPreimage, keyLocation, perCallTimeout),
        prove: (serializedPreimage, keyLocation, overwriteBindingInput) =>
          provingProvider.prove(
            serializedPreimage,
            keyLocation,
            overwriteBindingInput,
            perCallTimeout
          ),
        lookupKey: (keyLocation) => provingProvider.lookupKey(keyLocation)
      };

      return unprovenTx.prove(perCallProvingProvider, costModel);
    }
  };
};