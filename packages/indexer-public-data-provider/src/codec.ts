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

import type { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  type Binding,
  type ContractAddress,
  type IntentHash,
  type LedgerParameters,
  type Proof,
  type RawTokenType,
  type SignatureEnabled,
  type Transaction as LedgerTransaction,
  type ZswapChainState
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  FailEntirely,
  FailFallible,
  SegmentFail,
  type SegmentStatus,
  SegmentSuccess,
  SucceedEntirely,
  type TxStatus,
  type UnshieldedBalances,
  type UnshieldedUtxo,
  type UnshieldedUtxos
} from '@midnight-ntwrk/midnight-js-types';
import {
  deserializeCompactContractState,
  deserializeLedgerParameters,
  deserializeLedgerTransaction,
  deserializeZswapChainState
} from '@midnight-ntwrk/midnight-js-utils';
import { Buffer } from 'buffer';

import { IndexerDataError } from './errors';
import type { ContractBalance, Segment, TransactionResult } from './gen/graphql';

const toByteArray = (s: string): Buffer => Buffer.from(s, 'hex');

const PKG = '@midnight-ntwrk/midnight-js-indexer-public-data-provider';

/**
 * Adapters that take hex-encoded indexer payloads, decode to bytes, and
 * dispatch to the typed deserialization wrappers from `@midnight-ntwrk/midnight-js-utils`.
 * They exist (rather than inlining) so the `caller` string is centralized and
 * regression-testable. Exported for tests; not part of the public package API.
 */
export const parseHexContractState = (s: string): ContractState =>
  deserializeCompactContractState(toByteArray(s), { caller: `${PKG}:parseHexContractState` });

export const parseHexZswapState = (s: string): ZswapChainState =>
  deserializeZswapChainState(toByteArray(s), { caller: `${PKG}:parseHexZswapState` });

export const parseHexTransaction = (s: string): LedgerTransaction<SignatureEnabled, Proof, Binding> =>
  deserializeLedgerTransaction(toByteArray(s), { caller: `${PKG}:parseHexTransaction` });

export const parseHexLedgerParameters = (s: string): LedgerParameters =>
  deserializeLedgerParameters(toByteArray(s), { caller: `${PKG}:parseHexLedgerParameters` });

export const toTxStatus = (transactionResult: TransactionResult): TxStatus => {
  const result = transactionResult.status;
  const map = {
    'FAILURE': FailEntirely,
    'PARTIAL_SUCCESS': FailFallible,
    'SUCCESS': SucceedEntirely
  } as const;
  if (result === 'FAILURE' || result === 'PARTIAL_SUCCESS' || result === 'SUCCESS') {
    return map[result];
  }
  throw IndexerDataError.unknownStatus(result);
};

export const toSegmentStatus = (success: boolean): SegmentStatus =>
  success ? SegmentSuccess : SegmentFail;

export const toSegmentStatusMap = (transactionResult: TransactionResult): Map<number, SegmentStatus> | undefined => {
  if (transactionResult.status !== 'PARTIAL_SUCCESS') {
    return undefined;
  }

  if (!transactionResult.segments) {
    return undefined;
  }

  return new Map(
    transactionResult.segments.map((segment: Segment) => [segment.id, toSegmentStatus(segment.success)])
  );
};

export type IndexerUtxo = {
  owner: string;
  intentHash: string;
  tokenType: string;
  value: string;
};

const transformIndexerUtxoToUnshieldedUtxo = (indexerUtxo: IndexerUtxo): UnshieldedUtxo => ({
  owner: indexerUtxo.owner as ContractAddress,
  intentHash: indexerUtxo.intentHash as IntentHash,
  tokenType: indexerUtxo.tokenType as RawTokenType,
  value: BigInt(indexerUtxo.value)
});

export const toUnshieldedUtxos = (createdUtxo: readonly IndexerUtxo[], spentUtxo: readonly IndexerUtxo[]): UnshieldedUtxos => ({
  created: createdUtxo.map(transformIndexerUtxoToUnshieldedUtxo),
  spent: spentUtxo.map(transformIndexerUtxoToUnshieldedUtxo)
});

const transformContractBalanceToUnshieldedBalance = (contractBalance: ContractBalance): UnshieldedBalances[0] => ({
  balance: BigInt(contractBalance.amount),
  tokenType: contractBalance.tokenType as RawTokenType
});

export const toUnshieldedBalances = (contractBalances: readonly ContractBalance[]): UnshieldedBalances =>
  contractBalances.map(transformContractBalanceToUnshieldedBalance);

/**
 * Correlates a contract action at `contractAddress` with the transaction's
 * identifier at the same positional index. Throws {@link IndexerDataError}
 * when the deploy lacks an action for the address, when the corresponding
 * identifier slot is missing, or when the identifier is not a non-empty
 * string — all indicate that the indexer's contract-action / identifier
 * rows are out of sync.
 *
 * @internal Exported for unit testing the correlation in isolation.
 * Production callers should go through `PublicDataProvider.watchForDeployTxData`.
 */
export const correlateDeployTxId = (
  contractAddress: ContractAddress,
  contractActions: readonly { readonly address: string }[],
  identifiers: readonly string[]
): string => {
  const actionIndex = contractActions.findIndex(({ address }) => address === contractAddress);
  const txId = actionIndex >= 0 ? identifiers[actionIndex] : undefined;
  if (typeof txId !== 'string' || txId.length === 0) {
    throw IndexerDataError.missingIdentifier(contractAddress, actionIndex, identifiers.length);
  }
  return txId;
};
