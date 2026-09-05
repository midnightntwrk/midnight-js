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

import {
  LEDGER_VERSIONS,
  type LedgerVersion,
  loadLedger8,
  protocolVersionToLedger,
  UnknownProtocolVersionError
} from '@midnight-ntwrk/midnight-js-protocol';
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
// Type-only, so nothing here links the v8 chunk: the runtime is acquired
// through `loadLedger8()` and only when a v8-era record asks for it. Same
// precedent as `FinalizedTxDataV8` in `@midnight-ntwrk/midnight-js-types`.
import type { FinalizedTransaction as V8FinalizedTransaction } from '@midnight-ntwrk/midnight-js-protocol/v8';
import type { RawContractState, ReadSeam, VersionedFinalizedTxData } from '@midnight-ntwrk/midnight-js-types';
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
  contractStateEnvelopeVersion,
  deserializeCompactContractState,
  deserializeLedgerParameters,
  deserializeLedgerTransaction,
  deserializeZswapChainState,
  isDeserializationError,
  isHex,
  withDeserializationContext
} from '@midnight-ntwrk/midnight-js-utils';
import { Buffer } from 'buffer';

import { DecodeVersionMismatchError, EraUnsupportedError, IndexerDataError } from './errors';
import type { ContractBalance, Segment, TransactionResult } from './gen/schema-types';

const toByteArray = (s: string): Buffer => Buffer.from(s, 'hex');

const PKG = '@midnight-ntwrk/midnight-js-indexer-public-data-provider';

/**
 * Adapters that take hex-encoded indexer payloads, decode to bytes, and
 * dispatch to the typed deserialization wrappers from `@midnight-ntwrk/midnight-js-utils`.
 * They exist (rather than inlining) so the `caller` string is centralized and
 * regression-testable. Re-exported from the package entry point, so their
 * signatures are public API.
 */
export const parseHexZswapState = (s: string): ZswapChainState =>
  deserializeZswapChainState(toByteArray(s), { caller: `${PKG}:parseHexZswapState` });

export const parseHexTransaction = (s: string): LedgerTransaction<SignatureEnabled, Proof, Binding> =>
  deserializeLedgerTransaction(toByteArray(s), { caller: `${PKG}:parseHexTransaction` });

export const parseHexLedgerParameters = (s: string): LedgerParameters =>
  deserializeLedgerParameters(toByteArray(s), { caller: `${PKG}:parseHexLedgerParameters` });

/**
 * The v8-era sibling of {@link parseHexTransaction}. Acquires the v8 ledger
 * runtime through `loadLedger8()` — the only sanctioned path to it — and reads
 * the payload with the same marker convention the v9 wrapper uses.
 *
 * Routed through `withDeserializationContext` so a v8 failure arrives as the
 * same classified `DeserializationError` a v9 failure does. Without it the raw
 * WASM error would reach {@link decodeVersionedTransaction} unclassified, and a
 * genuine version mismatch on this era would be indistinguishable from
 * corruption.
 */
const parseHexTransactionV8 = async (s: string): Promise<V8FinalizedTransaction> => {
  const v8 = await loadLedger8();
  return withDeserializationContext(
    { dataType: 'LedgerTransaction', source: 'ledger', caller: `${PKG}:parseHexTransactionV8` },
    () => v8.Transaction.deserialize('signature', 'proof', 'binding', toByteArray(s))
  );
};

/**
 * A decoded finalized transaction paired with the era whose runtime produced
 * it — the two fields {@link VersionedFinalizedTxData} discriminates on.
 *
 * Derived from that union rather than restated, so an era added there arrives
 * here automatically and {@link TRANSACTION_DECODERS} stops type-checking
 * until it has a decoder.
 */
type DecodedArm<Arm> = Arm extends VersionedFinalizedTxData ? Pick<Arm, 'version' | 'tx'> : never;

export type DecodedVersionedTransaction = DecodedArm<VersionedFinalizedTxData>;

/**
 * One decoder per {@link LedgerVersion}, each returning only its own arm of
 * {@link DecodedVersionedTransaction}:
 *
 * - `v9` — read with the statically bound `@midnightntwrk/ledger-v9`, which is
 *   already linked because every other read on this provider needs it.
 * - `v8` — read with the pre-fork runtime, acquired lazily on first use so a
 *   session that never meets a v8 record never instantiates that WASM.
 *
 * A total `Record` on a null prototype, frozen — see the protocol package's
 * SharedTableDiscipline document. The null prototype is what makes an
 * off-vocabulary era resolve to `undefined` and reach the guard in
 * {@link decodeVersionedTransaction}, instead of answering with an inherited
 * `Object.prototype` member.
 */
