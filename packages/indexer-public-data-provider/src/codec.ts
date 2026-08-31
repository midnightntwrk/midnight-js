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
  isHex,
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
 * Decodes the indexer's hex-encoded contract state and reads the ledger era off
 * the envelope in front of the body, in that order.
 *
 * Hex first: `Buffer.from(s, 'hex')` stops at the first character it cannot
 * read, so an only-partly-hex payload would otherwise be silently truncated
 * into a shorter, still plausible-looking byte string.
 */
const stateBytesAndEnvelopeVersion = (
  hexState: string
): { readonly raw: Uint8Array; readonly envelopeVersion: LedgerVersion } => {
  if (!isHex(hexState)) {
    throw IndexerDataError.malformedStateEncoding();
  }
  const raw = new Uint8Array(toByteArray(hexState));
  return { raw, envelopeVersion: contractStateEnvelopeVersion(raw) };
};

/**
 * The only ledger era the deserializers reached from this module can read.
 *
 * The wrappers below bind the v9 runtime at import time; the v8 runtime is
 * reachable only through `loadLedger8()` and no read path dispatches on the era
 * yet. Until one does, bytes from any other era must be refused rather than fed
 * to the v9 decoder, which would return a wrong answer instead of failing.
 */
const DECODABLE_LEDGER_VERSION: LedgerVersion = 'v9';

/**
 * Deserialize a contract state the indexer served, but only after the era the
 * indexer reported for it and the era written into the state's own envelope
 * agree — and only if that era is one this path can actually decode.
 *
 * Two independent signals are required because neither is sufficient alone. The
 * reported `protocolVersion` comes from a block, resolved separately from the
 * state itself, so it can be about a different era than the bytes. The envelope
 * comes off the bytes but is attacker-controlled and proves nothing about the
 * network. Together, a disagreement is the honest signal that the answer cannot
 * be trusted.
 *
 * Nothing reaches a deserializer until all three checks pass.
 *
 * @param hexState The hex-encoded serialized contract state, as the indexer
 *                 serves it.
 * @param protocolVersion The protocol-version integer of the block that dates
 *                        the state.
 *
 * @throws {IndexerDataError} When the state is not hex-encoded, when the two
 *   era signals disagree, or when the agreed era is not decodable here.
 * @throws {TagParseError} When the payload carries no supported contract-state
 *   envelope.
 * @throws {UnknownProtocolVersionError} When `protocolVersion` resolves to no
 *   known era.
 */
export const parseHexContractState = (hexState: string, protocolVersion: number): ContractState => {
  const { raw, envelopeVersion } = stateBytesAndEnvelopeVersion(hexState);
  const reportedVersion = protocolVersionToLedger(protocolVersion, 'read');
  if (reportedVersion !== envelopeVersion) {
    throw IndexerDataError.eraDisagreement(protocolVersion, reportedVersion, envelopeVersion);
  }
  if (envelopeVersion !== DECODABLE_LEDGER_VERSION) {
    throw IndexerDataError.unsupportedDecodeEra(envelopeVersion);
  }
  return deserializeCompactContractState(raw, { caller: `${PKG}:parseHexContractState` });
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
export const toRawContractState = (hexState: string, protocolVersion: number): RawContractState => {
  // Validates the encoding and rejects anything that is not a contract state
  // from a supported runtime. The envelope reading is deliberately not compared
  // against `protocolVersion` here: this record's contract is that `version`
  // reports what the network said, and agreement with the envelope is the
  // caller's to establish.
  const { raw } = stateBytesAndEnvelopeVersion(hexState);
  return {
    version: protocolVersionToLedger(protocolVersion, 'read'),
    protocolVersion,
    raw
  };
};

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
