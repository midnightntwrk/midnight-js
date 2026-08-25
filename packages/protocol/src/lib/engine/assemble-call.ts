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

import { encodeContractKeyLocation, hashVerifierKey } from '@midnight-ntwrk/compact-js';
import type { AlignedValue, EncodedStateValue, Op, Transcript } from '@midnightntwrk/ledger-v9';

import { ComposeFailedError, type ComposeStage } from '../../errors';
import type { CallTranscriptSource } from '../era/compose-types';
import type { LedgerVersion } from '../ledger-version';

/**
 * The structural surface a ledger module (ledger-v8 or ledger-v9) exposes for
 * assembling a call prototype. Both modules satisfy it with every type
 * parameter inferred from the module namespace itself, so callers pass the
 * module and never spell out type arguments. The
 * `AlignedValue`/`Op`/`EncodedStateValue`/`Transcript` payload types are
 * declared once against ledger-v9: they are structurally identical across
 * onchain-runtime-v3, ledger-v8 and ledger-v9 (compile-time drift gate at the
 * bottom of engine-down-convert.test.ts, which pins all three axes).
 *
 * `Transcript` is spelled out rather than left as a type parameter because a
 * call can arrive with its transcript ALREADY partitioned (see
 * {@link CallTranscriptSource}), in which case the pair comes from the caller
 * rather than from this module's own partitioner — so there is no module-bound
 * type left to infer it from.
 */
