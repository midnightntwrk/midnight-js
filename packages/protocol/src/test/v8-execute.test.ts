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
  type ConstructorContext,
  decodeZswapLocalState,
  type EncodedZswapLocalState,
  type ZswapLocalState
} from 'compact-runtime-ledger8';
import { describe, expect, it, vi } from 'vitest';

import type { DownConvertedState } from '../lib/v8/down-convert';
import {
  executeCircuit,
  type ExecuteCircuitOptions,
  type Ledger8CircuitContext,
  type Ledger8CircuitResult,
  type Ledger8ContractLike,
  type Ledger8ExecutionRuntime,
  type TranscriptPojo
} from '../lib/v8/execute';

const FIXTURE_DIR = resolve(__dirname, '../../../../testkit-js/testkit-js/src/fixtures/hf/counter-016');
const EMPTY_ALIGNED: ocrt3.AlignedValue = { value: [], alignment: [] };
// A well-formed (32-byte, hex-encoded) coin public key placeholder — the
// pre-fork WASM validates this shape even where the circuit itself never
// reads it (increment() has no coin-related effects).
const SAMPLE_COIN_PUBLIC_KEY = 'ca'.repeat(32);

const emptyZswap = (): EncodedZswapLocalState => ({
  coinPublicKey: { bytes: new Uint8Array(32).fill(0xca) },
  currentIndex: 0n,
  inputs: [],
  outputs: []
});

const buildState = (byte: number): DownConvertedState => ({
  data: new ocrt3.ChargedState(
    ocrt3.StateValue.newCell({
      value: [new Uint8Array(32).fill(byte)],
      alignment: [{ tag: 'atom', value: { tag: 'field' } }]
    })
  )
});

