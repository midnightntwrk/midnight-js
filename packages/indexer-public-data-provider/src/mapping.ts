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
import type { RegularTransaction } from './gen/graphql';

type IsEmptyObject<T> = keyof T extends never ? true : false;
export type ExcludeEmptyAndNull<T> = T extends null ? never : IsEmptyObject<T> extends true ? never : T;

export const hasContractAction = <T extends { contractAction?: unknown }>(
  data: T
): data is T & { contractAction: NonNullable<T['contractAction']> } =>
  data.contractAction != null;

export const isRegularTransaction = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any
): tx is RegularTransaction & { hash: string; identifiers: string[] } => {
  return 'identifiers' in tx && 'hash' in tx && Array.isArray(tx.identifiers);
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
