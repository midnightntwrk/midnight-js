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

/**
 * Drives the REAL retained toolchain through compact-js's era-pinned ledger-8
 * entries, against the artifacts this repo already committed goldens for.
 *
 * The golden assertion is the oracle that retiring the hand-maintained
 * execution layer changed no behaviour: `increment-transcript.golden.json` was
 * minted from the old `executeCircuit` and is asserted here UNMODIFIED.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type * as Contract from '@midnight-ntwrk/compact-js/effect/Contract';
import { CompiledContract } from '@midnight-ntwrk/compact-js/v8/effect';
import { Effect } from 'effect';
import { describe, expect, it, vi } from 'vitest';

import { runRetainedCircuit } from '../lib/v8/executable';
import { fixturePath } from './fixtures';

// The compiled artifact opens with `checkRuntimeVersion('0.16.0')` against a
// bare `@midnight-ntwrk/compact-runtime` import, so the specifier is redirected
// to the retained alias for this file only -- the same redirect the retired
// `v8-execute.test.ts` used.
vi.mock('@midnight-ntwrk/compact-runtime', async () => import('compact-runtime-ledger8'));

const COUNTER_DIR = fixturePath('counter-016');
const SAMPLE_COIN_PUBLIC_KEY = '0'.repeat(64);
const ADDRESS = '00'.repeat(32);

/** The two non-JSON-native value kinds an `AlignedValue`/`Op` tree carries. */
const toGolden = (value: unknown): unknown => {
  if (typeof value === 'bigint') return `${value.toString()}n`;
  if (value instanceof Uint8Array) return Buffer.from(value).toString('hex');
  if (Array.isArray(value)) return value.map(toGolden);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, toGolden(v)]));
  }
  return value;
};

type CounterPrivateState = Record<string, never>;

/**
 * The counter artifact's own constructor result.
 *
 * compact-js's `ConstructorResult` declares only `currentPrivateState`; the
 * generated contract also returns the state it built, which is the member this
 * file needs. Narrowing it here rather than casting keeps the read checked.
 */
interface CounterConstructorResult {
  readonly currentPrivateState: CounterPrivateState;
  readonly currentContractState: { serialize(): Uint8Array };
}

interface CounterContract extends Contract.Contract<CounterPrivateState> {
  initialState(context: unknown): CounterConstructorResult;
}

interface CounterModule {
  readonly Contract: new (witnesses: Record<string, never>) => CounterContract;
}

/**
 * Builds the contract state the call runs against, as the SERIALIZED bytes the
 * chain serves — which is the only form {@link runRetainedCircuit} accepts.
 *
 * Runs the artifact's own constructor through the retained glue rather than
 * through `runRetainedConstructor`, so a fault in the constructor path cannot
 * make the circuit assertions below pass or fail for the wrong reason.
 */
const freshCounterStateBytes = async (contractModule: CounterModule): Promise<Uint8Array> => {
  const glue = await import('compact-runtime-ledger8');
  const contract = new contractModule.Contract({});
  const constructorContext = glue.createConstructorContext({}, SAMPLE_COIN_PUBLIC_KEY);
  return contract.initialState(constructorContext).currentContractState.serialize();
};

const loadCounter = async (): Promise<{
  module: CounterModule;
  compiled: CompiledContract.CompiledContract<CounterContract, CounterPrivateState, never>;
}> => {
  const contractModule = (await import(/* @vite-ignore */ resolve(COUNTER_DIR, 'compiled/contract/index.js'))) as CounterModule;
  const compiled = CompiledContract.make<CounterContract, CounterPrivateState>(
    'counter-016',
    contractModule.Contract
    // Both halves of `CompiledContract.Context` have to be discharged before
    // `ContractExecutable.make` will take it, so the assets path is supplied
    // even though a circuit call reads no ZK configuration.
  ).pipe(CompiledContract.withVacantWitnesses, CompiledContract.withCompiledFileAssets(COUNTER_DIR));
  return { module: contractModule, compiled };
};

