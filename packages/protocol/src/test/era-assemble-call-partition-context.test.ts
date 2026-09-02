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

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as ocrt3 from '@midnight-ntwrk/onchain-runtime-v3';
import * as ledgerV9 from '@midnightntwrk/ledger-v9';
import { describe, expect, it } from 'vitest';

import { ComposeFailedError, PROTOCOL_ERROR_CODES } from '../errors';
import { type AssembleCallOptions,assembleCallPrototype } from '../lib/engine/assemble-call';
import type { PartitionContext } from '../lib/era/compose-types';

const FIELD_ALIGNMENT: ocrt3.Alignment = [{ tag: 'atom', value: { tag: 'field' } }];
const fieldValue = (byte: number): ocrt3.AlignedValue => ({
  value: [new Uint8Array(32).fill(byte)],
  alignment: FIELD_ALIGNMENT
});

// See engine-wrap-v9.test.ts: `ContractOperation.verifierKey`'s setter
// validates a tagged blob, so the already-committed twin-contract key is
// reused rather than a synthetic one.
const REGISTERED_VERIFIER_KEY = readFileSync(
  resolve(__dirname, '../../../../testkit-js/testkit-js/src/fixtures/hf/twin-contract/compiled/keys/increment.verifier')
);

const contractStateWithOperation = (): ledgerV9.ContractState => {
  const contractState = new ledgerV9.ContractState();
  const operation = new ledgerV9.ContractOperation();
  operation.verifierKey = REGISTERED_VERIFIER_KEY;
  contractState.setOperation('increment', operation);
  return contractState;
};

const PRE_STATE: ledgerV9.EncodedStateValue = ocrt3.StateValue.newCell(fieldValue(0x01)).encode();
const PUBLIC_TRANSCRIPT: ledgerV9.Op<ledgerV9.AlignedValue>[] = [{ noop: { n: 1 } }];
const RECEIVED_COMMITMENT: ledgerV9.CoinCommitment = 'ef'.repeat(32);

// The context a call that touched no coins records: the block and effects the
// execution leg started from, and an empty commitment map. Read off a real
// `QueryContext` rather than hand-written, so a vendor field added to either
// shape arrives here instead of failing a setter.
const recordedContext = (address: string, overrides: Partial<PartitionContext> = {}): PartitionContext => {
  const queryContext = new ledgerV9.QueryContext(
    new ledgerV9.ChargedState(ledgerV9.StateValue.decode(PRE_STATE)),
    address
  );
  return {
    block: queryContext.block,
    effects: queryContext.effects,
    comIndices: new Map(),
    ...overrides
  };
};

// Split out so the same call options reach the real module and the capturing
// one below: the capturing module is not `typeof ledgerV9`, and the structural
// `CallAssemblyLedger` it does satisfy is what `assembleCallPrototype` infers
// its type arguments from.
const optionsFor = (
  address: string,
  partitionContext: PartitionContext
): AssembleCallOptions<ledgerV9.ContractOperation> => ({
  circuitId: 'increment',
  contractAddress: address,
  transcript: { kind: 'unpartitioned', preState: PRE_STATE, publicTranscript: PUBLIC_TRANSCRIPT, partitionContext },
  privateTranscriptOutputs: [],
  input: fieldValue(0x10),
  output: fieldValue(0x20),
  communicationCommitmentRandomness: ledgerV9.communicationCommitmentRandomness(),
  operations: contractStateWithOperation(),
  stage: 'call-operation',
  version: 'v9'
});

const assembleWith = (address: string, partitionContext: PartitionContext): ledgerV9.ContractCallPrototype =>
  assembleCallPrototype(ledgerV9, optionsFor(address, partitionContext));

const callIn = (prototype: ledgerV9.ContractCallPrototype): ledgerV9.ContractCall<ledgerV9.PreProof> => {
  const intent = ledgerV9.Intent.new(new Date(Date.now() + 3_600_000)).addCall(prototype);
  const calls = intent.actions.filter((action) => action instanceof ledgerV9.ContractCall);
  if (calls.length !== 1) {
    throw new Error(`expected exactly one contract call on the intent, found ${calls.length}`);
  }
  return calls[0];
};

const caught = (assemble: () => unknown): ComposeFailedError => {
  try {
    assemble();
  } catch (error) {
    if (error instanceof ComposeFailedError) {
      return error;
    }
    throw error;
  }
  throw new Error('expected the assembly to throw');
};

