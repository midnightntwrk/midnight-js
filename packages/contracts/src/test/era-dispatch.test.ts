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

import { type LedgerVersion, UnknownLedgerVersionError } from '@midnight-ntwrk/midnight-js-protocol';
import type { RawContractState } from '@midnight-ntwrk/midnight-js-types';
import { CONTRACTS_ERROR_CODES, hasErrorCode, TagParseError } from '@midnight-ntwrk/midnight-js-utils';
import { beforeAll, describe, expect, it, type Mock, vi } from 'vitest';

import {
  EraArtifactMismatchError,
  HeadStateEraMismatchError,
  IndexerInconsistencyError,
  Ledger8DeployOnV9Error} from '../errors';
import {
  assertEraCompatible,
  ERA_PAIRING,
  type PipelineEra,
  pipelineEraOf,
  resolveContractStateEra,
  resolveOperationEra
} from '../internal/era';
import { NEITHER_ERA_CONTRACT_MESSAGE } from '../ledger8-contract';
import { createMockCompiledContract } from './test-mocks';

// The shared hard-fork fixture tree. Reached by relative path rather than through a package
// dependency: `testkit-js` depends on `midnight-js-contracts`, so declaring it as a dependency
// here would close a workspace cycle. `packages/protocol/src/test/fixtures.ts` and
// `ledger8-contract.test.ts` reach the same tree the same way.
const FIXTURES_DIR = resolve(fileURLToPath(new URL('../../../../', import.meta.url)), 'testkit-js/testkit-js/src/fixtures/hf');

const readHexFixture = (name: string): Uint8Array =>
  Uint8Array.from(Buffer.from(readFileSync(resolve(FIXTURES_DIR, name), 'utf8').trim(), 'hex'));

// The registered symbol `@midnight-ntwrk/compact-js` brands its `CompiledContract` prototype
// with. Spelled out rather than imported, so the assertion below is about the literal key and
// keeps holding if the vendor moves where the constant is exported from.
const COMPILED_CONTRACT_BRAND = Symbol.for('compact-js/CompiledContract');

const SHIELDED_MAP_MODULE = './resources/compiled/shielded-map/contract/index.js';

interface RawCurrentEraContract {
  readonly impureCircuits: Readonly<Record<string, unknown>>;
  initialState(options: unknown): Promise<unknown>;
}

const rawState = (raw: Uint8Array, protocolVersion: number, version: LedgerVersion): RawContractState => ({
  version,
  protocolVersion,
  raw
});

// Spelled as a `Mock` over the real signature rather than `ReturnType<typeof vi.fn>`, which is the
// un-parameterised mock type and drops the call signature -- so the spy would not satisfy
// `HeadVersionSource` and every call site would fail to type-check.
type HeadSpy = Mock<() => Promise<number>>;

// Each queued value answers ONE head read, in order, so a test that expects a single read cannot
// pass by accident against a spy that would happily answer a second one with the same value.
const headSource = (...protocolVersions: readonly number[]): { readonly queryLatestProtocolVersion: HeadSpy } => {
  const queryLatestProtocolVersion: HeadSpy = vi.fn<() => Promise<number>>();
  for (const protocolVersion of protocolVersions) {
    queryLatestProtocolVersion.mockResolvedValueOnce(protocolVersion);
  }
  return { queryLatestProtocolVersion };
};

const rejectingHeadSource = (error: Error): { readonly queryLatestProtocolVersion: HeadSpy } => ({
  queryLatestProtocolVersion: vi.fn<() => Promise<number>>().mockRejectedValue(error)
});

const V8_HEAD = 1_000_000;
const V9_HEAD = 2_000_000;

