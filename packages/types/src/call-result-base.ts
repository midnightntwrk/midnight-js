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

/**
 * The guaranteed common contract of a circuit execution's result, shared by
 * every era.
 *
 * An era MAY add members to these bases; an era may NOT drop one. That is the
 * whole point of declaring them here: a member added to a base reaches both
 * eras' surfaces at once, so the two cannot drift as members are added.
 *
 * @see ADR-0010 for why these live in this package, and for the rule that
 *      separates a data-shape base from a behaviour-bearing one.
 */

import type {
  AlignedValue,
  Op,
  ZswapLocalState
} from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { PartitionedTranscript, ShieldedCoinInfo } from '@midnight-ntwrk/midnight-js-protocol/ledger';

/**
 * The public, non-sensitive half of a circuit execution that every era carries.
 *
 * Both members are plain data: an operation sequence and a pair of transcript
 * halves. Era-specific post-state — a live runtime handle in either era — is
 * NOT here, because no such handle may cross an era boundary.
 */
export interface CallResultPublicBase {
  /**
   * The public transcript the execution produced, unpartitioned.
   */
  readonly publicTranscript: Op<AlignedValue>[];
  /**
   * The public transcript partitioned into its guaranteed and fallible halves.
   * The guaranteed half must succeed for the transaction to be valid; the
   * fallible half may fail without invalidating it.
   */
  readonly partitionedTranscript: PartitionedTranscript;
}

/**
 * The ZK-confidential half of ONE contract call, in every era.
 *
 * The same three members describe the whole execution's private half and each
 * individual call in its tree, which is why they are declared once here rather
 * than twice.
 *
 * @remarks **Privacy-sensitive.** Every member is data the zero-knowledge
 * proofs were designed to keep confidential.
 */
export interface ContractCallPrivateBase {
  /**
   * ZK representation of the circuit arguments.
   */
  readonly input: AlignedValue;
  /**
   * ZK representation of the circuit result.
   */
  readonly output: AlignedValue;
  /**
   * ZK representation of the circuit's witness call results.
   */
  readonly privateTranscriptOutputs: AlignedValue[];
}

/**
 * The private, ZK-confidential half of a circuit execution that every era
 * carries.
 *
 * Generic over the two members whose types are genuinely era-specific: the
 * circuit's own return value and the contract's private state. Everything else
 * is one shared declaration, including `nextZswapLocalState` — the two
 * runtimes' `ZswapLocalState` interfaces are mutually assignable, asserted in
 * both directions by `packages/protocol/src/test/v8-execute.test.ts`, so one
 * type serves both eras rather than a third type parameter that would only ever
 * be filled with structurally equal arguments.
 *
 * @remarks **Privacy-sensitive.** Every member carries data the zero-knowledge
 * proofs were designed to keep confidential. Do not log, serialize or transmit
 * a value of a type derived from this one.
 *
 * @typeParam Result - What the circuit itself returned.
 * @typeParam PrivateState - The private state the execution produced.
 */
export interface CallResultPrivateBase<Result, PrivateState> extends ContractCallPrivateBase {
  /**
   * The JS representation of the value the circuit returned.
   */
  readonly result: Result;
  /**
   * The private state resulting from executing the circuit.
   */
  readonly nextPrivateState: PrivateState;
  /**
   * The Zswap local state resulting from executing the circuit.
   */
  readonly nextZswapLocalState: ZswapLocalState;
}

/**
 * What every era carries alongside the transaction it composed.
 *
 * The composed transaction itself is NOT here: the eras express it differently
 * — a live `UnprovenTransaction` in the current era, serialized bytes in a
 * retained one — and only the coin list is the same shape on both sides.
 *
 * @remarks **Privacy-sensitive.** `newCoins` is shielded coin material.
 */
export interface UnsubmittedTxDataBase {
  /**
   * New coins created for the caller during the construction of the
   * transaction. Empty when the call minted nothing to the caller's own key.
   */
  readonly newCoins: ShieldedCoinInfo[];
}

/**
 * What a call transaction resolves with when it is submitted WITHOUT waiting
 * for finalization, in every era.
 *
 * There is no finalized record here and there cannot be one — the call has not
 * been recorded yet. The execution data is a different matter: it is complete
 * by the time the transaction is submitted, and unrecoverable afterwards
 * without composing a second transaction, so every era carries it.
 *
 * @typeParam CallTxData - That era's unsubmitted call transaction data.
 */
export interface SubmittedCallTxBase<CallTxData> {
  /**
   * The transaction ID returned from submission.
   */
  readonly txId: string;
  /**
   * The execution data of the call that was submitted.
   *
   * @remarks **Privacy-sensitive.** Carries the call's private half.
   */
  readonly callTxData: CallTxData;
}
