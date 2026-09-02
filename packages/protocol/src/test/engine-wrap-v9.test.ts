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
import {
  ContractCall,
  ContractCallPrototype,
  ContractOperation,
  ContractState,
  Intent,
  sampleContractAddress
} from '@midnightntwrk/ledger-v9';
import { describe, expect, it } from 'vitest';

import { ComposeFailedError, PROTOCOL_ERROR_CODES } from '../errors';
import type { DownConvertedState } from '../lib/engine/down-convert';
import type { TranscriptPojo } from '../lib/engine/execute';
import { wrapKeepStateCall } from '../lib/engine/wrap-v9';
import { emptyPartitionContext, emptyZswapLocalState } from './fixtures';

const FIELD_ALIGNMENT: ocrt3.Alignment = [{ tag: 'atom', value: { tag: 'field' } }];

const fieldValue = (byte: number): ocrt3.AlignedValue => ({ value: [new Uint8Array(32).fill(byte)], alignment: FIELD_ALIGNMENT });

const buildState = (byte: number): DownConvertedState => ({
  data: new ocrt3.ChargedState(ocrt3.StateValue.newCell(fieldValue(byte)))
});

const buildTranscript = (): TranscriptPojo => ({
  circuitId: 'increment',
  result: [],
  input: fieldValue(0x10),
  output: fieldValue(0x20),
  publicTranscript: [],
  privateTranscriptOutputs: [],
  preContractState: buildState(0x01),
  postContractState: buildState(0x02),
  privateStateAfter: {},
  partitionContext: emptyPartitionContext(),
  zswapLocalState: emptyZswapLocalState()
});

// `ContractOperation.verifierKey`'s setter validates a `midnight:verifier-key[...]:`
// tagged blob — arbitrary bytes are rejected, so a synthetic key will not do.
// Reuses the already-committed, correctly-tagged `increment.verifier` key
// (compiled by THIS repo's own toolchain against the exact pinned ledger-v9
// version, per the fixtures README) rather than porting new verifier-key
// material for counter-016, which deliberately excludes keys/zkir (never
// read at import time by executeCircuit).
const REGISTERED_VERIFIER_KEY = readFileSync(
  resolve(__dirname, '../../../../testkit-js/testkit-js/src/fixtures/hf/twin-contract/compiled/keys/increment.verifier')
);

const buildContractStateWithOperation = (circuitId: string): ContractState => {
  const contractState = new ContractState();
  const op = new ContractOperation();
  op.verifierKey = REGISTERED_VERIFIER_KEY;
  contractState.setOperation(circuitId, op);
  return contractState;
};

describe('wrapKeepStateCall', () => {
  it('wraps a TranscriptPojo into a v9-native ContractCallPrototype, keyed by the transcript circuitId and address', () => {
    const address = sampleContractAddress();
    const contractState = buildContractStateWithOperation('increment');

    const prototype = wrapKeepStateCall({ transcript: buildTranscript(), contractAddress: address, contractState });

    expect(prototype).toBeInstanceOf(ContractCallPrototype);
  });

  it('produces a ContractCallPrototype (carrying the real registered operation) accepted by Intent.new(ttl).addCall(...)', () => {
    const address = sampleContractAddress();
    const contractState = buildContractStateWithOperation('increment');
    const prototype = wrapKeepStateCall({ transcript: buildTranscript(), contractAddress: address, contractState });
    const ttl = new Date(Date.now() + 3_600_000);

    expect(() => Intent.new(ttl).addCall(prototype)).not.toThrow();
  });

  // The keep-state leg partitions the transcript it is handed, so it is the leg
  // that has to carry what the pre-fork context recorded. Observable through
  // the composed call: the ledger's partitioner starts the transcript's effects
  // from the context's own, so a dropped context shows up as a call declaring
  // no claimed receive for a circuit that recorded one.
  it('carries the context the execution leg recorded into the call it composes', () => {
    const address = sampleContractAddress();
    const received = 'ef'.repeat(32);
    const recorded = emptyPartitionContext();
    const transcript: TranscriptPojo = {
      ...buildTranscript(),
      // An empty program partitions into a pair of `undefined`s, which would
      // make the assertion below vacuous; a single no-op is the smallest one
      // that yields a defined guaranteed transcript.
      publicTranscript: [{ noop: { n: 1 } }],
      partitionContext: {
        ...recorded,
        effects: { ...recorded.effects, claimedShieldedReceives: [received] }
      }
    };

    const prototype = wrapKeepStateCall({
      transcript,
      contractAddress: address,
      contractState: buildContractStateWithOperation('increment')
    });

    const intent = Intent.new(new Date(Date.now() + 3_600_000)).addCall(prototype);
    const calls = intent.actions.filter((action) => action instanceof ContractCall);
    expect(calls).toHaveLength(1);
    expect(calls[0].guaranteedTranscript?.effects.claimedShieldedReceives).toEqual([received]);
  });

  it('throws ComposeFailedError (stage wrap-call) when the given contract state has no registered operation for the circuit', () => {
    const address = sampleContractAddress();
    const blankContractState = new ContractState();

    let caught: unknown;
    try {
      wrapKeepStateCall({ transcript: buildTranscript(), contractAddress: address, contractState: blankContractState });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ComposeFailedError);
    const error = caught as ComposeFailedError;
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.COMPOSE_FAILED);
    // The keep-state leg binds natively onto v9, so its failures name v9 —
    // even though the circuit that produced the transcript ran on v8.
    expect(error.version).toBe('v9');
    expect(error.stage).toBe('wrap-call');
    expect(error.circuitId).toBe('increment');
  });
  it('throws ComposeFailedError (stage call-verifier-key) when the registered operation carries no verifier key', () => {
    const address = sampleContractAddress();
    const contractState = new ContractState();
    contractState.setOperation('increment', new ContractOperation());

    let caught: unknown;
    try {
      wrapKeepStateCall({ transcript: buildTranscript(), contractAddress: address, contractState });
    } catch (error) {
      caught = error;
    }

    // A slot registered with a blank ContractOperation reads back with no
    // verifier key. Composing against it yields a call no prover can verify,
    // so it must fail here rather than at submission.
    expect(caught).toBeInstanceOf(ComposeFailedError);
    const error = caught as ComposeFailedError;
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.COMPOSE_FAILED);
    expect(error.stage).toBe('call-verifier-key');
    expect(error.circuitId).toBe('increment');
  });
});
