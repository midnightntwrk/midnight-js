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

import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import type * as currentRuntimeModule from '@midnight-ntwrk/compact-runtime';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import type { DownConvertedState, ExecuteCircuitOptions } from '@midnight-ntwrk/midnight-js-protocol';
import { loadLedger8Engine } from '@midnight-ntwrk/midnight-js-protocol';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';

import { hfFixturePath } from '../src/fixtures-hf';

// The `private-counter` fixture pair: one source, compiled by both toolchains.
//
// This suite lives in testkit-js rather than beside the provider it drives
// because it needs BOTH compact runtimes in hand at once. `eslint.config.mjs`
// gates every file under `packages/` to reach a runtime version only through
// `midnight-js-protocol`, and exempts testkit-js in as many words — "fixtures
// and cross-version test doubles legitimately need a specific version in hand".
// That is exactly what this is.
const RETAINED_COMPILED = hfFixturePath('private-counter-016/compiled/contract/index.js');
const TWIN_COMPILED = hfFixturePath('private-counter-twin/compiled/contract/index.js');
const RETAINED_CONTRACT_INFO = hfFixturePath('private-counter-016/compiled/compiler/contract-info.json');
const TWIN_CONTRACT_INFO = hfFixturePath('private-counter-twin/compiled/compiler/contract-info.json');
const SOURCE = hfFixturePath('private-counter-twin/private-counter.compact');

// The digest of the source BOTH builds were compiled from. Spelled out rather
// than derived, so editing the contract without recompiling fails here: the
// version gate below catches "recompiled one side only", but nothing else
// catches "edited the source, recompiled neither" -- which would leave the
// suite testing an artifact the source and the README no longer describe.
const SOURCE_SHA256 = '183c8ca3b57d5c9d466a5d1915f6cfc4ebb45e33dbd056d46483e12ab1d736f0';

// Where a maintainer goes when one of the fixture gates below fires.
const RECOMPILE = 'recompile BOTH sides from the one source and recommit them - see "Regenerating" in src/fixtures/hf/README.md';

const RETAINED_RUNTIME_VERSION = '0.16.0';
const COIN_PUBLIC_KEY = 'ca'.repeat(32);
const CONTRACT_ADDRESS = `02${'1d'.repeat(31)}` as ContractAddress;
const PASSWORD = 'Fork-Window-Pass9!';
const ACCOUNT_ID = 'cross-window-account';

/**
 * The dApp's own private state. `step` is the only member the contract can see,
 * through the `localIncrement` witness, and `callCount` is what that witness
 * writes back; `secretKey` and `nullifiers` are the dApp's alone and no circuit
 * ever touches them. Not one of the four members survives JSON, so a storage
 * layer that stopped preserving types would hand a post-fork reader numbers,
 * strings and plain objects instead.
 */
interface CounterPrivateState {
  readonly step: bigint;
  readonly callCount: bigint;
  readonly secretKey: Uint8Array;
  readonly nullifiers: ReadonlyMap<string, bigint>;
}

const isCounterPrivateState = (value: unknown): value is CounterPrivateState => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const members: Record<string, unknown> = { ...value };
  return (
    typeof members.step === 'bigint' &&
    typeof members.callCount === 'bigint' &&
    members.secretKey instanceof Uint8Array &&
    members.nullifiers instanceof Map
  );
};

/** What `private-counter.compact` projects for its witness: its whole ledger. */
interface CounterLedger {
  readonly round: bigint;
}

/** The slice of the runtime's `WitnessContext` this suite's witness reads. */
interface WitnessView {
  readonly ledger: CounterLedger;
  readonly privateState: CounterPrivateState;
}

/**
 * The dApp's witness, identical on both sides of the fork: it discloses `step`
 * to the circuit and hands back a private state with one more call recorded.
 * Every call is appended to `seen`, so a test can assert what the runtime
 * actually showed it rather than trusting that it ran.
 */
const recordingWitnesses = (seen: WitnessView[]) => ({
  localIncrement: (context: WitnessView): [CounterPrivateState, bigint] => {
    seen.push({ ledger: context.ledger, privateState: context.privateState });
    return [{ ...context.privateState, callCount: context.privateState.callCount + 1n }, context.privateState.step];
  }
});

type Witnesses = ReturnType<typeof recordingWitnesses>;

/**
 * A compiled Compact contract's private-state surface is exactly its witness
 * list: witnesses are the only members that read or write private state. The
 * index signature carries the rest of the file — `circuits`, `ledger`,
 * `contracts` — which the identity assertion compares wholesale.
 */
interface CompiledContractInfo {
  readonly 'compiler-version': string;
  readonly 'language-version': string;
  readonly 'runtime-version': string;
  readonly witnesses: readonly { readonly name: string }[];
  readonly [member: string]: unknown;
}

