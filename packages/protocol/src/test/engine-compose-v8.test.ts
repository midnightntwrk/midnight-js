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
import * as LedgerV8 from '@midnightntwrk/ledger-v8';
import { describe, expect, it } from 'vitest';

import { type ComposeV8CallOptions, composeV8CallTx } from '../engine/compose-v8';
import type { DownConvertedState } from '../engine/down-convert';
import type { TranscriptPojo } from '../engine/execute';
import { Ledger8ComposeFailedError, PROTOCOL_ERROR_CODES } from '../errors';

const NETWORK_ID = 'test-network';
const TTL = new Date(Date.now() + 3_600_000);

// The exact tag `Transaction.serialize()` emits for an unproven
// (SignatureEnabled/PreProof/PreBinding) transaction — derived empirically by
// serializing an unproven transaction against the pinned
// `@midnightntwrk/ledger-v8@8.1.1` build, not guessed.
// A `parseSerializedTag` round trip is NOT exercised here: this tag's
// `version` segment (`transaction[v9](signature[v1],proof-preimage,embedded-fr[v1])`)
// contains `[`, `]`, `(`, `)`, and `,` — bytes `parseSerializedTag`'s
// `namespace:version:` grammar rejects (segments must match
// `/^[a-z0-9_-]+$/i`). That round trip is exercised at the consumer layer
// against tags whose grammar it actually accepts (e.g. `ContractState`'s
// `contract-state[v6]`/`[v8]` tags) — see `packages/utils`'s own
// `serialized-tag.test.ts` and `envelope.ts`'s callers.
const V8_UNPROVEN_TX_TAG = 'midnight:transaction[v9](signature[v1],proof-preimage,embedded-fr[v1]):';

const FIELD_ALIGNMENT: ocrt3.Alignment = [{ tag: 'atom', value: { tag: 'field' } }];
const fieldValue = (byte: number): ocrt3.AlignedValue => ({ value: [new Uint8Array(32).fill(byte)], alignment: FIELD_ALIGNMENT });
const buildState = (byte: number): DownConvertedState => ({ data: new ocrt3.ChargedState(ocrt3.StateValue.newCell(fieldValue(byte))) });

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
// tagged blob — arbitrary bytes are rejected (same rationale as
// engine-wrap-v9.test.ts). Reuses the already-committed twin-contract key.
const REGISTERED_VERIFIER_KEY = readFileSync(
  resolve(__dirname, '../../../../testkit-js/testkit-js/src/fixtures/hf/twin-contract/compiled/keys/increment.verifier')
);

const buildV8ContractStateWithOperation = (circuitId: string): LedgerV8.ContractState => {
  const contractState = new LedgerV8.ContractState();
  const op = new LedgerV8.ContractOperation();
  op.verifierKey = REGISTERED_VERIFIER_KEY;
  contractState.setOperation(circuitId, op);
  return contractState;
};

const buildCallOptions = (contractState: LedgerV8.ContractState): ComposeV8CallOptions => ({
  transcript: buildTranscript(),
  contractAddress: LedgerV8.sampleContractAddress(),
  contractState,
  networkId: NETWORK_ID,
  ttl: TTL
});

describe('composeV8CallTx (real ledger-v8 WASM)', () => {
  it('composes and serializes a v8-native call transaction, tag-prefixed exactly as ledger-v8 emits it', () => {
    const contractState = buildV8ContractStateWithOperation('increment');

    const bytes = composeV8CallTx(buildCallOptions(contractState), LedgerV8);

    expect(bytes).toBeInstanceOf(Uint8Array);
    const tag = Buffer.from(bytes.subarray(0, V8_UNPROVEN_TX_TAG.length)).toString('latin1');
    expect(tag).toBe(V8_UNPROVEN_TX_TAG);
  });

  it('round-trips through the real v8 decoder: deserialize then re-serialize yields byte-identical output', () => {
    const contractState = buildV8ContractStateWithOperation('increment');

    const bytes = composeV8CallTx(buildCallOptions(contractState), LedgerV8);
    const back = LedgerV8.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', bytes);

    expect(Buffer.from(back.serialize())).toEqual(Buffer.from(bytes));
  });

  it('never proves the transaction: the serialized bytes carry a pre-proof tag, not a real proof', () => {
    const contractState = buildV8ContractStateWithOperation('increment');

    const bytes = composeV8CallTx(buildCallOptions(contractState), LedgerV8);

    expect(Buffer.from(bytes).toString('latin1')).toContain('proof-preimage');
  });

  it('throws Ledger8ComposeFailedError (stage call-operation) when the v8 contract state has no registered operation for the circuit', () => {
    const blankContractState = new LedgerV8.ContractState();

    let caught: unknown;
    try {
      composeV8CallTx(buildCallOptions(blankContractState), LedgerV8);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8ComposeFailedError);
    const error = caught as Ledger8ComposeFailedError;
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.LEDGER8_COMPOSE_FAILED);
    expect(error.stage).toBe('call-operation');
    expect(error.circuitId).toBe('increment');
  });

  it('throws a plain Error when partitionTranscripts returns no result for the single call submitted', () => {
    const contractState = buildV8ContractStateWithOperation('increment');
    const poisonedV8: typeof LedgerV8 = { ...LedgerV8, partitionTranscripts: () => [] };

    expect(() => composeV8CallTx(buildCallOptions(contractState), poisonedV8)).toThrow(/partitionTranscripts returned no result/);
  });

  it('uses the exact operation resolved from contractState.operation(circuitId), not a blank default', () => {
    // A blank `ContractOperation` (no verifierKey assigned) is a distinct,
    // valid WASM value from the registered one — composing against each
    // produces different serialized bytes only if the resolved operation
    // genuinely flows into `ContractCallPrototype`, not a hardcoded stand-in.
    const withRegisteredKey = buildV8ContractStateWithOperation('increment');
    const withBlankOperation = new LedgerV8.ContractState();
    withBlankOperation.setOperation('increment', new LedgerV8.ContractOperation());

    const bytesWithRegisteredKey = composeV8CallTx(buildCallOptions(withRegisteredKey), LedgerV8);
    const bytesWithBlankOperation = composeV8CallTx(buildCallOptions(withBlankOperation), LedgerV8);

    expect(Buffer.from(bytesWithRegisteredKey)).not.toEqual(Buffer.from(bytesWithBlankOperation));
  });
});
