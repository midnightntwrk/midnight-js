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

import { encodeContractKeyLocation, hashVerifierKey } from '@midnightntwrk/compact-js';
import type {
  AlignedValue,
  CallContext,
  CoinCommitment,
  Effects,
  EncodedStateValue,
  Op,
  Transcript
} from '@midnightntwrk/ledger-v9';

import { ComposeFailedError, ComposeOptionError, type ComposeStage, InvariantViolationError } from '../../errors';
import {
  type CallTranscriptSource,
  INITIAL_LEDGER_PARAMETERS,
  type LedgerParametersOption,
  type PartitionContext,
  type PartitionedCallTranscript
} from './compose-types';
import type { LedgerEra } from './ledger-version';

// `insertCommitment` returns a new context rather than mutating in place.
export interface PartitionableQueryContext<TSelf> {
  block: CallContext;
  effects: Effects;
  insertCommitment: (commitment: CoinCommitment, index: bigint) => TSelf;
}

// Type parameters are inferred from the module namespace; payload types are declared once against
// ledger-v9 (see InjectedVendorSlices).
export interface CallAssemblyLedger<
  TStateValue,
  TChargedState,
  TQueryContext extends PartitionableQueryContext<TQueryContext>,
  TPreTranscript,
  TParams,
  TOperation,
  TPrototype
