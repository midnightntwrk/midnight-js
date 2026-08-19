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

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as ocrt3 from '@midnight-ntwrk/onchain-runtime-v3';
import { ContractCallPrototype, ContractOperation, ContractState, Intent, sampleContractAddress } from '@midnightntwrk/ledger-v9';
import type { ConstructorContext } from 'compact-runtime-ledger8';
import { describe, expect, it, vi } from 'vitest';

import { createLedger8Engine } from '../engine';
import type { DownConvertedState } from '../engine/down-convert';
import type { ExecuteCircuitOptions, Ledger8ContractLike } from '../engine/execute';

const PKG_ROOT = resolve(__dirname, '..', '..');
const distEngineExists = existsSync(resolve(PKG_ROOT, 'dist/engine.mjs'));
// createLedger8Engine() calls loadLedger8() (../load-v8.ts), which resolves
// the package self-reference specifier through the exports map to
// dist/v8.mjs — so the whole happy-path suite below needs this dist
// artifact too, or it fails with a confusing Ledger8RuntimeMissingError
// rather than a clean skip.
const distV8Exists = existsSync(resolve(PKG_ROOT, 'dist/v8.mjs'));
const FIXTURE_DIR = resolve(PKG_ROOT, '..', '..', 'testkit-js/testkit-js/src/fixtures/hf/counter-016');
const SAMPLE_COIN_PUBLIC_KEY = 'ca'.repeat(32);

// Redirects the ported spike fixture's bare `@midnight-ntwrk/compact-runtime`
// import to this package's own `compact-runtime-ledger8` (the real retained
// 0.16 instance) — see engine-execute.test.ts for the full rationale. Scoped
// to this test file's module registry only.
vi.mock('@midnight-ntwrk/compact-runtime', async () => import('compact-runtime-ledger8'));

interface CompiledCounterModule {
  readonly Contract: new (witnesses: Record<string, never>) => CompiledCounterContract;
}

interface CompiledCounterContract extends Ledger8ContractLike {
  initialState(constructorContext: ConstructorContext<Record<string, never>>): {
    currentContractState: { data: ocrt3.ChargedState };
  };
}

