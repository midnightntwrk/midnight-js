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
  LEDGER_ERAS,
  type LedgerEra,
  protocolVersionToLedger,
  UnknownProtocolVersionError
} from '@midnight-ntwrk/midnight-js-protocol';
import { type ContractAddress, type IntentHash, type RawTokenType } from '@midnight-ntwrk/midnight-js-protocol/v9';
import type {
  ContractStateAndParametersRead,
  ContractStateRead,
  FinalizedTxRead,
  PublicStatesRead,
  ReadMethod,
  StateReadMethod} from '@midnight-ntwrk/midnight-js-types';
import {
  FailEntirely,
  FailFallible,
  InvalidSerializedStateError,
  type LedgerTransaction,
  SegmentFail,
  type SegmentStatus,
  SegmentSuccess,
  SerializedContractState,
  SerializedLedgerParameters,
  SerializedZswapChainState,
  SucceedEntirely,
  type TxStatus,
  type UnshieldedBalances,
  type UnshieldedUtxo,
  type UnshieldedUtxos
} from '@midnight-ntwrk/midnight-js-types';
import {
  deserializeLedgerTransaction,
  isHex,
  ledgerVersionOfContractState,
  ledgerVersionOfLedgerParameters,
  parseHex
} from '@midnight-ntwrk/midnight-js-utils';
import { Buffer } from 'buffer';

import { DecoderEraUnsupportedError, IndexerDataError, UnknownRecordEraError } from './errors';
import type { ContractBalance, Segment, TransactionResult } from './gen/schema-types';

/**
 * Decodes the hex the indexer serves.
 *
 * Reads through `parseHex` rather than handing the string to
 * `Buffer.from(s, 'hex')`, which stops at the first character it cannot read
 * and returns a SHORTER buffer without complaining. `isHex` — the guard every
 * caller here runs first — accepts an optional `0x` prefix, so the two would
 * otherwise disagree about the same string and a prefixed payload would reach a
 * decoder as zero bytes.
 */
const toByteArray = (s: string): Buffer => Buffer.from(parseHex(s).byteChars, 'hex');

const PKG = '@midnight-ntwrk/midnight-js-indexer-public-data-provider';

/**
 * Facts identifying one read, carried onto a decode failure so it names the
 * record and the method rather than only the era.
 */
type ReadDetails = Readonly<Record<string, string | number>>;

/**
 * Takes a hex-encoded indexer transaction, decodes it to bytes, and dispatches to the typed
 * deserialization wrapper from `@midnight-ntwrk/midnight-js-utils`. Re-exported from the package
 * entry point, so its signature is public API.
 */
export const parseHexTransaction = <E extends LedgerEra>(
  era: E,
  s: string,
  details?: ReadDetails
): Promise<LedgerTransaction<'Finalized', E>> =>
  deserializeLedgerTransaction(era, toByteArray(s), { caller: `${PKG}:parseHexTransaction`, details });

const parametersBytesAndLedgerVersion = (
  hexParameters: string
): { readonly raw: Uint8Array; readonly ledgerVersion: LedgerEra } => {
  // Hex first, as in `stateBytesAndLedgerVersion`.
  if (!isHex(hexParameters)) {
    throw IndexerDataError.malformedParametersEncoding();
  }
  const raw = new Uint8Array(toByteArray(hexParameters));
  return { raw, ledgerVersion: ledgerVersionOfLedgerParameters(raw) };
};

/**
 * A decoded finalized transaction paired with the era whose runtime produced
 * it — the two fields {@link FinalizedTxRead} discriminates on.
 *
 * `DistributivePick` rather than a bare `Pick`: distributed over the union it
 * yields one variant per era, each pairing `era` with a `tx` handle of
 * that same era.
 */
type DistributivePick<T, K extends keyof T> = T extends unknown ? Pick<T, K> : never;

export type DecodedRecordTransaction = DistributivePick<FinalizedTxRead, 'era' | 'tx'>;