> {
  readonly StateValue: { readonly decode: (value: EncodedStateValue) => TStateValue };
  readonly ChargedState: new (state: TStateValue) => TChargedState;
  readonly QueryContext: new (state: TChargedState, contractAddress: string) => TQueryContext;
  readonly LedgerParameters: {
    readonly initialParameters: () => TParams;
    readonly deserialize: (raw: Uint8Array) => TParams;
  };
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

// What the split step reads: no operation registry, no private outputs, no envelope.
type PartitionCallOptions = Pick<
  AssembleCallOptions<never>,
  'circuitId' | 'contractAddress' | 'transcript' | 'ledgerParametersBytes' | 'version'
>;

export interface CallOperationRegistry<TOperation> {
  readonly operation: (circuitId: string) => TOperation | undefined;
}

export interface VerifiableOperation {
  readonly verifierKey?: Uint8Array;
}

// The only stage a caller chooses; see ComposeRefusalOrder.
export type CallResolutionStage = Extract<ComposeStage, 'wrap-call' | 'call-operation'>;

// The call's inputs, not a transcript: a partitioned call never ran on this process.
export interface AssembleCallOptions<TOperation> {
  readonly circuitId: string;
  readonly contractAddress: string;
  readonly transcript: CallTranscriptSource;
  readonly privateTranscriptOutputs: AlignedValue[];
  readonly input: AlignedValue;
  readonly output: AlignedValue;
  // Omitted for a root call, which gets fresh randomness from the ledger module.
  readonly communicationCommitmentRandomness?: string;
  readonly operations: CallOperationRegistry<TOperation>;
  // Required: the partition is drawn from this cost model; see VersionTaggedPayloads (types package).
  readonly ledgerParametersBytes: LedgerParametersOption;
  readonly stage: CallResolutionStage;
  // The era every failure raised here names -- see ComposeRefusalOrder.
  readonly version: LedgerEra;
}

// Returns the folded context, never the one it started from; see ComposeRefusalOrder.
const bridgePartitionContext = <TQueryContext extends PartitionableQueryContext<TQueryContext>>(
  queryContext: TQueryContext,
  partitionContext: PartitionContext
): TQueryContext => {
  queryContext.block = partitionContext.block;
  queryContext.effects = partitionContext.effects;
  let bridged = queryContext;
  for (const [commitment, index] of partitionContext.comIndices) {
    bridged = bridged.insertCommitment(commitment, index);
  }
  return bridged;
};

// A partitioned source passes through; an unpartitioned one is bridged and split. See ComposeRefusalOrder.
const resolvePartition = <
  TStateValue,
  TChargedState,
  TQueryContext extends PartitionableQueryContext<TQueryContext>,
  TPreTranscript,
  TParams,
  TOperation,
  TPrototype
>(
  ledger: CallAssemblyLedger<TStateValue, TChargedState, TQueryContext, TPreTranscript, TParams, TOperation, TPrototype>,
  options: PartitionCallOptions
): readonly [Transcript<AlignedValue> | undefined, Transcript<AlignedValue> | undefined] => {
  const { transcript, contractAddress, circuitId, version } = options;
  if (transcript.kind === 'partitioned') {
    // Only the CALLER-supplied pair is checked for emptiness, never the
    // partitioner's own answer below -- see ComposeRefusalOrder.
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

  try {
    queryContext = bridgePartitionContext(queryContext, transcript.partitionContext);
  } catch (cause) {
    throw new ComposeFailedError(version, 'call-partition-context', circuitId, cause);
  }

  // The partitioner rejects caller data with a raw error from inside wasm, so
  // it is coded here -- see ComposeRefusalOrder.
  let partitioned: (readonly [Transcript<AlignedValue> | undefined, Transcript<AlignedValue> | undefined])[];
  // Read before partitioning: a rejected blob is a bad option, not a failed partition. See ComposeRefusalOrder.
  let parameters: TParams;
  try {
    parameters =
      options.ledgerParametersBytes === INITIAL_LEDGER_PARAMETERS
        ? // Reachable only by naming the sentinel; wrong for a running chain.
          ledger.LedgerParameters.initialParameters()
        : // This era's reader: the bytes come from a block this era's call is built against.
          ledger.LedgerParameters.deserialize(options.ledgerParametersBytes);
  } catch (cause) {
    throw new ComposeOptionError(version, 'ledgerParametersBytes', cause);
  }

  try {
    partitioned = ledger.partitionTranscripts(
      [new ledger.PreTranscript(queryContext, transcript.publicTranscript)],
      parameters
    );
  } catch (cause) {
    throw new ComposeFailedError(version, 'call-partition', circuitId, cause);
  }
  const first = partitioned[0];
  if (first === undefined) {
    throw new InvariantViolationError('partitionTranscripts returned no result for the call transcript.');
  }
  return first;
};

// The sequence every composition leg shares: resolve the operation, resolve the transcript pair,
// construct the prototype. Refusals and their stages: see ComposeRefusalOrder.
export const assembleCallPrototype = <
  TStateValue,
  TChargedState,
  TQueryContext extends PartitionableQueryContext<TQueryContext>,
  TPreTranscript,
  TParams,
  TOperation extends VerifiableOperation,
  TPrototype
>(
  ledger: CallAssemblyLedger<TStateValue, TChargedState, TQueryContext, TPreTranscript, TParams, TOperation, TPrototype>,
  options: AssembleCallOptions<TOperation>
): { readonly prototype: TPrototype; readonly partition: PartitionedCallTranscript } => {
  const { circuitId, contractAddress, operations, stage, version } = options;

  const op = operations.operation(circuitId);
  if (op === undefined) {
    throw new ComposeFailedError(version, stage, circuitId);
  }
  if (op.verifierKey === undefined) {
    throw new ComposeFailedError(version, 'call-verifier-key', circuitId);
  }

  const [guaranteed, fallible] = resolvePartition(ledger, options);

  // Wrapped as one step rather than per argument -- see ComposeRefusalOrder.
  let prototype: TPrototype;
  try {
    prototype = new ledger.ContractCallPrototype(
      contractAddress,
      circuitId,
      op,
      guaranteed,
      fallible,
      options.privateTranscriptOutputs,
      options.input,
      options.output,
      options.communicationCommitmentRandomness ?? ledger.communicationCommitmentRandomness(),
      // The canonical, contract-qualified key location this framework's
      // provers resolve artifacts by -- see ComposeRefusalOrder.
      encodeContractKeyLocation({
        contractAddress,
        circuitId,
        verifierKeyHash: hashVerifierKey(op.verifierKey)
      })
    );
  } catch (cause) {
    throw new ComposeFailedError(version, 'call-prototype', circuitId, cause);
  }

  // Copied into a mutable pair rather than handed on: the partitioner answers
  // with a readonly tuple, and the ledger's own `PartitionedTranscript` --
  // which is what every consumer of this pair is typed against -- is not.
  return { prototype, partition: [guaranteed, fallible] };
};
