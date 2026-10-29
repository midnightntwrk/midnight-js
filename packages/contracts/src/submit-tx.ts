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

import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js/effect/Contract';
import { type LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';
import {
  type AnyProvableCircuitId,
  assertProvidersSupportEra,
  type FinalizedTxData,
  type FinalizedTxRead,
  LedgerTransaction,
  TransactionEraMismatchError,
  type UnprovenTx} from '@midnight-ntwrk/midnight-js-types';
import { assertValidMidnightConfig } from '@midnight-ntwrk/midnight-js-utils';

import { type ContractProviders } from './contract-providers';
import { EraArtifactMismatchError, type EraArtifactMismatchReason, EraInvariantViolationError } from './errors';
import { readHeadEra, requireLedger9Record, requireTaggedRecord } from './internal/era';
import { proveBalanceSubmit } from './internal/submit-payload';

/**
 * Configuration for {@link submitTx}.
 */
export interface SubmitTxOptions<PCK extends AnyProvableCircuitId> {
  /**
   * The transaction to prove, balance, and submit. The handle carries the ledger era that wrote
   * it; make one with `LedgerTransaction.seal`.
   */
  readonly unprovenTx: UnprovenTx;
  /**
   * A circuit identifier to use to fetch the ZK artifacts needed to prove the
   * transaction. Only defined if a call transaction is being submitted.
   *
   * @remarks
   * Where a transaction involves multiple circuits (e.g., when circuit calls are scoped to a transaction
   * context), this may be an array of circuit IDs.
   */
  readonly circuitId?: PCK | PCK[];
}

/**
 * Providers required to submit an unproven deployment transaction. Since {@link submitTx} doesn't
 * manipulate private state, the private state provider can be omitted.
 */
export type SubmitTxProviders<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>> = Omit<
  ContractProviders<C, PCK>,
  'privateStateProvider'
>;

/** @internal Configuration for {@link submitLedger9PayloadAsync}. */
export interface Ledger9PayloadSubmitOptions<PCK extends AnyProvableCircuitId> {
  readonly unprovenTx: UnprovenTx;
  readonly circuitId?: PCK | PCK[];
}

/**
 * @internal Proves, balances and submits a v9 transaction handle, for the pipelines that built a
 * v9 transaction. Reads no head.
 *
 * @throws InvalidTransactionHandleError if `unprovenTx` is not an unproven handle of this package.
 * @throws TransactionEraMismatchError if the handle is not a v9 one.
 */
export const submitLedger9PayloadAsync = async <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: SubmitTxProviders<C, PCK>,
  options: Ledger9PayloadSubmitOptions<PCK>
): Promise<string> => {
  const unprovenTx = LedgerTransaction.require(options.unprovenTx, 'Unproven', 'submitTx');
  if (unprovenTx.era !== 'v9') {
    throw new TransactionEraMismatchError('v9', unprovenTx.era);
  }
  // Before the first provider call: a provider set that cannot carry a v9 transaction has to be
  // refused before a proof is paid for, not at `balanceTx`.
  assertProvidersSupportEra('v9', providers);
  assertValidMidnightConfig(providers.config);
  return proveBalanceSubmit(providers, unprovenTx, options.circuitId);
};

/** @internal {@link submitLedger9PayloadAsync}, then waits for the v9 record. */
export const submitLedger9Payload = async <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: SubmitTxProviders<C, PCK>,
  options: Ledger9PayloadSubmitOptions<PCK>
): Promise<FinalizedTxData> => {
  const txId = await submitLedger9PayloadAsync(providers, options);
  return requireLedger9Record(
    await providers.publicDataProvider.watchForTxData(txId),
    'watchForTxData',
    options.circuitId
  );
};

const transactionEra = (unprovenTx: UnprovenTx): LedgerVersion =>
  LedgerTransaction.require(unprovenTx, 'Unproven', 'submitTx').era;

const ERA_MISMATCH_REASON: Readonly<Record<LedgerVersion, EraArtifactMismatchReason>> = {
  v8: 'ledger8-transaction-on-ledger9-network',
  v9: 'ledger9-transaction-on-ledger8-network'
};

const submitOnHead = async <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: SubmitTxProviders<C, PCK>,
  options: SubmitTxOptions<PCK>
): Promise<{ readonly txId: string; readonly head: LedgerVersion }> => {
  const { unprovenTx, circuitId } = options;
  const era = transactionEra(unprovenTx);
  assertValidMidnightConfig(providers.config);
  assertProvidersSupportEra(era, providers);
  const { head } = await readHeadEra(providers.publicDataProvider);
  if (era !== head) {
    throw new EraArtifactMismatchError(ERA_MISMATCH_REASON[era]);
  }
  const txId = await proveBalanceSubmit(providers, unprovenTx, circuitId);
  return { txId, head };
};