/**
 * One decoder per {@link LedgerEra}, each returning only its own variant of
 * {@link DecodedRecordTransaction}.
 *
 * A total `Record` on a null prototype, frozen — see
 * `packages/protocol/docs/shared-table-discipline.md`. The era set is gated by
 * `LedgerEra`: an era added there stops this table type-checking. That an
 * era also has a *read variant* is asserted separately, by `_EveryEraHasAReadVariant`
 * in `@midnight-ntwrk/midnight-js-types`.
 */
type TransactionDecoders = {
  readonly [V in LedgerEra]: (
    hexTransaction: string,
    details: ReadDetails
  ) => Promise<Extract<DecodedRecordTransaction, { era: V }>>;
};

const transactionDecoders = {
  v8: async (hexTransaction: string, details: ReadDetails) => ({
    era: 'v8' as const,
    tx: await parseHexTransaction('v8', hexTransaction, details)
  }),
  v9: async (hexTransaction: string, details: ReadDetails) => ({
    era: 'v9' as const,
    tx: await parseHexTransaction('v9', hexTransaction, details)
  })
} satisfies TransactionDecoders;

const TRANSACTION_DECODERS: TransactionDecoders = Object.freeze(
  Object.assign(Object.create(null) as Record<never, never>, transactionDecoders)
);

/**
 * Which record a decode was for, and where it was read from.
 */
export interface TransactionDecodeContext {
  readonly method: ReadMethod;
  readonly protocolVersion: number;
  readonly recordRef: string;
}

/**
 * Decodes one finalized transaction with the runtime of the era it was written
 * under, and tags the result with that era.
 *
 * `era` is the authority on which decoder runs, and it is derived from the
 * record's own `protocolVersion` by `resolveReadEra` (`./era.ts`) before this
 * is called. Nothing here re-derives it: the era and the `era` on the
 * returned record are the same fact.
 *
 * A payload that will not decode leaves as the `DeserializationError` the
 * runtime produced, carrying the era, the `protocolVersion`, the method and the
 * record on its context. This layer deliberately does not re-attribute the
 * failure: whether the record disagrees with itself or the consumer's ledger
 * package is a different vintage than the network's are indistinguishable from
 * here, and the deserializer's own mitigation covers both.
 *
 * @param hexTransaction The hex-encoded serialized transaction, as the indexer
 *                       serves it.
 * @param era The era whose runtime reads the payload. Validated at runtime, not
 *            merely type-checked.
 * @param context The record and read method a failure should name.
 * @throws IndexerDataError if `hexTransaction` is not a whole hex byte string.
 * @throws DecoderEraUnsupportedError if `era` is not a member of `LEDGER_ERAS`.
 * @throws Ledger8RuntimeMissingError if a v8-era record needs the pre-fork
 *   runtime and it cannot be acquired. From
 *   `@midnight-ntwrk/midnight-js-protocol`, and deliberately not an
 *   `IndexerError` — see {@link IndexerError}.
 * @throws DeserializationError for every decode failure.
 */
export const decodeRecordTransaction = async (
  hexTransaction: string,
  era: LedgerEra,
  context: TransactionDecodeContext
): Promise<DecodedRecordTransaction> => {
  if (!isHex(hexTransaction)) {
    throw IndexerDataError.malformedTransactionEncoding();
  }
  const decode = TRANSACTION_DECODERS[era];
  if (typeof decode !== 'function') {
    throw new DecoderEraUnsupportedError(context.method, era, context.protocolVersion, context.recordRef);
  }
  return decode(hexTransaction, {
    era,
    protocolVersion: context.protocolVersion,
    method: context.method,
    recordRef: context.recordRef
  });
};

/**
 * Decodes the indexer's hex-encoded contract state and reads the ledger era off
 * the version tag in front of the body, in that order.
 *
 * Hex first: `toByteArray` keeps only the leading run of whole hex bytes
 * `parseHex` finds and discards the rest, so an only-partly-hex payload would
 * otherwise be silently truncated into a shorter, still plausible-looking byte
 * string.
 */
const stateBytesAndLedgerVersion = (
  hexState: string
): { readonly raw: Uint8Array; readonly ledgerVersion: LedgerEra } => {
  if (!isHex(hexState)) {
    throw IndexerDataError.malformedStateEncoding();
  }
  const raw = new Uint8Array(toByteArray(hexState));
  return { raw, ledgerVersion: ledgerVersionOfContractState(raw) };
};

