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

import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
import {
  type Transaction,
  type UnprovenTransaction,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { CURRENT_LEDGER_VERSION, type LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';
import {
  type AnyProvableCircuitId,
  assertProvidersSupportEra,
  type FinalizedTxData,
  UntaggedPayloadError,
  type VersionedFinalizedTxData,
  type VersionedUnprovenTransaction
} from '@midnight-ntwrk/midnight-js-types';
import { assertValidMidnightConfig, intentTtl } from '@midnight-ntwrk/midnight-js-utils';

import { type ContractProviders } from './contract-providers';
import { EraArtifactMismatchError, EraInvariantViolationError } from './errors';
import { readHeadEra, requireLedger9Record, requireTaggedRecord,unwrapLedger9ProviderResult } from './internal/era';
import { submitLedger8TxBytes } from './internal/ledger8-entry';

declare const __DEBUG__: boolean;

/**
 * Configuration for {@link submitTx}.
 */
export interface SubmitTxOptions<PCK extends AnyProvableCircuitId> {
  /**
   * The transaction to prove, balance, and submit, tagged with the ledger era that wrote it:
   * `{ version: 'v9', tx }` for a live v9 transaction, `{ version: 'v8', txBytes }` for the
   * serialized bytes of a v8 one.
   */
  readonly unprovenTx: VersionedUnprovenTransaction;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logTransaction(circuitId: string | string[] | undefined, tx: Transaction<any, any, any>) {
  if (!__DEBUG__) {
    return;
  }

  const debug = process.env.MN_DEBUG?.toLowerCase();
  if (debug !== 'true') {
    return;
  }

  const circuitIds = Array.isArray(circuitId) ? circuitId.join('-') : circuitId ?? 'unknown-circuit';

  try {
    console.log(`Submit tx: ${circuitIds} : ${tx}`);
    const serialized = tx.serialize();

    console.log(`Serialized tx has length ${serialized.length}`);
  } catch (error) {
    console.error('Failed to write debug transaction logs:', error instanceof Error ? error.message : String(error));
  }
}

/** @internal Configuration for the current-era submit the contracts pipelines use. */
export interface CurrentEraSubmitTxOptions<PCK extends AnyProvableCircuitId> {
  readonly unprovenTx: UnprovenTransaction;
  readonly circuitId?: PCK | PCK[];
}

/**
 * @internal Proves, balances and submits a v9 transaction, for the pipelines that resolved the
 * era before they built it. Reads no head.
 */
export async function submitCurrentEraTxAsync<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: SubmitTxProviders<C, PCK>,
  options: CurrentEraSubmitTxOptions<PCK>
): Promise<string> {
  const { circuitId } = options;
  // Before the first provider call, not after it. This flow is current-era only —
  // every payload below is tagged `'v9'` — so a provider set missing that era
  // cannot carry the transaction, and finding out at `balanceTx` would mean
  // paying for a proof first.
  assertProvidersSupportEra(CURRENT_LEDGER_VERSION, providers);
  assertValidMidnightConfig(providers.config);
  const provenTx = unwrapLedger9ProviderResult(
    await providers.proofProvider.proveTx({ version: 'v9', tx: options.unprovenTx }),
    'proveTx',
    circuitId
  );
  const toSubmit = unwrapLedger9ProviderResult(
    await providers.walletProvider.balanceTx({ version: 'v9', tx: provenTx }, intentTtl(providers.config)),
    'balanceTx',
    circuitId
  );
  if (__DEBUG__) {
    logTransaction(circuitId, toSubmit);
  }
  return providers.midnightProvider.submitTx({ version: 'v9', tx: toSubmit });
}

/** @internal {@link submitCurrentEraTxAsync}, then waits for the v9 record. */
export const submitCurrentEraTx = async <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: SubmitTxProviders<C, PCK>,
  options: CurrentEraSubmitTxOptions<PCK>
): Promise<FinalizedTxData> => {
  const txId = await submitCurrentEraTxAsync(providers, options);
  return requireLedger9Record(
    await providers.publicDataProvider.watchForTxData(txId),
    'watchForTxData',
    options.circuitId
  );
};

const describeCircuitId = (circuitId: string | string[] | undefined): string =>
  Array.isArray(circuitId) ? circuitId.join('-') : circuitId ?? 'unknown-circuit';

const submitOnHead = async <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: SubmitTxProviders<C, PCK>,
  options: SubmitTxOptions<PCK>
): Promise<{ readonly txId: string; readonly head: LedgerVersion }> => {
  assertValidMidnightConfig(providers.config);
  const { head } = await readHeadEra(providers.publicDataProvider);
  const { unprovenTx, circuitId } = options;
  if (head === 'v8' && unprovenTx.version === 'v9') {
    throw new EraArtifactMismatchError('current-era-transaction-on-pre-fork-head');
  }
  assertProvidersSupportEra(head, providers);
  switch (unprovenTx.version) {
    case 'v9':
      return { txId: await submitCurrentEraTxAsync(providers, { unprovenTx: unprovenTx.tx, circuitId }), head };
    case 'v8':
      return { txId: await submitLedger8TxBytes(providers, unprovenTx.txBytes, head, describeCircuitId(circuitId)), head };
    default: {
      const unhandled: never = unprovenTx;
      throw new UntaggedPayloadError('proveTx', unhandled);
    }
  }
};

/**
 * Proves, balances, and submits an unproven deployment or call transaction using
 * the given providers, according to the given options.
 *
 * ## Which era it runs on
 *
 * It reads the network head once and runs on the head's era. The input's `version` only says how
 * to read the input:
 *
 * | input | head | what happens |
 * |---|---|---|
 * | v9 | v9 | proved, balanced and submitted as v9 payloads |
 * | v8 | v8 | proved, balanced and submitted as v8 payloads (`txBytes`) |
 * | v8 | v9 | the bytes are read as a v9 transaction, then as v9 |
 * | v9 | v8 | refused with `EraArtifactMismatchError` before proving |
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
 * @throws EraArtifactMismatchError for a v9 transaction on a pre-fork head.
 * @throws EraInvariantViolationError if the record's era differs from the head's.
 */
export const submitTx = async <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: SubmitTxProviders<C, PCK>,
  options: SubmitTxOptions<PCK>
): Promise<VersionedFinalizedTxData> => {
  const { txId, head } = await submitOnHead(providers, options);
  const record = requireTaggedRecord(await providers.publicDataProvider.watchForTxData(txId), 'watchForTxData');
  if (record.version !== head) {
    throw new EraInvariantViolationError('watchForTxData', options.circuitId, head, record.version);
  }
  return record;
};

/**
 * Proves, balances, and submits an unproven deployment or call transaction using
 * the given providers, according to the given options. Unlike {@link submitTx},
 * this function returns immediately after submission without waiting for finalization.
 *
 * @param providers The providers used to manage the transaction lifecycle.
 * @param options Configuration.
 *
 * @returns A promise that resolves with the transaction ID immediately after submission,
 *          or rejects if an error occurs during preparation or submission.
 *          To watch for finalization, use providers.publicDataProvider.watchForTxData(txId).
 */
export const submitTxAsync = async <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: SubmitTxProviders<C, PCK>,
  options: SubmitTxOptions<PCK>
): Promise<string> => {
  const { txId } = await submitOnHead(providers, options);
  return txId;
};
