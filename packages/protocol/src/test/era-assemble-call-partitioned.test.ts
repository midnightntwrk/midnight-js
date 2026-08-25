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
import { assembleCallPrototype } from '../lib/engine/assemble-call';
import type { CallTranscriptSource } from '../lib/era/compose-types';

const FIELD_ALIGNMENT: ocrt3.Alignment = [{ tag: 'atom', value: { tag: 'field' } }];
const fieldValue = (byte: number): ocrt3.AlignedValue => ({
  value: [new Uint8Array(32).fill(byte)],
  alignment: FIELD_ALIGNMENT
});

// `ContractOperation.verifierKey`'s setter validates a
// `midnight:verifier-key[...]:` tagged blob, so a synthetic key will not do —
// reuses the already-committed twin-contract key, as engine-wrap-v9.test.ts does.
const REGISTERED_VERIFIER_KEY = readFileSync(
  resolve(__dirname, '../../../../testkit-js/testkit-js/src/fixtures/hf/twin-contract/compiled/keys/increment.verifier')
);

const contractStateWithOperation = (): ledgerV9.ContractState => {
  const contractState = new ledgerV9.ContractState();
  const op = new ledgerV9.ContractOperation();
  op.verifierKey = REGISTERED_VERIFIER_KEY;
  contractState.setOperation('increment', op);
  return contractState;
};

const PRE_STATE: ledgerV9.EncodedStateValue = ocrt3.StateValue.newCell(fieldValue(0x01)).encode();
// A single no-op is the smallest program that partitions into a DEFINED
// guaranteed transcript; an empty program partitions into a pair of
// `undefined`s, which would make the comparison below vacuous.
const PUBLIC_TRANSCRIPT: ledgerV9.Op<ledgerV9.AlignedValue>[] = [{ noop: { n: 1 } }];

const partitionOf = (address: string): readonly [ledgerV9.Transcript<ledgerV9.AlignedValue> | undefined, ledgerV9.Transcript<ledgerV9.AlignedValue> | undefined] => {
  const queryContext = new ledgerV9.QueryContext(
    new ledgerV9.ChargedState(ledgerV9.StateValue.decode(PRE_STATE)),
    address
  );
  return ledgerV9.partitionTranscripts(
    [new ledgerV9.PreTranscript(queryContext, PUBLIC_TRANSCRIPT)],
    ledgerV9.LedgerParameters.initialParameters()
  )[0];
};

// An Intent's actions are a union of calls and deploys, so the call has to be
// narrowed out rather than indexed blindly.
const callIn = (intent: ledgerV9.Intent<ledgerV9.SignatureEnabled, ledgerV9.PreProof, ledgerV9.PreBinding>): ledgerV9.ContractCall<ledgerV9.PreProof> => {
  const calls = intent.actions.filter((action) => action instanceof ledgerV9.ContractCall);
  if (calls.length !== 1) {
    throw new Error(`expected exactly one contract call on the intent, found ${calls.length}`);
  }
  return calls[0];
};

const assembleWith = (
  address: string,
  transcript: CallTranscriptSource,
  operations: ledgerV9.ContractState,
  communicationCommitmentRandomness: string
): ledgerV9.ContractCallPrototype =>
  assembleCallPrototype(ledgerV9, {
    circuitId: 'increment',
    contractAddress: address,
    transcript,
    privateTranscriptOutputs: [],
    input: fieldValue(0x10),
    output: fieldValue(0x20),
    communicationCommitmentRandomness,
    operations,
    stage: 'call-operation',
    version: 'v9'
  });

