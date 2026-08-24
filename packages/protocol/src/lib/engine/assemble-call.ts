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

import type { AlignedValue, EncodedStateValue, Op } from '@midnightntwrk/ledger-v9';

import { Ledger8ComposeFailedError, type Ledger8ComposeStage } from '../../errors';
import type { TranscriptPojo } from './execute';

/**
 * The structural surface a retained-era ledger module (ledger-v8 or
 * ledger-v9) exposes for assembling a call prototype from a
 * {@link TranscriptPojo}. Both modules satisfy it with every type parameter
 * inferred from the module namespace itself, so callers pass the module and
 * never spell out type arguments. The `AlignedValue`/`Op`/`EncodedStateValue`
 * payload types are declared once against ledger-v9: they are structurally
 * identical across onchain-runtime-v3, ledger-v8 and ledger-v9 (see the
 * compile-time drift gate in engine-down-convert.test.ts).
 */
export interface CallAssemblyLedger<
  TStateValue,
  TChargedState,
  TQueryContext,
  TPreTranscript,
  TParams,
  TTranscript,
  TOperation,
  TPrototype
> {
  readonly StateValue: { readonly decode: (value: EncodedStateValue) => TStateValue };
  readonly ChargedState: new (state: TStateValue) => TChargedState;
  readonly QueryContext: new (state: TChargedState, contractAddress: string) => TQueryContext;
  readonly LedgerParameters: { readonly initialParameters: () => TParams };
  readonly PreTranscript: new (context: TQueryContext, program: Op<AlignedValue>[]) => TPreTranscript;
  readonly partitionTranscripts: (
    calls: TPreTranscript[],
    params: TParams
  ) => (readonly [TTranscript | undefined, TTranscript | undefined])[];
  readonly communicationCommitmentRandomness: () => string;
  readonly ContractCallPrototype: new (
    address: string,
    entryPoint: string,
    op: TOperation,
    guaranteedPublicTranscript: TTranscript | undefined,
    falliblePublicTranscript: TTranscript | undefined,
    privateTranscriptOutputs: AlignedValue[],
    input: AlignedValue,
    output: AlignedValue,
    communicationCommitmentRand: string,
    keyLocation: string
  ) => TPrototype;
}

/**
 * The slice of a ledger `ContractState` {@link assembleCallPrototype} reads.
 *
 * `TOperation` is constrained to the one property this module inspects: a
 * registered operation must carry a verifier key for a call against it to be
 * verifiable. Both eras' `ContractOperation` declare `verifierKey` as a
 * required `Uint8Array`, but a slot that was never assigned one reads back
 * `undefined` — pinned by the operation-resolution tests, so a vendor change
 * fails a test rather than silently disabling the check below.
 */
export interface CallOperationRegistry<TOperation> {
  readonly operation: (circuitId: string) => TOperation | undefined;
}

/** The one property {@link assembleCallPrototype} inspects on a resolved operation. */
export interface VerifiableOperation {
  readonly verifierKey?: Uint8Array;
}

/** Everything {@link assembleCallPrototype} needs beyond the ledger module. */
export interface AssembleCallOptions<TOperation> {
  readonly transcript: TranscriptPojo;
  readonly contractAddress: string;
  readonly operations: CallOperationRegistry<TOperation>;
  readonly stage: Ledger8ComposeStage;
}

/**
 * Assembles one call prototype from a {@link TranscriptPojo} against the
 * given ledger module — the sequence both composition legs share: resolve
 * the circuit's registered operation, bridge the transcript's pre-call state
 * into the module's own `QueryContext`, partition the public transcript, and
 * construct the module's `ContractCallPrototype`.
 *
 * The state bridge is a safe envelope crossing, not a lossy re-encode: the
 * `EncodedStateValue` produced by `.data.state.encode()` is structurally
 * identical between the pre-fork (`onchain-runtime-v3`) package and both
 * ledger modules (compile-time drift gate in engine-down-convert.test.ts),
 * so decoding it through the target module's `StateValue`/`ChargedState`
 * preserves the data exactly.
 *
 * Throws {@link Ledger8ComposeFailedError} with the caller's `stage` when
 * `operations` has no registered operation for the transcript's circuit, and
 * with stage `'call-verifier-key'` when the operation it resolves carries no
 * verifier key — rather than silently composing a call against a blank,
 * unverifiable operation. The second check is stage-independent because the
 * diagnosis does not differ by leg: an operation without a key is unusable on
 * either ledger axis.
 *
 * `partitionTranscripts` returning nothing for the single call submitted is an
 * internal invariant of the ledger module, not a caller error, so it throws a
 * plain `Error` and deliberately carries no protocol error code.
 */
export const assembleCallPrototype = <
  TStateValue,
  TChargedState,
  TQueryContext,
  TPreTranscript,
  TParams,
  TTranscript,
  TOperation extends VerifiableOperation,
  TPrototype
>(
  ledger: CallAssemblyLedger<TStateValue, TChargedState, TQueryContext, TPreTranscript, TParams, TTranscript, TOperation, TPrototype>,
  options: AssembleCallOptions<TOperation>
): TPrototype => {
  const { transcript, contractAddress, operations, stage } = options;

  const op = operations.operation(transcript.circuitId);
  if (op === undefined) {
    throw new Ledger8ComposeFailedError(stage, transcript.circuitId);
  }
  if (op.verifierKey === undefined) {
    throw new Ledger8ComposeFailedError('call-verifier-key', transcript.circuitId);
  }

  const stateValue = ledger.StateValue.decode(transcript.preContractState.data.state.encode());
  const queryContext = new ledger.QueryContext(new ledger.ChargedState(stateValue), contractAddress);
  const partitioned = ledger.partitionTranscripts(
    [new ledger.PreTranscript(queryContext, transcript.publicTranscript)],
    ledger.LedgerParameters.initialParameters()
  );
  const first = partitioned[0];
  if (first === undefined) {
    throw new Error('partitionTranscripts returned no result for the call transcript.');
  }
  const [guaranteed, fallible] = first;

  return new ledger.ContractCallPrototype(
    contractAddress,
    transcript.circuitId,
    op,
    guaranteed,
    fallible,
    transcript.privateTranscriptOutputs,
    transcript.input,
    transcript.output,
    ledger.communicationCommitmentRandomness(),
    transcript.circuitId
  );
};
