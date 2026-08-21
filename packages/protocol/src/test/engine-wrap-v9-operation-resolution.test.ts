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
import * as LedgerV9 from '@midnightntwrk/ledger-v9';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DownConvertedState } from '../lib/engine/down-convert';
import type { TranscriptPojo } from '../lib/engine/execute';

// See engine-wrap-v9.test.ts: `ContractOperation.verifierKey`'s setter
// validates a `midnight:verifier-key[...]:` tagged blob.
const REGISTERED_VERIFIER_KEY = readFileSync(
  resolve(__dirname, '../../../../testkit-js/testkit-js/src/fixtures/hf/twin-contract/compiled/keys/increment.verifier')
);

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

// Lives in its own file — a single doMock'd `ContractCallPrototype` capture,
// using only a dynamic re-import of `../engine/wrap-v9` — so this poisoned
// module registry cannot leak into engine-wrap-v9.test.ts's happy-path suite
// (same isolation precedent as load-v8-failure.test.ts). Everything else in
// `@midnightntwrk/ledger-v9` stays real (spread from importOriginal); only
// the constructor call itself is intercepted, to prove wrapKeepStateCall
// passes the REAL resolved operation through — not a blank default — since
// ContractCallPrototype exposes no getter to inspect after construction.
describe('wrapKeepStateCall operation resolution', () => {
  afterEach(() => {
    vi.doUnmock('@midnightntwrk/ledger-v9');
  });

  it('passes the operation resolved from contractState.operation(circuitId) into ContractCallPrototype', async () => {
    let capturedOp: LedgerV9.ContractOperation | undefined;
    vi.doMock('@midnightntwrk/ledger-v9', async (importOriginal) => {
      const actual = await importOriginal<typeof LedgerV9>();
      class CapturingContractCallPrototype {
        constructor(_address: unknown, _entryPoint: unknown, op: LedgerV9.ContractOperation) {
          capturedOp = op;
        }
      }
      return { ...actual, ContractCallPrototype: CapturingContractCallPrototype };
    });
    const { wrapKeepStateCall } = await import('../lib/engine/wrap-v9');

    const registeredOp = new LedgerV9.ContractOperation();
    registeredOp.verifierKey = REGISTERED_VERIFIER_KEY;
    const contractState = new LedgerV9.ContractState();
    contractState.setOperation('increment', registeredOp);

    wrapKeepStateCall({ transcript: buildTranscript(), contractAddress: LedgerV9.sampleContractAddress(), contractState });

    // `ContractState.operation()` is a WASM-bound getter: it returns a fresh
    // JS wrapper object each call (confirmed empirically — two calls never
    // share object identity), so this asserts by VALUE (the serialized form)
    // rather than by reference, proving the real registered operation's
    // bytes flow through unchanged rather than a blank default's.
    expect(capturedOp).toBeDefined();
    expect(capturedOp?.serialize()).toEqual(registeredOp.serialize());
  });
});