describe('pipelineEraOf: which execution pipeline an artifact belongs to', () => {
  it('routes the current-era CompiledContract container to the ledger9 pipeline', () => {
    // Arrange: the container this repo's own mocks build, which is what every current-era
    // caller passes.
    const container = createMockCompiledContract();

    // Act + Assert
    expect(pipelineEraOf(container)).toBe<PipelineEra>('ledger9');
  });

  it('routes an object with the retained-era shape to the retained-era pipeline', () => {
    // The real retained (`compact-runtime@0.16`) artifact is asserted against this predicate in
    // `era-dispatch-ledger8.test.ts`, which needs a module-scoped runtime stub this file must not
    // install: the current-era artifact below needs the REAL runtime. The shape asserted there and
    // the shape built here are the same one -- `impureCircuits` with a SYNCHRONOUS `initialState`.
    const retained = {
      impureCircuits: { increment: (): void => undefined },
      initialState: (): Record<string, never> => ({})
    };

    expect(pipelineEraOf(retained)).toBe<PipelineEra>('ledger8');
  });

  describe('the near-miss a JavaScript caller actually hits', () => {
    let rawCurrentEraContract: RawCurrentEraContract;

    beforeAll(async () => {
      const mod = (await import(SHIELDED_MAP_MODULE)) as {
        Contract: new (witnesses: unknown) => RawCurrentEraContract;
      };
      rawCurrentEraContract = new mod.Contract({
        dummy: (ctx: { privateState: undefined }) => [ctx.privateState, []]
      });
    });

    it('refuses a raw current-era Contract instance passed instead of its container', () => {
      // This is the blind spot the superseded provisional predicate documented and could not close: a raw current-era
      // contract carries `impureCircuits` too, so a structural test for that member alone
      // misclassifies it as retained-era. The `AsyncFunction` `initialState` is what separates
      // them, and it is a property of the real generated artifact, not of this test.
      expect(rawCurrentEraContract.initialState.constructor.name).toBe('AsyncFunction');

      expect(() => pipelineEraOf(rawCurrentEraContract)).toThrow(EraArtifactMismatchError);
      try {
        pipelineEraOf(rawCurrentEraContract);
        expect.unreachable('pipelineEraOf accepted a raw current-era contract');
      } catch (error) {
        expect(error).toBeInstanceOf(EraArtifactMismatchError);
        expect((error as EraArtifactMismatchError).reason).toBe('unwrapped-current-era-contract');
        expect(hasErrorCode(error, CONTRACTS_ERROR_CODES.ERA_ARTIFACT_MISMATCH)).toBe(true);
        // The message has to name the actual mistake, because the fix is one step: wrap it.
        expect((error as EraArtifactMismatchError).message).toMatch(/CompiledContract/);
      }
    });
  });

  it.each([
    ['a plain object', {}],
    ['null', null],
    ['undefined', undefined],
    ['a string', 'contract'],
    ['an object with a non-string tag', { tag: 7 }],
    ['an object whose initialState is not a function', { impureCircuits: {}, initialState: 'nope' }]
  ])('refuses %s as belonging to neither era', (_label, candidate) => {
    try {
      pipelineEraOf(candidate);
      expect.unreachable('pipelineEraOf accepted an object belonging to neither era');
    } catch (error) {
      expect(error).toBeInstanceOf(EraArtifactMismatchError);
      expect((error as EraArtifactMismatchError).reason).toBe('unrecognised-contract-shape');
      expect(hasErrorCode(error, CONTRACTS_ERROR_CODES.ERA_ARTIFACT_MISMATCH)).toBe(true);
      // The single settled wording, reused rather than re-invented here.
      expect((error as EraArtifactMismatchError).message).toContain(NEITHER_ERA_CONTRACT_MESSAGE);
    }
  });

  it.each([
    [
      'a generator function',
      function* generatorInitialState(): Generator<number> {
        yield 1;
      }
    ],
    [
      'an async generator function',
      async function* asyncGeneratorInitialState(): AsyncGenerator<number> {
        yield 1;
      }
    ]
  ])('refuses an object carrying impureCircuits whose initialState is %s', (_label, initialState) => {
    // The retained era is recognised POSITIVELY -- `initialState.constructor.name === 'Function'` --
    // so anything else with `impureCircuits` is refused rather than falling through into the
    // retained pipeline. These two are the shapes a future or hand-rolled artifact could really
    // have; a `class` cannot be separated this way, because a class's own constructor IS `Function`.
    const candidate = { impureCircuits: { increment: (): void => undefined }, initialState };

    try {
      pipelineEraOf(candidate);
      expect.unreachable('pipelineEraOf routed a non-Function initialState into the retained pipeline');
    } catch (error) {
      expect(error).toBeInstanceOf(EraArtifactMismatchError);
      expect((error as EraArtifactMismatchError).reason).toBe('unrecognised-contract-shape');
    }
  });

  it('deliberately does NOT discriminate on the compact-js CompiledContract brand', () => {
    // PIN, do not "improve" this away. `CompiledContract.make` installs the registered brand on a
    // PROTOTYPE (`Object.create(CompiledContractProto)`), and every combinator that makes a
    // container usable returns `{ ...self, ... }` -- an own-enumerable-only spread that drops the
    // prototype. So a brand test reports FALSE for every real, witness-bearing container, and a
    // predicate built on it would misclassify every current-era caller. This repo's own mock goes
    // through `withVacantWitnesses`, which makes it a free regression test for exactly that.
    const container = createMockCompiledContract();

    expect(COMPILED_CONTRACT_BRAND in container).toBe(false);
    // `pipe` is dropped by the same spread, which is the vendor half of the same defect.
    expect('pipe' in container).toBe(false);
    // And the predicate still places it correctly, because it does not consult the brand.
    expect(pipelineEraOf(container)).toBe<PipelineEra>('ledger9');
  });
});