// Happy-path suite only: this file statically imports `../engine` once at
// load time, so it never mixes with a mocked-module-registry test (those
// live in engine-load-engine-failure.test.ts — same isolation precedent as
// load-v8-failure.test.ts).
//
// Gated on distV8Exists (not omitted) so a run without a prior build reports
// these as visible skips rather than failing with a confusing
// Ledger8RuntimeMissingError — same policy as dist-laziness.test.ts and the
// loadLedger8Engine suite below. Run `yarn build && yarn test` to green it.
describe.skipIf(!distV8Exists)('createLedger8Engine', () => {
  it('builds a Ledger8Engine exposing extractState, downConvertForExecution, executeCircuit and wrapKeepStateCall', async () => {
    const engine = await createLedger8Engine();

    expect(typeof engine.extractState).toBe('function');
    expect(typeof engine.downConvertForExecution).toBe('function');
    expect(typeof engine.executeCircuit).toBe('function');
    expect(typeof engine.wrapKeepStateCall).toBe('function');
  });

  it('extractState + downConvertForExecution round-trip a v8-era envelope into a decoded DownConvertedState', async () => {
    const engine = await createLedger8Engine();
    const state = new ocrt3.ChargedState(
      ocrt3.StateValue.newCell({ value: [new Uint8Array(32).fill(7)], alignment: [{ tag: 'atom', value: { tag: 'field' } }] })
    );
    const contractState = new ocrt3.ContractState();
    contractState.data = state;
    const rawBytes = contractState.serialize();

    const extracted = engine.extractState(rawBytes, 'v8');
    const downConverted = engine.downConvertForExecution(extracted);

    expect(downConverted.data.state.type()).toBe('cell');
  });

  it('wrapKeepStateCall produces a v9-native ContractCallPrototype', async () => {
    const engine = await createLedger8Engine();
    const state = new ocrt3.ChargedState(
      ocrt3.StateValue.newCell({ value: [new Uint8Array(32).fill(1)], alignment: [{ tag: 'atom', value: { tag: 'field' } }] })
    );
    const contractState = new ContractState();
    const op = new ContractOperation();
    // `ContractOperation.verifierKey`'s setter validates a
    // `midnight:verifier-key[...]:` tagged blob — reuses the already-committed
    // twin-contract verifier key rather than porting new material (see
    // engine-wrap-v9.test.ts for the full rationale).
    op.verifierKey = readFileSync(
      resolve(PKG_ROOT, '..', '..', 'testkit-js/testkit-js/src/fixtures/hf/twin-contract/compiled/keys/increment.verifier')
    );
    contractState.setOperation('increment', op);

    const prototype = engine.wrapKeepStateCall({
      transcript: {
        circuitId: 'increment',
        result: [],
        input: { value: [], alignment: [] },
        output: { value: [], alignment: [] },
        publicTranscript: [],
        privateTranscriptOutputs: [],
        preContractState: { data: state },
        postContractState: { data: state },
        privateStateAfter: {}
      },
      contractAddress: sampleContractAddress(),
      contractState
    });

    expect(prototype).toBeInstanceOf(ContractCallPrototype);
  });

  it('executeCircuit runs increment on the ported counter-016 fixture end-to-end', async () => {
    const engine = await createLedger8Engine();
    const { Contract } = (await import(/* @vite-ignore */ resolve(FIXTURE_DIR, 'compiled/contract/index.js'))) as CompiledCounterModule;
    const ledger8Runtime = await import('compact-runtime-ledger8');
    const initialPrivateState: Record<string, never> = {};
    const contract = new Contract(initialPrivateState);
    const constructorContext = ledger8Runtime.createConstructorContext(initialPrivateState, SAMPLE_COIN_PUBLIC_KEY);
    const initial = contract.initialState(constructorContext);
    const preState: DownConvertedState = { data: initial.currentContractState.data };

    const options: ExecuteCircuitOptions = {
      contract,
      circuitId: 'increment',
      args: [],
      state: preState,
      address: ocrt3.dummyContractAddress(),
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      privateState: {}
    };

    const transcript = engine.executeCircuit(options);

    expect(transcript.circuitId).toBe('increment');
  });

  // Every other wrapKeepStateCall test (engine-wrap-v9.test.ts and the
  // 'wrapKeepStateCall produces a v9-native ContractCallPrototype' test
  // above) hand-builds a transcript with an empty publicTranscript, so the
  // keep-state leg never exercises partitionTranscripts against a REAL op
  // sequence. This test closes that gap: it runs executeCircuit on the
  // ported counter-016 fixture (the same recipe as the 'composeCallTx
  // composes...' test above) to produce a transcript whose publicTranscript
  // carries the genuine idx/addi/ins ops the compiled circuit emits, then
  // wraps it into a v9-native ContractCallPrototype (the operation-state
  // builder mirrors engine-wrap-v9.test.ts's buildContractStateWithOperation).
  it('wrapKeepStateCall wraps a REAL executeCircuit transcript (non-empty publicTranscript) into a ContractCallPrototype accepted by Intent.new(ttl).addCall', async () => {
    const engine = await createLedger8Engine();
    const { Contract } = (await import(/* @vite-ignore */ resolve(FIXTURE_DIR, 'compiled/contract/index.js'))) as CompiledCounterModule;
    const ledger8Runtime = await import('compact-runtime-ledger8');
    const initialPrivateState: Record<string, never> = {};
    const contract = new Contract(initialPrivateState);
    const constructorContext = ledger8Runtime.createConstructorContext(initialPrivateState, SAMPLE_COIN_PUBLIC_KEY);
    const initial = contract.initialState(constructorContext);
    const preState: DownConvertedState = { data: initial.currentContractState.data };
    const address = ocrt3.dummyContractAddress();

    const transcript = engine.executeCircuit({
      contract,
      circuitId: 'increment',
      args: [],
      state: preState,
      address,
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      privateState: {}
    });

    expect(transcript.publicTranscript.length).toBeGreaterThan(0);

    const contractState = new ContractState();
    const op = new ContractOperation();
    op.verifierKey = readFileSync(
      resolve(PKG_ROOT, '..', '..', 'testkit-js/testkit-js/src/fixtures/hf/twin-contract/compiled/keys/increment.verifier')
    );
    contractState.setOperation('increment', op);

    const prototype = engine.wrapKeepStateCall({ transcript, contractAddress: address, contractState });
    const ttl = new Date(Date.now() + 3_600_000);

    expect(prototype).toBeInstanceOf(ContractCallPrototype);
    expect(() => Intent.new(ttl).addCall(prototype)).not.toThrow();
  });
});

// loadLedger8Engine resolves the self-reference specifier through the exports
// map to dist/engine.mjs, so this suite needs a prior `yarn build`; without
// one it is reported as visible skips (same policy as dist-laziness.test.ts).
describe.skipIf(!distEngineExists)('loadLedger8Engine', () => {
  it('memoises the engine promise across calls', async () => {
    const { loadLedger8Engine } = await import('../engine/load-engine');

    const first = loadLedger8Engine();
    const second = loadLedger8Engine();

    expect(second).toBe(first);
    await expect(first).resolves.toBeDefined();
  });
});
