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

import type { ContractAddress, TransactionId } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';
import type { FinalizedTxRecord, ReadSeam, VersionedFinalizedTxData } from '@midnight-ntwrk/midnight-js-types';

import {
  correlateDeployTxId,
  decodeVersionedTransaction,
  toSegmentStatusMap,
  toTxStatus,
  toUnshieldedUtxos
} from './codec';
import { resolveReadEra } from './era';
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

/**
 * Everything a finalized-transaction record carries except the transaction and
 * the era it belongs to — the two the decode produces.
 *
 * Split out so both read seams build the metadata identically and differ only
 * where they genuinely do: which identifier the record is keyed by.
 */
const toFinalizedTxRecord = (
  transaction: RegularTransaction & { hash: string; identifiers: string[] },
  txId: TransactionId
): FinalizedTxRecord => ({
  status: toTxStatus(transaction.transactionResult),
  txId,
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

/**
 * Builds one version-tagged finalized-transaction record, decoding the payload
 * with the runtime of the era the record itself reports.
 *
 * `version` is what the decode returned, which is what the era resolution
 * selected, which is what `protocolVersion` says — one fact, not three. That is
 * why the discriminant is never stamped as a literal here.
 */
const toVersionedFinalizedTxData = async (
  transaction: RegularTransaction & { hash: string; identifiers: string[] },
  txId: TransactionId,
  era: LedgerVersion,
  seam: ReadSeam,
  recordRef: string
): Promise<VersionedFinalizedTxData> => {
  const decoded = await decodeVersionedTransaction(transaction.raw, era, {
    seam,
    protocolVersion: transaction.protocolVersion,
    recordRef
  });
  return { ...toFinalizedTxRecord(transaction, txId), ...decoded };
};

/**
 * The `watchForDeployTxData` record: keyed by the identifier that sits at the
 * same positional index as the deploy's contract action.
 *
 * The era is resolved first, before anything else in the record is built. Each
 * era has its own deserializer, so which one runs has to be settled before a
 * decoder is reached; and a record whose `protocolVersion` places it on no era
 * at all is refused without any runtime being acquired. Kept statements rather
 * than folded into the call below so that ordering is explicit — as arguments
 * it would hold only by evaluation order, which a reordering edit would
 * silently reverse.
 *
 * Declared `async` so every refusal on this path is a rejection. The two
 * statements below throw synchronously, and a caller should not have to place
 * its `try`/`catch` differently depending on which stage failed.
 */
export const toFinalizedDeployTxData = async (
  contractAddress: ContractAddress,
  transaction: RegularTransaction & { hash: string; identifiers: string[] }
): Promise<VersionedFinalizedTxData> => {
  const recordRef = `contractAddress ${contractAddress}`;
  const era = resolveReadEra(transaction, 'watchForDeployTxData', recordRef);
  const txId = correlateDeployTxId(contractAddress, transaction.contractActions, transaction.identifiers);
  return toVersionedFinalizedTxData(transaction, txId, era, 'watchForDeployTxData', recordRef);
};

/**
 * The `watchForTxData` record: keyed by the identifier the caller asked for.
 *
 * Same era-first ordering, and the same reason for being `async`, as
 * {@link toFinalizedDeployTxData}.
 */
export const toFinalizedTxData = async (
  txId: TransactionId,
  transaction: RegularTransaction & { hash: string; identifiers: string[] }
): Promise<VersionedFinalizedTxData> => {
  const recordRef = `txId ${txId}`;
  const era = resolveReadEra(transaction, 'watchForTxData', recordRef);
  return toVersionedFinalizedTxData(transaction, txId, era, 'watchForTxData', recordRef);
};