const readContractInfo = async (contractInfoPath: string): Promise<CompiledContractInfo> =>
  JSON.parse(await fs.readFile(contractInfoPath, 'utf8')) as CompiledContractInfo;

/** The three members two builds of one source are ALLOWED to disagree on. */
const VERSION_MEMBERS = ['compiler-version', 'language-version', 'runtime-version'];

/**
 * Everything a compiled contract declares except its toolchain versions: the
 * circuits, the ledger, the contract references and the witnesses. Two builds of
 * one source must agree on all of it.
 */
const withoutVersions = (info: CompiledContractInfo): Record<string, unknown> =>
  Object.fromEntries(Object.entries(info).filter(([member]) => !VERSION_MEMBERS.includes(member)));

/** The retained build, typed as the engine's own `executeCircuit` demands it. */
type RetainedContract = ExecuteCircuitOptions['contract'] & {
  initialState(constructorContext: unknown): { readonly currentContractState: DownConvertedState };
};

interface RetainedModule {
  readonly Contract: new (witnesses: Witnesses) => RetainedContract;
  readonly ledger: (state: unknown) => CounterLedger;
}

/**
 * The current-toolchain build. Its codegen is async, and its circuits take a
 * context the runtime builds rather than the contract state directly.
 */
interface TwinContract {
  readonly impureCircuits: {
    increment(context: unknown): Promise<{
      readonly context: { readonly callContext: { readonly currentQueryContext: { readonly state: unknown } } };
    }>;
  };
  initialState(constructorContext: unknown): Promise<{ readonly currentContractState: CurrentContractState }>;
}

interface TwinModule {
  readonly Contract: new (witnesses: Witnesses) => TwinContract;
  readonly ledger: (state: unknown) => CounterLedger;
}

/** The runtime members this suite calls on BOTH sides of the fork. */
interface CompactRuntimeLike {
  readonly versionString: string;
  readonly createConstructorContext: (privateState: unknown, coinPublicKey: string) => unknown;
  readonly dummyContractAddress: () => string;
}

/**
 * The CURRENT runtime, by its own types — which are the right ones for it,
 * since this repo resolves `@midnight-ntwrk/compact-runtime` to 0.19.0-rc.0.
 * The retained arm cannot use them (its VALUE is the 0.16 glue while these
 * types are 0.19's), which is why {@link CompactRuntimeLike} above spells out
 * by hand the few members that exist, and agree, on both sides.
 */
type CurrentRuntime = typeof currentRuntimeModule;

/** The contract-state shape the current runtime's circuit context accepts. */
type CurrentContractState = Parameters<CurrentRuntime['createCircuitContext']>[3];

interface RetainedToolchain {
  readonly runtime: CompactRuntimeLike;
  readonly module: RetainedModule;
}

interface TwinToolchain {
  readonly runtime: CurrentRuntime;
  readonly module: TwinModule;
}

