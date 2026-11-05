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

import { loadLedger8Protocol } from '@midnight-ntwrk/midnight-js-protocol';
import { InvalidArgumentError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { proveLedger8Transaction } from '@midnight-ntwrk/midnight-js-protocol/prove';
import type { ProvingProvider as Ledger8ProvingProvider } from '@midnight-ntwrk/midnight-js-protocol/v8';
import {
  CostModel,
  type PreBinding,
  type Proof,
  type ProvingProvider,
  type SignatureEnabled,
  Transaction
} from '@midnight-ntwrk/midnight-js-protocol/v9';
import { LEDGER_ERAS, type LedgerEra } from '@midnight-ntwrk/midnight-js-protocol/version';

import { dispatch, type Route, sealAnswer, type TransactionAnswers } from './internal/dispatch';
import { describeArgument, isObject, readEraEntries } from './internal/read-era-entries';
import type { LedgerTransaction, TransactionAnswer, UnboundTx, UnprovenTx } from './ledger-transaction';

/** A proven ledger 9 transaction, not yet bound: what `Ledger9WalletProvider.balanceTx` takes. */
export type Ledger9UnboundTransaction = Transaction<SignatureEnabled, Proof, PreBinding>;

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
   * `InvalidArgumentError` instead of ignoring it: {@link createLedger9ProofProvider},
   * {@link createProofProviderFromProvingProviders} and `dappConnectorProofProvider`.
   */
  readonly timeout?: number;
}

/**
 * Interface for a proof server running in a trusted environment.
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
  readonly supportedEras: readonly LedgerEra[];

  /**
   * Creates call proofs for an unproven transaction. The resulting transaction is unbalanced and
   * must be balanced using the {@link WalletProvider} interface.
   *
   * @param unprovenTx The unproven transaction handle.
   * @param proveTxConfig The configuration for the proof request to the proof provider. Empty in case
   *                      a deploy transaction is being proved with no user-defined timeout.
   * @returns The proven transaction handle, in the SAME era as `unprovenTx`. Read it with
   *          `proven.deserialize({ v9: Transaction })`, with `Transaction` from your own ledger copy.
   * @throws InvalidTransactionHandleError if `unprovenTx` is not an unproven handle of this package.
   * @throws ProviderEraUnsupportedError if the implementation does not serve the handle's era.
   *         {@link createLedger9ProofProvider} serves v9 only; `httpClientProofProvider` and
   *         `dappConnectorProofProvider` serve both eras.
   * @throws InvalidTransactionHandleError if the proven transaction is not a transaction object or
   *         bytes (`not-a-transaction`), or is not an Unbound transaction of the handle's era
   *         (`header-mismatch`).
   * @throws InvalidArgumentError if `proveTxConfig.timeout` is set and the implementation cannot
   *         apply it. {@link createLedger9ProofProvider}, {@link createProofProviderFromProvingProviders} and
   *         `dappConnectorProofProvider` refuse it before any proving starts;
   *         `httpClientProofProvider` honours it.
   */
  proveTx(unprovenTx: UnprovenTx, proveTxConfig?: ProveTxConfig): Promise<UnboundTx>;
}

/**
 * The per-era handlers {@link createProofProviderFromHandlers} assembles a
 * {@link ProofProvider} from: one key per ledger era, a handler for an era the
 * provider serves and `undefined` for one it does not.
 *
 * A handler receives the handle of its own era. It decodes it with its own
 * ledger copy (`tx.deserialize({ v9: Transaction })`), or passes
 * `tx.serialize()` to a prover that takes bytes. It answers with a transaction
 * object of any ledger copy, or with its bytes.
 */
export type ProofProviderHandlers = {
  readonly [E in LedgerEra]:
    | ((tx: LedgerTransaction<'Unproven', E>, config?: ProveTxConfig) => Promise<TransactionAnswer>)
    | undefined;
};

/**
 * Assembles a {@link ProofProvider} from one handler per ledger era.
 *
 * `supportedEras` is computed from the handlers given, so it cannot disagree
 * with what the provider does. Each handle is routed to the handler of its own
 * era, and the answer is sealed in that same era at the Unbound stage, so an
 * answer of another era or stage is refused.
 *
 * Every handler is called with `handlers` as `this`.
 *
 * @param handlers One entry per ledger era.
 * @returns A {@link ProofProvider} routing each handle to its era's handler.
 * @throws UnusableEraEntryError if an era entry is neither `undefined` nor a
 *         function. Raised at construction.
 * @throws InvalidArgumentError if `handlers` is not an object, has no key for
 *         a ledger era, or serves no era (every entry `undefined`). Raised at
 *         construction.
 *
 * @example
 * ```typescript
 * const proofProvider = createProofProviderFromHandlers({
 *   v8: async (tx) => proveLedger8Transaction(tx.deserialize({ v8: (await loadLedger8Protocol()).Transaction }), ledger8ProvingProvider),
 *   v9: (tx) => tx.deserialize({ v9: Transaction }).prove(provingProvider, CostModel.initialCostModel())
 * });
 * // proofProvider.supportedEras is ['v8', 'v9']
 * ```
 */
export const createProofProviderFromHandlers = (handlers: ProofProviderHandlers): ProofProvider => {
  const served = readEraEntries('proveTx', handlers, 'handler');
  const supportedEras = Object.freeze(LEDGER_ERAS.filter((era) => served[era] !== undefined));
  const route: Route<'Unproven', [ProveTxConfig?], TransactionAnswers, UnboundTx> = {
    method: 'proveTx',
    stage: 'Unproven',
    handlers: served,
    receiver: handlers,
    supportedEras,
    answer: (era, proven) => sealAnswer(era, 'Unbound', proven, 'proveTx')
  };
  return {
    supportedEras,
    proveTx: (unprovenTx, proveTxConfig) => dispatch(route, unprovenTx, [proveTxConfig])
  };
};

