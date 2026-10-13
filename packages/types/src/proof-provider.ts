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
import { assertValidRetainedEras } from './internal/validate-retained-eras';
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
   * this computed from the handlers it was given; a provider implementing this
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
 * The per-era handlers {@link createProofProviderFromHandlers} assembles a
 * {@link ProofProvider} from.
 *
 * Writing the handlers rather than the whole interface means an implementation
 * never writes a `version` tag, never narrows a payload, and cannot answer in
 * the wrong era — the factory routes each request to its own era's arm and tags
 * the answer to match. What is left in each arm is the proving itself.
 */
export interface ProofProviderHandlers {
  /** Required: every provider serves the current era. */
  readonly currentEra: CurrentEraProver;
  /** Optional, one entry per retained era this provider serves. */
  readonly retainedEras?: RetainedEraHandlers<RetainedEraProver>;
}

/**
 * Assembles a {@link ProofProvider} from one arm per ledger era it serves.
 *
 * The `supportedEras` declaration is computed from the handlers supplied, so it
 * cannot disagree with what the provider actually does.
 *
 * @param handlers The current-era handler, and one for each retained era served.
 * @returns A {@link ProofProvider} routing each request to its era's arm and
 *          answering in the era the request arrived in.
 *
 * @example
 * ```typescript
 * const proofProvider = createProofProviderFromHandlers({
 *   currentEra: (tx) => tx.prove(provingProvider, CostModel.initialCostModel()),
 *   retainedEras: { v8: (txBytes) => proveV8Transaction(txBytes, provingProvider) }
 * });
 * // proofProvider.supportedEras === ['v9', 'v8']
 * ```
 */
export const createProofProviderFromHandlers = (handlers: ProofProviderHandlers): ProofProvider => {
  assertValidRetainedEras('proveTx', handlers.retainedEras);
  return {
    supportedEras: erasServedBy(handlers.retainedEras),

    async proveTx(
      unprovenTx: VersionedUnprovenTransaction,
      proveTxConfig?: ProveTxConfig
    ): Promise<VersionedUnboundTransaction> {
      const request = narrowToEraArm(unprovenTx, 'proveTx', handlers.retainedEras);
      if (request.era === CURRENT_LEDGER_VERSION) {
        return { version: CURRENT_LEDGER_VERSION, tx: await handlers.currentEra(request.tx, proveTxConfig) };
      }
      // Answered in the arm it arrived in: a caller narrows the response and
      // rejects the other era, so replying in the wrong one strands a submit
      // mid-flight.
      return { version: request.era, txBytes: await request.handler(request.txBytes, proveTxConfig) };
    }
  };
};

/**
 * One {@link ProvingProvider} per ledger era, for
 * {@link createProofProviderForEras}.
 */
