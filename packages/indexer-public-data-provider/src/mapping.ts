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

import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { FinalizedTxData } from '@midnight-ntwrk/midnight-js-types';

import {
  correlateDeployTxId,
  parseHexTransaction,
  toSegmentStatusMap,
  toTxStatus,
  toUnshieldedUtxos
} from './codec';
import { IndexerInvariantError } from './errors';
import type { DeployTxQueryQuery } from './gen/graphql';
import type { ContractBalance, RegularTransaction } from './gen/schema-types';

type IsEmptyObject<T> = keyof T extends never ? true : false;
export type ExcludeEmptyAndNull<T> = T extends null ? never : IsEmptyObject<T> extends true ? never : T;

export const hasContractAction = <T extends { contractAction?: unknown }>(
  data: T
): data is T & { contractAction: NonNullable<T['contractAction']> } =>
  data.contractAction != null;

export const hasContract = <T extends { contract?: unknown }>(
  data: T
): data is T & { contract: NonNullable<T['contract']> } =>
  data.contract != null;

/**
 * Structural shape of a `contractAction` payload (or `contractActions` on the
 * subscription variant) that carries unshielded balances. `ContractDeploy` /
 * `ContractUpdate` expose them directly; `ContractCall` reaches them via
 * `deploy.unshieldedBalances`.
 */
export type UnshieldedBalanceContractAction =
  | { readonly deploy: { readonly unshieldedBalances: readonly ContractBalance[] } }
  | { readonly unshieldedBalances: readonly ContractBalance[] };

/**
 * Returns the `ContractBalance[]` carried by a contract action regardless of
 * which variant produced it. Throws {@link IndexerInvariantError} when the
 * payload has neither shape — surfaces indexer schema drift loudly rather
 * than silently degrading to `[]`. `callerName` is embedded in the error
 * message so the throw site is preserved in diagnostics.
 */
export const extractUnshieldedBalances = (
  action: UnshieldedBalanceContractAction,
  callerName: string
): readonly ContractBalance[] => {
  if ('unshieldedBalances' in action) return action.unshieldedBalances;
  if ('deploy' in action) return action.deploy.unshieldedBalances;
  throw new IndexerInvariantError(
    `${callerName}: contractAction has neither unshieldedBalances nor deploy field`
  );
};

export const isRegularTransaction = (
  tx: unknown
): tx is RegularTransaction & { hash: string; identifiers: string[] } => {
  if (typeof tx !== 'object' || tx === null) return false;
  if (!('identifiers' in tx) || !('hash' in tx)) return false;
  return Array.isArray((tx as { identifiers: unknown }).identifiers);
};

/**
 * Walks a `DeployTxQueryQuery.contractAction` payload to the underlying
 * transaction and returns it iff it is a regular (non-system) transaction.
 * Returns `null` for two distinct cases:
 * 1. `contractAction === null` — indexer hasn't produced data yet; callers
 *    use this as the "keep polling" signal.
 * 2. The contract action carries a non-regular (system) transaction shape.
 *
 * `ContractCall` reaches the transaction via `deploy.transaction`;
 * `ContractDeploy` / `ContractUpdate` expose it directly as `transaction`.
 */
export const extractRegularDeployTransaction = (
  contractAction: DeployTxQueryQuery['contractAction']
): (RegularTransaction & { hash: string; identifiers: string[] }) | null => {
  if (contractAction === null) return null;
  const contract = contractAction as ExcludeEmptyAndNull<DeployTxQueryQuery['contractAction']>;
  const transaction = 'deploy' in contract ? contract.deploy.transaction : contract.transaction;
  return isRegularTransaction(transaction) ? transaction : null;
};

export const toFinalizedDeployTxData = (
  contractAddress: ContractAddress,
  transaction: RegularTransaction
): FinalizedTxData => ({
  tx: parseHexTransaction(transaction.raw),
  status: toTxStatus(transaction.transactionResult),
  txId: correlateDeployTxId(contractAddress, transaction.contractActions, transaction.identifiers),
  identifiers: transaction.identifiers,
  txHash: transaction.hash,
  blockHeight: transaction.block.height,
  blockHash: transaction.block.hash,
  blockTimestamp: transaction.block.timestamp,
  blockAuthor: transaction.block.author,
  segmentStatusMap: toSegmentStatusMap(transaction.transactionResult),
  unshielded: toUnshieldedUtxos(transaction.unshieldedCreatedOutputs, transaction.unshieldedSpentOutputs),
  indexerId: transaction.id,
  protocolVersion: transaction.protocolVersion,
  fees: {
    estimatedFees: transaction.fees.estimatedFees,
    paidFees: transaction.fees.paidFees
  }
});
