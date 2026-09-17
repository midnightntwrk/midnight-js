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
import { fileURLToPath } from 'node:url';

import type { ZKConfigProvider } from '@midnight-ntwrk/midnight-js-types';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { deployContract } from '../deploy-contract';
import { EraArtifactMismatchError, Ledger8DeployOnV9Error } from '../errors';
import { resolveArtifactEra } from '../internal/era';
import type { Ledger8ContractProviders } from '../ledger8-contract';
import type {
  CoinReceiver016Contract,
  CoinReceiver016Module,
  Counter016Contract,
  Counter016Module
} from './ledger8-fixture-types';
import { createMockCompiledContract, createMockProviders } from './test-mocks';

// The other half of `../ledger8-contract.ts`. That file hand-writes the retained-era
// (`compact-runtime@0.16`) contract type family: it describes generated code without being
// generated from it. A hand-written type is a claim about generated code, and this test is what
// makes the claim checkable at RUNTIME: it loads the REAL generated artifact, constructs it, and
// asserts the exact structural facts the family encodes — facts a declaration file cannot state,
// such as which members the constructor actually installs and whether they are async.
//
// The pairing is required, not optional. `typecheck/overloads.test-d.ts` proves the overloads
// DISCRIMINATE the two eras and that the family accepts the artifact's own DECLARATIONS; only this
// test proves those declarations describe the JavaScript that actually ships. Without it, both
// generated files could agree with each other and disagree with reality.

// The shared hard-fork fixture tree, which lives in `testkit-js` because that is where the
// fixtures are produced and where the e2e suites consume them.
//
// Reached by relative path rather than through a package dependency: `testkit-js` depends on
// `midnight-js-contracts`, so declaring it as a dependency here would close a workspace cycle.
// `packages/protocol/src/test/fixtures.ts` reaches the same tree the same way.
const FIXTURES_DIR = resolve(fileURLToPath(new URL('../../../../', import.meta.url)), 'testkit-js/testkit-js/src/fixtures/hf');
const COUNTER_016_DIR = resolve(FIXTURES_DIR, 'counter-016/compiled/contract');
const COUNTER_016_MODULE = resolve(COUNTER_016_DIR, 'index.js');
const COIN_RECEIVER_016_DIR = resolve(FIXTURES_DIR, 'coin-receiver-016/compiled/contract');
const COIN_RECEIVER_016_MODULE = resolve(COIN_RECEIVER_016_DIR, 'index.js');
const TWIN_MODULE = resolve(FIXTURES_DIR, 'twin-contract/compiled/contract/index.js');
const TWIN_MODULE_TYPES = resolve(FIXTURES_DIR, 'twin-contract/compiled/contract/index.d.ts');

// The registered symbol the current era's `CompiledContract` container is branded with. Spelled
// out rather than imported so this test asserts the brand's ABSENCE against the literal key, and
// keeps asserting it if the vendor moves where the constant is exported from.
const COMPILED_CONTRACT_BRAND = Symbol.for('compact-js/CompiledContract');

/**
 * The circuit ids a generated declaration file declares, read off its `ImpureCircuits` block.
 *
 * Scoped to that one block rather than the whole file: `Circuits` and `ProvableCircuits` repeat
 * the same members, so matching file-wide would report each id three times and compare a list
 * nothing installs.
 */
