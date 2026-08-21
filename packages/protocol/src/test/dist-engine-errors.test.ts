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

// The engine lives in its own rollup entry, loaded through the package's
// `./engine` subpath — so it is a SECOND bundle, and everything it throws
// crosses a bundle boundary before a caller sees it. Every other engine suite
// resolves src/ once, which makes that boundary invisible: an error class
// inlined separately into each bundle answers `false` to `instanceof` against
// the root package's class, and the facade's own rejection discrimination
// (src/engine/load-engine.ts) reads the same way. This suite therefore drives
// the BUILT package through its own exports map, and never src/.
//
// The remaining facade contract — a failed chunk load surfacing unwrapped, and
// the dual-instantiation guard rejecting construction — needs a mutated
// install to reproduce (a broken ./v8 artifact, or a duplicated
// onchain-runtime-v3); that logic is covered against src/ in
// engine-load-engine-chunk-failure.test.ts, while what made its failure silent
// in the built artifact — one error module per bundle — is what the identity
// assertions below pin.
const PKG_ROOT = resolve(__dirname, '..', '..');
const ENGINE_BUNDLE_PATHS = ['dist/engine.js'];
const distBundlesExist = ['dist/index.js', ...ENGINE_BUNDLE_PATHS].every((p) => existsSync(resolve(PKG_ROOT, p)));

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
  privateStateAfter: {}
});

// Skipped (not omitted) when dist/ is absent — same policy as
// dist-laziness.test.ts; run `yarn build && yarn test` to green them.
describe.skipIf(!distBundlesExist)('dist engine error gate', () => {
  it('loads the engine facade out of the built package and binds the retained era', async () => {
    const { loadLedger8Engine } = await import('@midnight-ntwrk/midnight-js-protocol');

    const engine = await loadLedger8Engine();

    expect(typeof engine.executeCircuit).toBe('function');
    expect(typeof engine.wrapKeepStateCall).toBe('function');
  });

  it('throws an error the root package can still discriminate by class and by code', async () => {
    const { loadLedger8Engine, Ledger8ComposeFailedError, PROTOCOL_ERROR_CODES } = await import(
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

    expect(caught).toBeInstanceOf(Ledger8ComposeFailedError);
    expect(caught).toBeInstanceOf(Error);
    const composeFailure = caught as InstanceType<typeof Ledger8ComposeFailedError>;
    expect(composeFailure.code).toBe(PROTOCOL_ERROR_CODES.LEDGER8_COMPOSE_FAILED);
    expect(composeFailure.stage).toBe('wrap-call');
  });
});