/**
 * Whether `left` is a strictly newer ledger era than `right`.
 *
 * Positional: an era's index in `LEDGER_ERAS` is its place on the timeline,
 * so a newer era appended there needs no change here.
 */
const isNewerEra = (left: LedgerEra, right: LedgerEra): boolean =>
  LEDGER_ERAS.indexOf(left) > LEDGER_ERAS.indexOf(right);

/**
 * Whether the `protocolVersion` handed to {@link toContractStateRead} may be
 * trusted as an upper bound on the ledger version in the state's version tag.
 *
 * `'check'` is the default and the case to reach for: the version is known
 * to describe the same block as the bytes, so bytes from a newer runtime are an
 * indexer fault. A call site earns it either by reading the version out of the
 * same resolution that produced the state — a `transaction` or `block` subtree
 * carrying the state itself — or by pinning both Query-root fields to one fixed
 * block offset.
 *
 * `'skip'` is for the one shape that earns neither: `block` and `contract`
 * asked for as Query-root siblings on an *unpinned* read. The indexer resolves
 * those concurrently, from independent reads, and with no offset both follow
 * the chain tip — so a block indexed between the two puts them on either side
 * of a fork, giving a newer version tag under an older block with nothing wrong
 * anywhere. Only the comparison is dropped; the version tag still decides
 * decodability, which is what actually keeps a wrong-era payload away from the
 * decoder. The `protocolVersion` must still resolve to an era: one this build
 * cannot place is refused under `'skip'` as under `'check'`.
 */
export type UpperBoundCheck = 'check' | 'skip';

/**
 * The read a contract state is built for, so a refusal names the method and the contract.
 */
export interface StateReadContext {
  readonly method: StateReadMethod;
  readonly contractAddress: ContractAddress;
  readonly upperBound?: UpperBoundCheck;
}

const blockEra = (protocolVersion: number, context: StateReadContext): LedgerEra => {
  try {
    return protocolVersionToLedger(protocolVersion, 'read');
  } catch (error) {
    if (!(error instanceof UnknownProtocolVersionError)) {
      throw error;
    }
    if (error.reason === 'malformed') {
      throw IndexerDataError.malformedProtocolVersion(protocolVersion, error);
    }
    throw new UnknownRecordEraError(context.method, protocolVersion, { cause: error }, context.contractAddress);
  }
};

const zswapBytes = (hexZswapState: string): Uint8Array => {
  if (!isHex(hexZswapState)) {
    throw IndexerDataError.malformedZswapEncoding();
  }
  return new Uint8Array(toByteArray(hexZswapState));
};

const datedContractState = (
  hexState: string,
  protocolVersion: number,
  context: StateReadContext
): SerializedContractState => {
  const blockVersion = blockEra(protocolVersion, context);
  const { raw, ledgerVersion } = stateBytesAndLedgerVersion(hexState);
  if ((context.upperBound ?? 'check') === 'check' && isNewerEra(ledgerVersion, blockVersion)) {
    throw IndexerDataError.eraDisagreement(protocolVersion, blockVersion, ledgerVersion);
  }
  return SerializedContractState.fromBytes(ledgerVersion, raw);
};

const blockLedgerParameters = (
  hexParameters: string,
  protocolVersion: number,
  context: StateReadContext
): SerializedLedgerParameters => {
  const { raw, ledgerVersion } = parametersBytesAndLedgerVersion(hexParameters);
  const blockVersion = blockEra(protocolVersion, context);
  if (blockVersion !== ledgerVersion) {
    throw IndexerDataError.parametersEraDisagreement(protocolVersion, blockVersion, ledgerVersion);
  }
  return SerializedLedgerParameters.fromBytes(ledgerVersion, raw);
};

const zswapChainState = (hexZswapState: string, era: LedgerEra): SerializedZswapChainState => {
  const raw = zswapBytes(hexZswapState);
  try {
    return SerializedZswapChainState.fromBytes(era, raw);
  } catch (error: unknown) {
    if (error instanceof InvalidSerializedStateError) {
      throw IndexerDataError.malformedZswapState(era, error);
    }
    throw error;
  }
};

