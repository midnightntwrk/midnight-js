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
 * A {@link ProvingProvider} whose per-circuit `check` / `prove` calls accept an optional per-request
 * timeout override. The override is a trailing optional parameter so this interface stays assignable
 * to `ProvingProvider`; callers that don't need per-request control can ignore it.
 *
 * Used by `createProofProvider` and `httpClientProofProvider` to honor a per-`proveTx` timeout
 * without rebuilding the underlying provider. The Midnight `httpClientProvingProvider` conforms
 * to this interface; custom providers can opt in by extending it.
 *
 * See https://github.com/midnightntwrk/midnight-js/issues/974.
 */
export interface TimeoutAwareProvingProvider extends ProvingProvider {
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
 * Returns true if the supplied {@link ProvingProvider} accepts an optional trailing
 * `overrideTimeout` parameter on its `check` / `prove` calls — i.e., conforms structurally
 * to {@link TimeoutAwareProvingProvider}.
 *
 * Detection: TypeScript's structural typing means a `ProvingProvider` whose `prove` accepts
 * four positional parameters is structurally a `TimeoutAwareProvingProvider`. We narrow with
 * the runtime feature-detect on `prove.length` (arity); when the override is present,
 * `createProofProvider` threads the per-call timeout through a wrapper closure, otherwise
 * the underlying provider is used as-is.
 */
const isTimeoutAwareProvingProvider = (
  pp: ProvingProvider
): pp is TimeoutAwareProvingProvider => {
  // `Function.prototype.length` returns the number of declared parameters before any rest
  // parameter; an `overrideTimeout?: number` trailing parameter is counted. The Midnight
  // protocol `ProvingProvider.prove` signature has 3 positional params (preimage, key,
  // overwriteBindingInput); the timeout-aware extension adds a 4th.
  return pp.prove.length >= 4;
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
 * {@link TimeoutAwareProvingProvider} — i.e., accept an optional trailing
 * `overrideTimeout` parameter on `check` / `prove`. The Midnight `httpClientProvingProvider`
 * conforms; custom providers that don't will receive the unmodified call shape (no per-call
 * override threaded) and the underlying provider's own default remains in effect.
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
      // the underlying `check` / `prove` accept the trailing `overrideTimeout` parameter.
      // `lookupKey` is forwarded unchanged so the wrapper doesn't drop the upstream
      // `ProvingProvider.lookupKey` surface that the transaction prover may call.
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