// The two shapes exist because neither leg subsumes the other: the retained
// pre-fork execution leg hands over a raw public transcript it has not
// partitioned, while the current v9 production path receives transcripts
// compact-js has already partitioned. Collapsing them would force one leg to
// undo work the other never did.
describe('assembleCallPrototype from an already-partitioned transcript', () => {
  it('builds a prototype a v9 Intent accepts, keeping the partition it was handed', () => {
    const address = ledgerV9.sampleContractAddress();
    const [guaranteed, fallible] = partitionOf(address);

    const prototype = assembleWith(
      address,
      { kind: 'partitioned', guaranteed, fallible },
      contractStateWithOperation(),
      ledgerV9.communicationCommitmentRandomness()
    );

    expect(prototype).toBeInstanceOf(ledgerV9.ContractCallPrototype);
    const call = callIn(ledgerV9.Intent.new(new Date(Date.now() + 3_600_000)).addCall(prototype));
    // This program's ops are all guaranteed, so the guaranteed transcript must
    // arrive populated and the fallible one absent. Swapping the two positional
    // arguments would misplace the work between the transaction's guaranteed
    // and fallible sections and pass every other assertion here.
    expect(call.guaranteedTranscript).toBeDefined();
    expect(call.fallibleTranscript).toBeUndefined();
    expect(call.entryPoint).toBe('increment');
    expect(call.address).toBe(address);
  });

  // The claim this module rests on: partitioning a transcript up front and
  // letting the assembler partition it produce the SAME call. If they diverged,
  // the two legs would emit different transactions for the same execution.
  //
  // Compared through the call the Intent records rather than through the
  // Intent's own bytes: `Intent.new()` mints a fresh segment id, so two intents
  // built from identical calls never serialize identically. The randomness the
  // prototype carries is pinned for the same reason.
  // `ComposeCallOptions` makes both halves optional, so a source carrying
  // neither type-checks. Composed rather than refused, it yields a call that
  // claims a circuit ran and records no operations: the transaction serializes,
  // proves, submits and changes nothing. Refused only on the caller-supplied
  // arm — an empty pair from the module's own partitioner is that module's
  // answer, not a caller error.
  it('refuses a partitioned source carrying neither half rather than composing a call that does nothing', () => {
    const address = ledgerV9.sampleContractAddress();

    let caught: unknown;
    try {
      assembleWith(
        address,
        { kind: 'partitioned' },
        contractStateWithOperation(),
        ledgerV9.communicationCommitmentRandomness()
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ComposeFailedError);
    expect(caught).toMatchObject({
      code: PROTOCOL_ERROR_CODES.COMPOSE_FAILED,
      stage: 'call-transcript-empty',
      version: 'v9',
      circuitId: 'increment'
    });
  });

  it('produces the same call as partitioning the same transcript inside the assembler', () => {
    const address = ledgerV9.sampleContractAddress();
    const [guaranteed, fallible] = partitionOf(address);
    const randomness = ledgerV9.communicationCommitmentRandomness();
    const ttl = new Date(Date.now() + 3_600_000);

    const fromUnpartitioned = assembleWith(
      address,
      { kind: 'unpartitioned', preState: PRE_STATE, publicTranscript: PUBLIC_TRANSCRIPT },
      contractStateWithOperation(),
      randomness
    );
    const fromPartitioned = assembleWith(
      address,
      { kind: 'partitioned', guaranteed, fallible },
      contractStateWithOperation(),
      randomness
    );

    const render = (prototype: ledgerV9.ContractCallPrototype): string =>
      callIn(ledgerV9.Intent.new(ttl).addCall(prototype)).toString();
    expect(render(fromPartitioned)).toBe(render(fromUnpartitioned));
  });

  // Proof the branch really is a branch: a ledger whose partitioner throws
  // still assembles a partitioned call. Without the skip this would fail, and
  // the previous test alone could not tell the two paths apart.
  it('never partitions again for a transcript that arrives partitioned', () => {
    const address = ledgerV9.sampleContractAddress();
    const [guaranteed, fallible] = partitionOf(address);
    const poisoned = {
      ...ledgerV9,
      partitionTranscripts: (): never => {
        throw new Error('partitionTranscripts must not run for an already-partitioned transcript');
      }
    };

    const prototype = assembleCallPrototype(poisoned, {
      circuitId: 'increment',
      contractAddress: address,
      transcript: { kind: 'partitioned', guaranteed, fallible },
      privateTranscriptOutputs: [],
      input: fieldValue(0x10),
      output: fieldValue(0x20),
      operations: contractStateWithOperation(),
      stage: 'call-operation',
      version: 'v9'
    });

    expect(prototype).toBeInstanceOf(ledgerV9.ContractCallPrototype);
  });

  it('refuses a partitioned call whose registered operation carries no verifier key', () => {
    const address = ledgerV9.sampleContractAddress();
    const [guaranteed, fallible] = partitionOf(address);
    const blank = new ledgerV9.ContractState();
    blank.setOperation('increment', new ledgerV9.ContractOperation());

    let caught: unknown;
    try {
      assembleWith(address, { kind: 'partitioned', guaranteed, fallible }, blank, ledgerV9.communicationCommitmentRandomness());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ComposeFailedError);
    const failure = caught as ComposeFailedError;
    expect(failure.code).toBe(PROTOCOL_ERROR_CODES.COMPOSE_FAILED);
    expect(failure.stage).toBe('call-verifier-key');
    expect(failure.version).toBe('v9');
    expect(failure.circuitId).toBe('increment');
  });

  // Only the unpartitioned shape reads a pre-call state, so this is the one
  // shape that can be handed one the era cannot decode.
  it('refuses an unpartitioned call whose pre-call state the era cannot read', () => {
    const address = ledgerV9.sampleContractAddress();
    const unreadable: ledgerV9.EncodedStateValue = {
      tag: 'cell',
      content: { value: [new Uint8Array(4000).fill(0xff)], alignment: FIELD_ALIGNMENT }
    };

    let caught: unknown;
    try {
      assembleWith(
        address,
        { kind: 'unpartitioned', preState: unreadable, publicTranscript: PUBLIC_TRANSCRIPT },
        contractStateWithOperation(),
        ledgerV9.communicationCommitmentRandomness()
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ComposeFailedError);
    const failure = caught as ComposeFailedError;
    expect(failure.stage).toBe('call-contract-state');
    expect(failure.version).toBe('v9');
    expect(failure.circuitId).toBe('increment');
    expect(failure.cause).toBeInstanceOf(Error);
    expect(failure.message).not.toMatch(/[0-9a-f]{16,}/i);
  });
});