/**
 * Builds the record served by `watchForContractState`, `queryDeployContractState` and
 * `contractStateObservable`. Nothing is decoded.
 *
 * The version tag on the bytes gives `contractState.era`, and `protocolVersion` bounds it: a
 * version tag newer than a checked dating block is {@link IndexerDataError.eraDisagreement}. A
 * `protocolVersion` that is not a non-negative integer is
 * {@link IndexerDataError.malformedProtocolVersion}, because it is copied onto the record; one this
 * build cannot place on the era timeline is {@link UnknownRecordEraError}, as on a transaction read.
 * Both are refused before the bytes are read.
 *
 * @param hexState The hex-encoded serialized contract state, as the indexer serves it.
 * @param protocolVersion The protocol-version integer of the block that dates the state.
 * @param context The method and contract a refusal names. `upperBound` states whether
 *                `protocolVersion` certainly describes the same block as the bytes. Defaults to
 *                `'check'`. See {@link UpperBoundCheck}.
 * @throws {UnknownRecordEraError} When `protocolVersion` maps to no ledger era this build knows.
 * @throws {IndexerDataError} When `protocolVersion` is malformed, the state is not hex-encoded, or
 *   the state is newer than a checked dating block.
 * @throws {TagParseError} When the state carries no supported version tag.
 */
export const toContractStateRead = (
  hexState: string,
  protocolVersion: number,
  context: StateReadContext
): ContractStateRead => ({
  protocolVersion,
  contractState: datedContractState(hexState, protocolVersion, context)
});

/**
 * Builds the record served by `queryContractState`: {@link toContractStateRead} plus the ledger
 * parameters of the block that dates the read. Nothing is decoded.
 *
 * The parameters and `protocolVersion` come from the same block, so parameters of another era than
 * that block are {@link IndexerDataError.parametersEraDisagreement}.
 *
 * @throws {UnknownRecordEraError} When `protocolVersion` maps to no ledger era this build knows.
 * @throws {IndexerDataError} When `protocolVersion` is malformed, a payload is not hex-encoded, the
 *   state is newer than a checked dating block, or the parameters are of another era than their
 *   block.
 * @throws {TagParseError} When a payload carries no supported version tag.
 */
export const toContractStateAndParametersRead = (
  hexState: string,
  protocolVersion: number,
  hexLedgerParameters: string,
  context: StateReadContext
): ContractStateAndParametersRead => ({
  ...toContractStateRead(hexState, protocolVersion, context),
  ledgerParameters: blockLedgerParameters(hexLedgerParameters, protocolVersion, context)
});

/**
 * Builds the record served by `PublicDataProvider.queryZSwapAndContractState`. Nothing is decoded.
 *
 * The contract state and the parameters are dated as in {@link toContractStateAndParametersRead}.
 * The parameters must come from the same era as the state; a pair from two eras is refused rather
 * than mixed. The zswap chain state carries no era of its own on the wire — v8 and v9 write the same
 * format — so it takes the era of the ledger parameters of its block.
 *
 * @throws {IndexerDataError} `mixed-era-public-states` when the state and the parameters were
 *   written by different eras, and `malformed-zswap-encoding` / `malformed-zswap-state` when the
 *   zswap chain state is not hex-encoded or not a zswap chain state of that era.
 */
export const toPublicStatesRead = (
  hexZswapState: string,
  hexState: string,
  hexParameters: string,
  protocolVersion: number,
  context: StateReadContext
): PublicStatesRead => {
  const { contractState, ledgerParameters } = toContractStateAndParametersRead(
    hexState,
    protocolVersion,
    hexParameters,
    context
  );
  if (ledgerParameters.era !== contractState.era) {
    throw IndexerDataError.mixedEraPublicStates(contractState.era, ledgerParameters.era);
  }
  return {
    protocolVersion,
    contractState,
    ledgerParameters,
    zswapChainState: zswapChainState(hexZswapState, ledgerParameters.era)
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
