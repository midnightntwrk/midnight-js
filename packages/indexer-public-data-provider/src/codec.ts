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

import { type LedgerVersion, protocolVersionToLedger } from '@midnight-ntwrk/midnight-js-protocol';
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
import type { RawContractState } from '@midnight-ntwrk/midnight-js-types';
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
  deserializeZswapChainState,
  parseSerializedTag,
  TagParseError
} from '@midnight-ntwrk/midnight-js-utils';
import { Buffer } from 'buffer';

import { IndexerDataError } from './errors';
import type { ContractBalance, Segment, TransactionResult } from './gen/schema-types';

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

// A serialized contract state carries a `midnight:contract-state[vN]:`
// envelope tag. The bracketed number is the *state format* version, not the
// ledger version: the v8 ledger writes `[v6]` and the v9 ledger writes `[v8]`.
// Both entries are pinned by a test that serializes a state with each runtime
// and checks the tag it produces, so a runtime bump that changes the format
// version fails loudly here instead of silently mis-reading an envelope.
const CONTRACT_STATE_TAG_TO_LEDGER_VERSION: Readonly<Partial<Record<string, LedgerVersion>>> = Object.freeze({
  'midnight:contract-state[v6]': 'v8',
  'midnight:contract-state[v8]': 'v9'
});

/**
 * Reads which ledger runtime wrote a serialized contract state, from the
 * envelope tag in front of the state body — without deserializing the body.
 *
 * The tag is attacker-controlled input and is never the authority on the body;
 * the node remains the sole authority on what the bytes decode to. What this
 * check buys is a cheap, early rejection of anything that is not a contract
 * state from a supported runtime, before those bytes reach a decoder.
 *
 * @throws {TagParseError} When there is no well-formed envelope tag, or the
 *   tag is not one of the supported contract-state envelopes.
 */
export const contractStateEnvelopeVersion = (raw: Uint8Array): LedgerVersion => {
  const { tag } = parseSerializedTag(raw);
  const ledgerVersion = CONTRACT_STATE_TAG_TO_LEDGER_VERSION[tag];
  if (ledgerVersion === undefined) {
    // Deliberately does not echo the observed tag: it is attacker-controlled
    // and unvalidated beyond its character set, so embedding it verbatim would
    // let a crafted payload put arbitrary text into this message.
    throw new TagParseError(
      'The serialized state does not carry a contract-state envelope from a supported ledger runtime. ' +
        'Verify the payload came from a contract-state query and not from another serialized type.'
    );
  }
  return ledgerVersion;
};

/**
 * Builds the raw (undeserialized) contract-state record served by
 * `PublicDataProvider.queryRawContractState`.
 *
 * This is the single construction point for the record's `version` field: it
 * is always derived here from `protocolVersion`, using the read-path resolver,
 * and is never passed in or chosen by a caller. Keeping the derivation in one
 * place is what makes "`version` always agrees with `protocolVersion`" true by
 * construction rather than by convention.
 *
 * @param hexState The hex-encoded serialized contract state, as the indexer
 *                 serves it.
 * @param protocolVersion The protocol-version integer the network reported for
 *                        that state.
 */
export const toRawContractState = (hexState: string, protocolVersion: number): RawContractState => ({
  version: protocolVersionToLedger(protocolVersion, 'read'),
  protocolVersion,
  raw: new Uint8Array(toByteArray(hexState))
});

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
