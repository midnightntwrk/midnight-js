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
import type { ConstructorContext } from 'compact-runtime-ledger8';
import { describe, expect, it, vi } from 'vitest';

import type { DownConvertedState } from '../lib/v8/down-convert';
import { createLedger8Engine } from '../lib/v8/engine';
import type { ExecuteCircuitOptions, Ledger8ContractLike } from '../lib/v8/execute';
import { emptyPartitionContext, emptyZswapLocalState } from './fixtures';

const PKG_ROOT = resolve(__dirname, '..', '..');
const FIXTURE_DIR = resolve(PKG_ROOT, '..', '..', 'testkit-js/testkit-js/src/fixtures/hf/counter-016');
const SAMPLE_COIN_PUBLIC_KEY = 'ca'.repeat(32);

// Redirects the ported spike fixture's bare `@midnight-ntwrk/compact-runtime`
// import to this package's own `compact-runtime-ledger8` (the real retained
// 0.16 instance) — see v8-execute.test.ts for the full rationale. Scoped
// to this test file's module registry only.
vi.mock('@midnight-ntwrk/compact-runtime', async () => import('compact-runtime-ledger8'));

interface CompiledCounterLedger {
  readonly round: bigint;
}

interface CompiledCounterModule {
  readonly Contract: new (witnesses: Record<string, never>) => CompiledCounterContract;
  readonly ledger: (state: ocrt3.StateValue | ocrt3.ChargedState) => CompiledCounterLedger;
}

interface CompiledCounterContract extends Ledger8ContractLike {
  initialState(constructorContext: ConstructorContext<Record<string, never>>): {
    currentContractState: { data: ocrt3.ChargedState };
  };
}

// Happy-path suite only: this file statically imports `../lib/v8/engine` once at
// load time, so it never mixes with a mocked-module-registry test (those live
// in v8-load-engine-chunk-failure.test.ts and
// v8-load-engine-instance-mismatch.test.ts — same isolation precedent as
// v8-load-failure.test.ts).
//
// Ungated: every specifier this suite reaches — the 0.16 glue, ocrt3, and
// loadLedger8's own `../../v8.js` — resolves out of src/ or node_modules under
// vitest, never through dist/.
describe('createLedger8Engine', () => {
  // Strict equality, not a per-method `typeof` sweep: a method leaked onto the
  // facade, renamed, or silently dropped has to fail here, which a
  // one-directional check of the names we happen to remember cannot do.
  it('exposes exactly the four documented engine methods, and nothing else', async () => {
    const engine = await createLedger8Engine();

    expect(Object.keys(engine).sort()).toEqual(
      ['downConvertForExecution', 'executeCircuit', 'executeConstructor', 'wrapKeepStateCall'].sort()
    );
    expect(Object.values(engine).every((method) => typeof method === 'function')).toBe(true);
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
    // v9-wrap.test.ts for the full rationale).
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
        partitionContext: emptyPartitionContext(),
        zswapLocalState: emptyZswapLocalState(),
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
    const { Contract, ledger } = (await import(
      /* @vite-ignore */ resolve(FIXTURE_DIR, 'compiled/contract/index.js')
    )) as CompiledCounterModule;
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

    // circuitId alone is echoed straight back from the options, so it proves
    // nothing about execution; the round advance is what shows the retained
    // 0.16 stack actually ran the circuit through the facade.
    expect(transcript.circuitId).toBe('increment');
    expect(ledger(transcript.postContractState.data.state).round).toBe(1n);
  });

  // Every other wrapKeepStateCall test (v9-wrap*.test.ts and the
  // 'wrapKeepStateCall produces a v9-native ContractCallPrototype' test
  // above) hand-builds a transcript with an empty publicTranscript, so the
  // keep-state leg never exercises partitionTranscripts against a REAL op
  // sequence. This test closes that gap: it runs executeCircuit on the
  // ported counter-016 fixture (the same recipe as the 'executeCircuit runs
  // increment on the ported counter-016 fixture end-to-end' test above) to
  // produce a transcript whose publicTranscript carries the genuine
  // idx/addi/ins ops the compiled circuit emits, then wraps it into a
  // v9-native ContractCallPrototype (the operation-state builder mirrors
  // v9-wrap.test.ts's buildContractStateWithOperation).
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

// Under vitest `import('../../engine.js')` resolves to src/engine.ts, not the
// built chunk, so this suite needs no prior `yarn build`. The dist artifact is
// what dist-laziness.test.ts and dist-engine-errors.test.ts cover.
describe('loadLedger8Engine', () => {
  it('memoises the engine promise across calls', async () => {
    const { loadLedger8Engine } = await import('../lib/v8/load-engine');

    const first = loadLedger8Engine();
    const second = loadLedger8Engine();

    expect(second).toBe(first);
    await expect(first).resolves.toBeDefined();
  });
});
