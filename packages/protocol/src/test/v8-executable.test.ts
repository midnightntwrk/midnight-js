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
import * as ContractConfigurationError from '@midnight-ntwrk/compact-js/effect/ContractConfigurationError';
import type { ZswapLocalState as CurrentZswapLocalState } from '@midnight-ntwrk/compact-runtime';
import type * as ocrt3 from '@midnight-ntwrk/onchain-runtime-v3';
import type {
  AlignedValue as LedgerV8AlignedValue,
  CallContext as LedgerV8CallContext,
  Effects as LedgerV8Effects,
  EncodedStateValue as LedgerV8EncodedStateValue,
  Op as LedgerV8Op,
  Transcript as LedgerV8Transcript
} from '@midnightntwrk/ledger-v8';
import type {
  AlignedValue as LedgerV9AlignedValue,
  CallContext as LedgerV9CallContext,
  Effects as LedgerV9Effects,
  EncodedStateValue as LedgerV9EncodedStateValue,
  Op as LedgerV9Op,
  Transcript as LedgerV9Transcript
} from '@midnightntwrk/ledger-v9';
import type { TokenType } from '@midnightntwrk/ledger-v9';
import * as glue from 'compact-runtime-ledger8';
import { Effect } from 'effect';
import { describe, expect, it, vi } from 'vitest';

import { ComposeFailedError, ComposeOptionError, DownConvertFailedError } from '../errors';
import type { EncodedStateValue } from '../lib/era/envelope';
import { loadLedgerEra } from '../lib/era/load-era';
import type { ContractBalance, ContractStatePojo } from '../lib/shared/contract-state';
import {
  causeChain,
  pinnedClock,
  recodeVerifierKeyBlobFailure,
  refuseVerifierKeyRead,
  runOrRethrow,
  runRetainedCircuit,
  runRetainedConstructor,
  soleCall,
  structurallyEqual
} from '../lib/v8/executable';
import { fixturePath } from './fixtures';
import type { Assert, MutuallyAssignable } from './type-assertions';

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
  readonly currentContractState: { data: { state: { encode(): EncodedStateValue } } };
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


const loadCounter = async (): Promise<{ module: CounterModule; contract: CounterContract }> => {
  const contractModule = (await import(/* @vite-ignore */ resolve(COUNTER_DIR, 'compiled/contract/index.js'))) as CounterModule;
  return { module: contractModule, contract: new contractModule.Contract({}) };
};

/**
 * The contract state a fresh counter starts on, in the ERA-NEUTRAL shape the
 * envelope readers produce — which is what execution takes.
 */
const freshCounterState = async (contractModule: CounterModule, balance: ContractBalance = new Map()) => {
  const contract = new contractModule.Contract({});
  const initial = contract.initialState(glue.createConstructorContext({}, SAMPLE_COIN_PUBLIC_KEY));
  return { state: initial.currentContractState.data.state.encode(), balance, entryPoints: [] };
};

/**
 * The `StateValue` builders the state-guard suite needs, over the retained
 * runtime's own algebra. A map is the only container whose encoding carries an
 * ORDER, which is what makes the round-trip comparison testable against the
 * real decoder rather than an injected one.
 */
const FIELD_ALIGNMENT: glue.Alignment = [{ tag: 'atom', value: { tag: 'field' } }];

const fieldValue = (byte: number): glue.AlignedValue => ({
  value: [new Uint8Array(32).fill(byte)],
  alignment: FIELD_ALIGNMENT
});

const cellSv = (byte: number): glue.StateValue => glue.StateValue.newCell(fieldValue(byte));

const mapOf = (...entries: readonly (readonly [number, glue.StateValue])[]): glue.StateValue =>
  glue.StateValue.newMap(
    entries.reduce((acc, [key, value]) => acc.insert(fieldValue(key), value), new glue.StateMap())
  );

/** The one {@link EncodedStateValue} variant whose encoding carries an order. */
type EncodedMapStateValue = Extract<EncodedStateValue, { readonly tag: 'map' }>;

const encodedThreeEntryMap = (): EncodedMapStateValue => {
  const encoded = mapOf([0x33, cellSv(0x33)], [0x11, cellSv(0x11)], [0x77, cellSv(0x77)]).encode();
  if (encoded.tag !== 'map') {
    throw new Error(`the map builder produced a '${encoded.tag}', not a map`);
  }
  return encoded;
};

