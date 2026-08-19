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

import { Ledger8ComposeFailedError } from '../errors';
import type { ProtocolV8 } from '../load-v8';
import type { TranscriptPojo } from './execute';

/**
 * Everything {@link composeV8CallTx} needs to assemble one v8-native call
 * transaction. `contractState` is the v8-native `ContractState` the call is
 * dispatched against — read from chain, or the `ContractDeploy.initialState`
 * a prior {@link composeV8DeployTx} (`engine/deploy-v8.ts`) call produced —
 * used only to look up the `ContractOperation` for `transcript.circuitId`
 * (mirrors {@link wrapKeepStateCall}'s `contractState` parameter in
 * `engine/wrap-v9.ts`, and the spike's own `assembleCallV8`). `networkId` and
 * `ttl` are left to the caller rather than hardcoded: which network id and
 * TTL policy a live deployment uses is an integration-milestone concern, out
 * of scope here.
 */
export interface ComposeV8CallOptions {
  readonly transcript: TranscriptPojo;
  readonly contractAddress: string;
  readonly contractState: InstanceType<ProtocolV8['ContractState']>;
  readonly networkId: string;
  readonly ttl: Date;
}

/**
 * Bridges a {@link TranscriptPojo}'s pre-call state into a v8-native
 * `QueryContext`. Same envelope-crossing rationale as `wrap-v9.ts`'s
 * `toV9QueryContext`: the `EncodedStateValue` produced by
 * `.data.state.encode()` is structurally identical between the pre-fork
 * (`onchain-runtime-v3`) and ledger-v8 packages, so decoding it through
 * ledger-v8's own `StateValue`/`ChargedState` is a safe envelope crossing,
 * not a lossy re-encode.
 */
const toV8QueryContext = (
  transcript: TranscriptPojo,
  contractAddress: string,
  v8: ProtocolV8
): InstanceType<ProtocolV8['QueryContext']> => {
  const stateValue = v8.StateValue.decode(transcript.preContractState.data.state.encode());
  return new v8.QueryContext(new v8.ChargedState(stateValue), contractAddress);
};

/**
 * Composes a v8-native call transaction from a {@link TranscriptPojo} — the
 * output of {@link executeCircuit} (`engine/execute.ts`) — and immediately
 * serializes it. This is the "same-era" leg: both the circuit's execution
 * and the call it produces are bound entirely on the ledger-v8 axis (the
 * spike's `assembleCallV8`), as opposed to {@link wrapKeepStateCall}
 * (`engine/wrap-v9.ts`), which binds a retained-execution transcript
 * natively onto the current, post-fork ledger-v9 axis instead.
 *
 * Never proves the transaction — the returned bytes are an UNPROVEN,
 * tag-prefixed serialization (`midnight:transaction[...]:...`), exactly what
 * `Transaction.serialize()` produces before `.prove()` is ever called. Real
 * proving needs a running proof server and is out of scope for this engine
 * seam (and for its unit tests — see the test file for why).
 *
 * Throws {@link Ledger8ComposeFailedError} (stage `'call-operation'`) when
 * `contractState` has no registered operation for the transcript's circuit,
 * rather than silently falling back to a blank, unverifiable operation.
 */
export const composeV8CallTx = (options: ComposeV8CallOptions, v8: ProtocolV8): Uint8Array => {
  const { transcript, contractAddress, contractState, networkId, ttl } = options;

  const op = contractState.operation(transcript.circuitId);
  if (op === undefined) {
    throw new Ledger8ComposeFailedError('call-operation', transcript.circuitId);
  }

  const params = v8.LedgerParameters.initialParameters();
  const queryContext = toV8QueryContext(transcript, contractAddress, v8);
  const partitioned = v8.partitionTranscripts([new v8.PreTranscript(queryContext, transcript.publicTranscript)], params);
  const first = partitioned[0];
  if (first === undefined) {
    throw new Error('partitionTranscripts returned no result for the v8-native call transcript.');
  }
  const [guaranteed, fallible] = first;

  const prototype = new v8.ContractCallPrototype(
    contractAddress,
    transcript.circuitId,
    op,
    guaranteed,
    fallible,
    transcript.privateTranscriptOutputs,
    transcript.input,
    transcript.output,
    v8.communicationCommitmentRandomness(),
    transcript.circuitId
  );

  const intent = v8.Intent.new(ttl).addCall(prototype);
  const unproven = v8.Transaction.fromPartsRandomized(networkId, undefined, undefined, intent);
  return unproven.serialize();
};
