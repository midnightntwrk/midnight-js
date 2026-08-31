/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
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
 * Creates a {@link ProofProvider} from a {@link ProvingProvider}.
 * The returned provider proves transactions using the initial cost model.
 *
 * @param provingProvider - The underlying proving provider used to generate proofs.
 * @param costModel - Optional cost model to use for proof generation. Defaults to the initial cost model if not provided.
 * @returns A {@link ProofProvider} that delegates proof generation to the given proving provider.
 *
 * @remarks
 * When `proveTxConfig.timeout` is set and `provingProvider` is a timeout-aware implementation
 * (e.g. the result of `httpClientProvingProvider`), the timeout is forwarded to each circuit-level
 * call. Plain {@link ProvingProvider} implementations that do not declare an override timeout
 * parameter safely ignore the extra argument at runtime.
 */
export const createProofProvider = (
  provingProvider: ProvingProvider,
  costModel: CostModel = CostModel.initialCostModel()
): ProofProvider => ({
  async proveTx(unprovenTx: UnprovenTransaction, proveTxConfig?: ProveTxConfig): Promise<UnboundTransaction> {
    if (proveTxConfig?.timeout !== undefined) {
      const timeout = proveTxConfig.timeout;
      // Cast to the extended signature accepted by timeout-aware providers (e.g. httpClientProvingProvider).
      // The extra argument is ignored by implementations that don't support per-call timeout overrides.
      const pp = provingProvider as unknown as {
        check(preimage: Uint8Array, keyLocation: string, overrideTimeout?: number): Promise<(bigint | undefined)[]>;
        prove(preimage: Uint8Array, keyLocation: string, overwriteBindingInput?: bigint, overrideTimeout?: number): Promise<Uint8Array>;
      };
      const wrapped: ProvingProvider = {
        check: (preimage, keyLocation) => pp.check(preimage, keyLocation, timeout),
        prove: (preimage, keyLocation, overwriteBindingInput) => pp.prove(preimage, keyLocation, overwriteBindingInput, timeout),
        lookupKey: (keyLocation) => provingProvider.lookupKey(keyLocation),
      };
      return unprovenTx.prove(wrapped, costModel);
    }
    return unprovenTx.prove(provingProvider, costModel);
  }
});