const declaredCircuitIds = (declarations: string): string[] => {
  const block = /export type ImpureCircuits<PS> = \{([\s\S]*?)\n\}/.exec(declarations);
  if (!block) {
    throw new Error('the declaration file has no ImpureCircuits block');
  }
  return [...block[1].matchAll(/^\s{2}(\w+)\(context:/gm)].map((match) => match[1]).sort();
};

// The fixture's generated code opens with `checkRuntimeVersion('0.16.0')`, which the installed
// (current) `@midnight-ntwrk/compact-runtime` rejects outright, and then builds type descriptors
// and an empty context at module scope. Only what that module-scope code touches is stubbed here:
// nothing in this test EXECUTES a circuit or a constructor, it only inspects the members the
// generated class installs, and every one of those is generated code rather than runtime code.
//
// An insufficient stub cannot pass silently — the module's top-level code would throw during
// import and the whole suite would fail loudly — which is why a stub is safe here where
// `packages/protocol` needs the real retained runtime injected instead.
vi.mock('@midnight-ntwrk/compact-runtime', () => {
  class CompactTypeStub {
    alignment(): unknown[] {
      return [];
    }
    fromValue(value: unknown): unknown {
      return value;
    }
    toValue(value: unknown): unknown[] {
      return [value];
    }
  }
  class ContractStateStub {
    data: unknown = undefined;
  }
  class QueryContextStub {}
  return {
    checkRuntimeVersion: (): void => undefined,
    CompactError: Error,
    CompactTypeBoolean: new CompactTypeStub(),
    CompactTypeBytes: CompactTypeStub,
    CompactTypeUnsignedInteger: CompactTypeStub,
    ContractState: ContractStateStub,
    dummyContractAddress: (): string => '00'.repeat(32),
    emptyRunningCost: (): unknown => ({}),
    QueryContext: QueryContextStub
  };
});

const loadCounter016 = async (): Promise<Counter016Module> => import(/* @vite-ignore */ COUNTER_016_MODULE);
const loadCoinReceiver016 = async (): Promise<CoinReceiver016Module> =>
  import(/* @vite-ignore */ COIN_RECEIVER_016_MODULE);
// The current-era twin, loaded for its RAW contract instance rather than its declaration file.
// `Contract` is the only member read, and it is generated code like the retained-era fixtures.
const loadTwin = async (): Promise<{ readonly Contract: new (witnesses: object) => object }> =>
  import(/* @vite-ignore */ TWIN_MODULE);

describe('the retained-era contract family matches the real compact-runtime@0.16 artifact', () => {
  let contract: Counter016Contract;
  let contractModule: Counter016Module;

  beforeAll(async () => {
    contractModule = await loadCounter016();
    contract = new contractModule.Contract({});
  });

  it('installs exactly the four members the family declares, and no others', () => {
    const ownMembers = Object.keys(contract);

    expect(ownMembers.sort()).toEqual(['circuits', 'impureCircuits', 'provableCircuits', 'witnesses'].sort());
  });

  it('exposes initialState as a SYNCHRONOUS function, which admits the artifact without placing it', () => {
    expect(typeof contract.initialState).toBe('function');
    // A PRECONDITION of the retained route, not its reason. `AsyncFunction` here would mean the
    // artifact was produced by the current toolchain and would refuse it outright; `Function` is
    // what a real retained artifact AND a transpiled current-era one both read, so it decides
    // nothing on its own -- the declared runtime version does. See `era-artifact-declaration.test.ts`.
    expect(contract.initialState.constructor.name).toBe('Function');
  });

  it('exposes every impure circuit as a SYNCHRONOUS function', () => {
    const circuitIds = Object.keys(contract.impureCircuits);
    expect(circuitIds.sort()).toEqual(['increment']);

    const asyncCircuitIds = Object.entries(contract.impureCircuits)
      .filter(([, circuit]) => circuit.constructor.name !== 'Function')
      .map(([circuitId]) => circuitId);
    expect(asyncCircuitIds).toEqual([]);
  });

  it('sets provableCircuits as well as impureCircuits, so neither one discriminates the era on its own', () => {
    // The reason the family is built on sync-versus-async rather than on which circuit collections
    // are present: the retained artifact sets BOTH, exactly as the current era's does.
    expect(Object.keys(contract.provableCircuits).sort()).toEqual(Object.keys(contract.impureCircuits).sort());
    expect(Object.keys(contract.circuits).sort()).toEqual(Object.keys(contract.impureCircuits).sort());
  });

  it('carries no current-era CompiledContract brand, so the two eras cannot be confused at runtime either', () => {
    expect(COMPILED_CONTRACT_BRAND in contract).toBe(false);
    expect('tag' in contract).toBe(false);
  });

  it('ships the declaration file the type test imports, wired to the RETAINED runtime', () => {
    // `../ledger8-fixture-types.ts` types both fixtures from these declarations, so the compile
    // assertions and the runtime assertions look at one artifact. Two things have to hold for that
    // to mean anything, and neither is visible from the type side:
    //
    //  - the declaration is there at all (it was deliberately not ported until #1312);
    //  - it names `compact-runtime-ledger8`, this repo's alias for the retained
    //    `@midnight-ntwrk/compact-runtime@0.16.0`. `compactc` emits the bare specifier, which the
    //    root `resolutions` pin to 0.19.0 — so left alone the retained fixture would be typed
    //    against the CURRENT runtime's `CircuitContext`. That is loud rather than silent (the
    //    conformance assertions in `typecheck/overloads.test-d.ts` go red), but it fails somewhere
    //    that says nothing about a specifier, which is what this pins. The one-line rewrite is
    //    documented in `fixtures/hf/README.md` under `counter-016/`.
    const counterTypes = readFileSync(resolve(COUNTER_016_DIR, 'index.d.ts'), 'utf8');
    expect(counterTypes).toContain("from 'compact-runtime-ledger8'");
    expect(counterTypes).not.toContain("from '@midnight-ntwrk/compact-runtime'");
    expect(counterTypes).toContain('export declare class Contract');
    expect(readFileSync(TWIN_MODULE_TYPES, 'utf8')).toContain('export declare class Contract');

    // And the declaration belongs to THIS module. Strict equality in BOTH directions, not
    // `toContain` per circuit: a one-directional check misses a circuit declared in the `.d.ts`
    // that the module does not install, which is the direction that would make the type test
    // assert about a circuit no caller can reach. Regenerating one file without the other is how
    // the pairing breaks.
    expect(declaredCircuitIds(counterTypes)).toEqual(Object.keys(contract.impureCircuits).sort());
  });

  it('exports no expectedVk, unlike the current era whose modules always do', () => {
    expect('expectedVk' in contractModule).toBe(false);
  });

  describe('the same facts hold for the ARGUMENT-TAKING artifact, not just the zero-argument one', () => {
    // The second half of the pairing, and the reason it exists: every structural fact above was
    // asserted against a circuit that takes no arguments of its own, so nothing tied the family's
    // handling of real circuit ARGUMENTS to a real artifact. `coin-receiver-016`'s `receive_coin`
    // takes one (its own arity guard is `args_1.length !== 2`, against the counter's `!== 1`), and
    // `typecheck/overloads.test-d.ts` asserts the retained-era overload RESOLVES for it. These
    // assertions are what tie the generated DECLARATION `CoinReceiver016Contract` now comes from
    // to the generated JavaScript beside it.
    let coinReceiver: CoinReceiver016Contract;
    let coinReceiverModule: CoinReceiver016Module;

    beforeAll(async () => {
      coinReceiverModule = await loadCoinReceiver016();
      coinReceiver = new coinReceiverModule.Contract({});
    });

    it('installs exactly the four members the family declares, and no others', () => {
      expect(Object.keys(coinReceiver).sort()).toEqual(
        ['circuits', 'impureCircuits', 'provableCircuits', 'witnesses'].sort()
      );
    });

    it('exposes initialState and every impure circuit as SYNCHRONOUS functions', () => {
      expect(typeof coinReceiver.initialState).toBe('function');
      expect(coinReceiver.initialState.constructor.name).toBe('Function');

      expect(Object.keys(coinReceiver.impureCircuits).sort()).toEqual(['receive_coin']);
      const asyncCircuitIds = Object.entries(coinReceiver.impureCircuits)
        .filter(([, circuit]) => circuit.constructor.name !== 'Function')
        .map(([circuitId]) => circuitId);
      expect(asyncCircuitIds).toEqual([]);
    });

    it('declares the coin argument with the byte widths the DECLARATION cannot state', () => {
      // `CoinReceiver016Coin` is now derived from the generated declaration, so field names and
      // TypeScript types are tied to the artifact by the compiler. Byte widths are not: the
      // declaration erases them to `Uint8Array` and `bigint`. The generated JavaScript states them
      // outright in its own type-error text, which is the only place they can be pinned -- and it
      // is also what cross-checks the two generated files against each other.
      const source = readFileSync(COIN_RECEIVER_016_MODULE, 'utf8');

      expect(source).toContain('nonce: Bytes<32>');
      expect(source).toContain('color: Bytes<32>');
      expect(source).toContain('value: Uint<0..340282366920938463463374607431768211456>');
    });

    it('really does take one argument beyond the context, which is what the counter cannot show', () => {
      // Read off the generated arity guard rather than the compact source: the guard is what the
      // artifact enforces, and `2` is the context plus one real argument. The counter's is `1`.
      const source = readFileSync(COIN_RECEIVER_016_MODULE, 'utf8');
      expect(source).toContain('receive_coin: expected 2 arguments');
      expect(readFileSync(COUNTER_016_MODULE, 'utf8')).toContain('increment: expected 1 argument');
    });

    it('carries no current-era CompiledContract brand either', () => {
      expect(COMPILED_CONTRACT_BRAND in coinReceiver).toBe(false);
      expect('tag' in coinReceiver).toBe(false);
    });

    it('ships the same retained-runtime-wired declaration file, and exports no expectedVk', () => {
      const coinReceiverTypes = readFileSync(resolve(COIN_RECEIVER_016_DIR, 'index.d.ts'), 'utf8');
      expect(coinReceiverTypes).toContain("from 'compact-runtime-ledger8'");
      expect(coinReceiverTypes).not.toContain("from '@midnight-ntwrk/compact-runtime'");
      expect(coinReceiverTypes).toContain('export declare class Contract');
      expect(declaredCircuitIds(coinReceiverTypes)).toEqual(Object.keys(coinReceiver.impureCircuits).sort());
      expect('expectedVk' in coinReceiverModule).toBe(false);
    });

    it('and the current era DOES export expectedVk, so the absence above is a property of the era', () => {
      // Without this, `expectedVk` absence is unfalsifiable: it would keep passing if the current
      // toolchain stopped emitting it too.
      expect(readFileSync(TWIN_MODULE, 'utf8')).toContain('export const expectedVk');
    });
  });

  describe('the era dispatch fork routes the real artifact away from the current-era pipeline', () => {
    // The overloads accept the retained-era shape but nothing executes it yet. These assertions
    // are what prove the fork is WIRED: each entry point recognises the real artifact and refuses
    // it by name, instead of falling through into the current-era pipeline and failing somewhere
    // unrelated to the era.
    // The shared mock is keyed by `string`, and `ZKConfigProvider<K>` reports `K` back out of
    // `getVerifierKeys`, so a `string`-keyed one is not a `'increment'`-keyed one. Only that single
    // provider has to be re-narrowed; the rest of the shared mock spreads in unchanged.
    const zkConfigProvider: ZKConfigProvider<'increment'> = {
      getZKIR: vi.fn(),
      getProverKey: vi.fn(),
      getVerifierKey: vi.fn(),
      getArtifactRuntimeVersion: vi.fn().mockResolvedValue('0.16.0'),
      getVerifierKeys: vi.fn(),
      get: vi.fn(),
      asKeyMaterialProvider: vi.fn()
    };
    const providers: Ledger8ContractProviders<Counter016Contract, 'increment'> = {
      ...createMockProviders(),
      zkConfigProvider
    };

    let rawCurrentEraContract: object;
    let coinReceiverContract: CoinReceiver016Contract;

    beforeAll(async () => {
      const twin = await loadTwin();
      rawCurrentEraContract = new twin.Contract({ round: (): readonly [unknown, unknown] => [0n, 0n] });
      coinReceiverContract = new (await loadCoinReceiver016()).Contract({});
    });

    it('places the real retained-era artifacts, and a current-era container as not', async () => {
      // `resolveArtifactEra` is the single era decision. The retained artifacts are placed from the
      // runtime version their bundle declares; the current-era container is placed from its own
      // `tag`, without the bundle being consulted at all.
      await expect(resolveArtifactEra(contract, zkConfigProvider)).resolves.toBe('ledger8');
      await expect(resolveArtifactEra(coinReceiverContract, zkConfigProvider)).resolves.toBe('ledger8');
      await expect(
        resolveArtifactEra({ tag: 'counter', pipe: (): void => undefined }, zkConfigProvider)
      ).resolves.toBe('ledger9');
    });

    it('places a REAL current-era container, not just a hand-rolled stand-in', async () => {
      // `createMockCompiledContract` goes through `CompiledContract.make(...).pipe(withVacantWitnesses)`,
      // which is how every real container is built. A literal `{ tag, pipe }` resembles only the
      // transient `make()` result and would keep passing if the check were widened.
      await expect(resolveArtifactEra(createMockCompiledContract(), zkConfigProvider)).resolves.toBe('ledger9');
    });

    it('refuses a RAW current-era contract instance, which also carries impureCircuits', async () => {
      // The blind spot that made the error message lie. A raw current-era instance is what a
      // JavaScript consumer passes when they forget the container, and `impureCircuits` alone does
      // not tell the eras apart -- the current toolchain installs it too. Here the real artifact
      // still carries its `async initialState`, which is proof of the current era on its own, so it
      // is refused before the bundle is read. A build that erased that `async` is refused too, by
      // the runtime version the bundle declares -- see `era-artifact-declaration.test.ts`.
      await expect(resolveArtifactEra(rawCurrentEraContract, zkConfigProvider)).rejects.toBeInstanceOf(
        EraArtifactMismatchError
      );
    });

    it('refuses a contract belonging to neither era, where the superseded check returned false', async () => {
      // The changed failure mode, and the reason the provisional check was replaced rather than
      // patched: it answered `false` here and let the request fall into the current-era pipeline,
      // to fail later on something unrelated to the era.
      await expect(resolveArtifactEra(undefined, zkConfigProvider)).rejects.toBeInstanceOf(EraArtifactMismatchError);
      await expect(resolveArtifactEra(null, zkConfigProvider)).rejects.toBeInstanceOf(EraArtifactMismatchError);
      await expect(resolveArtifactEra('not a contract', zkConfigProvider)).rejects.toBeInstanceOf(
        EraArtifactMismatchError
      );
    });

    // The deploy arm no longer refuses by artifact. It runs, and what decides it is the ERA PAIRING:
    // the retained era has no post-fork deployment, so a retained artifact against a post-fork head
    // is refused by the same table every other retained operation is measured against. This shared
    // mock reports a post-fork head, which is the refusing cell.
    it('routes a retained-era deployContract into the retained pipeline, where the era table refuses it', async () => {
      let caught: unknown;
      try {
        await deployContract(providers, { compiledContract: contract });
      } catch (error) {
        caught = error;
      }

      // The CLASS, not the message constant: asserting against the same string the production code
      // throws can only fail if one file disagrees with itself, which it cannot.
      expect(caught).toBeInstanceOf(Ledger8DeployOnV9Error);
      // POSITIVE evidence that the arm REACHED the era gate rather than refusing in front of it:
      // the head was read. A refusal raised before any provider was touched -- which is what stood
      // here -- would leave this untouched.
      expect(providers.publicDataProvider.queryLatestProtocolVersion).toHaveBeenCalled();
    });

    it('does NOT refuse a current-era deploy, so the era machinery cannot fire on the common path', async () => {
      // The regression guard for the fork itself: a real container must reach the current-era
      // pipeline. Asserted POSITIVELY -- `not.toBeInstanceOf(EraArtifactMismatchError)` would also
      // pass if the current-era path broke for some entirely unrelated reason. This mock provider
      // set configures no network id, so reaching the current-era pipeline is exactly what the
      // network-id guard reports.
      let caught: unknown;
      try {
        await deployContract(createMockProviders(), { compiledContract: createMockCompiledContract() });
      } catch (error) {
        caught = error;
      }

      // POSITIVE evidence that the request reached the current-era deploy: it dies at
      // `sampleSigningKey`, a current-era-only step, which this file's `compact-runtime` stub does
      // not provide. Coupled to that stub on purpose -- the alternative, asserting only that the
      // rejection is not an era error, passes just as happily if the current-era path breaks for a
      // reason that has nothing to do with the fork.
      expect((caught as Error).message).toMatch(/sampleSigningKey/);
      // And it is not an era refusal of any kind.
      expect(caught).not.toBeInstanceOf(EraArtifactMismatchError);
      expect(caught).not.toBeInstanceOf(Ledger8DeployOnV9Error);
    });

  });
});
