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

import type { AlignedValue, EncodedStateValue, Op, Transcript } from '@midnightntwrk/ledger-v9';

/**
 * Where a call's public transcript comes from. Two shapes, because neither
 * production leg subsumes the other:
 *
 * - `'unpartitioned'` — the retained pre-fork execution leg hands over the raw
 *   op sequence a circuit emitted, together with the state it ran against.
 *   Splitting it into a guaranteed and a fallible half is the ledger's job, and
 *   needs both halves.
 * - `'partitioned'` — the current production path receives transcripts already
 *   split by compact-js. Re-deriving the split would mean rebuilding a query
 *   context the caller no longer has, to redo work already done.
 *
 * Every member is plain data in the ledger's own declared algebra — no live
 * WASM handle — so a source can be built, stored and moved across a boundary
 * without the module that produced it.
 */
export type CallTranscriptSource =
  | {
      readonly kind: 'unpartitioned';
      readonly preState: EncodedStateValue;
      readonly publicTranscript: Op<AlignedValue>[];
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
 * as read from chain — BYTES, not a live handle, so the same entry is usable on
 * either era. It supplies the registered operation for `circuitId`, including
 * its verifier key, which the call's key location hashes; a constructor-built
 * state will not do, because it declares its entry points with blank keys.
 *
 * `communicationCommitmentRandomness` is the randomness the runtime bound a
 * cross-contract callee to its caller with. The root call — being no one's
 * callee — omits it and gets fresh randomness.
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
 * The two Zswap offers are serialized offer BYTES, not handles, for the same
 * reason `ComposeCallEntry.contractState` is. `networkId` and `ttl` carry the
 * caller's policy decisions — which network, how long the transaction lives —
 * but their well-formedness is checked before composition starts.
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
 * constructor produced — BYTES, not a live handle, so the same options are
 * usable on either era.
 *
 * `verifierKeys` maps entry-point name -> raw, tagged verifier key bytes
 * (`keys/<id>.verifier`). A compiled contract's constructor declares an
 * operation slot per circuit but leaves its verifier key blank, so a deploy
 * has to carry real keys or a ledger refuses it. When supplied, the map must
 * name exactly the entry points the state declares — no more, no fewer. Omit
 * it only for a state that ALREADY carries its keys; omitting it for a
 * constructor-built state deploys a contract with unregistered entry points.
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
 * Not a bare `Uint8Array`, because the transaction alone is not enough to use
 * the deployment: `contractAddress` is derived from the initial state AFTER
 * the verifier keys are registered AND a fresh nonce is minted, so a caller
 * cannot recompute it at all — repeating the registration would not reproduce
 * it — and `initialState` is the state that address was derived from — what a caller stores and later hands to a call.
 *
 * All three are plain data, so the whole result survives a `structuredClone`.
 * That is a transport guarantee, not an immutability one: `readonly` freezes
 * each reference, not the bytes behind it.
 */
export interface DeployResultPojo {
  readonly transaction: Uint8Array;
  readonly contractAddress: string;
  readonly initialState: Uint8Array;
}
