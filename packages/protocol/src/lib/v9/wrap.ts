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

import * as ledgerV9 from '@midnightntwrk/ledger-v9';

import { assembleCallPrototype } from '../shared/assemble-call';
import type { TranscriptPojo } from '../v8/execute';

/**
 * Everything {@link wrapKeepStateCall} needs to wrap one keep-state call.
 * `contractState` is the migrated, post-fork v9 `ContractState` — read from
 * chain, or otherwise carrying the contract's real registered operations —
 * used only to look up the `ContractOperation` for `transcript.circuitId`
 * (mirrors `ComposeV8CallOptions`'s `contractState` parameter in
 * `../v8/compose.ts`).
 */
export interface WrapKeepStateCallOptions {
  readonly transcript: TranscriptPojo;
  readonly contractAddress: string;
  readonly contractState: ledgerV9.ContractState;
}

/**
 * Wraps a {@link TranscriptPojo} — the output of {@link executeCircuit}
 * (`./execute.ts`) — into a v9-native `ContractCallPrototype`, ready for
 * `Intent.new(ttl).addCall(...)`, via {@link assembleCallPrototype}
 * (`./assemble-call.ts`) against the ledger-v9 module. This is the
 * "keep-state" leg: the contract keeps running on the retained pre-fork
 * execution engine after the fork, but the resulting call is bound NATIVELY
 * against the current ledger-v9 axis from the start — no v8-tx carrier, no
 * later re-bind.
 *
 * `options.contractState` is the migrated, post-fork v9 `ContractState` —
 * read from chain, or otherwise carrying the contract's real registered
 * operations. A keep-state call never registers a new verifier key (unlike
 * a deploy); it reuses whichever key was already registered on-chain by the
 * contract's original (pre-fork) deploy and carried through the migration —
 * so `contractState` must already carry that operation, or this throws
 * `ComposeFailedError` (`../../errors.ts`) rather than silently
 * falling back to a blank, unverifiable operation: stage `'wrap-call'` when
 * no operation is registered for the circuit at all, and
 * `'call-verifier-key'` when the one registered carries no verifier key.
 */
export const wrapKeepStateCall = (options: WrapKeepStateCallOptions): ledgerV9.ContractCallPrototype => {
  const { transcript, contractAddress, contractState } = options;
  return assembleCallPrototype(ledgerV9, {
    circuitId: transcript.circuitId,
    contractAddress,
    // The retained execution leg partitions nothing: it hands over the raw op
    // sequence the circuit emitted, against the state it ran on.
    transcript: {
      kind: 'unpartitioned',
      preState: transcript.preContractState.data.state.encode(),
      publicTranscript: transcript.publicTranscript
    },
    privateTranscriptOutputs: transcript.privateTranscriptOutputs,
    input: transcript.input,
    output: transcript.output,
    operations: contractState,
    stage: 'wrap-call',
    version: 'v9'
  });
};