describe('executeCircuit (fake runtime — plumbing only, no WASM circuit execution)', () => {
  it('builds the circuit context from the options, invokes the named circuit, and packages a TranscriptPojo', () => {
    const preState = buildState(0x01);
    const postState = buildState(0x02);
    let capturedAddress: unknown;
    let capturedCoinPk: unknown;
    let capturedContractState: unknown;
    let capturedPrivateState: unknown;
    let capturedGasLimit: unknown;
    let capturedCostModel: unknown;
    const injectedCostModel = ocrt3.CostModel.initialCostModel();

    const runtime: Ledger8ExecutionRuntime = {
      decodeZswapLocalState,
      createCircuitContext: (address, coinPk, contractState, privateState, gasLimit, costModel) => {
        capturedAddress = address;
        capturedCoinPk = coinPk;
        capturedContractState = contractState;
        capturedPrivateState = privateState;
        capturedGasLimit = gasLimit;
        capturedCostModel = costModel;
        return { currentQueryContext: { state: contractState }, currentPrivateState: privateState, currentZswapLocalState: emptyZswap() };
      },
      CostModel: { initialCostModel: () => injectedCostModel }
    };

    const contract: Ledger8ContractLike = {
      impureCircuits: {
        increment: (ctx, ...args): Ledger8CircuitResult => ({
          result: args,
          proofData: { input: EMPTY_ALIGNED, output: EMPTY_ALIGNED, publicTranscript: [], privateTranscriptOutputs: [] },
          context: {
            currentQueryContext: { state: postState.data },
            currentPrivateState: ctx.currentPrivateState,
            currentZswapLocalState: emptyZswap()
          }
        })
      }
    };

    const options: ExecuteCircuitOptions = {
      contract,
      circuitId: 'increment',
      args: ['a'],
      state: preState,
      address: 'deadbeef',
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      privateState: { count: 1 }
    };

    const transcript = executeCircuit(options, runtime);

    expect(transcript.circuitId).toBe('increment');
    expect(transcript.result).toEqual(['a']);
    expect(transcript.preContractState).toBe(preState);
    expect(transcript.postContractState.data).toBe(postState.data);
    expect(transcript.privateStateAfter).toEqual({ count: 1 });
    // address and coinPk are both 32-byte hex in the real fixtures, so a
    // transposition is invisible to the WASM runtime and has to be pinned here.
    expect(capturedAddress).toBe('deadbeef');
    expect(capturedCoinPk).toBe(SAMPLE_COIN_PUBLIC_KEY);
    expect(capturedContractState).toBe(preState.data);
    expect(capturedPrivateState).toEqual({ count: 1 });
    expect(capturedGasLimit).toBeUndefined();
    // The real 0.16 createCircuitContext tolerates an undefined cost model, so
    // dropping the injected one would otherwise go unnoticed.
    expect(capturedCostModel).toBe(injectedCostModel);
  });

  it('throws a plain Error naming the unknown circuit id, never invoking createCircuitContext', () => {
    const createCircuitContext = vi.fn(
      (): Ledger8CircuitContext => ({
        currentQueryContext: { state: buildState(3).data },
        currentPrivateState: undefined,
        currentZswapLocalState: emptyZswap()
      })
    );
    const runtime: Ledger8ExecutionRuntime = {
      decodeZswapLocalState,
      createCircuitContext,
      CostModel: { initialCostModel: () => ocrt3.CostModel.initialCostModel() }
    };
    const contract: Ledger8ContractLike = { impureCircuits: {} };
    const options: ExecuteCircuitOptions = {
      contract,
      circuitId: 'missing',
      args: [],
      state: buildState(3),
      address: 'deadbeef',
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      privateState: undefined
    };

    expect(() => executeCircuit(options, runtime)).toThrow(/No impure circuit named 'missing'/);
    expect(createCircuitContext).not.toHaveBeenCalled();
  });

  it.each(['toString', 'valueOf', 'constructor'])(
    'treats the Object.prototype member %s as an unknown circuit rather than dispatching to it',
    (inheritedName) => {
      const runtime: Ledger8ExecutionRuntime = {
        decodeZswapLocalState,
        createCircuitContext: () => ({
          currentQueryContext: { state: buildState(4).data },
          currentPrivateState: undefined,
          currentZswapLocalState: emptyZswap()
        }),
        CostModel: { initialCostModel: () => ocrt3.CostModel.initialCostModel() }
      };
      // A compiled contract assigns impureCircuits a plain object literal, so
      // its prototype chain is live: an inherited member is not `undefined` and
      // would sail past a bare lookup, failing much later as an unrelated
      // TypeError deep inside transcript packaging.
      const contract: Ledger8ContractLike = { impureCircuits: {} };
      const options: ExecuteCircuitOptions = {
        contract,
        circuitId: inheritedName,
        args: [],
        state: buildState(4),
        address: 'deadbeef',
        coinPk: SAMPLE_COIN_PUBLIC_KEY,
        privateState: undefined
      };

      expect(() => executeCircuit(options, runtime)).toThrow(new RegExp(`No impure circuit named '${inheritedName}'`));
    }
  );

  it('names the circuits the contract does carry, so a typo is diagnosable from the message alone', () => {
    const runtime: Ledger8ExecutionRuntime = {
      decodeZswapLocalState,
      createCircuitContext: () => ({
        currentQueryContext: { state: buildState(5).data },
        currentPrivateState: undefined,
        currentZswapLocalState: emptyZswap()
      }),
      CostModel: { initialCostModel: () => ocrt3.CostModel.initialCostModel() }
    };
    const contract: Ledger8ContractLike = {
      impureCircuits: {
        increment: () => {
          throw new Error('never invoked');
        }
      }
    };
    const options: ExecuteCircuitOptions = {
      contract,
      circuitId: 'incremnt',
      args: [],
      state: buildState(5),
      address: 'deadbeef',
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      privateState: undefined
    };

    expect(() => executeCircuit(options, runtime)).toThrow(/Available circuits: increment\./);
  });

  // A coin-moving circuit is composable on this era: the transcript carries the
  // post-call Zswap local state, which is what a caller turns into the
  // transaction's segmented offer (`zswapStateToSegmentedOffer` in
  // packages/contracts). Dropping it here is what would leave a caller composing
  // an unbalanced transaction, so the carry is pinned rather than the refusal.
  it('carries the post-call Zswap local state of a coin-moving circuit onto the transcript', () => {
    const preState = buildState(0x01);
    const coinPublicKeyBytes = new Uint8Array(32).fill(0xca);
    const produced: EncodedZswapLocalState = {
      coinPublicKey: { bytes: coinPublicKeyBytes },
      currentIndex: 1n,
      inputs: [],
      outputs: [
        {
          coinInfo: { nonce: new Uint8Array(32).fill(0x11), color: new Uint8Array(32).fill(0x22), value: 42n },
          recipient: {
            is_left: true,
            left: { bytes: coinPublicKeyBytes },
            right: { bytes: new Uint8Array(32) }
          }
        }
      ]
    };
    let decoded: unknown;
    const runtime: Ledger8ExecutionRuntime = {
      decodeZswapLocalState: (state) => {
        decoded = state;
        return decodeZswapLocalState(state);
      },
      createCircuitContext: (_address, _coinPk, contractState, privateState) => ({
        currentQueryContext: { state: contractState },
        currentPrivateState: privateState,
        currentZswapLocalState: emptyZswap()
      }),
      CostModel: { initialCostModel: () => ocrt3.CostModel.initialCostModel() }
    };
    const contract: Ledger8ContractLike = {
      impureCircuits: {
        send: (ctx): Ledger8CircuitResult => ({
          result: null,
          proofData: { input: EMPTY_ALIGNED, output: EMPTY_ALIGNED, publicTranscript: [], privateTranscriptOutputs: [] },
          context: {
            currentQueryContext: ctx.currentQueryContext,
            currentPrivateState: ctx.currentPrivateState,
            currentZswapLocalState: produced
          }
        })
      }
    };
    const options: ExecuteCircuitOptions = {
      contract,
      circuitId: 'send',
      args: [],
      state: preState,
      address: 'deadbeef',
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      privateState: {}
    };

    const transcript = executeCircuit(options, runtime);

    // The POST-call state, not the one the context started with: taking the
    // pre-call state would carry an empty offer for a call that moved coins.
    expect(decoded).toBe(produced);
    // Decoded, not the runtime's internal byte encoding: this is the shape the
    // offer builder consumes, and it costs a caller the retained 0.16 glue to
    // convert for itself.
    const expected: ZswapLocalState = decodeZswapLocalState(produced);
    expect(transcript.zswapLocalState).toEqual(expected);
    expect(transcript.zswapLocalState.outputs).toHaveLength(1);
    expect(transcript.zswapLocalState.outputs[0].coinInfo.value).toBe(42n);
  });
});