type TransactionDecoders = {
  readonly [V in LedgerVersion]: (hexTransaction: string) => Promise<Extract<DecodedVersionedTransaction, { version: V }>>;
};

const TRANSACTION_DECODERS: TransactionDecoders = Object.freeze(
  Object.assign(Object.create(null) as TransactionDecoders, {
    v8: async (hexTransaction: string) => ({ version: 'v8' as const, tx: await parseHexTransactionV8(hexTransaction) }),
    // Wrapped in a resolved promise rather than decoded eagerly: both arms have
    // to be awaited the same way, and the v9 read stays the same synchronous
    // call `parseHexTransaction` already makes.
    v9: (hexTransaction: string) => Promise.resolve({ version: 'v9' as const, tx: parseHexTransaction(hexTransaction) })
  } satisfies TransactionDecoders)
);

/**
 * Which record a decode was for, and where it was read from. Carried so a
 * failure names the record and the seam rather than only the era — a dApp with
 * several watches open cannot otherwise tell which one rejected.
 */
export interface TransactionDecodeContext {
  readonly seam: ReadSeam;
  readonly protocolVersion: number;
  readonly recordRef: string;
}

/**
 * Decodes one finalized transaction with the runtime of the era it was written
 * under, and tags the result with that era.
 *
 * `era` is the authority on which decoder runs, and it is derived from the
 * record's own `protocolVersion` by `resolveReadEra` (`./era.ts`) before this
 * is called. Nothing here re-derives it: the era and the `version` on the
 * returned record are the same fact, which is what keeps the discriminant from
 * disagreeing with the `protocolVersion` beside it.
 *
 * A payload that will not decode on the era selected for it is reported as
 * {@link DecodeVersionMismatchError} — but only when the deserialization layer
 * classified the failure as a version mismatch. Malformed or truncated bytes
 * leave as the `DeserializationError` they are: calling corruption an era
 * disagreement would send a reader to align package versions that are already
 * right.
 *
 * @param hexTransaction The hex-encoded serialized transaction, as the indexer
 *                       serves it.
 * @param era The era whose runtime reads the payload. Validated at runtime, not
 *            merely type-checked.
 * @param context The record and seam a failure should name.
 * @throws EraUnsupportedError if `era` is not a member of `LEDGER_VERSIONS`.
 * @throws DecodeVersionMismatchError if the payload's own header tag belongs to
 *   a different runtime, carrying that runtime's diagnosis on `cause`.
 * @throws DeserializationError for every other decode failure.
 */
