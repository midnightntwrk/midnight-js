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
import type {
  AlignedValue,
  CallContext,
  CoinCommitment,
  Effects,
  EncodedStateValue,
  Op,
  Transcript
} from '@midnightntwrk/ledger-v9';

import { ComposeFailedError, type ComposeStage } from '../../errors';
import type { CallTranscriptSource, PartitionContext } from './compose-types';
import type { LedgerVersion } from './ledger-version';

/**
 * The `QueryContext` capability {@link assembleCallPrototype} needs beyond
 * construction: the two settable members and the one method the pre-partition
 * bridge writes a {@link PartitionContext} through.
 *
 * @typeParam TSelf The module's own `QueryContext` type, which
 * `insertCommitment` returns rather than mutating in place.
 * @see {@link ComposeRefusalOrder}
 */
export interface PartitionableQueryContext<TSelf> {
  block: CallContext;
  effects: Effects;
  insertCommitment: (commitment: CoinCommitment, index: bigint) => TSelf;
}

/**
 * The structural surface a ledger module (ledger-v8 or ledger-v9) exposes for
 * assembling a call prototype. Every type parameter is inferred from the
 * module namespace itself, so callers pass the module and never spell out type
 * arguments.
 *
 * @see {@link ComposeRefusalOrder} for why the payload types are declared once
 * against ledger-v9, and why `Transcript` is spelled out rather than left as a
 * type parameter.
 */
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
 * @typeParam TOperation The resolved operation, constrained to the one
 * property this module inspects: a registered operation must carry a verifier
 * key for a call against it to be verifiable.
 * @see {@link ComposeRefusalOrder}
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
 * lookup — the only stage choice a caller has, and narrower than
 * {@link ComposeStage} for that reason.
 *
 * @see {@link ComposeRefusalOrder}
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
  // The era every failure raised here names -- see ComposeRefusalOrder.
  readonly version: LedgerVersion;
}

/**
 * Writes the context a call recorded onto the query context its transcript is
 * about to be partitioned against. Returns the folded context, never the one
 * it started from.
 *
 * @see {@link ComposeRefusalOrder}
 */
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

/**
 * Resolves a call's guaranteed/fallible transcript pair: a partitioned source
 * is passed through untouched, an unpartitioned one is bridged into the
 * module's own `QueryContext` ({@link bridgePartitionContext}) and split there.
 *
 * @see {@link ComposeRefusalOrder}
 */
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
  options: AssembleCallOptions<TOperation>
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
  try {
    partitioned = ledger.partitionTranscripts(
      [new ledger.PreTranscript(queryContext, transcript.publicTranscript)],
      ledger.LedgerParameters.initialParameters()
    );
  } catch (cause) {
    throw new ComposeFailedError(version, 'call-partition', circuitId, cause);
  }
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
 * @typeParam TQueryContext The module's own `QueryContext`. Every other type
 * parameter is inferred from the module namespace, so callers pass the module
 * and never spell out type arguments.
 * @typeParam TOperation The resolved operation, constrained to
 * {@link VerifiableOperation}.
 * @param ledger The ledger module (ledger-v8 or ledger-v9) to assemble
 * against.
 * @param options The call's own inputs, the operation registry to resolve
 * `circuitId` against, and the era to name in a failure.
 * @returns The module's own `ContractCallPrototype` for this call.
 * @throws ComposeFailedError naming `version` and `circuitId`, at
 * `options.stage` when `operations` has no registered operation for
 * `circuitId`; at `'call-verifier-key'` when the resolved operation carries no
 * verifier key; at `'call-transcript-empty'`, `'call-contract-state'`,
 * `'call-partition-context'` or `'call-partition'` from resolving the
 * transcript pair; at `'call-prototype'` when the module rejects the call's
 * own inputs.
 * @throws Error, deliberately carrying no protocol error code, when the
 * module's own partitioner returns no result — its invariant, not a caller
 * fault.
 * @see {@link ComposeRefusalOrder}
 */
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

  // Wrapped as one step rather than per argument -- see ComposeRefusalOrder.
  try {
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
};