export interface ProvingProvidersByEra {
  readonly currentEra: ProvingProvider;
  /**
   * One entry per retained era served, in that era's own `ProvingProvider`
   * shape. An entry present but `undefined` leaves the era unserved, exactly as
   * omitting it does: `supportedEras` excludes it, and a payload arriving on
   * that arm is refused with `V8PayloadUnsupportedError`.
   *
   * Register the provider built for the era the entry names. Nothing verifies
   * that — the current era's shape is a structural superset of the retained
   * era's, so the wrong one type-checks.
   *
   * @see {@link https://github.com/midnightntwrk/midnight-js/blob/main/packages/types/docs/seam-era-declarations.md | Seam era declarations}
   */
  readonly retainedEras?: RetainedEraHandlers<RetainedEraProvingProvider>;
  /**
   * Cost model for the CURRENT era, defaulting to the initial cost model. A
   * retained era always proves with its own era's initial cost model, which
   * this cannot override.
   *
   * @see {@link https://github.com/midnightntwrk/midnight-js/blob/main/packages/types/docs/seam-era-declarations.md | Seam era declarations}
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
const PROVE_BY_RETAINED_ERA: Readonly<
  Record<
    RetainedLedgerVersion,
    (txBytes: Uint8Array, provingProvider: RetainedEraProvingProvider) => Promise<Uint8Array>
  >
> = {
  v8: proveV8Transaction
};

const toRetainedEraHandlers = (
  provingProviders: RetainedEraHandlers<RetainedEraProvingProvider>
): RetainedEraHandlers<RetainedEraProver> => {
  const handlers: Partial<Record<RetainedLedgerVersion, RetainedEraProver>> = {};
  for (const era of RETAINED_LEDGER_VERSIONS) {
    const provingProvider = provingProviders[era];
    if (provingProvider !== undefined) {
      handlers[era] = (txBytes) => PROVE_BY_RETAINED_ERA[era](txBytes, provingProvider);
    }
  }
  return handlers;
};

/**
 * Assembles a {@link ProofProvider} from one {@link ProvingProvider} per ledger
 * era it serves, deriving the routing, the version tagging and the
 * `supportedEras` declaration from the providers supplied.
 *
 * This is the route for an in-process prover that crosses the fork, which needs
 * one instance per era; the package document explains why.
 *
 * {@link ProveTxConfig} is not forwarded on either arm: a `ProvingProvider`
 * takes no per-request configuration, so a `timeout` passed to `proveTx` does
 * not reach the proving call. A provider that honours it is
 * `httpClientProofProvider`.
 *
 * @param provingProviders One proving provider per era served, and an optional
 *                         current-era cost model.
 * @returns A {@link ProofProvider} routing each request to its era's proving
 *          provider and answering in the era the request arrived in.
 * @throws V8PayloadUnsupportedError if a payload arrives on a retained arm no
 *         provider was registered for.
 * @throws UntaggedPayloadError if `version` is missing or unrecognised.
 * @throws PayloadNotATransactionError if a retained arm's `txBytes` is not a
 *         serialized transaction.
 * @throws Ledger8RuntimeMissingError if a retained arm is reached and that
 *         era's runtime cannot be loaded. Both are defined in
 *         `@midnight-ntwrk/midnight-js-protocol/errors`.
 *
 * @example
 * ```typescript
 * const proofProvider = createProofProviderForEras({
 *   currentEra: currentEraProver.asProvingProvider(),
 *   retainedEras: { v8: retainedEraProver.asV8ProvingProvider() }
 * });
 * // supportedEras is ['v9', 'v8']
 * ```
 *
 * @see {@link https://github.com/midnightntwrk/midnight-js/blob/main/packages/types/docs/seam-era-declarations.md | Seam era declarations}
 */
export const createProofProviderForEras = ({
  currentEra,
  retainedEras,
  costModel = CostModel.initialCostModel()
}: ProvingProvidersByEra): ProofProvider => {
  assertValidRetainedEras(
    'proveTx',
    retainedEras,
    (entry): boolean =>
      typeof entry === 'object' &&
      entry !== null &&
      'check' in entry &&
      typeof entry.check === 'function' &&
      'prove' in entry &&
      typeof entry.prove === 'function',
    "expected an object with callable 'check' and 'prove' methods"
  );
  return createProofProviderFromHandlers({
    currentEra: (tx) => tx.prove(currentEra, costModel),
    retainedEras: retainedEras && toRetainedEraHandlers(retainedEras)
  });
};

/**
 * Creates a {@link ProofProvider} from a {@link ProvingProvider}.
 * The returned provider proves transactions using the initial cost model.
 *
 * The returned provider serves the v9 arm only — `supportedEras` says so — and
 * that is permanent rather than a gap: it lifts a single current-era
 * `ProvingProvider`. It rejects a v8 payload with `V8PayloadUnsupportedError`,
 * and an untagged one with `UntaggedPayloadError`. To serve a retained era as
 * well, pass that era's own proving provider to
 * {@link createProofProviderForEras}, or, where the proving itself is not a
 * `ProvingProvider` call, write the handlers directly with
 * {@link createProofProviderFromHandlers}.
 *
 * @param provingProvider - The underlying proving provider used to generate proofs.
 * @param costModel - Optional cost model to use for proof generation. Defaults to the initial cost model if not provided.
 * @returns A {@link ProofProvider} that delegates proof generation to the given proving provider.
 */
export const createProofProvider = (
  provingProvider: ProvingProvider,
  costModel: CostModel = CostModel.initialCostModel()
): ProofProvider => createProofProviderForEras({ currentEra: provingProvider, costModel });
