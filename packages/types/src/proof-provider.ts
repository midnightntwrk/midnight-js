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
import { proveV8Transaction } from '@midnight-ntwrk/midnight-js-protocol/prove';
import type { ProvingProvider as RetainedEraProvingProvider } from '@midnight-ntwrk/midnight-js-protocol/v8';
import {
  CURRENT_LEDGER_VERSION,
  type LedgerVersion,
  RETAINED_LEDGER_VERSIONS,
  type RetainedLedgerVersion
} from '@midnight-ntwrk/midnight-js-protocol/version';

import { erasServedBy, narrowToEraArm, type RetainedEraHandlers } from './era-arms';
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
   * The ledger eras THIS INSTANCE serves.
   *
   * Read before an operation starts, by `assertSeamsSupportEra`, so a set of
   * providers that cannot carry a transaction end to end is refused before its
   * proof is paid for. A provider built by one of the `create*` factories has
   * this computed from the arms it was given; a provider implementing this
   * interface directly states it.
   *
   * Declare every era `proveTx` really serves and no more. Nothing verifies the
   * claim — an era listed here but not served still fails at `proveTx`, just
   * later and after more work.
   */
  readonly supportedEras: readonly LedgerVersion[];

  /**
   * Creates call proofs for an unproven transaction. The resulting transaction is unbalanced and
   * must be balanced using the {@link WalletProvider} interface.
   *
   * @param unprovenTx The version-tagged unproven transaction: wrap a live v9 ledger object as
   *                   `{ version: 'v9', tx }`, or v8-era serialized bytes as
   *                   `{ version: 'v8', txBytes }`.
   * @param proveTxConfig The configuration for the proof request to the proof provider. Empty in case
   *                      a deploy transaction is being proved with no user-defined timeout.
   * @returns The proven transaction, version-tagged, and always in the SAME arm the request
   *          carried. Narrow on `version` — or call `unwrapV9` — before reading the payload.
   * @throws V8PayloadUnsupportedError if the implementation does not handle the v8 arm. Which
   *         implementations do is worth knowing before you send one: `httpClientProofProvider`
   *         and `dappConnectorProofProvider` both serve it, taking and returning serialized
   *         bytes. {@link createProofProvider} does NOT — it adapts a v9-only `ProvingProvider`,
   *         so it refuses the v8 arm on the way in, which is the honest answer for what it wraps.
   * @throws PayloadNotATransactionError if the v8 arm's `txBytes` is not a serialized transaction.
   *         Raised by the providers that serve that arm and defined in
   *         `@midnight-ntwrk/midnight-js-protocol/errors` (not a runtime dependency of this
   *         package, so it is named here rather than imported); match it with `hasErrorCode`
   *         against `PROTOCOL_ERROR_CODES.PAYLOAD_NOT_A_TRANSACTION`.
   * @throws UntaggedPayloadError if `version` is missing or unrecognised.
   */
  proveTx(
    unprovenTx: VersionedUnprovenTransaction,
    proveTxConfig?: ProveTxConfig
  ): Promise<VersionedUnboundTransaction>;
}

/**
 * Proves a CURRENT-era transaction, which crosses this seam as a live ledger
 * object because both sides share the current era's WASM instance.
 */
export type CurrentEraProver = (tx: UnprovenTransaction, config?: ProveTxConfig) => Promise<UnboundTransaction>;

/**
 * Proves a RETAINED-era transaction, which crosses this seam as serialized
 * bytes in both directions: the runtime that owns such a transaction is loaded
 * lazily and its instances are not interchangeable with the current era's.
 */
export type RetainedEraProver = (txBytes: Uint8Array, config?: ProveTxConfig) => Promise<Uint8Array>;

/**
 * The per-era arms {@link createProofProviderFromArms} assembles a
 * {@link ProofProvider} from.
 *
 * Writing the arms rather than the whole interface means an implementation
 * never writes a `version` tag, never narrows a payload, and cannot answer in
 * the wrong era — the factory routes each request to its own era's arm and tags
 * the answer to match. What is left in each arm is the proving itself.
 */
export interface ProofProviderArms {
  /** Required: every provider serves the current era. */
  readonly currentEra: CurrentEraProver;
  /** Optional, one entry per retained era this provider serves. */
  readonly retainedEras?: RetainedEraHandlers<RetainedEraProver>;
}

/**
 * Assembles a {@link ProofProvider} from one arm per ledger era it serves.
 *
 * The `supportedEras` declaration is computed from the arms supplied, so it
 * cannot disagree with what the provider actually does.
 *
 * @param arms The current-era arm, and a handler for each retained era served.
 * @returns A {@link ProofProvider} routing each request to its era's arm and
 *          answering in the era the request arrived in.
 *
 * @example
 * ```typescript
 * const proofProvider = createProofProviderFromArms({
 *   currentEra: (tx) => tx.prove(provingProvider, CostModel.initialCostModel()),
 *   retainedEras: { v8: (txBytes) => proveV8Transaction(txBytes, provingProvider) }
 * });
 * // proofProvider.supportedEras === ['v9', 'v8']
 * ```
 */
