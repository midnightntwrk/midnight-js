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

import type { Contract } from '@midnight-ntwrk/compact-js/effect/Contract';
import {
  type Transaction,
  type UnprovenTransaction,
} from '@midnight-ntwrk/ledger-v8';
import {
  type AnyProvableCircuitId,
  type FinalizedTxData,
} from '@midnight-ntwrk/midnight-js-types';
import fs from 'fs';
import path from 'path';

import { type ContractProviders } from './contract-providers';

declare const __DEBUG__: boolean;

/**
 * Configuration for {@link submitTx}.
 */
export type SubmitTxOptions<PCK extends AnyProvableCircuitId> = {
  /**
   * The transaction to prove, balance, and submit.
   */
  readonly unprovenTx: UnprovenTransaction;
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
    const logsDir = path.join(process.cwd(), 'logs', 'transactions');

    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const filename = `tx-${Date.now()}-${circuitIds}`;
    const filepath = path.join(logsDir, filename + '.bin');
    const filepathString = path.join(logsDir, filename + '.txt');

    fs.writeFileSync(filepath, serialized);
    fs.writeFileSync(filepathString, tx.toString());

    console.log(`Transaction serialized and written to: ${filepath}`);
  } catch (error) {
    console.error('Failed to write debug transaction logs:', error instanceof Error ? error.message : String(error));
  }
}

async function submitTxCore<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: SubmitTxProviders<C, PCK>,
  options: SubmitTxOptions<PCK>
): Promise<string> {
  const provenTx = await providers.proofProvider.proveTx(options.unprovenTx);
  const toSubmit = await providers.walletProvider.balanceTx(provenTx);
  if (__DEBUG__) {
    logTransaction(options.circuitId, toSubmit);
  }
  return providers.midnightProvider.submitTx(toSubmit);
}

/**
 * Proves, balances, and submits an unproven deployment or call transaction using
 * the given providers, according to the given options.
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
 * @returns A promise that resolves with the finalized transaction data for the invocation,
 *          or rejects if an error occurs along the way.
 */
export const submitTx = async <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: SubmitTxProviders<C, PCK>,
  options: SubmitTxOptions<PCK>
): Promise<FinalizedTxData> => {
  const txId = await submitTxCore(providers, options);
  return providers.publicDataProvider.watchForTxData(txId);
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
  return submitTxCore(providers, options);
};