describe('runRetainedCircuit against the counter-016 artifact (real compact-runtime@0.16)', () => {
  it('reproduces the committed golden transcript', async () => {
    // Arrange.
    const { module: contractModule, compiled } = await loadCounter();
    const contractStateBytes = await freshCounterStateBytes(contractModule);

    // Act.
    const transcript = await runRetainedCircuit({
      compiledContract: compiled,
      circuitId: 'increment',
      args: [],
      contractStateBytes,
      address: ADDRESS,
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      privateState: {}
    });

    // Assert.
    const golden: unknown = JSON.parse(readFileSync(resolve(COUNTER_DIR, 'increment-transcript.golden.json'), 'utf8'));
    expect(
      toGolden({
        circuitId: transcript.circuitId,
        result: transcript.result,
        input: transcript.input,
        output: transcript.output,
        publicTranscript: transcript.publicTranscript,
        privateTranscriptOutputs: transcript.privateTranscriptOutputs
      })
    ).toEqual(golden);
  });

  it('advances the state it returns, and encodes the state it claims to encode', async () => {
    // Arrange.
    const { module: contractModule, compiled } = await loadCounter();
    const contractStateBytes = await freshCounterStateBytes(contractModule);

    // Act.
    const transcript = await runRetainedCircuit({
      compiledContract: compiled,
      circuitId: 'increment',
      args: [],
      contractStateBytes,
      address: ADDRESS,
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      privateState: {}
    });

    // Assert. The encoded twin is the member ADR-0010 tells a consumer to
    // persist. Encoding the PRE-state instead would leave every other
    // assertion green, which is what the second expectation stops: the two
    // states genuinely differ, because the circuit advanced the round.
    expect(transcript.postContractStateEncoded).toEqual(transcript.postContractState.encode());
    expect(transcript.postContractStateEncoded).not.toEqual(transcript.preContractState.encode());
  });

  it('records the context the retained runtime actually built', async () => {
    // Arrange.
    const { module: contractModule, compiled } = await loadCounter();
    const contractStateBytes = await freshCounterStateBytes(contractModule);

    // Act.
    const transcript = await runRetainedCircuit({
      compiledContract: compiled,
      circuitId: 'increment',
      args: [],
      contractStateBytes,
      address: ADDRESS,
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      privateState: {}
    });

    // Assert. `increment` receives no coin, so it records no commitments and
    // claims no shielded receives.
    expect(transcript.partitionContext.block.ownAddress).toBe(ADDRESS);
    expect([...transcript.partitionContext.comIndices]).toEqual([]);
    expect(transcript.partitionContext.effects.claimedShieldedReceives).toEqual([]);
  });

  it('pins the block clock to the second it is given, rather than the wall clock', async () => {
    // Arrange.
    const { module: contractModule, compiled } = await loadCounter();
    const contractStateBytes = await freshCounterStateBytes(contractModule);
    const nowSeconds = 1_700_000_000;

    // Act.
    const transcript = await runRetainedCircuit({
      compiledContract: compiled,
      circuitId: 'increment',
      args: [],
      contractStateBytes,
      address: ADDRESS,
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      privateState: {},
      nowSeconds
    });

    // Assert. Without the pin this carries `Date.now()`, so the equality below
    // is what makes a recorded fixture reproducible at all
    // (midnightntwrk/midnight-sdk#403).
    expect(transcript.partitionContext.block.secondsSinceEpoch).toBe(BigInt(nowSeconds));
  });

  it('carries the balance the contract holds into the executing context', async () => {
    // Arrange. The balance rides INSIDE the serialized contract state; it is
    // not a separate argument. This is the regression #1345 was: handed a bare
    // state value rather than a whole contract state, the retained runtime
    // substitutes an empty balance map and a circuit reading a balance sees
    // nothing, with every guard green.
    const { module: contractModule, compiled } = await loadCounter();
    const { Ledger } = await import('@midnight-ntwrk/compact-js/v8/effect');
    const colour = { tag: 'shielded' as const, raw: '11'.repeat(32) };
    const held = 4_200n;

    const freshBytes = await freshCounterStateBytes(contractModule);
    const withBalance = await Effect.runPromise(
      Effect.gen(function* () {
        const state = yield* Ledger.contractStateFromBytes(freshBytes);
        state.balance = new Map([[colour, held]]);
        return state.serialize();
      })
    );

    // Act.
    const transcript = await runRetainedCircuit({
      compiledContract: compiled,
      circuitId: 'increment',
      args: [],
      contractStateBytes: withBalance,
      address: ADDRESS,
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      privateState: {}
    });

    // Assert.
    expect([...transcript.partitionContext.block.balance]).toEqual([[colour, held]]);
  });
});