/**
 * Proves, balances, and submits an unproven deployment or call transaction using
 * the given providers, according to the given options.
 *
 * ## Which era it runs on
 *
 * It reads the network's ledger version once and runs on that era. The handle's `era` must match it:
 *
 * | input | network | what happens |
 * |---|---|---|
 * | v9 | v9 | proved, balanced and submitted as v9 handles |
 * | v8 | v8 | proved, balanced and submitted as v8 handles |
 * | v8 | v9 | refused with `EraArtifactMismatchError` before proving: the v9 ledger cannot read a v8 transaction |
 * | v9 | v8 | refused with `EraArtifactMismatchError` before proving |
 *
 * The head is read before proving, not again. If the network crosses the hard fork while the
 * transaction is being proved, the node refuses it and the refusal arrives as
 * `ProviderFailedError` from `submitTx`, not as a fork diagnosis. Read the head again and rebuild
 * the transaction for the new era.
 *
 * ## Blocking Behavior
 *
 * This method **waits indefinitely** for the transaction to appear on the blockchain via
 * `providers.publicDataProvider.watchForTxData(txId)`. It will not return until:
 * - The transaction is successfully included in the blockchain, OR
 * - An error occurs during proving, balancing, or submission
 *
 * ## Conditions When Transaction May Not Appear
 *
 * A submitted transaction may fail to appear on-chain if:
 * - Transaction is invalid in ways not detected during local validation
 * - Network issues prevent propagation to validators
 * - Transaction is rejected by validator consensus
 * - Insufficient fees or resources
 * - Contract state has changed making the transaction invalid
 *
 * ## Implications of Aborting This Method
 *
 * If the application terminates this method before it returns:
 * - Transaction may still be pending/processing on-chain
 * - **Private state updates are NOT stored** (even if transaction later succeeds on-chain)
 * - **Signing keys are NOT updated** (for deploy/replace authority transactions)
 * - Application state will be out of sync with blockchain state
 * - Manual recovery may be required to reconcile state
 *
 * **Recommendation**: Use {@link submitTxAsync} for non-blocking submission with manual
 * finalization handling and timeout control.
 *
 * @param providers The providers used to manage the transaction lifecycle.
 * @param options Configuration.
 *
 * @returns A promise that resolves with the finalized transaction data, tagged with the era of
 *          the head it ran on, or rejects if an error occurs along the way.
 * @throws InvalidTransactionHandleError if `unprovenTx` is not an unproven handle of this package,
 *         before the head is read.
 * @throws EraArtifactMismatchError for a transaction whose era is not the head's.
 * @throws ProviderFailedError if a provider rejects, with its failure sanitized onto `cause`.
 * @throws EraInvariantViolationError if a provider answers in the other era, or the record's era
 *         differs from the head's. In the record's case the
 *         transaction is already on chain; its id is on `txId`.
 */
export const submitTx = async <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: SubmitTxProviders<C, PCK>,
  options: SubmitTxOptions<PCK>
): Promise<FinalizedTxRead> => {
  const { txId, head } = await submitOnHead(providers, options);
  const record = requireTaggedRecord(
    await providers.publicDataProvider.watchForTxData(txId),
    'watchForTxData',
    options.circuitId
  );
  if (record.era !== head) {
    throw new EraInvariantViolationError('watchForTxData', options.circuitId, head, record.era, undefined, txId);
  }
  return record;
};

/**
 * Proves, balances, and submits an unproven deployment or call transaction using
 * the given providers, according to the given options. Unlike {@link submitTx},
 * this function returns immediately after submission without waiting for finalization.
 * It reads the head and routes on it exactly as {@link submitTx} does.
 *
 * @param providers The providers used to manage the transaction lifecycle.
 * @param options Configuration.
 *
 * @returns A promise that resolves with the transaction ID immediately after submission,
 *          or rejects if an error occurs during preparation or submission.
 *          To watch for finalization, use providers.publicDataProvider.watchForTxData(txId).
 * @throws InvalidTransactionHandleError if `unprovenTx` is not an unproven handle of this package,
 *         before the head is read.
 * @throws EraArtifactMismatchError for a transaction whose era is not the head's.
 * @throws ProviderFailedError if a provider rejects, with its failure sanitized onto `cause`.
 */
export const submitTxAsync = async <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: SubmitTxProviders<C, PCK>,
  options: SubmitTxOptions<PCK>
): Promise<string> => {
  const { txId } = await submitOnHead(providers, options);
  return txId;
};
