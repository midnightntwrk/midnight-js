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

import type { TransactionHash, TransactionId } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { FinalizedTransaction as V8Transaction } from '@midnight-ntwrk/midnight-js-protocol/v8';

import type { BlockHash, Fees, FinalizedTxData, SegmentStatus, TxStatus, UnshieldedUtxos } from './midnight-types';

/**
 * The v8 arm of every transaction payload crossing a provider seam
 * (`proveTx`, `balanceTx`, `submitTx`), in both directions.
 *
 * During the ledger-fork window a v8-era transaction never crosses a provider
 * seam as a live ledger object: the two ledger runtimes are separate WASM
 * instances, so an object built by one cannot be handed to the other. It
 * crosses as its serialized, tag-prefixed byte form instead, and the
 * `version` discriminant says which runtime produced those bytes.
 */
export interface V8TxBytes {
  /**
   * Discriminant identifying this as a v8-era payload.
   */
  readonly version: 'v8';
  /**
   * The transaction in its serialized, tag-prefixed byte form.
   */
  readonly txBytes: Uint8Array;
}

/**
 * A transaction payload crossing a provider seam, discriminated by the ledger
 * runtime it belongs to: serialized bytes for the v8 era ({@link V8TxBytes}),
 * or the live ledger object of type `T` for v9.
 *
 * Consumers must narrow on `version` before touching the payload — there is
 * deliberately no untagged form, so a bare `Uint8Array` (bytes whose era
 * nobody can tell) is never assignable where this type is expected.
 *
 * @typeParam T - The v9 ledger transaction type carried by the `'v9'` arm.
 */
export type VersionedTx<T> = V8TxBytes | { readonly version: 'v9'; readonly tx: T };

/**
 * The v8 arm of {@link VersionedFinalizedTxData}. Carries exactly the same
 * finalized-transaction metadata as {@link FinalizedTxData}, but with a v8
 * ledger transaction object in place of the v9 one. A provider only ever
 * produces this shape for a record whose `protocolVersion` resolves to the
 * v8 ledger runtime: `version` always equals the resolved ledger version for
 * `protocolVersion` (i.e. resolving `protocolVersion` the same way the
 * `read`-path resolver in `@midnight-ntwrk/midnight-js-protocol` does).
 */
export interface FinalizedTxDataV8 {
  /**
   * Discriminant identifying this as a v8 ledger record.
   */
  readonly version: 'v8';
  /**
   * The transaction that was finalized, as a v8 ledger transaction object.
   */
  readonly tx: V8Transaction;
  /**
   * The status of a submitted transaction.
   */
  readonly status: TxStatus;
  /**
   * One of the transaction ID of the submitted transaction.
   */
  readonly txId: TransactionId;
  /**
   * All transaction IDs of the submitted transaction.
   */
  readonly identifiers: readonly TransactionId[];
  /**
   * The transaction hash of the transaction in which the original transaction was included.
   */
  readonly txHash: TransactionHash;
  /**
   * The block hash of the block in which the transaction was included.
   */
  readonly blockHash: BlockHash;
  /**
   * The block height of the block in which the transaction was included.
   */
  readonly blockHeight: number;
  /**
   * The timestamp of the block in which the transaction was included.
   */
  readonly blockTimestamp: number;
  /**
   * The author of the block in which the transaction was included.
   */
  readonly blockAuthor: string | null;
  /**
   * The indexer internal db ID.
   */
  readonly indexerId: number;
  /**
   * The protocol version of the transaction.
   */
  readonly protocolVersion: number;
  /**
   * The fees associated with the transaction, including both paid and estimated fees.
   */
  readonly fees: Fees;
  /**
   * The map that associates segment identifiers (numbers) with their corresponding status {@link SegmentStatus}.
   * The segment identifier is represented as a number (key in the map), and the status indicates the success or failure of the transaction update.
   */
  readonly segmentStatusMap: Map<number, SegmentStatus> | undefined;
  /**
   * Represents the unshielded outputs, typically used for transactions or operations
   * involving data or values that are not encrypted or concealed.
   */
  readonly unshielded: UnshieldedUtxos;
}

/**
 * A finalized transaction record, discriminated by which ledger runtime
 * produced it. Both arms carry identical metadata; only `tx`'s type and the
 * `version` discriminant differ. `version` is set at exactly one
 * construction point per provider, and on every value of this type
 * `version` always equals the resolved ledger version for `protocolVersion`
 * (the same resolution the `read`-path resolver in
 * `@midnight-ntwrk/midnight-js-protocol` performs) — never asserted here,
 * since `types` stays declarations-only; providers and their mocks are
 * responsible for upholding it at construction time.
 */
export type VersionedFinalizedTxData = FinalizedTxDataV8 | FinalizedTxData;