export interface CallAssemblyLedger<
  TStateValue,
  TChargedState,
  TQueryContext,
  TPreTranscript,
  TParams,
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
  ) => (readonly [Transcript<AlignedValue> | undefined, Transcript<AlignedValue> | undefined])[];
  readonly communicationCommitmentRandomness: () => string;
  readonly ContractCallPrototype: new (
    address: string,
    entryPoint: string,
    op: TOperation,
    guaranteedPublicTranscript: Transcript<AlignedValue> | undefined,
    falliblePublicTranscript: Transcript<AlignedValue> | undefined,
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

/**
 * The stages {@link assembleCallPrototype} can reach on a failed operation
 * lookup. Narrower than {@link ComposeStage}: this function only ever
 * resolves a call's operation, so a caller cannot ask it to report a deploy
 * stage. The verifier-key and pre-call-state stages it raises itself and are
 * not a caller choice.
 */
export type CallResolutionStage = Extract<ComposeStage, 'wrap-call' | 'call-operation'>;

/**
 * Everything {@link assembleCallPrototype} needs beyond the ledger module.
 *
 * Carries the call's inputs directly rather than a whole execution transcript:
 * a call that arrives already partitioned never ran on this process's execution
 * leg at all, so there is no transcript object to hand over — only the pieces a
 * prototype is built from.
 */
export interface AssembleCallOptions<TOperation> {
  readonly circuitId: string;
  readonly contractAddress: string;
  readonly transcript: CallTranscriptSource;
  readonly privateTranscriptOutputs: AlignedValue[];
  readonly input: AlignedValue;
  readonly output: AlignedValue;
  /**
   * The randomness the runtime bound a cross-contract callee to its caller
   * with. Omitted for a root call, which is no one's callee and gets fresh
   * randomness from the ledger module.
   */
  readonly communicationCommitmentRandomness?: string;
  readonly operations: CallOperationRegistry<TOperation>;
  readonly stage: CallResolutionStage;
  // The era every failure raised here names. Passed rather than inferred from
  // the ledger module: this function is generic over the module, so it has no
  // way to ask which axis it was handed.
  readonly version: LedgerVersion;
}

/**
 * Resolves a call's guaranteed/fallible transcript pair.
 *
 * A partitioned source is passed through untouched — the whole point of the
 * shape. Re-partitioning it would need a query context the caller no longer
 * has, to redo work compact-js already did.
 *
 * An unpartitioned source is bridged into the module's own `QueryContext` and
 * split there. That bridge is a safe envelope crossing, not a lossy re-encode:
 * the `EncodedStateValue` algebra is structurally identical between
 * onchain-runtime-v3 and both ledger modules (compile-time drift gate in
 * engine-down-convert.test.ts). A state the module still cannot read is the
 * caller's, so it leaves as {@link ComposeFailedError} at stage
 * `'call-contract-state'` with the decoder's own failure on `cause`, rather
 * than as a raw WASM error.
 *
 * `partitionTranscripts` then returning nothing for the single call submitted
 * is an internal invariant of the ledger module, not a caller error, so that
 * one throws a plain `Error` and deliberately carries no protocol error code.
 */
const resolvePartition = <TStateValue, TChargedState, TQueryContext, TPreTranscript, TParams, TOperation, TPrototype>(
  ledger: CallAssemblyLedger<TStateValue, TChargedState, TQueryContext, TPreTranscript, TParams, TOperation, TPrototype>,
  options: AssembleCallOptions<TOperation>
): readonly [Transcript<AlignedValue> | undefined, Transcript<AlignedValue> | undefined] => {
  const { transcript, contractAddress, circuitId, version } = options;
  if (transcript.kind === 'partitioned') {
    // Only the CALLER-supplied pair is checked. An empty pair coming back from
    // the module's own partitioner below is that module's answer for the
    // program it was handed, and this seam does not overrule it. A partitioned
    // source carrying neither half is different: it is a caller with nothing to
    // compose, and a prototype built from it would claim a circuit ran while
    // recording no operations — the same silent no-op `'call-empty'` refuses
    // one level up.
    if (transcript.guaranteed === undefined && transcript.fallible === undefined) {
      throw new ComposeFailedError(version, 'call-transcript-empty', circuitId);
    }
    return [transcript.guaranteed, transcript.fallible];
  }

  let queryContext: TQueryContext;
  try {
    const stateValue = ledger.StateValue.decode(transcript.preState);
    queryContext = new ledger.QueryContext(new ledger.ChargedState(stateValue), contractAddress);
  } catch (cause) {
    throw new ComposeFailedError(version, 'call-contract-state', circuitId, cause);
  }

  const partitioned = ledger.partitionTranscripts(
    [new ledger.PreTranscript(queryContext, transcript.publicTranscript)],
    ledger.LedgerParameters.initialParameters()
  );
  const first = partitioned[0];
  if (first === undefined) {
    throw new Error('partitionTranscripts returned no result for the call transcript.');
  }
  return first;
};

/**
 * Assembles one call prototype against the given ledger module — the sequence
 * every composition leg shares: resolve the circuit's registered operation,
 * resolve the call's guaranteed/fallible transcript pair (see
 * {@link resolvePartition}), and construct the module's
 * `ContractCallPrototype`.
 *
 * Throws {@link ComposeFailedError} with the caller's `stage` when
 * `operations` has no registered operation for `circuitId`, with stage
 * `'call-transcript-empty'` when a caller-supplied partitioned pair has neither
 * half,
 * and with stage `'call-verifier-key'` when the operation it resolves carries
 * no verifier key — rather than silently composing a call against a blank,
 * unverifiable operation. The second check is stage-independent because the
 * diagnosis does not differ by leg: an operation without a key is unusable on
 * either ledger axis.
 */
export const assembleCallPrototype = <
  TStateValue,
  TChargedState,
  TQueryContext,
  TPreTranscript,
  TParams,
  TOperation extends VerifiableOperation,
  TPrototype
>(
  ledger: CallAssemblyLedger<TStateValue, TChargedState, TQueryContext, TPreTranscript, TParams, TOperation, TPrototype>,
  options: AssembleCallOptions<TOperation>
): TPrototype => {
  const { circuitId, contractAddress, operations, stage, version } = options;

  const op = operations.operation(circuitId);
  if (op === undefined) {
    throw new ComposeFailedError(version, stage, circuitId);
  }
  if (op.verifierKey === undefined) {
    throw new ComposeFailedError(version, 'call-verifier-key', circuitId);
  }

  const [guaranteed, fallible] = resolvePartition(ledger, options);

  return new ledger.ContractCallPrototype(
    contractAddress,
    circuitId,
    op,
    guaranteed,
    fallible,
    options.privateTranscriptOutputs,
    options.input,
    options.output,
    options.communicationCommitmentRandomness ?? ledger.communicationCommitmentRandomness(),
    // The canonical, contract-qualified key location this framework's provers
    // resolve artifacts by (see `encodeContractKeyLocation` and
    // `ZKConfigRegistry`). A bare circuit id is ambiguous across contracts and
    // `parseContractKeyLocation` rejects it, so a call carrying one cannot be
    // proven through the registry or the DApp-connector path.
    encodeContractKeyLocation({
      contractAddress,
      circuitId,
      verifierKeyHash: hashVerifierKey(op.verifierKey)
    })
  );
};