// Read off the production signature rather than restated here. A test-local alias would make the
// exhaustive map below a gate over itself, which is what left the kind axis unbound.
type OperationKind = Parameters<typeof assertEraCompatible>[2];

interface DispatchCell {
  readonly artifact: string;
  readonly pipeline: PipelineEra;
  readonly head: LedgerVersion;
  readonly kind: OperationKind;
}

const cellKey = ({ pipeline, head, kind }: DispatchCell): string => `${pipeline}/${head}/${kind}`;

// Every cell the dispatch accepts, and which pipeline it routes to.
const ACCEPTED_CELLS: readonly (DispatchCell & { readonly route: string })[] = [
  { artifact: 'current-era (0.18)', pipeline: 'ledger9', head: 'v9', kind: 'call', route: 'ledger9' },
  { artifact: 'current-era (0.18)', pipeline: 'ledger9', head: 'v9', kind: 'deploy', route: 'ledger9' },
  { artifact: 'retained-era (0.16)', pipeline: 'ledger8', head: 'v9', kind: 'call', route: 'keep-state' },
  { artifact: 'retained-era (0.16)', pipeline: 'ledger8', head: 'v8', kind: 'call', route: 'ledger8' },
  { artifact: 'retained-era (0.16)', pipeline: 'ledger8', head: 'v8', kind: 'deploy', route: 'ledger8' }
];

// Every cell it refuses, with the class and the registered code each refusal must carry.
const REFUSED_CELLS: readonly (DispatchCell & {
  readonly errorClass: new (...args: never[]) => Error;
  readonly code: string;
})[] = [
  {
    artifact: 'current-era (0.18)',
    pipeline: 'ledger9',
    head: 'v8',
    kind: 'call',
    errorClass: EraArtifactMismatchError,
    code: CONTRACTS_ERROR_CODES.ERA_ARTIFACT_MISMATCH
  },
  {
    artifact: 'current-era (0.18)',
    pipeline: 'ledger9',
    head: 'v8',
    kind: 'deploy',
    errorClass: EraArtifactMismatchError,
    code: CONTRACTS_ERROR_CODES.ERA_ARTIFACT_MISMATCH
  },
  {
    artifact: 'retained-era (0.16)',
    pipeline: 'ledger8',
    head: 'v9',
    kind: 'deploy',
    errorClass: Ledger8DeployOnV9Error,
    code: CONTRACTS_ERROR_CODES.LEDGER8_DEPLOY_ON_V9
  }
];

