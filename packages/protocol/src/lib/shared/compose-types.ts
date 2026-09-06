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
 * @see {@link ComposeRefusalOrder} for why partitioning needs the context the
 * circuit actually ran on, and why `CallContext` and `Effects` are declared
 * once against ledger-v9.
 * @see {@link RetainedEraExecution} for why each member is read off the
 * context it is.
 * @see {@link EraSeam}
 */
export interface PartitionContext {
  readonly block: CallContext;
  readonly effects: Effects;
  /** Commitment -> the index the runtime recorded it at. Empty for a call that received no coin. */
  readonly comIndices: ReadonlyMap<CoinCommitment, bigint>;
}

/**
 * Where a call's public transcript comes from. Two shapes, because neither
 * production leg subsumes the other:
 *
 * - `'unpartitioned'` — the raw op sequence a circuit emitted on the retained
 *   pre-fork execution leg, the state it ran against, and the
 *   {@link PartitionContext} that leg recorded.
 * - `'partitioned'` — a guaranteed/fallible pair already split by compact-js,
 *   which is the current production path.
 *
 * Every member is plain data in the ledger's own declared algebra — no live
 * WASM handle.
 *
 * @see {@link RetainedEraExecution} for the leg that submits the unpartitioned
 * shape.
 * @see {@link ComposeRefusalOrder} for why an already-partitioned pair is
 * passed through rather than re-derived.
 * @see {@link EraSeam}
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
 * One contract call in a call transaction.
 *
 * `contractState` is the raw, serialized state the call is dispatched against,
 * as read from chain. It supplies the registered operation for `circuitId`,
 * including its verifier key, which the call's key location hashes; a
 * constructor-built state will not do, because it declares its entry points
 * with blank keys.
 *
 * `communicationCommitmentRandomness` is the randomness the runtime bound a
 * cross-contract callee to its caller with. The root call — being no one's
 * callee — omits it and gets fresh randomness.
 *
 * @see {@link EraSeam}
 */
export interface ComposeCallEntry {
  readonly contractAddress: string;
  readonly circuitId: string;
  readonly contractState: Uint8Array;
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
 * The two Zswap offers are serialized offer bytes. `networkId` and `ttl` carry
 * the caller's policy decisions — which network, how long the transaction
 * lives.
 *
 * @see {@link ComposeRefusalOrder} for when the envelope options are checked.
 * @see {@link EraSeam}
 */
export interface ComposeCallOptions {
  readonly calls: readonly ComposeCallEntry[];
  readonly networkId: string;
  readonly ttl: Date;
  readonly guaranteedZswapOffer?: Uint8Array;
  readonly fallibleZswapOffer?: Uint8Array;
}

/**
 * Everything a deploy transaction needs.
 *
 * `contractState` is the raw, serialized initial state the contract's
 * constructor produced.
 *
 * `verifierKeys` maps entry-point name -> raw, tagged verifier key bytes
 * (`keys/<id>.verifier`). When supplied, the map must name exactly the entry
 * points the state declares — no more, no fewer. Omit it only for a state that
 * ALREADY carries its keys.
 *
 * @see {@link VerifierKeys}
 * @see {@link EraSeam}
 */
export interface ComposeDeployOptions {
  readonly contractState: Uint8Array;
  readonly verifierKeys?: ReadonlyMap<string, Uint8Array>;
  readonly networkId: string;
  readonly ttl: Date;
  readonly guaranteedZswapOffer?: Uint8Array;
}

/**
 * What a composed deploy hands back.
 *
 * `contractAddress` cannot be recomputed from the state a caller passed in, so
 * it is handed back here rather than derived. `initialState` is the state that
 * address was derived from — what a caller stores and later hands to a call.
 *
 * All three are plain data.
 *
 * @see {@link VerifierKeys} for why the address cannot be recomputed.
 * @see {@link EraSeam}
 */
export interface DeployResultPojo {
  readonly transaction: Uint8Array;
  readonly contractAddress: string;
  readonly initialState: Uint8Array;
}
