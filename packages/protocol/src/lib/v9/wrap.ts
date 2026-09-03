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
 * (`./assemble-call.ts`) against the ledger-v9 module.
 *
 * `options.contractState` is the migrated, post-fork v9 `ContractState` —
 * read from chain, or otherwise carrying the contract's real registered
 * operations. It must already carry the operation for the circuit: a
 * keep-state call registers no new verifier key.
 *
 * @param options The transcript to wrap, the contract's address, and the
 * migrated post-fork state to resolve the circuit's operation against.
 * @returns The v9-native call prototype.
 * @throws ComposeFailedError at stage `'wrap-call'` if `contractState`
 * registers no operation for the circuit, and at `'call-verifier-key'` if the
 * registered operation carries no verifier key — rather than falling back to a
 * blank, unverifiable operation.
 * @see {@link RetainedEraExecution}
 */
export const wrapKeepStateCall = (options: WrapKeepStateCallOptions): ledgerV9.ContractCallPrototype => {
  const { transcript, contractAddress, contractState } = options;
  return assembleCallPrototype(ledgerV9, {
    circuitId: transcript.circuitId,
    contractAddress,
    // The retained execution leg partitions nothing: it always submits the raw
    // op sequence as `'unpartitioned'` -- see RetainedEraExecution.
    transcript: {
      kind: 'unpartitioned',
      preState: transcript.preContractState.data.state.encode(),
      publicTranscript: transcript.publicTranscript,
      partitionContext: transcript.partitionContext
    },
    privateTranscriptOutputs: transcript.privateTranscriptOutputs,
    input: transcript.input,
    output: transcript.output,
    operations: contractState,
    stage: 'wrap-call',
    version: 'v9'
  });
};