// Exhaustive maps over the three axes, in the `Record<K, K>` form this repo uses where a test has
// to enumerate a closed set: a member added to any of the three types stops the literal below
// compiling, which is what makes the completeness gate further down a real one.
const ALL_PIPELINES: Record<PipelineEra, PipelineEra> = {
  ledger8: 'ledger8',
  ledger9: 'ledger9'
};

const ALL_HEADS: Record<LedgerVersion, LedgerVersion> = {
  v8: 'v8',
  v9: 'v9'
};

const ALL_KINDS: Record<OperationKind, OperationKind> = {
  call: 'call',
  deploy: 'deploy'
};

// The values the run-time guards exist for, asserted back in one named place so the negative tests
// below read as the calls they are rather than as a cast each.
//
// `unknown`, not `string`. Typed as `string` these helpers could not express the case that matters
// most -- a non-string key, which a member access coerces and a `switch` did not -- so every
// negative test would have been confined to the inputs that were already safe.
const asPipelineEra = (value: unknown): PipelineEra => value as PipelineEra;
const asHeadEra = (value: unknown): LedgerVersion => value as LedgerVersion;
const asOperationKind = (value: unknown): OperationKind => value as OperationKind;

describe('the era dispatch table: artifact era x network head era x operation kind', () => {
  it.each(ACCEPTED_CELLS)('accepts a $artifact $kind on a $head head, routing it $route', ({ pipeline, head, kind }) => {
    expect(() => assertEraCompatible(pipeline, head, kind)).not.toThrow();
  });

  it.each(REFUSED_CELLS)('refuses a $artifact $kind on a $head head', ({ pipeline, head, kind, errorClass, code }) => {
    try {
      assertEraCompatible(pipeline, head, kind);
      expect.unreachable(`assertEraCompatible accepted ${pipeline}/${head}/${kind}`);
    } catch (error) {
      expect(error).toBeInstanceOf(errorClass);
      // The registered code, not just the class: a consumer branches on `code`, and swapping two
      // code assignments between classes type-checks and would leave an instanceof-only suite green.
      expect(hasErrorCode(error, code)).toBe(true);
    }
  });

  it('covers every artifact-era x head-era x kind cell, so no cell is silently unruled', () => {
    // Strictness gate on the table itself. `assertEraCompatible` takes THREE arguments and rules
    // differently on `kind`, so the cross product has to include it -- omitting it left
    // `ledger9/v9/deploy`, the most common post-fork operation there is, untested while this gate
    // claimed completeness.
    //
    // The three enumerations are `Record<K, K>` maps, not `readonly K[]` arrays. An array only
    // asserts that each element IS a member and never that all members are listed, so a third
    // pipeline era or a third ledger version compiled and left this gate claiming completeness
    // over a cross product two thirds the real size. `breadcrumbs.test.ts` had the same weakness
    // and records the same reason.
    const covered = [...ACCEPTED_CELLS.map(cellKey), ...REFUSED_CELLS.map(cellKey)];
    const pipelines = Object.values(ALL_PIPELINES);
    const heads = Object.values(ALL_HEADS);
    const kinds = Object.values(ALL_KINDS);
    const wholeCrossProduct = pipelines.flatMap((pipeline) =>
      heads.flatMap((head) => kinds.map((kind) => cellKey({ artifact: '', pipeline, head, kind })))
    );

    expect(covered.sort()).toEqual(wholeCrossProduct.sort());
    // And no cell is claimed twice, which would let a duplicate stand in for a missing one.
    expect(new Set(covered).size).toBe(covered.length);
  });

  it('names the reason on a current-era artifact refused by a pre-fork head', () => {
    try {
      assertEraCompatible('ledger9', 'v8', 'call');
      expect.unreachable('a current-era artifact was accepted on a pre-fork head');
    } catch (error) {
      expect(error).toBeInstanceOf(EraArtifactMismatchError);
      expect((error as EraArtifactMismatchError).reason).toBe('current-era-artifact-on-pre-fork-head');
    }
  });

  it('gives the retained-era deploy refusal actionable remediation', () => {
    try {
      assertEraCompatible('ledger8', 'v9', 'deploy');
      expect.unreachable('a retained-era deploy was accepted on a post-fork head');
    } catch (error) {
      expect(error).toBeInstanceOf(Ledger8DeployOnV9Error);
      expect(hasErrorCode(error, CONTRACTS_ERROR_CODES.LEDGER8_DEPLOY_ON_V9)).toBe(true);
      expect((error as Ledger8DeployOnV9Error).message).toMatch(/runtime-deploy|0\.18 artifacts/);
    }
  });

  it('keeps the three exhaustive maps self-consistent, so none of them drives the wrong values', () => {
    // The maps are compile-time gates whose VALUES are what the cross product above is built from.
    // A copy-paste slip -- a key mapped to a sibling's value -- would compile and would quietly
    // cover one member twice while never covering another.
    expect(Object.keys(ALL_PIPELINES)).toEqual(Object.values(ALL_PIPELINES));
    expect(Object.keys(ALL_HEADS)).toEqual(Object.values(ALL_HEADS));
    expect(Object.keys(ALL_KINDS)).toEqual(Object.values(ALL_KINDS));
  });

  // The refusal is asserted on `requestedVersion`, never on the class alone. Every path out of
  // this function that is not a ruling throws the same class, so a class-only assertion passes
  // whichever axis was refused and whatever value it blamed -- including a value read off
  // `Object.prototype`, which is exactly what these tests exist to rule out.
  //
  // That one class covers both axes is a known wart, not something asserted here as desirable:
  // `UnknownLedgerVersionError`'s own message names `v8`/`v9`, which is the wrong vocabulary for a
  // refused artifact era. These tests pin the VALUE blamed, and deliberately not the message.
  const refusedEra = (pipeline: PipelineEra, head: LedgerVersion): string => {
    try {
      assertEraCompatible(pipeline, head, 'call');
      return expect.unreachable(`assertEraCompatible ruled on ${String(pipeline)}/${String(head)}`);
    } catch (error) {
      expect(error).toBeInstanceOf(UnknownLedgerVersionError);
      return (error as UnknownLedgerVersionError).requestedVersion;
    }
  };

  it('refuses an era outside either vocabulary, naming the one it could not place', () => {
    // The build-time gate on the pairing table cannot cover these: a head era arrives as an
    // integer resolved at run time, and a pipeline era as whatever a JavaScript caller's artifact
    // turned out to be. Both reach this function before the table is extended for them.
    expect(refusedEra(asPipelineEra('ledger10'), 'v9')).toBe('ledger10');
    expect(refusedEra('ledger8', asHeadEra('v10'))).toBe('v10');
  });

  it('refuses a key that merely COERCES to an era, on either axis', () => {
    // A member access runs `ToPropertyKey` on its key, so `{ toString: () => 'ledger9' }` selects a
    // real row. The nested switches this table replaced compared with `===` and refused it. Without
    // the `typeof` guards these six inputs are RULED ON, and four of them are ruled `'run'`.
    const coercing: readonly unknown[] = [
      { toString: () => 'ledger9' },
      { [Symbol.toPrimitive]: () => 'ledger9' },
      new String('ledger9'),
      Object('ledger9')
    ];

    for (const coerces of coercing) {
      expect(refusedEra(asPipelineEra(coerces), 'v9')).toBe(String(coerces));
      expect(refusedEra('ledger9', asHeadEra(coerces))).toBe(String(coerces));
    }
  });

  it('refuses the two era arguments transposed', () => {
    // Both are era-shaped strings in adjacent positions, so this is the call a caller gets wrong.
    expect(refusedEra(asPipelineEra('v9'), 'v9')).toBe('v9');
    expect(refusedEra('ledger9', asHeadEra('ledger9'))).toBe('ledger9');
  });

  it('refuses a retained-era operation on a post-fork head unless it is positively a call', () => {
    // The `'call-only'` cell is the one asymmetric ruling in the fork window, so it refuses
    // anything that is not a call rather than admitting anything that is not a deploy. Asserting
    // only the two declared literals would leave that direction untested -- and every value here
    // was ADMITTED before.
    const notCalls: readonly unknown[] = ['Deploy', 'DEPLOY', 'deploy ', '', undefined, null, 0, {}];

    for (const notCall of notCalls) {
      expect(() => assertEraCompatible('ledger8', 'v9', asOperationKind(notCall))).toThrow(Ledger8DeployOnV9Error);
    }
    expect(() => assertEraCompatible('ledger8', 'v9', 'call')).not.toThrow();
  });

  it('holds the table frozen and off the object prototype, at both levels', () => {
    // The behavioural consequence of the null prototype is pinned by the test below; this pins the
    // construction itself, because dropping either `Object.freeze` changes no behaviour any other
    // test observes while leaving a process-wide singleton that a test double can rewrite.
    expect(Object.isFrozen(ERA_PAIRING)).toBe(true);
    expect(Object.getPrototypeOf(ERA_PAIRING)).toBeNull();

    for (const row of Object.values(ERA_PAIRING)) {
      expect(Object.isFrozen(row)).toBe(true);
      expect(Object.getPrototypeOf(row)).toBeNull();
    }
  });

  it('refuses a prototype-reachable key on either axis, blaming the key and not a prototype member', () => {
    // The difference between a table on a null prototype and one on a plain object literal. From a
    // literal, `ERA_PAIRING.constructor` comes back as a truthy non-cell, so the refusal moves to
    // the OTHER axis and blames a head era that was perfectly valid; on the head axis it blames
    // `Object.prototype.constructor` rendered as a string. Both axes are checked, because both
    // keys are supplied from outside this package.
    for (const inherited of ['constructor', 'toString', 'hasOwnProperty', 'valueOf', '__proto__']) {
      expect(refusedEra(asPipelineEra(inherited), 'v9')).toBe(inherited);
      expect(refusedEra('ledger8', asHeadEra(inherited))).toBe(inherited);
    }
  });

  it('refuses a retained-era deploy but NOT a retained-era call on the same head', () => {
    // The two differ only in `kind`; without this pairing, a refusal that rejected every
    // retained-era operation on a v9 head would satisfy the deploy assertion just as well.
    expect(() => assertEraCompatible('ledger8', 'v9', 'deploy')).toThrow(Ledger8DeployOnV9Error);
    expect(() => assertEraCompatible('ledger8', 'v9', 'call')).not.toThrow();
  });
});

