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

import { unwrapV9 } from './unwrap-v9';
import type { VersionedTx } from './versioned';

export type UnboundTransaction = Transaction<SignatureEnabled, Proof, PreBinding>;

/**
 * An unproven transaction on its way to a {@link ProofProvider}: either the
 * live v9 ledger object, or the serialized bytes of a v8-era transaction.
 */
export type VersionedUnprovenTransaction = VersionedTx<UnprovenTransaction>;

/**
 * A proven-but-unbalanced transaction coming back from a {@link ProofProvider}:
 * either the live v9 ledger object, or the serialized bytes of a v8-era
 * transaction.
 */
export type VersionedUnboundTransaction = VersionedTx<UnboundTransaction>;

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
   *
   * @param unprovenTx The version-tagged unproven transaction: wrap a live v9 ledger object as
   *                   `{ version: 'v9', tx }`, or v8-era serialized bytes as
   *                   `{ version: 'v8', txBytes }`.
   * @param proveTxConfig The configuration for the proof request to the proof provider. Empty in case
   *                      a deploy transaction is being proved with no user-defined timeout.
   * @returns The proven transaction, version-tagged. Narrow on `version` — or call `unwrapV9` —
   *          before reading the payload.
   * @throws V8PayloadUnsupportedError if the implementation does not handle the v8 arm.
   * @throws UntaggedPayloadError if `version` is missing or unrecognised.
   */
  proveTx(
    unprovenTx: VersionedUnprovenTransaction,
    proveTxConfig?: ProveTxConfig
  ): Promise<VersionedUnboundTransaction>;
}

/**
 * Creates a {@link ProofProvider} from a {@link ProvingProvider}.
 * The returned provider proves transactions using the initial cost model.
 *
 * The returned provider serves the v9 arm only: it rejects a v8 payload with
 * `V8PayloadUnsupportedError`, and an untagged one with `UntaggedPayloadError`.
 *
 * @param provingProvider - The underlying proving provider used to generate proofs.
 * @param costModel - Optional cost model to use for proof generation. Defaults to the initial cost model if not provided.
 * @returns A {@link ProofProvider} that delegates proof generation to the given proving provider.
 */
export const createProofProvider = (
  provingProvider: ProvingProvider,
  costModel: CostModel = CostModel.initialCostModel()
): ProofProvider => ({
  async proveTx(unprovenTx: VersionedUnprovenTransaction): Promise<VersionedUnboundTransaction> {
    const tx = unwrapV9(unprovenTx, 'proveTx');
    return { version: 'v9', tx: await tx.prove(provingProvider, costModel) };
  }
});