// An unpartitioned call is partitioned HERE, against a query context this seam
// rebuilds from bytes. Everything the execution leg's own context carried and
// the bytes do not — the block it ran against, the effects it started from, the
// commitment indices it recorded for coins received in-contract — has to travel
// with the call, exactly as compact-js's own v9 leg carries it
// (`ContractExecutable.js`, `partitionAllTranscripts`). Dropping it composes a
// call the ledger partitions against a context the circuit never ran on.
describe('assembleCallPrototype bridges the context an unpartitioned call recorded', () => {
  it('carries the effects the call started from into the transcript it records', () => {
    const address = ledgerV9.sampleContractAddress();
    const context = recordedContext(address);

    const prototype = assembleWith(address, {
      ...context,
      effects: { ...context.effects, claimedShieldedReceives: [RECEIVED_COMMITMENT] }
    });

    expect(callIn(prototype).guaranteedTranscript?.effects.claimedShieldedReceives).toEqual([RECEIVED_COMMITMENT]);
  });

  it('leaves the transcript effects empty for a call that recorded none', () => {
    const address = ledgerV9.sampleContractAddress();

    const prototype = assembleWith(address, recordedContext(address));

    expect(callIn(prototype).guaranteedTranscript?.effects.claimedShieldedReceives).toEqual([]);
  });

  it('folds the recorded commitment indices and block onto the context it partitions against', () => {
    const address = ledgerV9.sampleContractAddress();
    const context = recordedContext(address, {
      block: { ...recordedContext(address).block, secondsSinceEpoch: 1_234n },
      comIndices: new Map([[RECEIVED_COMMITMENT, 4n]])
    });

    // Only the PreTranscript construction is intercepted, to read back the
    // context the ledger was really handed; partitioning itself still runs on
    // the real module, rebuilding a genuine PreTranscript from the captured
    // pair. The structural `CallAssemblyLedger` interface is what makes this
    // possible without a cast.
    const partitionedAgainst: ledgerV9.QueryContext[] = [];
    class CapturingPreTranscript {
      constructor(
        readonly partitionedContext: ledgerV9.QueryContext,
        readonly program: ledgerV9.Op<ledgerV9.AlignedValue>[]
      ) {
        partitionedAgainst.push(partitionedContext);
      }
    }
    const capturing = {
      ...ledgerV9,
      PreTranscript: CapturingPreTranscript,
      partitionTranscripts: (calls: CapturingPreTranscript[], params: ledgerV9.LedgerParameters) =>
        ledgerV9.partitionTranscripts(
          calls.map((call) => new ledgerV9.PreTranscript(call.partitionedContext, call.program)),
          params
        )
    };

    assembleCallPrototype(capturing, optionsFor(address, context));

    expect(partitionedAgainst).toHaveLength(1);
    expect([...partitionedAgainst[0].comIndices]).toEqual([[RECEIVED_COMMITMENT, 4n]]);
    expect(partitionedAgainst[0].block.secondsSinceEpoch).toBe(1_234n);
  });

  // Every member of the recorded context is caller data the ledger validates
  // itself, and each of the three shapes below is well-typed: an out-of-range
  // u64, a hex string of the wrong length, a commitment that is not hex at all.
  // The runtime rejects each from inside wasm, so this seam reports them coded
  // like every other caller fault — and under its OWN stage, because the defect
  // is in the context the execution leg handed over, not in the state bytes
  // read from chain.
  it.each([
    [
      'a block field the era cannot read',
      (context: PartitionContext): PartitionContext => ({
        ...context,
        block: { ...context.block, secondsSinceEpoch: -1n }
      })
    ],
    [
      'an effects field the era cannot read',
      (context: PartitionContext): PartitionContext => ({
        ...context,
        effects: { ...context.effects, claimedNullifiers: ['zz'] }
      })
    ],
    [
      'a commitment the era cannot read',
      (context: PartitionContext): PartitionContext => ({ ...context, comIndices: new Map([['zz', 0n]]) })
    ]
  ])('reports %s as a coded failure', (_shape, corrupt) => {
    const address = ledgerV9.sampleContractAddress();

    const failure = caught(() => assembleWith(address, corrupt(recordedContext(address))));

    expect(failure.code).toBe(PROTOCOL_ERROR_CODES.COMPOSE_FAILED);
    expect(failure.stage).toBe('call-partition-context');
    expect(failure.version).toBe('v9');
    expect(failure.circuitId).toBe('increment');
    expect(failure.cause).toBeInstanceOf(Error);
    expect(failure.message).not.toMatch(/[0-9a-f]{16,}/i);
  });
});