describe('resolveOperationEra: the head is read ONCE per operation and threaded as a value', () => {
  it('issues exactly one head read and reports the era, the raw integer and the era facade', async () => {
    const pdp = headSource(V9_HEAD);

    const resolved = await resolveOperationEra(pdp);

    // One read, not two: the naive shape asks `networkHeadVersion` for the era and then asks the
    // provider again for the integer, which is a second network round trip and, at the fork
    // boundary, a second and possibly DIFFERENT answer inside one operation.
    expect(pdp.queryLatestProtocolVersion).toHaveBeenCalledTimes(1);
    expect(resolved.headProtocolVersion).toBe(V9_HEAD);
    expect(resolved.head).toBe<LedgerVersion>('v9');
    expect(resolved.era.version).toBe<LedgerVersion>('v9');
  });

  it('reports the era the head integer resolves to, not a latched one', async () => {
    // Two independent operations against a head that moved between them. Each resolves the era it
    // actually read: nothing here caches across calls (see docs/adr/0007).
    const pdp = headSource(V8_HEAD, V9_HEAD);

    const first = await resolveOperationEra(pdp);
    const second = await resolveOperationEra(pdp);

    expect(first.head).toBe<LedgerVersion>('v8');
    expect(second.head).toBe<LedgerVersion>('v9');
    expect(pdp.queryLatestProtocolVersion).toHaveBeenCalledTimes(2);
  });

  it('resolves a same-era minor node bump to the same era', async () => {
    const pdp = headSource(2_001_000);

    const resolved = await resolveOperationEra(pdp);

    expect(resolved.head).toBe<LedgerVersion>('v9');
    expect(resolved.headProtocolVersion).toBe(2_001_000);
  });
});

