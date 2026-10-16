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

import { InvalidArgumentError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import {
  CostModel,
  type PreBinding,
  type Proof,
  type ProvingProvider,
  type SignatureEnabled,
  type Transaction,
  type UnprovenTransaction
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { proveLedger8Transaction } from '@midnight-ntwrk/midnight-js-protocol/prove';
import type { ProvingProvider as RetainedEraProvingProvider } from '@midnight-ntwrk/midnight-js-protocol/v8';
import {
  CURRENT_LEDGER_VERSION,
  type LedgerVersion,
  RETAINED_LEDGER_VERSIONS,
  type RetainedLedgerVersion
} from '@midnight-ntwrk/midnight-js-protocol/version';

import { erasServedBy, narrowToEra, type RetainedEraEntries } from './era-entries';
import { describeArgument, isObject, readEraEntries } from './internal/read-era-entries';
import type { VersionedTransaction } from './versioned';

export type UnboundTransaction = Transaction<SignatureEnabled, Proof, PreBinding>;

/**
 * An unproven transaction on its way to a {@link ProofProvider}: either the
 * live v9 ledger object, or the serialized bytes of a v8-era transaction.
 */
export type VersionedUnprovenTransaction = VersionedTransaction<UnprovenTransaction>;

/**
 * A proven-but-unbalanced transaction coming back from a {@link ProofProvider}:
 * either the live v9 ledger object, or the serialized bytes of a v8-era
 * transaction.
 */
export type VersionedUnboundTransaction = VersionedTransaction<UnboundTransaction>;

/**
 * The configuration for the proof request to the proof provider.
 */
export interface ProveTxConfig {
  /**
   * The timeout for the request, in milliseconds. This is a per-request timeout for the underlying
   * proof server call, not a hard wall-clock ceiling for the whole `proveTx` call — the proof
   * provider's internal retry/backoff means a `proveTx` call may take longer than this value when
   * retries occur. See https://github.com/midnightntwrk/midnight-js/issues/974.
   *
   * Honoured by `httpClientProofProvider`. Providers that cannot apply it reject `proveTx` with
   * `InvalidArgumentError` instead of ignoring it: {@link createProofProvider},
   * {@link createProofProviderFromProvingProviders} and `dappConnectorProofProvider`.
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
   * Read before an operation starts, by `assertProvidersSupportEra`, so a set of
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
   * @returns The proven transaction, version-tagged, and always in the SAME era the request
   *          carried. Narrow on `version` — or call `unwrapLedger9` — before reading the payload.
   * @throws Ledger8PayloadUnsupportedError if the implementation does not handle v8 payloads. Which
   *         implementations do is worth knowing before you send one: `httpClientProofProvider`
   *         and `dappConnectorProofProvider` both serve it, taking and returning serialized
   *         bytes. {@link createProofProvider} does NOT — it adapts a v9-only `ProvingProvider`,
   *         so it refuses a v8 payload on the way in, which is the honest answer for what it wraps.
   * @throws PayloadNotATransactionError if a v8 payload's `txBytes` is not a serialized transaction.
   *         Raised by the providers that serve v8 and defined in
   *         `@midnight-ntwrk/midnight-js-protocol/errors` (not a runtime dependency of this
   *         package, so it is named here rather than imported); match it with `hasErrorCode`
   *         against `PROTOCOL_ERROR_CODES.PAYLOAD_NOT_A_TRANSACTION`.
   * @throws UntaggedPayloadError if `version` is missing or unrecognised.
   * @throws InvalidArgumentError if `proveTxConfig.timeout` is set and the implementation cannot
   *         apply it. {@link createProofProvider}, {@link createProofProviderFromProvingProviders} and
   *         `dappConnectorProofProvider` refuse it before any proving starts;
   *         `httpClientProofProvider` honours it.
   */
  proveTx(
    unprovenTx: VersionedUnprovenTransaction,
    proveTxConfig?: ProveTxConfig
  ): Promise<VersionedUnboundTransaction>;
}

/**
 * Proves a ledger 9 transaction, which is passed to `proveTx` as a live ledger
 * object because both sides share the ledger 9 WASM instance. It fills the
 * `currentEra` slot while ledger 9 is the current era.
 */
export type Ledger9Prover = (tx: UnprovenTransaction, config?: ProveTxConfig) => Promise<UnboundTransaction>;

/**
 * Proves a RETAINED-era transaction (an era in `RetainedLedgerVersion`; today
 * ledger 8), which is passed to `proveTx` as serialized
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
 * the wrong era — the factory routes each request to its own era's handler and tags
 * the answer to match. What is left in each handler is the proving itself.
 */
export interface ProofProviderHandlers {
  /** Required: every provider serves the current era. */
  readonly currentEra: Ledger9Prover;
  /** Optional, one entry per retained era this provider serves. */
  readonly retainedEras?: RetainedEraEntries<RetainedEraProver>;
}

/**
 * Assembles a {@link ProofProvider} from one handler per ledger era it serves.
 *
 * The `supportedEras` declaration is computed from the handlers supplied, so it
 * cannot disagree with what the provider actually does.
 *
 * `currentEra` is called with `handlers` as `this`; a retained-era handler is
 * called with no `this`.
 *
 * @param handlers The current-era handler, and one for each retained era served.
 * @returns A {@link ProofProvider} routing each request to its era's handler and
 *          answering in the era the request arrived in.
 * @throws UnusableEraEntryError if `currentEra`, or a `retainedEras` entry other
 *         than `undefined`, is not a function. Raised at construction.
 * @throws InvalidArgumentError if `handlers` is not an object, or `retainedEras`
 *         is not a plain object keyed only by retained eras. Raised at construction.
 *
 * @example
 * ```typescript
 * const proofProvider = createProofProviderFromHandlers({
 *   currentEra: (tx) => tx.prove(provingProvider, CostModel.initialCostModel()),
 *   retainedEras: { v8: (txBytes) => proveLedger8Transaction(txBytes, provingProvider) }
 * });
 * // proofProvider.supportedEras === ['v9', 'v8']
 * ```
 */
export const createProofProviderFromHandlers = (handlers: ProofProviderHandlers): ProofProvider => {
  const { currentEra, retainedEras } = readEraEntries('proveTx', handlers, 'handler');
  return {
    supportedEras: erasServedBy(retainedEras),

    async proveTx(
      unprovenTx: VersionedUnprovenTransaction,
      proveTxConfig?: ProveTxConfig
    ): Promise<VersionedUnboundTransaction> {
      const request = narrowToEra(unprovenTx, 'proveTx', retainedEras);
      if (request.era === CURRENT_LEDGER_VERSION) {
        return { version: CURRENT_LEDGER_VERSION, tx: await Reflect.apply(currentEra, handlers, [request.tx, proveTxConfig]) };
      }
      // Answered in the era it arrived in: a caller narrows the response and
      // rejects the other era, so replying in the wrong one strands a submit
      // mid-flight.
      return { version: request.era, txBytes: await Reflect.apply(request.handler, undefined, [request.txBytes, proveTxConfig]) };
    }
  };
};

/**
 * One {@link ProvingProvider} per ledger era, for
 * {@link createProofProviderFromProvingProviders}.
 */
export interface ProvingProvidersByEra {
  readonly currentEra: ProvingProvider;
  /**
   * One entry per retained era served, in that era's own `ProvingProvider`
   * shape. An entry present but `undefined` leaves the era unserved, exactly as
   * omitting it does: `supportedEras` excludes it, and a payload arriving on
   * that era is refused with `Ledger8PayloadUnsupportedError`.
   *
   * Register the provider built for the era the entry names. Nothing verifies
   * that — the current era's shape is a structural superset of the retained
   * era's, so the wrong one type-checks.
   *
   * @see {@link https://github.com/midnightntwrk/midnight-js/blob/main/packages/types/docs/provider-era-declarations.md | Provider era declarations}
   */
  readonly retainedEras?: RetainedEraEntries<RetainedEraProvingProvider>;
  /**
   * Cost model for the CURRENT era, defaulting to the initial cost model. A
   * retained era always proves with its own era's initial cost model, which
   * this cannot override.
   *
   * @see {@link https://github.com/midnightntwrk/midnight-js/blob/main/packages/types/docs/provider-era-declarations.md | Provider era declarations}
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
  v8: proveLedger8Transaction
};

const refuseTimeout = (config: ProveTxConfig | undefined): void => {
  if (config?.timeout !== undefined) {
    throw new InvalidArgumentError(
      'proveTxConfig.timeout is not supported by createProofProvider or createProofProviderFromProvingProviders: ' +
        'a ProvingProvider takes no per-request configuration, so the timeout could not reach the proving call. ' +
        'Omit it, or use httpClientProofProvider, which honours it.'
    );
  }
};

const toRetainedEraHandlers = (
  provingProviders: RetainedEraEntries<RetainedEraProvingProvider>
): RetainedEraEntries<RetainedEraProver> => {
  const handlers: Partial<Record<RetainedLedgerVersion, RetainedEraProver>> = {};
  for (const era of RETAINED_LEDGER_VERSIONS) {
    const provingProvider = provingProviders[era];
    if (provingProvider !== undefined) {
      handlers[era] = (txBytes, config) => {
        refuseTimeout(config);
        return PROVE_BY_RETAINED_ERA[era](txBytes, provingProvider);
      };
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
 * @param provingProviders One proving provider per era served, and an optional
 *                         current-era cost model.
 * @returns A {@link ProofProvider} routing each request to its era's proving
 *          provider and answering in the era the request arrived in.
 * @throws UnusableEraEntryError if `currentEra`, or a `retainedEras` entry other
 *         than `undefined`, is not an object with callable `check` and `prove`.
 *         Raised at construction.
 * @throws InvalidArgumentError if `provingProviders` is not an object,
 *         `retainedEras` is not a plain object keyed only by retained eras, or
 *         `costModel` is given but is not an object. Raised at construction.
 * @throws InvalidArgumentError raised by `proveTx`, before any proving starts,
 *         if `proveTxConfig.timeout` is set (including `0`): a `ProvingProvider`
 *         takes no per-request configuration. To bound proving time, use
 *         `httpClientProofProvider`, which honours it.
 * @throws Ledger8PayloadUnsupportedError raised by `proveTx` if a payload arrives on
 *         a retained era no provider was registered for.
 * @throws UntaggedPayloadError raised by `proveTx` if `version` is missing or
 *         unrecognised.
 * @throws PayloadNotATransactionError raised by `proveTx` if a retained payload's
 *         `txBytes` is not a serialized transaction.
 * @throws Ledger8RuntimeMissingError raised by `proveTx` if a retained era is
 *         reached and that era's runtime cannot be loaded.
 *
 * `InvalidArgumentError`, `PayloadNotATransactionError` and
 * `Ledger8RuntimeMissingError` are defined in
 * `@midnight-ntwrk/midnight-js-protocol/errors`.
 *
 * @example
 * ```typescript
 * const proofProvider = createProofProviderFromProvingProviders({
 *   currentEra: currentEraProver.asProvingProvider(),
 *   retainedEras: { v8: retainedEraProver.asV8ProvingProvider() }
 * });
 * // supportedEras is ['v9', 'v8']
 * ```
 *
 * @see {@link https://github.com/midnightntwrk/midnight-js/blob/main/packages/types/docs/provider-era-declarations.md | Provider era declarations}
 */
export const createProofProviderFromProvingProviders = (provingProviders: ProvingProvidersByEra): ProofProvider => {
  const { currentEra, retainedEras } = readEraEntries('proveTx', provingProviders, 'proving-provider');
  const { costModel = CostModel.initialCostModel() } = provingProviders;
  if (!isObject(costModel)) {
    throw new InvalidArgumentError(`proveTx: costModel must be a CostModel object, got ${describeArgument(costModel)}.`);
  }
  return createProofProviderFromHandlers({
    currentEra: (tx, config) => {
      refuseTimeout(config);
      return tx.prove(currentEra, costModel);
    },
    retainedEras: toRetainedEraHandlers(retainedEras)
  });
};

/**
 * Creates a {@link ProofProvider} from a {@link ProvingProvider}.
 * The returned provider proves transactions using the initial cost model.
 *
 * The returned provider serves v9 payloads only — `supportedEras` says so — and
 * that is permanent rather than a gap: it lifts a single current-era
 * `ProvingProvider`. It rejects a v8 payload with `Ledger8PayloadUnsupportedError`,
 * and an untagged one with `UntaggedPayloadError`. It also rejects any
 * `proveTxConfig.timeout`, including `0`, with `InvalidArgumentError` before
 * proving starts: a `ProvingProvider` takes no per-request configuration. To
 * bound proving time, use `httpClientProofProvider`. To serve a retained era as
 * well, pass that era's own proving provider to
 * {@link createProofProviderFromProvingProviders}, or, where the proving itself is not a
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
): ProofProvider => createProofProviderFromProvingProviders({ currentEra: provingProvider, costModel });
