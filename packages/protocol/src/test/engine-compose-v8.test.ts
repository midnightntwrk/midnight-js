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

import { Ledger8ComposeFailedError, Ledger8ComposeOptionError, PROTOCOL_ERROR_CODES } from '../errors';
import { type ComposeV8CallOptions, composeV8CallTx } from '../lib/engine/compose-v8';
import type { DownConvertedState } from '../lib/engine/down-convert';
import type { TranscriptPojo } from '../lib/engine/execute';

const NETWORK_ID = 'test-network';
const TTL = new Date(Date.now() + 3_600_000);

// The exact tag `Transaction.serialize()` emits for an unproven
// (SignatureEnabled/PreProof/PreBinding) transaction — derived empirically by
// serializing an unproven transaction against the pinned
// `@midnightntwrk/ledger-v8@8.1.1` build, not guessed.
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

const buildRegisteredOperation = (): LedgerV8.ContractOperation => {
  const op = new LedgerV8.ContractOperation();
  op.verifierKey = REGISTERED_VERIFIER_KEY;
  return op;
};

const buildV8ContractStateWithOperation = (circuitId: string): LedgerV8.ContractState => {
  const contractState = new LedgerV8.ContractState();
  contractState.setOperation(circuitId, buildRegisteredOperation());
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
    // The tag itself carries `proof-preimage`, so this one assertion is also
    // what shows the transaction was never proven.
    expect(tag).toBe(V8_UNPROVEN_TX_TAG);
  });

  it('round-trips through the real v8 decoder: deserialize then re-serialize yields byte-identical output', () => {
    const contractState = buildV8ContractStateWithOperation('increment');

    const bytes = composeV8CallTx(buildCallOptions(contractState), LedgerV8);
    const back = LedgerV8.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', bytes);

    expect(Buffer.from(back.serialize())).toEqual(Buffer.from(bytes));
  });

  it('passes the exact operation resolved from contractState.operation(circuitId) into ContractCallPrototype, and keys it by circuit id', () => {
    // Byte comparison of two composed transactions cannot show this: the
    // assembly draws fresh `communicationCommitmentRandomness()` and
    // `fromPartsRandomized` picks a random segment id, so ANY two composes
    // differ. The module is an injected parameter, so the prototype
    // constructor can be intercepted directly (no vi.doMock needed) —
    // everything else stays the real ledger-v8. Asserted by VALUE, because
    // `ContractState.operation()` returns a fresh wrapper object per call
    // (same reasoning as engine-wrap-v9-operation-resolution.test.ts).
    const captured: { op?: LedgerV8.ContractOperation; entryPoint?: Uint8Array | string; keyLocation?: string; address?: string } = {};
    // Subclasses the real prototype rather than replacing it, so no cast is
    // needed and the genuine WASM constructor still validates every argument.
    class CapturingContractCallPrototype extends LedgerV8.ContractCallPrototype {
      constructor(
        address: LedgerV8.ContractAddress,
        entryPoint: Uint8Array | string,
        op: LedgerV8.ContractOperation,
        guaranteedPublicTranscript: LedgerV8.Transcript<LedgerV8.AlignedValue> | undefined,
        falliblePublicTranscript: LedgerV8.Transcript<LedgerV8.AlignedValue> | undefined,
        privateTranscriptOutputs: LedgerV8.AlignedValue[],
        input: LedgerV8.AlignedValue,
        output: LedgerV8.AlignedValue,
        communicationCommitmentRand: LedgerV8.CommunicationCommitmentRand,
        keyLocation: string
      ) {
        super(
          address,
          entryPoint,
          op,
          guaranteedPublicTranscript,
          falliblePublicTranscript,
          privateTranscriptOutputs,
          input,
          output,
          communicationCommitmentRand,
          keyLocation
        );
        captured.address = address;
        captured.entryPoint = entryPoint;
        captured.op = op;
        captured.keyLocation = keyLocation;
      }
    }
    const capturingV8: typeof LedgerV8 = { ...LedgerV8, ContractCallPrototype: CapturingContractCallPrototype };
    const options = buildCallOptions(buildV8ContractStateWithOperation('increment'));

    composeV8CallTx(options, capturingV8);

    expect(captured.op?.serialize()).toEqual(buildRegisteredOperation().serialize());
    expect(captured.entryPoint).toBe('increment');
    expect(captured.keyLocation).toBe('increment');
    expect(captured.address).toBe(options.contractAddress);
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

  it('throws Ledger8ComposeFailedError (stage call-verifier-key) when the registered operation carries no verifier key', () => {
    // The state a constructor produces: the entry point is declared, but its
    // key is blank until a deploy registers one. Composing a call against it
    // would produce a transaction no ledger can verify.
    const withBlankOperation = new LedgerV8.ContractState();
    withBlankOperation.setOperation('increment', new LedgerV8.ContractOperation());

    let caught: unknown;
    try {
      composeV8CallTx(buildCallOptions(withBlankOperation), LedgerV8);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8ComposeFailedError);
    const error = caught as Ledger8ComposeFailedError;
    expect(error.stage).toBe('call-verifier-key');
    expect(error.circuitId).toBe('increment');
  });

  it('throws a plain Error when partitionTranscripts returns no result for the single call submitted', () => {
    const contractState = buildV8ContractStateWithOperation('increment');
    const poisonedV8: typeof LedgerV8 = { ...LedgerV8, partitionTranscripts: () => [] };

    expect(() => composeV8CallTx(buildCallOptions(contractState), poisonedV8)).toThrow(/partitionTranscripts returned no result/);
  });

  it('refuses an empty network id rather than baking it into the transaction', () => {
    const options = { ...buildCallOptions(buildV8ContractStateWithOperation('increment')), networkId: '' };

    let caught: unknown;
    try {
      composeV8CallTx(options, LedgerV8);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8ComposeOptionError);
    expect((caught as Ledger8ComposeOptionError).option).toBe('networkId');
    expect((caught as Ledger8ComposeOptionError).code).toBe(PROTOCOL_ERROR_CODES.LEDGER8_COMPOSE_OPTION_INVALID);
  });

  it('refuses an invalid ttl rather than composing a transaction the ledger dates to the epoch', () => {
    const options = { ...buildCallOptions(buildV8ContractStateWithOperation('increment')), ttl: new Date('not-a-date') };

    let caught: unknown;
    try {
      composeV8CallTx(options, LedgerV8);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Ledger8ComposeOptionError);
    expect((caught as Ledger8ComposeOptionError).option).toBe('ttl');
  });
});