/**
 * One {@link ProvingProvider} per ledger era, for
 * {@link createProofProviderFromProvingProviders}: a proving provider for an
 * era the provider serves and `undefined` for one it does not.
 *
 * Register the proving provider built for the era its key names. Nothing
 * verifies that — the v9 shape is a structural superset of the v8 one, so a v9
 * proving provider under `v8` type-checks.
 *
 * @see {@link https://github.com/midnightntwrk/midnight-js/blob/main/packages/types/docs/provider-era-declarations.md | Provider era declarations}
 */
export interface ProvingProvidersByEra {
  readonly v8: Ledger8ProvingProvider | undefined;
  readonly v9: ProvingProvider | undefined;
  /**
   * Cost model for v9, defaulting to the initial cost model. v8 always proves
   * with its own initial cost model, which this cannot override.
   */
  readonly costModel?: CostModel;
}

const refuseTimeout = (config: ProveTxConfig | undefined): void => {
  if (config?.timeout !== undefined) {
    throw new InvalidArgumentError(
      'proveTxConfig.timeout is not supported by createLedger9ProofProvider or createProofProviderFromProvingProviders: ' +
        'a ProvingProvider takes no per-request configuration, so the timeout could not reach the proving call. ' +
        'Omit it, or use httpClientProofProvider, which honours it.'
    );
  }
};

/**
 * Assembles a {@link ProofProvider} from one {@link ProvingProvider} per ledger
 * era, deriving the routing and the `supportedEras` declaration from the
 * proving providers given.
 *
 * This is the route for an in-process prover that crosses the fork, which needs
 * one instance per era; the package document explains why.
 *
 * @param provingProviders One entry per ledger era, and an optional v9 cost model.
 * @returns A {@link ProofProvider} routing each handle to its era's proving provider.
 * @throws UnusableEraEntryError if an era entry is neither `undefined` nor an
 *         object with callable `check` and `prove`. Raised at construction.
 * @throws InvalidArgumentError if `provingProviders` is not an object, has no key
 *         for a ledger era, serves no era (every entry `undefined`), or `costModel`
 *         is given but is not an object. Raised at construction.
 * @throws InvalidArgumentError raised by `proveTx`, before any proving starts,
 *         if `proveTxConfig.timeout` is set (including `0`): a `ProvingProvider`
 *         takes no per-request configuration. To bound proving time, use
 *         `httpClientProofProvider`, which honours it.
 * @throws Ledger8RuntimeMissingError raised by `proveTx` if a v8 handle arrives
 *         and the v8 runtime cannot be loaded. Defined in
 *         `@midnight-ntwrk/midnight-js-protocol/errors`.
 *
 * @example
 * ```typescript
 * const proofProvider = createProofProviderFromProvingProviders({
 *   v8: prover.asV8ProvingProvider(),
 *   v9: prover.asProvingProvider()
 * });
 * // supportedEras is ['v8', 'v9']
 * ```
 *
 * @see {@link https://github.com/midnightntwrk/midnight-js/blob/main/packages/types/docs/provider-era-declarations.md | Provider era declarations}
 */
export const createProofProviderFromProvingProviders = (provingProviders: ProvingProvidersByEra): ProofProvider => {
  const { v8, v9 } = readEraEntries('proveTx', provingProviders, 'proving-provider');
  const { costModel = CostModel.initialCostModel() } = provingProviders;
  if (!isObject(costModel)) {
    throw new InvalidArgumentError(`proveTx: costModel must be a CostModel object, got ${describeArgument(costModel)}.`);
  }
  return createProofProviderFromHandlers({
    v8:
      v8 === undefined
        ? undefined
        : async (tx, config) => {
            refuseTimeout(config);
            return proveLedger8Transaction(tx.deserialize({ v8: (await loadLedger8Protocol()).Transaction }), v8);
          },
    v9:
      v9 === undefined
        ? undefined
        : (tx, config) => {
            refuseTimeout(config);
            return tx.deserialize({ v9: Transaction }).prove(v9, costModel);
          }
  });
};

/**
 * Creates a {@link ProofProvider} from a v9 {@link ProvingProvider}.
 * The returned provider proves transactions using the initial cost model.
 *
 * The returned provider serves v9 only — `supportedEras` says so — and refuses
 * a v8 handle with `ProviderEraUnsupportedError`. It also rejects any
 * `proveTxConfig.timeout`, including `0`, with `InvalidArgumentError` before
 * proving starts: a `ProvingProvider` takes no per-request configuration. To
 * bound proving time, use `httpClientProofProvider`. To serve v8 as well, pass
 * a v8 proving provider to {@link createProofProviderFromProvingProviders}, or,
 * where the proving itself is not a `ProvingProvider` call, write the handlers
 * directly with {@link createProofProviderFromHandlers}.
 *
 * @param provingProvider - The underlying proving provider used to generate proofs.
 * @param costModel - Optional cost model to use for proof generation. Defaults to the initial cost model if not provided.
 * @returns A {@link ProofProvider} that delegates proof generation to the given proving provider.
 */
export const createLedger9ProofProvider = (
  provingProvider: ProvingProvider,
  costModel: CostModel = CostModel.initialCostModel()
): ProofProvider => createProofProviderFromProvingProviders({ v8: undefined, v9: provingProvider, costModel });