export const decodeVersionedTransaction = async (
  hexTransaction: string,
  era: LedgerVersion,
  context: TransactionDecodeContext
): Promise<DecodedVersionedTransaction> => {
  const decode = TRANSACTION_DECODERS[era];
  if (typeof decode !== 'function') {
    throw new EraUnsupportedError(context.seam, era, context.protocolVersion, context.recordRef);
  }
  try {
    return await decode(hexTransaction);
  } catch (error) {
    if (isDeserializationError(error) && error.context.classification === 'version-mismatch') {
      throw new DecodeVersionMismatchError(context.seam, era, context.protocolVersion, context.recordRef, {
        cause: error
      });
    }
    throw error;
  }
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
 * The only ledger era {@link parseHexContractState} can read.
 *
 * Deliberately narrower than the transaction path above, which dispatches per
 * record across both eras. Widening this one would change what
 * `queryContractState` returns — a `ContractState` from whichever runtime wrote
 * it, so no longer one type — and `queryRawContractState` already serves the
 * bytes together with their era for a caller that needs the other runtime.
 * Until that changes, bytes from any other era are refused here rather than fed
 * to the v9 decoder — which would reject them anyway, but with a header-tag
 * error that says nothing about what the caller should do instead.
 */
const DECODABLE_LEDGER_VERSION: LedgerVersion = 'v9';

/**
 * Whether `left` is a strictly newer ledger era than `right`.
 *
 * Positional: an era's index in `LEDGER_VERSIONS` is its place on the timeline,
 * so a newer era appended there needs no change here.
 */
const isNewerEra = (left: LedgerVersion, right: LedgerVersion): boolean =>
  LEDGER_VERSIONS.indexOf(left) > LEDGER_VERSIONS.indexOf(right);

/**
 * The era an indexer-reported `protocolVersion` resolves to, or `undefined`
 * when this client cannot place that integer on the era timeline at all.
 *
 * Unresolvable is a distinct answer from wrong, and the two must not be
 * conflated: the reported version is a cross-check on the envelope here, never
 * the authority on the bytes, so "I cannot place this integer" has to leave the
 * decode to the envelope rather than fail the caller's read. Only
 * {@link UnknownProtocolVersionError} is treated that way — anything else is a
 * real failure and propagates.
 */
export const reportedEra = (protocolVersion: number): LedgerVersion | undefined => {
  try {
    return protocolVersionToLedger(protocolVersion, 'read');
  } catch (error) {
    if (error instanceof UnknownProtocolVersionError) {
      return undefined;
    }
    throw error;
  }
};

/**
 * Whether the `protocolVersion` handed to {@link parseHexContractState} may be
 * trusted as an upper bound on the state's envelope.
 *
 * `'enforced'` is the default and the case to reach for: the version is known
 * to describe the same block as the bytes, so bytes from a newer runtime are an
 * indexer fault. A call site earns it either by reading the version out of the
 * same resolution that produced the state — a `transaction` or `block` subtree
 * carrying the state itself — or by pinning both Query-root fields to one fixed
 * block offset.
 *
 * `'withheld'` is for the one shape that earns neither: `block` and `contract`
 * asked for as Query-root siblings on an *unpinned* read. The indexer resolves
 * those concurrently, from independent reads, and with no offset both follow
 * the chain tip — so a block indexed between the two puts them on either side
 * of a fork, giving a newer envelope under an older block with nothing wrong
 * anywhere. Only the comparison is dropped; the envelope still decides
 * decodability, which is what actually keeps a wrong-era payload away from the
 * decoder.
 */
export type EnvelopeUpperBound = 'enforced' | 'withheld';

/**
 * Deserialize a contract state the indexer served, after establishing which
 * ledger runtime wrote it — and only if that runtime is one this path can
 * decode.
 *
 * The envelope is the authority on the bytes, and the version the indexer
 * reported for the dating block is an upper bound on it. That asymmetry is the
 * whole rule, and it follows from how the two signals are obtained:
 *
 * - The envelope comes off the bytes themselves. It is attacker-controlled and
 *   proves nothing about the network, but it is the one thing the deserializer
 *   also reads: a mismatched envelope is rejected on the header tag before the
 *   body, so it cannot produce a wrong answer, only a failure.
 * - The reported version dates the *read*, not the bytes. The indexer serves
 *   the latest contract action at or before the requested block, so a state can
 *   legitimately be older than the block that dates it — after a fork, every
 *   contract dormant across it is exactly that. Treating that ordinary case as
 *   a contradiction would send callers hunting a fault that is not there.
 *
 * So an older envelope under a newer block is normal and decided on the
 * envelope alone. The reverse — bytes written by a runtime the dating block
 * had not forked to yet — cannot happen while both signals describe the same
 * block, and is the one direction reported as
 * {@link IndexerDataError.eraDisagreement}. Where they need not describe the
 * same block, the caller says so and the comparison is dropped instead of
 * being reported as a fault — see {@link EnvelopeUpperBound}.
 *
 * Nothing reaches a deserializer until the era is settled.
 *
 * @param hexState The hex-encoded serialized contract state, as the indexer
 *                 serves it.
 * @param protocolVersion The protocol-version integer of the block that dates
 *                        the read. An integer this client cannot resolve
 *                        withholds the upper-bound check and nothing else.
 * @param options `upperBound` states whether `protocolVersion` certainly
 *                describes the same block as the bytes, and so whether it may
 *                bound the envelope. Defaults to `'enforced'`, so a call site
 *                has to opt out of the check deliberately rather than lose it
 *                by omission. See {@link EnvelopeUpperBound}.
 *
 * @throws {IndexerDataError} When the state is not hex-encoded, when its
 *   envelope is newer than the block that dates it and that bound is enforced,
 *   or when its era is not decodable here.
 * @throws {TagParseError} When the payload carries no supported contract-state
 *   envelope.
 */
export const parseHexContractState = (
  hexState: string,
  protocolVersion: number,
  options?: { readonly upperBound?: EnvelopeUpperBound }
): ContractState => {
  const { raw, envelopeVersion } = stateBytesAndEnvelopeVersion(hexState);
  if ((options?.upperBound ?? 'enforced') === 'enforced') {
    const reportedVersion = reportedEra(protocolVersion);
    if (reportedVersion !== undefined && isNewerEra(envelopeVersion, reportedVersion)) {
      throw IndexerDataError.eraDisagreement(protocolVersion, reportedVersion, envelopeVersion);
    }
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