describe("resolveContractStateEra: which era's decoder owns the bytes an operation fetched", () => {
  const v8Envelope = readHexFixture('state-v8.hex');
  const v9Envelope = readHexFixture('state-migrated-v9.hex');
  // A real v9 envelope whose BODY is corrupt (one payload byte XORed past the header). Any decode
  // of these bytes throws; this fixture is how the "tag check happens before any decode" claim is
  // made observable rather than asserted.
  const v9EnvelopeCorruptBody = readHexFixture('state-tampered-bytes.hex');

  // THE RULE: the envelope decides, the block bounds. A retained envelope is answered for under
  // EITHER head, because the fork does not rewrite a contract's stored state -- so a contract
  // deployed before it is served with retained bytes under a post-fork head, indefinitely. Only an
  // envelope NEWER than the block dating it is impossible, and only that is investigated.
  //
  // What this function does NOT decide is whether the caller's artifacts fit the contract. It names
  // a decoder; `assertSnapshotVerifierKey` judges the artifacts.
  it.each([
    ['a pre-fork head, which is a native retained call', 'v8' as LedgerVersion, V8_HEAD],
    ['a post-fork head, which is keep-state', 'v9' as LedgerVersion, V9_HEAD]
  ])('answers the retained era for a retained envelope under %s, without re-reading the head', async (_name, head, headInt) => {
    const pdp = headSource();

    await expect(resolveContractStateEra(head, rawState(v8Envelope, headInt, head), pdp)).resolves.toBe('v8');

    // No re-read at all: the head plays no part in accepting a retained envelope, so there is
    // nothing to disambiguate.
    expect(pdp.queryLatestProtocolVersion).not.toHaveBeenCalled();
  });

  it('answers the retained era whatever the head INTEGER is, since the head is not compared', async () => {
    const pdp = headSource();

    // A same-era minor node bump, and a different era entirely, reach the same answer.
    for (const headInt of [V8_HEAD, 1_000_001, V9_HEAD, 2_001_000]) {
      await expect(resolveContractStateEra('v9', rawState(v8Envelope, headInt, 'v9'), pdp)).resolves.toBe('v8');
    }

    expect(pdp.queryLatestProtocolVersion).not.toHaveBeenCalled();
  });

  it('reads the envelope tag BEFORE any decode, so a corrupt body never reaches a decoder', async () => {
    const pdp = headSource();

    // These bytes cannot be decoded by either era. The answer still names the era of the TAG, which
    // is only possible if the tag was read and the body was not: a decode would have raised a decode
    // failure instead of returning.
    await expect(resolveContractStateEra('v9', rawState(v9EnvelopeCorruptBody, V9_HEAD, 'v9'), pdp)).resolves.toBe(
      'v9'
    );
  });

  it('answers the CURRENT era for a migrated state under a post-fork head, rather than refusing it', async () => {
    // The fixture is a real ledger-8-to-9 migrated state: current-era envelope, retained verifier
    // keys. Refusing it here is what made a pre-fork contract callable exactly once after the fork.
    // Whether the caller's artifacts fit it is a question about the KEYS, and it is asked elsewhere.
    const pdp = headSource();

    await expect(resolveContractStateEra('v9', rawState(v9Envelope, V9_HEAD, 'v9'), pdp)).resolves.toBe('v9');

    // No re-read: the head is not in question here.
    expect(pdp.queryLatestProtocolVersion).not.toHaveBeenCalled();
  });

  it('reports a head/state mismatch when the envelope is NEWER than the block dating it', async () => {
    // The impossible direction, and the realistic fork-window one: the operation started from a
    // pre-fork head reading, the state it fetched is a current-era one, and a fresh read confirms
    // the network has crossed the fork. The head reading was the stale half.
    const pdp = headSource(V9_HEAD);

    try {
      await resolveContractStateEra('v8', rawState(v9Envelope, V8_HEAD, 'v8'), pdp);
      expect.unreachable('a stale pre-fork head was accepted against a current-era state');
    } catch (error) {
      expect(error).toBeInstanceOf(HeadStateEraMismatchError);
      expect((error as HeadStateEraMismatchError).head).toBe<LedgerVersion>('v8');
      expect((error as HeadStateEraMismatchError).stateEra).toBe<LedgerVersion>('v9');
      expect(hasErrorCode(error, CONTRACTS_ERROR_CODES.HEAD_STATE_ERA_MISMATCH)).toBe(true);
      expect((error as HeadStateEraMismatchError).message).toMatch(/re-read|re-run/i);
      // Direction-neutral on purpose: the check establishes that the two readings disagree, not
      // which of them moved.
      expect((error as HeadStateEraMismatchError).message).not.toMatch(/was behind|was ahead/i);
    }
    expect(pdp.queryLatestProtocolVersion).toHaveBeenCalledTimes(1);
  });

  it('reports indexer inconsistency, with retry-later text, when the FRESH head still disagrees', async () => {
    // The head is confirmed pre-fork while the state is current-era, so the two answers cannot both
    // describe one chain. The indexer's problem, not something re-running fixes.
    const pdp = headSource(V8_HEAD);

    try {
      await resolveContractStateEra('v8', rawState(v9Envelope, V8_HEAD, 'v8'), pdp);
      expect.unreachable('an inconsistent indexer response was accepted');
    } catch (error) {
      expect(error).toBeInstanceOf(IndexerInconsistencyError);
      expect(hasErrorCode(error, CONTRACTS_ERROR_CODES.INDEXER_INCONSISTENCY)).toBe(true);
      expect((error as IndexerInconsistencyError).message).toMatch(/retry/i);
      // Never the fork-in-progress wording: nothing here establishes that a fork is under way.
      expect((error as IndexerInconsistencyError).message).not.toMatch(/fork in progress|fork is in progress/i);
    }
    expect(pdp.queryLatestProtocolVersion).toHaveBeenCalledTimes(1);
  });

  it('does not lose the era disagreement when the fresh head read itself fails', async () => {
    // A bare transport error here would erase the most diagnostic fact available in the fork
    // window: that an era disagreement was being investigated when the read failed.
    const transportFailure = new Error('indexer unreachable');
    const pdp = rejectingHeadSource(transportFailure);

    try {
      await resolveContractStateEra('v8', rawState(v9Envelope, V8_HEAD, 'v8'), pdp);
      expect.unreachable('a failed fresh head read was treated as agreement');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      // The transport failure is propagated, never swallowed.
      expect((error as Error).cause).toBe(transportFailure);
      expect((error as Error).message).toMatch(/re-read the network head/i);
      // Both eras survive into the message, so the unresolved question is still legible.
      expect((error as Error).message).toContain("'v8'");
      expect((error as Error).message).toContain("'v9'");
    }
  });

  it('refuses bytes that are not a contract-state envelope at all', async () => {
    // A real, well-formed, tagged payload of the WRONG TYPE: a verifier key. Its tag parses
    // cleanly, so this is not caught by tag parsing -- it is caught by the envelope not being one
    // this framework recognises as a contract state.
    const verifierKey = Uint8Array.from(
      readFileSync(resolve(FIXTURES_DIR, 'twin-contract/compiled/keys/increment.verifier'))
    );
    const pdp = headSource();

    await expect(
      resolveContractStateEra('v9', rawState(verifierKey, V9_HEAD, 'v9'), pdp)
    ).rejects.toThrow(TagParseError);
  });
});