// --- Ported spike fixture: real 0.16 execution end-to-end -------------------
// counter-016/compiled/contract/index.js is the spike's own compact-runtime@0.16
// compiled artifact (see testkit fixtures README, "counter-016/" section) —
// it can only run against a REAL compact-runtime@0.16 instance, never the
// repo's pinned 0.18.0-rc.1. `compact-runtime-ledger8` (this package's own
// dependency, npm-aliased to `@midnight-ntwrk/compact-runtime@0.16.0`) IS
// that real 0.16 instance; redirecting the fixture's own bare
// `@midnight-ntwrk/compact-runtime` import to it (module-registry-scoped to
// this test file only) lets the byte-verbatim ported artifact run unmodified.
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

// Serializes a TranscriptPojo into a JSON-safe golden shape: bigints as
// `${n}n`-suffixed strings, Uint8Arrays as lower-case hex — the two
// non-JSON-native value kinds AlignedValue/Op trees carry.
const toGolden = (value: unknown): unknown => {
  if (typeof value === 'bigint') return `${value.toString()}n`;
  if (value instanceof Uint8Array) return Buffer.from(value).toString('hex');
  if (Array.isArray(value)) return value.map(toGolden);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, toGolden(v)]));
  }
  return value;
};

describe('executeCircuit against the ported spike counter-016 fixture (real compact-runtime@0.16)', () => {
  it('runs increment on a fresh counter, advancing round from 0 to 1, matching the committed golden transcript', async () => {
    const { Contract, ledger } = (await import(/* @vite-ignore */ resolve(FIXTURE_DIR, 'compiled/contract/index.js'))) as CompiledCounterModule;
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

    const transcript = executeCircuit(options, ledger8Runtime);

    expect(ledger(preState.data.state).round).toBe(0n);
    expect(ledger(transcript.postContractState.data.state).round).toBe(1n);
    // Against the REAL 0.16 glue, not a fake: increment moves no coins, so the
    // carried state is empty — but it is the runtime's own decoded shape, which
    // is what pins the injected decoder to the glue's own function.
    expect(transcript.zswapLocalState).toEqual({
      coinPublicKey: SAMPLE_COIN_PUBLIC_KEY,
      currentIndex: 0n,
      inputs: [],
      outputs: []
    });

    // `zswapLocalState` is omitted alongside the state members: the committed
    // golden pins the PROOF artifacts, and this circuit's coin movements are
    // asserted directly above rather than through the fixture.
    const serializable: Omit<
      TranscriptPojo,
      'preContractState' | 'postContractState' | 'privateStateAfter' | 'zswapLocalState'
    > = {
      circuitId: transcript.circuitId,
      result: transcript.result,
      input: transcript.input,
      output: transcript.output,
      publicTranscript: transcript.publicTranscript,
      privateTranscriptOutputs: transcript.privateTranscriptOutputs
    };
    const golden = JSON.parse(
      readFileSync(resolve(FIXTURE_DIR, 'increment-transcript.golden.json'), 'utf8')
    ) as unknown;
    expect(toGolden(serializable)).toEqual(golden);
  });
});