describe('runRetainedCircuit against the counter-016 artifact (real compact-runtime@0.16)', () => {
  it('reproduces the committed golden transcript', async () => {
    // Arrange.
    const { module: contractModule, contract } = await loadCounter();
    const contractState = await freshCounterState(contractModule);

    // Act.
    const transcript = await runRetainedCircuit({
      contract,
      circuitId: 'increment',
      args: [],
      contractState,
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
    const { module: contractModule, contract } = await loadCounter();
    const contractState = await freshCounterState(contractModule);

    // Act.
    const transcript = await runRetainedCircuit({
      contract,
      circuitId: 'increment',
      args: [],
      contractState,
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
    const { module: contractModule, contract } = await loadCounter();
    const contractState = await freshCounterState(contractModule);

    // Act.
    const transcript = await runRetainedCircuit({
      contract,
      circuitId: 'increment',
      args: [],
      contractState,
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
    const { module: contractModule, contract } = await loadCounter();
    const contractState = await freshCounterState(contractModule);
    const nowSeconds = 1_700_000_000;

    // Act.
    const transcript = await runRetainedCircuit({
      contract,
      circuitId: 'increment',
      args: [],
      contractState,
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
    // Arrange. The balance travels on the SAME value as the state, so the two
    // cannot come off different reads. This is the regression #1345 was: handed
    // a bare state value rather than a whole contract state, the retained
    // runtime substitutes an empty balance map and a circuit reading a balance
    // sees nothing, with every guard green.
    const { module: contractModule, contract } = await loadCounter();
    const colour = { tag: 'shielded' as const, raw: '11'.repeat(32) };
    const held = 4_200n;
    const contractState = await freshCounterState(contractModule, new Map([[colour, held]]));

    // Act.
    const transcript = await runRetainedCircuit({
      contract,
      circuitId: 'increment',
      args: [],
      contractState,
      address: ADDRESS,
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      privateState: {}
    });

    // Assert.
    expect([...transcript.partitionContext.block.balance]).toEqual([[colour, held]]);
  });

  it('executes a contract whose state carries a CURRENT-era envelope', async () => {
    // Arrange. A contract an earlier post-fork call has already MIGRATED: its
    // state is written in the current era while its artifacts stay the retained
    // toolchain's, so it must keep executing on the retained runtime. A real
    // committed v9 envelope, decoded by the era that wrote it -- which is what
    // the pipeline threads.
    //
    // This is a regression test with a known failure: handing the chain's own
    // bytes to the retained decoder instead refuses them on the envelope tag,
    // which silently broke every keep-state call after the first.
    const receiverDir = fixturePath('coin-receiver-016');
    const receiverModule = (await import(/* @vite-ignore */ `${receiverDir}/compiled/contract/index.js`)) as CounterModule;
    const contract = new receiverModule.Contract({});
    const era = await loadLedgerEra('v9');
    const contractState = era.decodeContractState(
      Uint8Array.from(Buffer.from(readFileSync(`${receiverDir}/state-v9.hex`, 'utf8').trim(), 'hex'))
    );

    // Act.
    const transcript = await runRetainedCircuit({
      contract,
      circuitId: 'receive_coin',
      args: [{ nonce: new Uint8Array(32).fill(7), color: new Uint8Array(32), value: 42n }],
      contractState,
      address: ADDRESS,
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      privateState: {}
    });

    // Assert.
    expect(transcript.circuitId).toBe('receive_coin');
    expect(transcript.publicTranscript.length).toBeGreaterThan(0);
  });

  // The retained runtime's own refusals name neither the option, the era, nor
  // the caller: a short key reads back as `failed to fill whole buffer`, a
  // non-hex one as `Invalid character 'z' at position 0`. Measured against the
  // pinned runtime, a signing key is 32 bytes written as 64 hex characters, so
  // the LENGTH boundaries are as much a part of the shape as the alphabet is.
  it.each([
    ['empty', ''],
    ['not hex', 'z'.repeat(64)],
    ['too short', 'a1'.repeat(31)],
    ['too long', 'a1'.repeat(33)],
    ['odd length', `${'a1'.repeat(31)}a`]
  ])('refuses a signing key that is %s, by name and before the constructor runs', async (_label, signingKey) => {
    // Arrange. A key the retained runtime cannot read at all: the refusal has
    // to name the option, not leave the runtime's own buffer message to stand
    // for it, and it has to happen before anything executes.
    const { contract } = await loadCounter();
    let constructorRan = false;

    // Act.
    const rejection = await runRetainedConstructor({
      contract,
      args: [],
      privateState: {},
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      signingKey,
      verifierKeys: () => {
        constructorRan = true;
        return Promise.resolve(undefined);
      }
    }).catch((error: unknown) => error);

    // Assert.
    expect(rejection).toBeInstanceOf(ComposeOptionError);
    expect((rejection as ComposeOptionError).option).toBe('signingKey');
    expect((rejection as ComposeOptionError).version).toBe('v8');
    expect((rejection as ComposeOptionError).message).toContain('signingKey');
    expect(constructorRan).toBe(false);
  });

  it('never renders the refused signing key, which is a secret', async () => {
    // Arrange. A key malformed only by LENGTH, so its characters are the real
    // thing: a message that echoed its input would put a live secret into
    // whatever log or issue tracker the error reaches, and on the sampled path
    // that is the only copy in existence.
    const { contract } = await loadCounter();
    const nearMiss = 'c5'.repeat(31);

    // Act.
    const rejection = await runRetainedConstructor({
      contract,
      args: [],
      privateState: {},
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      signingKey: nearMiss,
      verifierKeys: () => Promise.resolve(undefined)
    }).catch((error: unknown) => error);

    // Assert.
    expect(rejection).toBeInstanceOf(ComposeOptionError);
    expect((rejection as ComposeOptionError).message).not.toContain(nearMiss.slice(0, 16));
  });

  it('refuses to build a state when the reader answers for no key', async () => {
    // Arrange.
    const { contract } = await loadCounter();

    // Act.
    const rejection = await runRetainedConstructor({
      contract,
      args: [],
      privateState: {},
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      verifierKeys: () => Promise.resolve(undefined)
    }).catch((error: unknown) => error);

    // Assert. STRICTER than the leg this replaced, and deliberately recorded:
    // a retained-era constructor used to leave every entry point's key slot
    // blank, and the deploy composition was the only thing that checked
    // coverage. compact-js refuses before a state is built at all, naming the
    // circuit whose key is missing.
    expect(rejection).toBeInstanceOf(Error);
    expect(String(rejection)).toContain("'increment'");
  });

  it('codes a verifier key the ledger rejects, naming the circuit it was served for', async () => {
    // Arrange. A blob the reader answers with but the ledger refuses. compact-js
    // writes the keys itself inside `initialize`, so this is the first thing to
    // touch the bytes -- the retained composer, which used to raise the coded
    // refusal, is never reached.
    const { contract } = await loadCounter();

    // Act.
    const rejection = await runRetainedConstructor({
      contract,
      args: [],
      privateState: {},
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      verifierKeys: () => Promise.resolve(new Uint8Array([0x00, 0x01, 0x02]))
    }).catch((error: unknown) => error);

    // Assert. The same stage the v9 arm raises for the same fault, so a
    // consumer switching on `stage` is not told a different story per era.
    expect(rejection).toBeInstanceOf(ComposeFailedError);
    expect((rejection as ComposeFailedError).stage).toBe('deploy-verifier-key-blob');
    expect((rejection as ComposeFailedError).circuitId).toBe('increment');
    expect((rejection as ComposeFailedError).version).toBe('v8');
    expect((rejection as ComposeFailedError).cause).toBeDefined();
  });

  it('surfaces a verifier-key read failure rather than deploying without the key', async () => {
    // Arrange.
    const { contract } = await loadCounter();
    const cause = new Error('the key store was unreachable');

    // Act.
    const rejection = await runRetainedConstructor({
      contract,
      args: [],
      privateState: {},
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      verifierKeys: () => Promise.reject(cause)
    }).catch((error: unknown) => error);

    // Assert.
    expect(rejection).toBeInstanceOf(Error);
    expect(String(rejection)).toContain('increment');
    // The READER's own reason has to survive. Without this an implementation
    // that swallowed it and reported only "could not read a key for
    // 'increment'" passes -- which is the whole point of `causeChain`.
    expect(String(rejection)).toContain('the key store was unreachable');
    expect((rejection as Error).cause).toBeDefined();
  });
});

const SENTINEL_NOT_CALLED = Symbol('the circuit was never called');

/**
 * The balance the runtime hands a circuit at the moment it runs.
 *
 * Read off the context the circuit itself receives, not off the transcript:
 * `partitionContext.block` is the PRE-execution context, so asserting on it
 * pins only that the property was set going in. #1345 was the runtime dropping
 * the balance as the glue swapped contexts, which a pre-execution assertion
 * cannot see.
 */
const balanceSeenByTheCircuit = (contract: CounterContract): { readonly read: () => unknown } => {
  const circuits = contract as unknown as Record<string, Record<string, (...args: never[]) => unknown>>;
  const inner = circuits.provableCircuits.increment;
  let seen: unknown = SENTINEL_NOT_CALLED;
  circuits.provableCircuits.increment = (context: never, ...args: never[]) => {
    const queryContext = (context as unknown as Record<string, unknown>).currentQueryContext;
    seen = ((queryContext as Record<string, unknown> | undefined)?.block as Record<string, unknown> | undefined)
      ?.balance;
    return inner(context, ...args);
  };
  return { read: () => seen };
};

describe('the balance a circuit actually reads', () => {
  it('survives into the executing context, not merely into the one built beforehand', async () => {
    // Arrange.
    const { module: contractModule, contract } = await loadCounter();
    const colour = { tag: 'shielded' as const, raw: '11'.repeat(32) };
    const held = 4_200n;
    const contractState = await freshCounterState(contractModule, new Map([[colour, held]]));
    const observed = balanceSeenByTheCircuit(contract);

    // Act.
    await runRetainedCircuit({
      contract,
      circuitId: 'increment',
      args: [],
      contractState,
      address: ADDRESS,
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      privateState: {}
    });

    // Assert. #1345 was exactly this map arriving EMPTY, with every other guard
    // green and the node refusing the resulting transcript.
    expect(observed.read()).toBeInstanceOf(Map);
    expect([...(observed.read() as Map<unknown, unknown>)]).toEqual([[colour, held]]);
  });

  it('arrives empty when the contract holds nothing, so the row above is not vacuous', async () => {
    // Arrange.
    const { module: contractModule, contract } = await loadCounter();
    const contractState = await freshCounterState(contractModule);
    const observed = balanceSeenByTheCircuit(contract);

    // Act.
    await runRetainedCircuit({
      contract,
      circuitId: 'increment',
      args: [],
      contractState,
      address: ADDRESS,
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      privateState: {}
    });

    // Assert.
    expect([...(observed.read() as Map<unknown, unknown>)]).toEqual([]);
  });
});

describe('refuseVerifierKeyRead', () => {
  it('names the circuit whose key a circuit call tried to read', async () => {
    // Arrange, Act.
    const rejection = await refuseVerifierKeyRead('increment').catch((error: unknown) => error);

    // Assert. A circuit call reads no ZK configuration -- measured, not
    // assumed -- so this reader exists to make a future version that DOES read
    // one fail by name rather than silently serve `Option.none()` and compose a
    // call with a blank key slot.
    expect(rejection).toBeInstanceOf(Error);
    expect((rejection as Error).message).toContain("'increment'");
  });
});

describe('pinnedClock', () => {
  it('answers the same instant on every accessor, in each accessor\'s own unit', async () => {
    // Arrange, Act.
    const clock = pinnedClock(1_700_000_000);

    // Assert. compact-js reads `currentTimeMillis` and divides to seconds, but
    // the whole interface is pinned so a future read cannot quietly fall back
    // to the wall clock. The units differ and a copy-paste between them would
    // be off by a factor of a million.
    expect(clock.unsafeCurrentTimeMillis()).toBe(1_700_000_000_000);
    expect(Effect.runSync(clock.currentTimeMillis)).toBe(1_700_000_000_000);
    expect(clock.unsafeCurrentTimeNanos()).toBe(1_700_000_000_000_000_000n);
    expect(Effect.runSync(clock.currentTimeNanos)).toBe(1_700_000_000_000_000_000n);
    // The members that are NOT overridden must survive. `Clock.make()` returns a
    // class instance and these two live on its prototype, so building the pinned
    // clock with a spread drops them -- with no type error, because a spread
    // type keeps the declared members.
    expect(typeof clock.sleep).toBe('function');
    await expect(Effect.runPromise(Effect.sleep('1 millis').pipe(Effect.withClock(clock)))).resolves.toBeUndefined();
  });

  it('accepts a FRACTIONAL second, which is what the obvious consumer expression produces', () => {
    // Arrange. `nowSeconds` is a plain `number` on the published
    // `RunRetainedCircuitOptions`, and `Date.now() / 1000` -- the expression a
    // consumer reaches for -- is fractional. Unrounded, `BigInt(millis)` dies
    // with `RangeError: ... cannot be converted to a BigInt because it is not
    // an integer`, from inside the clock builder, naming neither the option nor
    // the era.
    const nowSeconds = 1_700_000_000.123_456;

    // Act.
    const clock = pinnedClock(nowSeconds);

    // Assert. Rounded to the millisecond, which is the finest unit the
    // interface carries -- compact-js divides it back down to seconds.
    expect(clock.unsafeCurrentTimeMillis()).toBe(1_700_000_000_123);
    expect(clock.unsafeCurrentTimeNanos()).toBe(1_700_000_000_123_000_000n);
  });
});

describe('pinnedClock refuses a second it cannot pin to', () => {
  // `Number(process.env.NOW_SECONDS)` with the variable unset is `NaN`, and it
  // is a plain `number` on the published option. Without a refusal it reaches
  // `BigInt(millis)` and dies with a bare `RangeError` from inside the clock
  // builder, naming neither the option nor the era -- the exact failure the
  // rounding fix set out to remove.
  it.each([
    ['NaN', Number.NaN],
    ['positive infinity', Number.POSITIVE_INFINITY],
    ['negative infinity', Number.NEGATIVE_INFINITY]
  ])('refuses %s by naming the option', (_label, nowSeconds) => {
    // Act.
    const refusal = (): unknown => pinnedClock(nowSeconds);

    // Assert.
    expect(refusal).toThrow(/nowSeconds/);
  });

  it('still accepts a finite second, so the refusal is not refusing everything', () => {
    // Act & Assert.
    expect(pinnedClock(1_700_000_000).unsafeCurrentTimeMillis()).toBe(1_700_000_000_000);
  });
});

describe('soleCall', () => {
  it('reads the one call a retained-era execution produces', () => {
    expect(soleCall(['only'], 'increment')).toBe('only');
  });

  it('refuses an empty call list by naming the circuit', () => {
    // The retained era cannot make a cross-contract call, so its adapter
    // synthesises exactly one entry. An empty list is a contract this era
    // cannot honour, and is refused rather than read as `undefined` and carried
    // into a composition.
    expect(() => soleCall([], 'increment')).toThrow("circuit 'increment' produced no contract call");
  });
});

describe('a failing circuit', () => {
  it('surfaces the runtime\'s own reason, not just compact-js\'s wrapper', async () => {
    // Arrange. `receive_coin` on a contract state that does not fit it: the
    // retained runtime refuses inside the circuit, and compact-js reports that
    // as `Error executing circuit '...'` with the real diagnostic on `cause`.
    const { module: contractModule, contract } = await loadCounter();
    const contractState = await freshCounterState(contractModule);

    // Act.
    const rejection = await runRetainedCircuit({
      contract,
      circuitId: 'increment',
      args: ['not-an-argument-this-circuit-takes'],
      contractState,
      address: ADDRESS,
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      privateState: {}
    }).catch((error: unknown) => error);

    // Assert. The wrapper alone would leave a caller reading
    // `Error executing circuit 'increment'` with no idea why. Both halves have
    // to reach them, and the original has to stay on `cause` so it can still be
    // discriminated on.
    expect(rejection).toBeInstanceOf(Error);
    expect((rejection as Error).message).toContain('increment');
    expect((rejection as Error).message.split(': ').length).toBeGreaterThan(1);
    expect((rejection as Error).cause).toBeDefined();
  });
});

describe('causeChain', () => {
  it('reads every message down the chain, outermost first', () => {
    const root = new Error('Block time is <= time');
    const wrapped = new Error("Error executing circuit 'testBlockTimeGt'", { cause: root });

    expect(causeChain(wrapped)).toEqual(["Error executing circuit 'testBlockTimeGt'", 'Block time is <= time']);
  });

  it('reads a cause that is a bare string, which a thrown literal produces', () => {
    expect(causeChain(new Error('outer', { cause: 'inner reason' }))).toEqual(['outer', 'inner reason']);
  });

  it('stops on a cycle rather than recursing forever', () => {
    // A self-referential cause is not hypothetical: a handler that re-wraps an
    // error it already wrapped produces one, and the walk must terminate.
    const looped: { message: string; cause?: unknown } = { message: 'looped' };
    looped.cause = looped;

    expect(causeChain(looped)).toEqual(['looped']);
  });

  it('answers nothing for a value carrying no message at all', () => {
    expect(causeChain(undefined)).toEqual([]);
    expect(causeChain({ cause: { cause: undefined } })).toEqual([]);
  });
});

describe('runOrRethrow', () => {
  it('passes a success straight through', async () => {
    await expect(runOrRethrow(Effect.succeed('value'))).resolves.toBe('value');
  });

  it('rethrows a failure with the whole cause chain and the original on `cause`', async () => {
    const root = new Error('Block time is <= time');
    const wrapped = new Error("Error executing circuit 'testBlockTimeGt'", { cause: root });

    const rejection = await runOrRethrow(Effect.fail(wrapped)).catch((error: unknown) => error);

    // `Effect.runPromise` alone rejects with a `FiberFailure`, which carries
    // neither the class nor the cause -- so the reason the circuit actually
    // failed never reaches the caller. This is the assertion an e2e test caught
    // the hard way.
    expect((rejection as Error).message).toBe("Error executing circuit 'testBlockTimeGt': Block time is <= time");
    expect((rejection as Error).cause).toBe(wrapped);
  });

  it('rethrows a CODED protocol error unchanged, so a caller can still branch on it', async () => {
    // Arrange. Flattening every failure to a bare `Error` erases the class, and
    // with it the `code` and `stage` a consumer discriminates on -- including
    // for errors this package raised itself on the way through.
    const coded = new ComposeFailedError('v8', 'deploy-verifier-key-blob', 'increment', new Error('ledger said no'));

    // Act.
    const rejection = await runOrRethrow(Effect.fail(coded)).catch((error: unknown) => error);

    // Assert.
    expect(rejection).toBe(coded);
    expect((rejection as ComposeFailedError).stage).toBe('deploy-verifier-key-blob');
  });

  it('reports EVERY failure when concurrent work fails, not just the first', async () => {
    // Arrange. `zkConfigurationLayer` reads verifier keys with
    // `concurrency: 'unbounded'`, so a deploy whose ZK config is missing three
    // circuits' artifacts fails three times at once. Reporting one sends the
    // caller round the fix-and-rerun loop once per missing key.
    const concurrentlyFailing = Effect.all(
      [
        Effect.tryPromise(() => Promise.reject(new Error('increment is missing'))),
        Effect.tryPromise(() => Promise.reject(new Error('decrement is missing'))),
        Effect.tryPromise(() => Promise.reject(new Error('reset is missing')))
      ],
      { concurrency: 'unbounded' }
    );

    // Act.
    const rejection = await runOrRethrow(concurrentlyFailing).catch((error: unknown) => error);

    // Assert.
    expect(String(rejection)).toContain('increment is missing');
    expect(String(rejection)).toContain('decrement is missing');
    expect(String(rejection)).toContain('reset is missing');
  });

  it('keeps the code when a CODED failure arrives beside others', async () => {
    // Arrange. Two typed failures at once. Guarding the coded-error branch on
    // the failure COUNT means every class is flattened here, so a consumer
    // switching on `PROTOCOL_ERROR_CODES` gets nothing -- and the
    // `@throws ComposeFailedError` on `executeConstructor` stops holding.
    const coded = new ComposeFailedError('v8', 'deploy-verifier-key-blob', 'increment', new Error('ledger said no'));
    const concurrentlyFailing = Effect.all([Effect.fail(coded), Effect.fail(new Error('reset is missing'))], {
      concurrency: 'unbounded'
    });

    // Act.
    const rejection = await runOrRethrow(concurrentlyFailing).catch((error: unknown) => error);

    // Assert.
    expect(rejection).toBeInstanceOf(ComposeFailedError);
    expect((rejection as ComposeFailedError).stage).toBe('deploy-verifier-key-blob');
  });

  it('reports a DEFECT, which carries no typed failure to read', async () => {
    // Arrange. A throw outside the typed error channel -- what vendor code
    // raising unexpectedly produces. `Cause.failures` is empty for one, so the
    // squashed cause is the only thing left to report.
    const defect = new Error('the runtime threw where it declared it would not');

    // Act.
    const rejection = await runOrRethrow(Effect.die(defect)).catch((error: unknown) => error);

    // Assert.
    expect(String(rejection)).toContain('the runtime threw where it declared it would not');
  });

  it('still says something when the failure carries no message', async () => {
    // A failure value that is not an `Error` at all. Without the fallback the
    // rethrown message would be empty, which is worse than the wrapper it
    // replaced.
    const rejection = await runOrRethrow(Effect.fail(42)).catch((error: unknown) => error);

    expect((rejection as Error).message).toBe('42');
  });
});

// The two state guards `runRetainedCircuit` runs BEFORE it executes anything.
// Both used to live in the hand-maintained `lib/v8/down-convert.ts`; both are
// reachable from the published seam, because `RunRetainedCircuitOptions` takes
// a `ContractStatePojo` whose `state` is a bare `EncodedStateValue` a caller
// can assemble by hand, and whose `balance` is an ordinary interface member.
describe('runRetainedCircuit refuses a state it cannot execute against', () => {
  const runAgainst = async (contractState: ContractStatePojo): Promise<unknown> => {
    const { contract } = await loadCounter();
    return runRetainedCircuit({
      contract,
      circuitId: 'increment',
      args: [],
      contractState,
      address: ADDRESS,
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      privateState: {}
    }).catch((error: unknown) => error);
  };

  // Every substitution `new Map(...)` accepts yields an EMPTY balance, which is
  // indistinguishable from a contract that holds nothing -- the circuit then
  // reads zero where the chain says otherwise, with every guard green. That is
  // #1345, and the reason it is checked rather than trusted is that `tsc`
  // reaches neither an untyped JavaScript caller nor an options object
  // assembled dynamically.
  const unusableBalances: readonly [label: string, balance: unknown][] = [
    ['an absent balance', undefined],
    ['a null balance', null],
    ['an empty array', []],
    ['an empty Set', new Set()],
    ['a string', ''],
    ['amounts that are not bigints', new Map([[{ tag: 'shielded', raw: '00'.repeat(32) }, 1]])]
  ];

  it.each(unusableBalances)('refuses %s rather than executing on an empty one', async (_label, balance) => {
    // Arrange.
    const { module: contractModule } = await loadCounter();
    const fresh = await freshCounterState(contractModule);

    // Act.
    const rejection = await runAgainst({ ...fresh, balance: balance as ContractBalance });

    // Assert.
    // CODED, like every other refusal on this seam: a consumer switching on
    // `stage` must not be handed a classless error for the one refusal that
    // exists to keep #1345 closed.
    expect(rejection).toBeInstanceOf(DownConvertFailedError);
    expect((rejection as DownConvertFailedError).stage).toBe('state down-convert');
    expect(String((rejection as Error).cause)).toMatch(/carries no usable balance/);
  });

  // The structural round trip: decode the state, re-encode it, and refuse a
  // value that did not come back. The comparison is cross-codec in production
  // -- a MIGRATED contract's state is encoded by ledger-v9 and decoded by the
  // retained runtime -- so what it catches is the two disagreeing about a
  // shape one of them accepts. Both rows below are refused by the REAL
  // decoder; neither needs an injected one.
  const notItsOwnSource: readonly [label: string, mangle: (encoded: EncodedMapStateValue) => EncodedStateValue][] = [
    [
      'a map whose entries are in non-canonical order',
      (encoded) => ({ ...encoded, content: new Map([...encoded.content].reverse()) })
    ],
    // `Object.assign` rather than an object literal: an undeclared property on
    // a literal is an excess-property error, and the value under test is
    // exactly the one an untyped JavaScript caller can hand over.
    [
      'a value carrying a member the decoder ignores',
      (encoded) => Object.assign({}, encoded, { extraneous: 'dropped' })
    ]
  ];

  it.each(notItsOwnSource)('refuses %s, which decodes but does not re-encode to its source', async (_label, mangle) => {
    // Arrange. A three-entry map, so reversing the order is observable at all.
    const { module: contractModule } = await loadCounter();
    const fresh = await freshCounterState(contractModule);

    // Act.
    const rejection = await runAgainst({ ...fresh, state: mangle(encodedThreeEntryMap()) });

    // Assert. DOWN_CONVERT_FAILED at the down-convert stage, which is what a
    // consumer switching on `stage` already discriminates on.
    expect(rejection).toBeInstanceOf(DownConvertFailedError);
    expect((rejection as DownConvertFailedError).stage).toBe('state down-convert');
    expect((rejection as DownConvertFailedError).cause).toBeDefined();
  });

  // A state the retained decoder THROWS on, rather than one that decodes and
  // fails the round trip. The retired `downConvertForExecution` wrapped the
  // whole decode in a try/catch and coded every failure; only the round-trip
  // mismatch is coded without one, so these leave as bare vendor errors
  // carrying neither `code` nor `stage`.
  const undecodable = (shape: Record<string, unknown>): EncodedStateValue =>
    Object.assign({} as EncodedStateValue, shape);

  const refusedByTheDecoder: readonly [label: string, state: EncodedStateValue][] = [
    ['a tag no retained-era variant declares', undecodable({ tag: 'nonsense' })],
    ['a value carrying no tag at all', undecodable({})],
    ['a cell with no content', undecodable({ tag: 'cell' })]
  ];

  it.each(refusedByTheDecoder)('codes %s as a down-convert failure', async (_label, state) => {
    // Arrange.
    const { module: contractModule } = await loadCounter();
    const fresh = await freshCounterState(contractModule);

    // Act.
    const rejection = await runAgainst({ ...fresh, state });

    // Assert. The same discrimination the round-trip refusal offers, so a
    // consumer switching on `stage` reaches the same remediation either way.
    expect(rejection).toBeInstanceOf(DownConvertFailedError);
    expect((rejection as DownConvertFailedError).stage).toBe('state down-convert');
    expect((rejection as DownConvertFailedError).cause).toBeDefined();
  });

  it('codes a colour the retained runtime cannot read, rather than leaking the WASM error', async () => {
    // Arrange. `isContractBalance` checks only that a colour's `tag` is a
    // string -- never `raw` -- so this passes the guard and reaches the WASM
    // `balance` setter, which refuses it. An untyped caller, or a migrated
    // contract whose balance the ledger-v9 reader produced, is how it arrives.
    const { module: contractModule } = await loadCounter();
    const fresh = await freshCounterState(contractModule);
    const colourWithoutRaw: TokenType = Object.assign({} as TokenType, { tag: 'shielded' });

    // Act.
    const rejection = await runAgainst({ ...fresh, balance: new Map([[colourWithoutRaw, 5n]]) });

    // Assert.
    expect(rejection).toBeInstanceOf(DownConvertFailedError);
    expect((rejection as DownConvertFailedError).stage).toBe('state down-convert');
    expect((rejection as DownConvertFailedError).cause).toBeDefined();
  });

  it('executes a state that IS its own source, so the round trip is not refusing everything', async () => {
    // Arrange. The positive control for the two rows above: the same builder,
    // unmangled.
    const { module: contractModule } = await loadCounter();
    const fresh = await freshCounterState(contractModule);

    // Act.
    const rejection = await runAgainst(fresh);

    // Assert.
    expect(rejection).not.toBeInstanceOf(Error);
  });
});

describe('runRetainedCircuit refuses a circuit the contract does not declare', () => {
  // `provableCircuits` is a plain object literal in the 0.16 artifact, so its
  // PROTOTYPE is live. compact-js resolves a circuit with `contract
  // .provableCircuits[id]` guarded only by `if (!circuit)`, which a prototype
  // member satisfies -- it then CALLS `Object.prototype.toString` with the
  // runtime context and feeds the result to `readExecution`. The retired
  // `executeCircuit` refused an unknown id by name before dispatching.
  const inheritedFromObjectPrototype = ['toString', 'valueOf', 'constructor', 'hasOwnProperty'] as const;

  it.each([...inheritedFromObjectPrototype, 'no_such_circuit'])(
    'refuses %s rather than dispatching to it',
    async (circuitId) => {
      // Arrange.
      const { module: contractModule, contract } = await loadCounter();
      const contractState = await freshCounterState(contractModule);

      // Act.
      const rejection = await runRetainedCircuit({
        contract,
        circuitId,
        args: [],
        contractState,
        address: ADDRESS,
        coinPk: SAMPLE_COIN_PUBLIC_KEY,
        privateState: {}
      }).catch((error: unknown) => error);

      // Assert.
      expect(rejection).toBeInstanceOf(Error);
      expect(String(rejection)).toContain(circuitId);
      expect(String(rejection)).toContain('increment');
    }
  );

  it('still runs the circuit the contract DOES declare, so the guard is not refusing everything', async () => {
    // Arrange.
    const { module: contractModule, contract } = await loadCounter();
    const contractState = await freshCounterState(contractModule);

    // Act.
    const transcript = await runRetainedCircuit({
      contract,
      circuitId: 'increment',
      args: [],
      contractState,
      address: ADDRESS,
      coinPk: SAMPLE_COIN_PUBLIC_KEY,
      privateState: {}
    });

    // Assert.
    expect(transcript.circuitId).toBe('increment');
  });
});

describe('recodeVerifierKeyBlobFailure', () => {
  it('re-codes a blob the ledger refused, carrying the ledger\'s own error as the cause', () => {
    // Arrange.
    const ledgerSaidNo = new Error('malformed verifier key');
    const reported = ContractConfigurationError.make(
      "Failed to configure verifier key for circuit 'increment' for the given contract state",
      undefined,
      ledgerSaidNo
    );

    // Act.
    const recoded = recodeVerifierKeyBlobFailure(reported);

    // Assert.
    expect(recoded).toBeInstanceOf(ComposeFailedError);
    expect((recoded as ComposeFailedError).circuitId).toBe('increment');
    expect((recoded as ComposeFailedError).cause).toBe(ledgerSaidNo);
  });

  // Each row is a configuration refusal that is NOT a rejected blob, and must
  // reach the caller unchanged -- re-coding one would report a missing key, or
  // an unrelated failure, as bytes the ledger refused.
  it.each([
    [
      'a configuration error carrying no cause, which is a key that was never served',
      ContractConfigurationError.make("Circuit 'increment' is undefined for the given contract state", undefined)
    ],
    [
      'a configuration error whose message names no circuit',
      ContractConfigurationError.make('something else entirely went wrong', undefined, new Error('why'))
    ],
    ['a failure that is not a configuration error at all', new Error('unrelated')]
  ])('passes %s through unchanged', (_label, reported) => {
    // Act.
    const recoded = recodeVerifierKeyBlobFailure(reported);

    // Assert.
    expect(recoded).toBe(reported);
  });
});

describe('structurallyEqual', () => {
  it('holds for a state value and its own re-encoding, including a multi-entry map', () => {
    // Also pins the assumption the comparison relies on: the runtime emits map
    // entries in a canonical key order, so a value and its re-encoding iterate
    // identically even when the entries were inserted out of order.
    const encoded = mapOf([0x33, cellSv(0x33)], [0x11, cellSv(0x11)], [0x77, cellSv(0x77)]).encode();

    expect(structurallyEqual(glue.StateValue.decode(encoded).encode(), encoded)).toBe(true);
  });

  it.each([
    { name: 'identical primitives', a: 1, b: 1, equal: true },
    { name: 'different primitives', a: 1, b: 2, equal: false },
    { name: 'null against an object', a: null, b: {}, equal: false },
    { name: 'an object against a primitive', a: {}, b: 1, equal: false },
    { name: 'equal byte arrays', a: new Uint8Array([1, 2]), b: new Uint8Array([1, 2]), equal: true },
    { name: 'byte arrays of different length', a: new Uint8Array([1, 2]), b: new Uint8Array([1]), equal: false },
    { name: 'byte arrays differing in one byte', a: new Uint8Array([1, 2]), b: new Uint8Array([1, 3]), equal: false },
    { name: 'a byte array against a plain array', a: new Uint8Array([1]), b: [1], equal: false },
    { name: 'equal maps', a: new Map([['k', 1]]), b: new Map([['k', 1]]), equal: true },
    { name: 'maps of different size', a: new Map([['k', 1]]), b: new Map(), equal: false },
    { name: 'maps with different keys', a: new Map([['k', 1]]), b: new Map([['j', 1]]), equal: false },
    { name: 'maps with different values', a: new Map([['k', 1]]), b: new Map([['k', 2]]), equal: false },
    { name: 'a map against a plain object', a: new Map([['k', 1]]), b: { k: 1 }, equal: false },
    { name: 'equal arrays', a: [1, 2], b: [1, 2], equal: true },
    { name: 'arrays of different length', a: [1, 2], b: [1], equal: false },
    { name: 'an array against an object', a: [1], b: { 0: 1 }, equal: false },
    { name: 'equal objects', a: { x: 1, y: [2] }, b: { x: 1, y: [2] }, equal: true },
    { name: 'objects with different key counts', a: { x: 1 }, b: { x: 1, y: 2 }, equal: false },
    { name: 'objects with different values', a: { x: 1 }, b: { x: 2 }, equal: false },
    { name: 'objects with different keys', a: { x: 1 }, b: { y: 1 }, equal: false },
    // Key *counts* matching is not key *sets* matching. Looking each of a's
    // keys up in b without checking the key exists reads `undefined` on both
    // sides and short-circuits to equal, so these two disagree on every key
    // and still compare equal. Unreachable in today's EncodedStateValue
    // algebra, which has no undefined-valued fields -- and the reason this is
    // pinned rather than left to that assumption holding forever.
    { name: 'objects whose keys differ, with an undefined value', a: { x: undefined }, b: { y: 1 }, equal: false },
    { name: 'objects whose keys differ, both undefined-valued', a: { x: undefined }, b: { y: undefined }, equal: false },
    // Map order-sensitivity is deliberate, not incidental: it is what makes
    // the re-encode comparison exact. A get()-based rewrite would pass every
    // string-keyed row above and silently drop that property.
    {
      name: 'maps with the same entries in a different order',
      a: new Map([
        ['a', 1],
        ['b', 2]
      ]),
      b: new Map([
        ['b', 2],
        ['a', 1]
      ]),
      equal: false
    }
  ])('is $equal for $name', ({ a, b, equal }) => {
    expect(structurallyEqual(a, b)).toBe(equal);
  });
});

// Compile-time drift detector, restored from the retired `v8-down-convert.test.ts`.
// If a vendor bump changes the wire shape of EncodedStateValue, Op, AlignedValue,
// Transcript, CallContext or Effects between the retained (onchain-runtime-v3 /
// ledger-v8) and current (ledger-v9) packages this engine bridges, this block
// stops compiling. It is deliberately not paired with a runtime assertion, which
// would be a tautology after erasure.
//
// Where it is checked: `yarn typecheck:tests`, run BOTH by the pre-push hook and
// by CI (`typecheck:tests:core`, ci-base.yml). Test files are outside
// tsconfig.build.json and vitest transpiles without type-checking, so the test
// run itself does not evaluate it -- the typecheck job does.
type AssertEqual<A, B> = (<T>() => T extends A ? 1 : 0) extends <T>() => T extends B ? 1 : 0 ? true : false;
type Expect<T extends true> = T;

type _EncodedStateValueUnchanged = Expect<AssertEqual<ocrt3.EncodedStateValue, LedgerV9EncodedStateValue>>;
type _OpUnchanged = Expect<AssertEqual<ocrt3.Op<null>, LedgerV9Op<null>>>;
type _AlignedValueUnchanged = Expect<AssertEqual<ocrt3.AlignedValue, LedgerV9AlignedValue>>;
type _TranscriptUnchanged = Expect<
  AssertEqual<ocrt3.Transcript<ocrt3.AlignedValue>, LedgerV9Transcript<LedgerV9AlignedValue>>
>;

// The ledger-v8 axis, pinned for the same reason: `assemble-call.ts` crosses the
// envelope into whichever ledger module it is handed, and its safety argument --
// a safe envelope crossing, not a lossy re-encode -- covers ledger-v8 as soon as
// the retained leg binds to it.
type _V8EncodedStateValueUnchanged = Expect<AssertEqual<LedgerV8EncodedStateValue, LedgerV9EncodedStateValue>>;
type _V8OpUnchanged = Expect<AssertEqual<LedgerV8Op<null>, LedgerV9Op<null>>>;
type _V8AlignedValueUnchanged = Expect<AssertEqual<LedgerV8AlignedValue, LedgerV9AlignedValue>>;
type _V8TranscriptUnchanged = Expect<
  AssertEqual<LedgerV8Transcript<LedgerV8AlignedValue>, LedgerV9Transcript<LedgerV9AlignedValue>>
>;

// `CallContext` and `Effects` join them one step further out, and this is the row
// closest to the new code: `runRetainedCircuit` reads `partitionInputs.block` and
// `.effects` off compact-js's RETAINED types and publishes them as
// `PartitionContext`, declared once against ledger-v9, which a composition leg
// then writes onto whichever era's `QueryContext` it partitions against. Three
// axes have to agree for that to be a move rather than a re-encode, and the WASM
// setters reject a mismatched record at runtime, from inside wasm, with no
// compile error to warn first.
type _CallContextUnchanged = Expect<AssertEqual<ocrt3.CallContext, LedgerV9CallContext>>;
type _EffectsUnchanged = Expect<AssertEqual<ocrt3.Effects, LedgerV9Effects>>;
type _V8CallContextUnchanged = Expect<AssertEqual<LedgerV8CallContext, LedgerV9CallContext>>;
type _V8EffectsUnchanged = Expect<AssertEqual<LedgerV8Effects, LedgerV9Effects>>;

// ADR-0009 declares `nextZswapLocalState` once, as the CURRENT era's
// `ZswapLocalState`, rather than behind a third type parameter -- and rests that
// on the two runtimes' declarations being interchangeable. This is the check that
// claim names. `packages/types` cannot host it (it may not reach the retained
// runtime), so it lives here, where both are in scope.
type _ZswapLocalStateInterchangeable = Assert<
  MutuallyAssignable<glue.ZswapLocalState, CurrentZswapLocalState>
>;
