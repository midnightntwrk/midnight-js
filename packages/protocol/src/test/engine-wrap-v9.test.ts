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
import { ContractCallPrototype, ContractOperation, ContractState, Intent, sampleContractAddress } from '@midnightntwrk/ledger-v9';
import { describe, expect, it } from 'vitest';

import type { DownConvertedState } from '../engine/down-convert';
import type { TranscriptPojo } from '../engine/execute';
import { wrapKeepStateCall } from '../engine/wrap-v9';
import { Ledger8ComposeFailedError, PROTOCOL_ERROR_CODES } from '../errors';

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
  privateStateAfter: {}
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

  it('throws Ledger8ComposeFailedError (stage wrap-call) when the given contract state has no registered operation for the circuit', () => {
    const address = sampleContractAddress();
    const blankContractState = new ContractState();

    let caught: unknown;
    try {
      wrapKeepStateCall({ transcript: buildTranscript(), contractAddress: address, contractState: blankContractState });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8ComposeFailedError);
    const error = caught as Ledger8ComposeFailedError;
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.LEDGER8_COMPOSE_FAILED);
    expect(error.stage).toBe('wrap-call');
    expect(error.circuitId).toBe('increment');
  });
});
