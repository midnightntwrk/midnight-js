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

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import * as ocrt3 from '@midnight-ntwrk/onchain-runtime-v3';
import * as ledgerV9 from '@midnightntwrk/ledger-v9';
import { describe, expect, it } from 'vitest';

import { emptyZswapLocalState, readHexFixture } from './fixtures';

// The engine lives in its own rollup entry, loaded through the package's
// `./engine` subpath — so it is a SECOND bundle, and everything it throws
// crosses a bundle boundary before a caller sees it. Every other engine suite
// resolves src/ once, which makes that boundary invisible: an error class
// inlined separately into each bundle answers `false` to `instanceof` against
// the root package's class, and the facade's own rejection discrimination
// (src/lib/v8/load-engine.ts) reads the same way. This suite therefore
// drives the BUILT package through its own exports map, and never src/.
//
// The rest of the facade contract — a failed chunk load surfacing wrapped in
// Ledger8RuntimeMissingError, and a protocol-coded rejection passing through
// unwrapped — is covered against src/ in
// v8-load-engine-chunk-failure.test.ts; the dual-instantiation guard's
// wiring into construction is covered in
// v8-load-engine-instance-mismatch.test.ts. What made those failures
// silent in the built artifact — one error module per bundle — is what the
// identity assertions below pin.
const PKG_ROOT = resolve(__dirname, '..', '..');
const DIST_BUNDLES = ['dist/index.js', 'dist/engine.js'];

const FIELD_ALIGNMENT: ocrt3.Alignment = [{ tag: 'atom', value: { tag: 'field' } }];
const fieldValue = (byte: number): ocrt3.AlignedValue => ({
  value: [new Uint8Array(32).fill(byte)],
  alignment: FIELD_ALIGNMENT
});
const downConvertedState = (byte: number) => ({
  data: new ocrt3.ChargedState(ocrt3.StateValue.newCell(fieldValue(byte)))
});

// A transcript naming a circuit no contract state has registered: the shortest
// real path to an error raised INSIDE the engine chunk.


const transcriptForUnregisteredCircuit = () => ({
  circuitId: 'increment',
  result: [],
  input: fieldValue(0x10),
  output: fieldValue(0x20),
  publicTranscript: [],
  privateTranscriptOutputs: [],
  preContractState: downConvertedState(0x01),
  postContractState: downConvertedState(0x02),
  privateStateAfter: {},
  zswapLocalState: emptyZswapLocalState()
});

// Never skipped when a bundle is absent: a skip is reported as a pass, so the
// gate would silently stop guarding — and it is the only cover for
// cross-bundle error identity. Every orchestrated run has the build ahead of
// it — turbo's `test` task dependsOn `build` — so a missing bundle is a real
// failure, called out by the first case below before the imports fail.
describe('dist engine error gate', () => {
  it('ships the bundles this gate drives', () => {
    expect(DIST_BUNDLES.filter((path) => !existsSync(resolve(PKG_ROOT, path)))).toEqual([]);
  });

  it('loads the engine facade out of the built package and binds the retained era', async () => {
    const { loadLedger8Engine } = await import('@midnight-ntwrk/midnight-js-protocol');

    const engine = await loadLedger8Engine();

    expect(Object.keys(engine).sort()).toEqual(
      ['downConvertForExecution', 'executeCircuit', 'executeConstructor', 'wrapKeepStateCall'].sort()
    );
  });

  it('throws an error the root package can still discriminate by class and by code', async () => {
    const { loadLedger8Engine, ComposeFailedError, PROTOCOL_ERROR_CODES } = await import(
      '@midnight-ntwrk/midnight-js-protocol'
    );
    const engine = await loadLedger8Engine();

    let caught: unknown;
    try {
      engine.wrapKeepStateCall({
        transcript: transcriptForUnregisteredCircuit(),
        contractAddress: ledgerV9.sampleContractAddress(),
        contractState: new ledgerV9.ContractState()
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ComposeFailedError);
    expect(caught).toBeInstanceOf(Error);
    const composeFailure = caught as InstanceType<typeof ComposeFailedError>;
    expect(composeFailure.code).toBe(PROTOCOL_ERROR_CODES.COMPOSE_FAILED);
    expect(composeFailure.version).toBe('v9');
    expect(composeFailure.stage).toBe('wrap-call');
  });

  // The era facade is published through the root barrel, so its failures cross
  // the SAME bundle boundary the engine's do: a caller narrowing on
  // `ComposeFailedError` imported from the package root must still match one
  // raised inside the era arm, and must still find its discriminants.
  it('raises an era composition failure the root package can discriminate by class and by code', async () => {
    const { loadLedgerEra, ComposeFailedError, PROTOCOL_ERROR_CODES } = await import(
      '@midnight-ntwrk/midnight-js-protocol'
    );
    const era = await loadLedgerEra('v8');

    let caught: unknown;
    try {
      era.composeCallTx({
        calls: [
          {
            contractAddress: ocrt3.dummyContractAddress(),
            circuitId: 'increment',
            // A blank state: it declares no operation for the circuit, which is
            // the shortest real path to a failure raised inside the era arm.
            contractState: new ocrt3.ContractState().serialize(),
            transcript: {
              kind: 'unpartitioned',
              preState: ocrt3.StateValue.newCell(fieldValue(0x01)).encode(),
              publicTranscript: []
            },
            privateTranscriptOutputs: [],
            input: fieldValue(0x10),
            output: fieldValue(0x20)
          }
        ],
        networkId: 'test-network',
        ttl: new Date(Date.now() + 3_600_000)
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ComposeFailedError);
    expect(caught).toBeInstanceOf(Error);
    const failure = caught as InstanceType<typeof ComposeFailedError>;
    expect(failure.code).toBe(PROTOCOL_ERROR_CODES.COMPOSE_FAILED);
    expect(failure.version).toBe('v8');
    expect(failure.stage).toBe('call-operation');
  });

  it('raises a state-decode failure the root package can discriminate by class and by code', async () => {
    const { loadLedgerEra, StateDecodeFailedError, PROTOCOL_ERROR_CODES } = await import(
      '@midnight-ntwrk/midnight-js-protocol'
    );
    const era = await loadLedgerEra('v9');

    let caught: unknown;
    try {
      // A state written by the OTHER era: valid bytes, wrong decoder.
      era.decodeContractState(readHexFixture('state-v8.hex'));
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(StateDecodeFailedError);
    expect(caught).toBeInstanceOf(Error);
    const failure = caught as InstanceType<typeof StateDecodeFailedError>;
    expect(failure.code).toBe(PROTOCOL_ERROR_CODES.STATE_DECODE_FAILED);
    expect(failure.version).toBe('v9');
    expect(failure.cause).toBeInstanceOf(Error);
  });
});
