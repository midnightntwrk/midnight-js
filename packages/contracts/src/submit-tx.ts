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
import { type UnprovenTransaction } from '@midnight-ntwrk/ledger-v6';
import  {
  type Contract,
  createUnbalancedTx,
  type FinalizedTxData,
  type ImpureCircuitId
} from '@midnight-ntwrk/midnight-js-types';

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
  const unprovenTx = await providers.walletProvider.balanceTx(createUnbalancedTx(options.unprovenTx), options.newCoins ?? []);
  const provenTx = await providers.proofProvider.proveTx(unprovenTx, proveTxConfig);
  const finalizedTx = await providers.walletProvider.finalizeTx(provenTx);
  const txId = await providers.midnightProvider.submitTx(finalizedTx);
  return await providers.publicDataProvider.watchForTxData(txId);
};