export const createProofProviderFromArms = (arms: ProofProviderArms): ProofProvider => ({
  supportedEras: erasServedBy(arms.retainedEras),

  async proveTx(
    unprovenTx: VersionedUnprovenTransaction,
    proveTxConfig?: ProveTxConfig
  ): Promise<VersionedUnboundTransaction> {
    const request = narrowToEraArm(unprovenTx, 'proveTx', arms.retainedEras);
    if (request.era === CURRENT_LEDGER_VERSION) {
      return { version: CURRENT_LEDGER_VERSION, tx: await arms.currentEra(request.tx, proveTxConfig) };
    }
    // Answered in the arm it arrived in: a caller narrows the response and
    // rejects the other era, so replying in the wrong one strands a submit
    // mid-flight.
    return { version: request.era, txBytes: await request.handler(request.txBytes, proveTxConfig) };
  }
});

/**
 * The proving providers {@link createProofProviderFromProvingProviders}
 * assembles a {@link ProofProvider} from — one per ledger era served.
 */
export interface EraProvingProviders {
  /** Required: every provider serves the current era. */
  readonly currentEra: ProvingProvider;
  /**
   * Optional, one entry per retained era this provider serves.
   *
   * Takes the RETAINED era's `ProvingProvider` shape, which is what an
   * in-process prover's `asV8ProvingProvider()` returns. Registering the
   * provider built for THIS era is the whole point of the entry: the eras need
   * different key material, and a proof made with the other era's is rejected
   * by the node at submit, after the proving has been paid for.
   */
  readonly retainedEras?: RetainedEraHandlers<RetainedEraProvingProvider>;
  /**
   * Optional cost model, applied on the CURRENT era only. Defaults to the
   * initial cost model.
   *
   * Not consulted on a retained era, which proves with its own era's model: the
   * retained ledger ships its own `CostModel` class and type-checks `prove()`'s
   * argument against it across the WASM boundary, so the value passed here
   * would be rejected outright.
   */
  readonly costModel?: CostModel;
}

/**
 * How each retained era turns serialized bytes into proved serialized bytes.
 *
 * A required record rather than a partial one: an era added to
 * {@link RetainedLedgerVersion} without an entry here is a build failure, so
 * the factory below cannot silently stop serving one.
 */
const RETAINED_ERA_PROVERS: Readonly<
  Record<
    RetainedLedgerVersion,
    (txBytes: Uint8Array, provingProvider: RetainedEraProvingProvider) => Promise<Uint8Array>
  >
> = {
  v8: proveV8Transaction
};

const toRetainedEraArms = (
  provingProviders: RetainedEraHandlers<RetainedEraProvingProvider>
): RetainedEraHandlers<RetainedEraProver> => {
  const arms: Partial<Record<RetainedLedgerVersion, RetainedEraProver>> = {};
  for (const era of RETAINED_LEDGER_VERSIONS) {
    const provingProvider = provingProviders[era];
    if (provingProvider !== undefined) {
      arms[era] = (txBytes) => RETAINED_ERA_PROVERS[era](txBytes, provingProvider);
    }
  }
  return arms;
};

/**
 * Assembles a {@link ProofProvider} from one {@link ProvingProvider} per ledger
 * era it serves.
 *
 * This is the route for an in-process prover that crosses the fork. Such a
 * prover needs one instance per era — the eras' proving keys are a different
 * generation, and a node rejects a transaction proved with the other era's key
 * material — and this factory is where the two are paired with the era each
 * one serves. Everything else follows from the pairing: the routing, the
 * version tagging and the `supportedEras` declaration are all derived, so no
 * caller writes them.
 *
 * @param provingProviders One proving provider per era served, and an optional
 *                         current-era cost model.
 * @returns A {@link ProofProvider} routing each request to its era's proving
 *          provider and answering in the era the request arrived in.
 *
 * @example
 * ```typescript
 * const proofProvider = createProofProviderFromProvingProviders({
 *   currentEra: currentEraProver.asProvingProvider(),
 *   retainedEras: { v8: retainedEraProver.asV8ProvingProvider() }
 * });
 * // proofProvider.supportedEras === ['v9', 'v8']
 * ```
 */
export const createProofProviderFromProvingProviders = ({
  currentEra,
  retainedEras,
  costModel = CostModel.initialCostModel()
}: EraProvingProviders): ProofProvider =>
  createProofProviderFromArms({
    currentEra: (tx) => tx.prove(currentEra, costModel),
    retainedEras: retainedEras && toRetainedEraArms(retainedEras)
  });

/**
 * Creates a {@link ProofProvider} from a {@link ProvingProvider}.
 * The returned provider proves transactions using the initial cost model.
 *
 * The returned provider serves the v9 arm only — `supportedEras` says so — and
 * that is what a single proving provider can honestly promise: it is the one
 * built for the current era. It rejects a v8 payload with
 * `V8PayloadUnsupportedError`, and an untagged one with
 * `UntaggedPayloadError`. To serve a retained era as well, pass that era's own
 * proving provider to {@link createProofProviderFromProvingProviders}, or,
 * where the proving itself is not a `ProvingProvider` call, write the arms
 * directly with {@link createProofProviderFromArms}.
 *
 * @param provingProvider - The underlying proving provider used to generate proofs.
 * @param costModel - Optional cost model to use for proof generation. Defaults to the initial cost model if not provided.
 * @returns A {@link ProofProvider} that delegates proof generation to the given proving provider.
 */
export const createProofProvider = (
  provingProvider: ProvingProvider,
  costModel: CostModel = CostModel.initialCostModel()
): ProofProvider => createProofProviderFromProvingProviders({ currentEra: provingProvider, costModel });