describe('private state across the ledger v8 to v9 fork window', () => {
  let dbName: string;
  let retained: RetainedToolchain;
  let twin: TwinToolchain;

  /**
   * Both toolchains, resolved once, in this order and nowhere else.
   *
   * The retained build's own bare `@midnight-ntwrk/compact-runtime` import has
   * to reach a real 0.16 instance, which this repo does not resolve that
   * specifier to — it pins 0.19.0-rc.0, and the build's
   * `checkRuntimeVersion('0.16.0')` guard refuses it. `compact-runtime-ledger8`
   * IS that 0.16 instance, installed under an npm alias so the two can coexist;
   * redirecting the specifier is the same move `v8-execute.test.ts` makes.
   *
   * The redirect then has to be LIFTED, because the twin needs the very
   * 0.19.0-rc.0 the repo does resolve. `vi.doMock` rather than `vi.mock` so the
   * redirect is not hoisted over the whole file, and both modules are pulled in
   * here so no test has to care which redirect is in force when it runs.
   *
   * Both runtime handles are imported from the one bare specifier, so which era
   * a handle carries is decided by the redirect in force when it is taken.
   */
  beforeAll(async () => {
    dbName = await fs.mkdtemp(path.join(os.tmpdir(), 'midnight-cross-window-'));

    vi.doMock('@midnight-ntwrk/compact-runtime', async () => import('compact-runtime-ledger8'));
    // Before the reset below, so the engine and the retained build capture the
    // same physical 0.16 instance: two copies would fail wasm-bindgen's own
    // class-identity checks deep inside a call.
    await loadLedger8Engine();
    retained = {
      runtime: await import('@midnight-ntwrk/compact-runtime'),
      module: (await import(/* @vite-ignore */ RETAINED_COMPILED)) as RetainedModule
    };

    vi.doUnmock('@midnight-ntwrk/compact-runtime');
    vi.resetModules();
    twin = {
      runtime: await import('@midnight-ntwrk/compact-runtime'),
      module: (await import(/* @vite-ignore */ TWIN_COMPILED)) as TwinModule
    };
  });

  afterAll(async () => {
    await fs.rm(dbName, { recursive: true, force: true });
  });

  const openProvider = () => {
    const provider = levelPrivateStateProvider<string, CounterPrivateState>({
      midnightDbName: dbName,
      privateStoragePasswordProvider: () => PASSWORD,
      accountId: ACCOUNT_ID
    });
    provider.setContractAddress(CONTRACT_ADDRESS);
    return provider;
  };

  /**
   * The dApp after graduation. The encryption key is cached per database for the
   * life of the process, so a second provider alone would reuse the key the
   * pre-fork write derived; dropping the cache makes the post-fork read derive
   * it again from the password and the persisted salt, as a restarted dApp does.
   */
  const openPostForkProvider = async () => {
    const provider = openProvider();
    await provider.invalidateEncryptionCache();
    return provider;
  };

  /**
   * One `increment()` call on the RETAINED toolchain, through the only
   * sanctioned runtime path to it. Returns the private state that execution
   * produced, the round it left behind, and what the witness was shown.
   */
  const runRetainedIncrement = async (privateState: CounterPrivateState) => {
    const seen: WitnessView[] = [];
    const contract = new retained.module.Contract(recordingWitnesses(seen));
    const initial = contract.initialState(retained.runtime.createConstructorContext(privateState, COIN_PUBLIC_KEY));
    const engine = await loadLedger8Engine();
    const transcript = engine.executeCircuit({
      contract,
      circuitId: 'increment',
      args: [],
      state: initial.currentContractState,
      address: retained.runtime.dummyContractAddress(),
      coinPk: COIN_PUBLIC_KEY,
      privateState
    });
    if (!isCounterPrivateState(transcript.privateStateAfter)) {
      throw new Error('the retained execution did not hand back a private state of the expected shape');
    }
    return {
      privateState: transcript.privateStateAfter,
      round: retained.module.ledger(transcript.postContractState.data.state).round,
      seen
    };
  };

  /** The same call on the CURRENT toolchain — the post-fork half of the window. */
  const runTwinIncrement = async (privateState: CounterPrivateState) => {
    const seen: WitnessView[] = [];
    const contract = new twin.module.Contract(recordingWitnesses(seen));
    const initial = await contract.initialState(twin.runtime.createConstructorContext(privateState, COIN_PUBLIC_KEY));
    const result = await contract.impureCircuits.increment(
      twin.runtime.createCircuitContext(
        'increment',
        twin.runtime.dummyContractAddress(),
        COIN_PUBLIC_KEY,
        initial.currentContractState,
        privateState
      )
    );
    return {
      round: twin.module.ledger(result.context.callContext.currentQueryContext.state).round,
      seen
    };
  };

  it('compiles the same source to the same private-state surface on both sides of the fork', async () => {
    const retainedInfo = await readContractInfo(RETAINED_CONTRACT_INFO);
    const twinInfo = await readContractInfo(TWIN_CONTRACT_INFO);

    // Everything but the toolchain versions, compared wholesale: the circuits,
    // the ledger and the witnesses all have to survive the recompile, and
    // gating only the witnesses would let the other two drift past this suite.
    expect(withoutVersions(twinInfo)).toEqual(withoutVersions(retainedInfo));
    // Non-empty, and named: this contract HAS private state, which is the
    // whole reason this pair exists. The assertion above would hold just as
    // well for two builds that both declared none.
    expect(retainedInfo.witnesses.map((witness) => witness.name)).toEqual(['localIncrement']);
    // Neither build can drift from the source they were compiled from without
    // this failing -- the version gates below only compare the two builds to
    // each other, so an edited source with neither side recompiled is invisible
    // to them.
    expect(createHash('sha256').update(await fs.readFile(SOURCE)).digest('hex'), RECOMPILE).toBe(SOURCE_SHA256);
    expect(retainedInfo['runtime-version']).toBe(RETAINED_RUNTIME_VERSION);
    // A gate, not decoration: the twin is only executable while its declared
    // runtime is the one this repo resolves. Bumping compact-runtime without
    // recompiling the fixture fails here, rather than as a version-mismatch
    // throw from deep inside the twin's own module body. Exact equality is
    // stricter than the runtime's own `checkRuntimeVersion`, which compares
    // only major/minor on a 0.x version -- so a 0.19.0-rc.0 -> 0.19.0 bump
    // trips this while the fixture would still load. That is the intent: the
    // pair is recompiled deliberately, never left to drift quietly.
    expect(twinInfo['runtime-version'], RECOMPILE).toBe(twin.runtime.versionString);
    expect(retained.runtime.versionString).toBe(RETAINED_RUNTIME_VERSION);
  });

  it('returns a private state written by a retained-toolchain execution to a later reader, value intact', async () => {
    const preForkState: CounterPrivateState = {
      step: 7n,
      callCount: 0n,
      secretKey: new Uint8Array(32).fill(0xa7),
      nullifiers: new Map([
        ['0xfeed', 3n],
        ['0xbeef', 9n]
      ])
    };
    const preFork = await runRetainedIncrement(preForkState);
    // The retained runtime really ran the circuit and really called the witness:
    // the round advanced by the step the witness disclosed, the witness was
    // shown the pre-call ledger, and the state that reaches storage is the one
    // the witness handed back rather than the one passed in.
    expect(preFork.round).toBe(7n);
    expect(preFork.seen).toHaveLength(1);
    expect(preFork.seen[0].ledger.round).toBe(0n);
    // Identity, deliberately: the runtime hands the witness the very object it
    // was given, so a structural comparison here would compare `preForkState`
    // with itself and could never fail.
    expect(preFork.seen[0].privateState).toBe(preForkState);
    expect(preFork.privateState).not.toBe(preForkState);
    expect(preFork.privateState.callCount).toBe(1n);
    const preForkProvider = openProvider();
    await preForkProvider.set('private-counter', preFork.privateState);

    const postForkProvider = await openPostForkProvider();
    const readBack = await postForkProvider.get('private-counter');

    // The pass criterion is the DECODED VALUE, never the stored bytes: this
    // package is era-agnostic and persists through superjson plus AES, so a byte
    // comparison would assert superjson's output stability instead of
    // private-state continuity.
    expect(readBack).toEqual(preFork.privateState);
    // Without this the assertion above would also hold for a provider that
    // handed the caller its own argument back without ever storing it.
    expect(readBack).not.toBe(preFork.privateState);
    expect(readBack?.step).toBe(7n);
    expect(readBack?.callCount).toBe(1n);
    expect(readBack?.secretKey).toBeInstanceOf(Uint8Array);
    expect(readBack?.secretKey).toEqual(new Uint8Array(32).fill(0xa7));
    expect(readBack?.nullifiers).toBeInstanceOf(Map);
    expect([...(readBack?.nullifiers ?? [])]).toEqual([
      ['0xfeed', 3n],
      ['0xbeef', 9n]
    ]);
  });

  it('lets the post-fork twin read the same meaning out of it, and continue from it', async () => {
    const preFork = await runRetainedIncrement({
      step: 5n,
      callCount: 0n,
      secretKey: new Uint8Array(32).fill(0x5c),
      nullifiers: new Map([['0xcafe', 1n]])
    });
    const preForkProvider = openProvider();
    await preForkProvider.set('private-counter-continued', preFork.privateState);

    const postForkProvider = await openPostForkProvider();
    const carried = await postForkProvider.get('private-counter-continued');
    if (!isCounterPrivateState(carried)) {
      throw new Error('the post-fork reader found no usable private state to continue from');
    }
    const postFork = await runTwinIncrement(carried);

    // Same meaning, not merely the same bytes: the current toolchain's witness
    // was shown exactly what the retained one wrote, and reading `step` out of
    // the carried state drove its ledger to the same round the retained
    // execution reached.
    expect(postFork.seen).toEqual([{ ledger: { round: 0n }, privateState: preFork.privateState }]);
    expect(postFork.round).toBe(preFork.round);
    expect(postFork.seen[0].privateState.callCount).toBe(1n);
  });

  it('keeps the values written before the fork intact when the post-fork dApp writes on top of them', async () => {
    const preFork = await runRetainedIncrement({
      step: 3n,
      callCount: 0n,
      secretKey: new Uint8Array(32).fill(0x33),
      nullifiers: new Map([['0xdead', 4n]])
    });
    const preForkProvider = openProvider();
    await preForkProvider.set('private-counter-post-fork-write', preFork.privateState);

    const postForkProvider = await openPostForkProvider();
    const carried = await postForkProvider.get('private-counter-post-fork-write');
    if (!isCounterPrivateState(carried)) {
      throw new Error('the post-fork reader found no usable private state to continue from');
    }
    await postForkProvider.set('private-counter-post-fork-write', {
      ...carried,
      callCount: carried.callCount + 1n,
      nullifiers: new Map([...carried.nullifiers, ['0xf00d', 2n]])
    });
    const restartedProvider = await openPostForkProvider();
    const continued = await restartedProvider.get('private-counter-post-fork-write');

    expect(continued?.secretKey).toEqual(preFork.privateState.secretKey);
    expect(continued?.step).toBe(3n);
    expect(continued?.callCount).toBe(2n);
    expect([...(continued?.nullifiers ?? [])]).toEqual([
      ['0xdead', 4n],
      ['0xf00d', 2n]
    ]);
  });
});
