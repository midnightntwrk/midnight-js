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

import type {
  AlignedValue,
  CallContext,
  CoinCommitment,
  Effects,
  EncodedStateValue,
  Op,
  Transcript
} from '@midnightntwrk/ledger-v9';

/**
 * The query-context state a call recorded while it ran, which its pre-call
 * state bytes do not carry.
 *
 * `block` and `effects` are the PRE-call values; `comIndices` is the POST-call
 * map. Plain data on every member.
 *
 * @see {@link ComposeRefusalOrder}
 * @see {@link Ledger8Execution}
 */
export interface PartitionContext {
  readonly block: CallContext;
  readonly effects: Effects;
  /** Commitment -> the index the runtime recorded it at. Empty for a call that received no coin. */
  readonly comIndices: ReadonlyMap<CoinCommitment, bigint>;
}

/**
 * Where a call's public transcript comes from, as plain data:
 *
 * - `'unpartitioned'` — the op sequence a circuit emitted on the ledger 8
 *   execution leg, the state it ran against, and its {@link PartitionContext}.
 * - `'partitioned'` — a guaranteed/fallible pair compact-js already split;
 *   passed through unchanged.
 *
 * @see {@link Ledger8Execution}
 * @see {@link ComposeRefusalOrder}
 */
export type CallTranscriptSource =
  | {
      readonly kind: 'unpartitioned';
      readonly preState: EncodedStateValue;
      readonly publicTranscript: Op<AlignedValue>[];
      readonly partitionContext: PartitionContext;
    }
  | {
      readonly kind: 'partitioned';
      readonly guaranteed?: Transcript<AlignedValue>;
      readonly fallible?: Transcript<AlignedValue>;
    };

/**
 * The sentinel that asks for the ledger's own INITIAL cost model instead of the chain's.
 *
 * Wrong for any chain that has been running: the node then refuses the guaranteed segment with
 * `Transcript(Execution(OutOfGas))` after the proof is paid for. See the `VersionTaggedPayloads`
 * document of `@midnightntwrk/midnight-js-types`.
 */
export const INITIAL_LEDGER_PARAMETERS = 'initial';

/**
 * What a composer accepts for the block's ledger parameters: the chain's own serialized parameters,
 * or {@link INITIAL_LEDGER_PARAMETERS}.
 *
 * Pass the bytes from the SAME read as the contract state: the parameters are era-tagged and dated
 * per block, so a second read could answer for another block.
 */
export type LedgerParametersOption = Uint8Array | typeof INITIAL_LEDGER_PARAMETERS;

/**
 * A call's guaranteed/fallible transcript pair, as the ledger's partitioner
 * answers it. Either member is absent when that segment carries nothing.
 */
export type PartitionedCallTranscript = [
  Transcript<AlignedValue> | undefined,
  Transcript<AlignedValue> | undefined
];

/**
 * Builds the transaction's Zswap offers once the composer holds every call's
 * partition, in `calls` order. Returns serialized offer bytes per segment; an
 * absent member is the normal shape of a segment that moves no shielded coin.
 *
 * @see {@link ComposeRefusalOrder}
 */
export type ZswapOfferFactory = (partitions: readonly PartitionedCallTranscript[]) => {
  readonly guaranteedBytes?: Uint8Array;
  readonly fallibleBytes?: Uint8Array;
};

/**
 * One contract call in a call transaction.
 *
 * `contractStateBytes` is the raw, serialized state the call is dispatched against,
 * as read from chain. It supplies the registered operation for `circuitId`,
 * including its verifier key, which the call's key location hashes; a
 * constructor-built state will not do, because it declares its entry points
 * with blank keys.
 *
 * `communicationCommitmentRandomness` binds a cross-contract callee to its
 * caller; the root call omits it.
 */
export interface ComposeCallEntry {
  readonly contractAddress: string;
  readonly circuitId: string;
  readonly contractStateBytes: Uint8Array;
  /**
   * The ledger parameters the chain held at the block this call is built against, serialized —
   * `ContractStateAndParametersRead.ledgerParameters`, serialized and passed through untouched — or
   * {@link INITIAL_LEDGER_PARAMETERS} to partition against the ledger's initial cost model instead.
   */
  readonly ledgerParametersBytes: LedgerParametersOption;
  readonly transcript: CallTranscriptSource;
  readonly privateTranscriptOutputs: AlignedValue[];
  readonly input: AlignedValue;
  readonly output: AlignedValue;
  readonly communicationCommitmentRandomness?: string;
}

/**
 * Everything a call transaction needs.
 *
 * `calls` is in execution-trace order: cross-contract callees first, the root
 * call last. A circuit with no cross-contract calls has a single entry.
 *
 * `zswapOffer` is called back once every call has been assembled; omitting it
 * composes a transaction with no shielded offer.
 *
 * @see {@link ComposeRefusalOrder}
 */
export interface ComposeCallOptions {
  readonly calls: readonly ComposeCallEntry[];
  readonly networkId: string;
  readonly ttl: Date;
  readonly zswapOffer?: ZswapOfferFactory;
}

/**
 * What a composed call transaction answers with: the serialized UNPROVEN
 * transaction, and the partition each call was split into, in `calls` order.
 */
export interface ComposeCallResultPojo {
  readonly txBytes: Uint8Array;
  readonly partitions: readonly PartitionedCallTranscript[];
}

/**
 * Everything a deploy transaction needs.
 *
 * `contractStateBytes` is the raw, serialized initial state the contract's
 * constructor produced.
 *
 * `verifierKeys` maps entry-point name -> raw, tagged verifier key bytes
 * (`keys/<id>.verifier`). When supplied, the map must name exactly the entry
 * points the state declares — no more, no fewer. Omit it only for a state that
 * ALREADY carries its keys.
 *
 * @see {@link VerifierKeys}
 */
export interface ComposeDeployOptions {
  readonly contractStateBytes: Uint8Array;
  readonly verifierKeys?: ReadonlyMap<string, Uint8Array>;
  readonly networkId: string;
  readonly ttl: Date;
  readonly guaranteedZswapOfferBytes?: Uint8Array;
}

/**
 * What a composed deploy hands back.
 *
 * `contractAddress` cannot be recomputed from the state a caller passed in.
 * `initialContractStateBytes` is the state that address was derived from: what
 * a caller stores and later hands to a call.
 *
 * @see {@link VerifierKeys}
 */
export interface DeployResultPojo {
  readonly txBytes: Uint8Array;
  readonly contractAddress: string;
  readonly initialContractStateBytes: Uint8Array;
}
