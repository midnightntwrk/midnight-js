/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
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

import type { ShieldedCoinInfo } from '@midnight-ntwrk/compact-runtime';
import {
  type FinalizedTransaction,
  type Transaction,
  type UnprovenTransaction,
} from '@midnight-ntwrk/ledger-v6';
import {
  BALANCE_TRANSACTION_TO_PROVE,
  type BalancedProvingRecipe,
  type BalanceTransactionToProve,
  type Contract,
  type FinalizedTxData,
  type ImpureCircuitId,
  NOTHING_TO_PROVE,
  type NothingToProve,
  type ProvenTransaction,
  TRANSACTION_TO_PROVE,
  type ZKConfig
} from '@midnight-ntwrk/midnight-js-types';
import fs from 'fs';
import path from 'path';

import { type ContractProviders } from './contract-providers';

/**
 * Configuration for {@link submitTx}.
 */
export type SubmitTxOptions<ICK extends ImpureCircuitId> = {
  /**
   * The transaction to prove, balance, and submit.
   */
  readonly unprovenTx: UnprovenTransaction;
  /**
   * Any new coins created during the construction of the transaction. Only defined
   * if the transaction being submitted is a call or deploy transaction.
   */
  readonly newCoins?: ShieldedCoinInfo[];
  /**
   * A circuit identifier to use to fetch the ZK artifacts needed to prove the
   * transaction. Only defined if a call transaction is being submitted.
   */
  readonly circuitId?: ICK;
}

/**
 * Providers required to submit an unproven deployment transaction. Since {@link submitTx} doesn't
 * manipulate private state, the private state provider can be omitted.
 */
export type SubmitTxProviders<C extends Contract, ICK extends ImpureCircuitId<C>> = Omit<
  ContractProviders<C, ICK>,
  'privateStateProvider'
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logAndCheckTransaction(circuitId: string | undefined, tx: Transaction<any, any, any>) {
  if (process.env.MN_DEBUG) {
    console.log(`Submit tx: ${circuitId} : ${tx}`);
    const serialized = tx.serialize();
    const logsDir = path.join(process.cwd(), 'logs', 'transactions');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const filename = `tx-${Date.now()}-${circuitId}`;
    const filepath = path.join(logsDir, filename + '.bin');
    const filepathString = path.join(logsDir, filename + '.txt');
    fs.writeFileSync(filepath, serialized);
    fs.writeFileSync(filepathString, tx.toString());
    console.log(`Transaction serialized and written to: ${filepath}`);
  }
}

async function proveTransaction<C extends Contract, ICK extends ImpureCircuitId<C>>(recipe: BalancedProvingRecipe, providers: SubmitTxProviders<C, ICK>, proveTxConfig: {
  zkConfig: ZKConfig<ICK>
} | undefined) {
  let toSubmit: ProvenTransaction;
  switch (recipe.type) {
    case TRANSACTION_TO_PROVE: {
      toSubmit = await providers.proofProvider.proveTx(recipe.transaction, proveTxConfig);
      break;
    }

    case BALANCE_TRANSACTION_TO_PROVE: {
      const recipeBalance = recipe as BalanceTransactionToProve<UnprovenTransaction>;
      const merged = recipeBalance.transactionToBalance.merge(recipeBalance.transactionToProve);
      toSubmit = await providers.proofProvider.proveTx(merged, proveTxConfig);
      break;
    }

    case NOTHING_TO_PROVE: {
      // unsafe cast, but it looks like these types are not proper
      toSubmit = (recipe as NothingToProve<FinalizedTransaction>).transaction as unknown as ProvenTransaction;
      break;
    }

    default:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      throw new Error(`Unknown recipe type: ${(recipe as any).type}`);
  }
  return toSubmit;
}

/**
 * Proves, balances, and submits an unproven deployment or call transaction using
 * the given providers, according to the given options.
 *
 * @param providers The providers used to manage the transaction lifecycle.
 * @param options Configuration.
 *
 * @returns A promise that resolves with the finalized transaction data for the invocation,
 *          or rejects if an error occurs along the way.
 */
export const submitTx = async <C extends Contract, ICK extends ImpureCircuitId<C>>(
  providers: SubmitTxProviders<C, ICK>,
  options: SubmitTxOptions<ICK>
): Promise<FinalizedTxData> => {
  const proveTxConfig = options.circuitId
    ? { zkConfig: await providers.zkConfigProvider.get(options.circuitId) }
    : undefined;
  const recipe = await providers.walletProvider.balanceTx(options.unprovenTx, options.newCoins);
  const toSubmit = await proveTransaction(recipe, providers, proveTxConfig);
  const bound = toSubmit.bind();
  logAndCheckTransaction(options.circuitId, bound);
  const txId = await providers.midnightProvider.submitTx(bound);
  return await providers.publicDataProvider.watchForTxData(txId);
};
