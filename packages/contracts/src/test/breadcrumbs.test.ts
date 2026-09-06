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
 * The DISPATCH BREADCRUMBS: what an operator can see about which era an
 * operation ran against, and why.
 *
 * Three decisions get a breadcrumb, and they are the three this package
 * actually makes:
 *
 * 1. HEAD RESOLUTION -- the head integer read and the era it resolved to.
 * 2. PIPELINE SELECTION -- the artifact's pipeline paired with that head era.
 * 3. ENCODING -- the era the fetched contract state's envelope tag declares.
 *
 * Several era decisions a reader might expect are REFUSALS rather than
 * choices, and a refusal already carries a registered error code and
 * remediation text, so it is not breadcrumbed a second time: the retained-era
 * deploy arm refuses, a scope on a pre-fork head refuses, and a provider that
 * answers on the wrong era's arm refuses.
 *
 * Every assertion here is a STRICT equality on the whole breadcrumb, not a
 * subset match, because the second thing these tests guard is privacy: a
 * breadcrumb may carry version integers, era names, decision names and a
 * contract address, and must never carry key bytes, decoded state or a raw
 * payload. A subset assertion cannot see a field that was added later.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type * as Protocol from '@midnight-ntwrk/midnight-js-protocol';
import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol';
import type { RawContractState } from '@midnight-ntwrk/midnight-js-types';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import {
  HeadStateEraMismatchError,
  IndexerInconsistencyError,
  Ledger8DeployOnV9Error,
  Ledger8SeamFailedError,
  StaleHeadError,
  SubmitRejectionUndiagnosedError,
  type SubmittedOperation
} from '../errors';
import type { DispatchBreadcrumb, HeadReadingProvenance } from '../internal/breadcrumbs';
import { DISPATCH_BREADCRUMB_MESSAGE, emitEncoding, emitHeadResolution, emitPipelineSelection } from '../internal/breadcrumbs';
import { assertHeadStateEraAgreement, type PipelineEra, resolveOperationEra } from '../internal/era';
import { acquireLedger8Runtime, findLedger8Contract } from '../internal/ledger8-entry';
import { handleSubmitRejection } from '../internal/stale-head';
import { resolveScopeEra } from '../internal/transaction';
import { createMockContractAddress, createMockProviders } from './test-mocks';

// The retained ENGINE acquisition is replaced and only it: `loadLedgerEra`
// stays the real thing, so every era name a breadcrumb reports here was
// resolved by the genuine era timeline. Nothing in this file executes a
// circuit, so a bare stand-in engine is sufficient -- `acquireLedger8Runtime`
// hands the engine straight back without touching it.
const ENGINE_STAND_IN = vi.hoisted((): Record<string, never> => ({}));

vi.mock('@midnight-ntwrk/midnight-js-protocol', async (importOriginal) => {
  const actual = await importOriginal<typeof Protocol>();
  return { ...actual, loadLedger8Engine: (): Promise<unknown> => Promise.resolve(ENGINE_STAND_IN) };
});

// The shared hard-fork fixture tree, reached by relative path: `testkit-js`
// depends on `midnight-js-contracts`, so a package dependency here would close
// a workspace cycle. `era-dispatch.test.ts` reaches the same tree the same way.
const FIXTURES_DIR = resolve(fileURLToPath(new URL('../../../../', import.meta.url)), 'testkit-js/testkit-js/src/fixtures/hf');

const readHexFixture = (name: string): Uint8Array =>
  Uint8Array.from(Buffer.from(readFileSync(resolve(FIXTURES_DIR, name), 'utf8').trim(), 'hex'));

// The era timeline's own scheme, `node-major * 1_000_000 + node-minor * 1_000`.
const V8_HEAD = 1_000_000;
const V9_HEAD = 2_000_000;
// A same-era minor node bump: a different integer on the SAME era, which is
// what makes the raw integer worth carrying beside the era name.
const V9_HEAD_MINOR_BUMP = 2_001_000;

// A real, well-formed address from this repo's own sampler rather than a
// hand-typed one: the attach path validates the address before it resolves an
// era, so a hand-typed value of the wrong byte length would fail there and
// never reach the breadcrumb this file is about.
const CONTRACT_ADDRESS: string = createMockContractAddress();

/**
 * EXHAUSTIVE maps over the two closed vocabularies a breadcrumb reports.
 *
 * `Record<Union, Union>` and not `readonly Union[]`, and the difference is the
 * whole point. An array annotated `readonly HeadReadingProvenance[]` only
 * asserts that each ELEMENT IS a member; adding a fourth member to the union
 * leaves such an array compiling and every test passing. A `Record` keyed by
 * the union fails to compile with `TS2741: Property ... is missing` until the
 * new member is listed here -- which is what turns "a new head read must add a
 * provenance and emit it" from prose in a docblock into a build failure.
 *
 * The VALUES repeat the keys rather than being `true`, so `Object.values` hands
 * back a properly typed list to drive the emissions with -- `Object.keys` is
 * `string[]`, and narrowing it would need a cast. The key-equals-value
 * invariant is asserted below rather than assumed, so a copy-paste slip in
 * either map is caught too.
 */
const ALL_PROVENANCES: Record<HeadReadingProvenance, HeadReadingProvenance> = {
  'operation-start': 'operation-start',
  'disagreement-re-read': 'disagreement-re-read',
  'post-rejection-re-read': 'post-rejection-re-read'
};

const ALL_PIPELINES: Record<PipelineEra, PipelineEra> = {
  ledger8: 'ledger8',
  v9native: 'v9native'
};

type DebugSpy = Mock<(breadcrumb: DispatchBreadcrumb, message: string) => void>;

const createSink = (): { readonly debug: DebugSpy } => ({
  debug: vi.fn<(breadcrumb: DispatchBreadcrumb, message: string) => void>()
});

const emitted = (sink: { readonly debug: DebugSpy }): DispatchBreadcrumb[] =>
  sink.debug.mock.calls.map(([breadcrumb]) => breadcrumb);

type HeadSpy = Mock<() => Promise<number>>;

// Each queued value answers ONE head read, in order, so a test that expects a
// single read cannot pass against a spy that would answer a second one.
const headSource = (...protocolVersions: readonly number[]): { readonly queryLatestProtocolVersion: HeadSpy } => {
  const queryLatestProtocolVersion: HeadSpy = vi.fn<() => Promise<number>>();
  for (const protocolVersion of protocolVersions) {
    queryLatestProtocolVersion.mockResolvedValueOnce(protocolVersion);
  }
  return { queryLatestProtocolVersion };
};

const rawState = (raw: Uint8Array, protocolVersion: number, version: LedgerVersion): RawContractState => ({
  version,
  protocolVersion,
  raw
});

// The field surface each decision carries, split into what MUST be present and
// what MAY be. Two lists rather than one allow-list, because the two failures
// arrive from opposite directions and one list cannot see both: an ADDED field
// is how a privacy regression arrives, and a MISSING field is how the
// observability layer quietly stops answering the question it exists for.
const REQUIRED_FIELDS: Readonly<Record<DispatchBreadcrumb['decision'], readonly string[]>> = {
  'head-resolution': ['decision', 'version', 'protocolVersion', 'source', 'readingProvenance'],
  'pipeline-selection': ['decision', 'version', 'protocolVersion', 'source', 'readingProvenance', 'path'],
  encoding: ['decision', 'version', 'source']
};

// Present only when the operation has a value for them. `contractAddress` is
// the only one: a deploy names no contract.
const OPTIONAL_FIELDS: Readonly<Record<DispatchBreadcrumb['decision'], readonly string[]>> = {
  'head-resolution': [],
  'pipeline-selection': ['contractAddress'],
  encoding: []
};

/**
 * The privacy gate, run over the SERIALIZED breadcrumb.
 *
 * `secrets` are the byte-bearing values the scenario actually had in hand --
 * the state envelope, a verifier key, a private state. If any of them reaches
 * a breadcrumb field, the hex of its bytes appears in the serialization.
 */
const expectCarriesNoSecrets = (breadcrumb: DispatchBreadcrumb, secrets: readonly Uint8Array[]): void => {
  const serialized = JSON.stringify(breadcrumb);

  for (const secret of secrets) {
    expect(serialized).not.toContain(Buffer.from(secret).toString('hex'));
    expect(serialized).not.toContain(Buffer.from(secret).toString('base64'));
  }
  // No structured value survived either: every field is a name, an era or an
  // integer, so nothing can carry bytes in a nested shape a substring search
  // would miss.
  for (const value of Object.values(breadcrumb)) {
    expect(typeof value === 'string' || typeof value === 'number').toBe(true);
  }

  const present = Object.keys(breadcrumb);
  const required = REQUIRED_FIELDS[breadcrumb.decision];
  const permitted = [...required, ...OPTIONAL_FIELDS[breadcrumb.decision]];

  // ABSENCE: every mandated field is here. Comparing against a list filtered
  // by what the breadcrumb already has cannot state this -- a missing field
  // would be filtered out of its own expectation and pass.
  expect(required.filter((field) => present.includes(field)).sort()).toEqual([...required].sort());
  // ADDITION: nothing outside the permitted surface.
  expect(present.filter((field) => !permitted.includes(field))).toEqual([]);
};

describe('the breadcrumb emitters', () => {
  it('writes the head resolution at DEBUG level and at no other level', () => {
    const info = vi.fn();
    const warn = vi.fn();
    const error = vi.fn();
    const sink = { ...createSink(), info, warn, error };

    emitHeadResolution(sink, { head: 'v9', headProtocolVersion: V9_HEAD }, 'operation-start');

    expect(sink.debug).toHaveBeenCalledTimes(1);
    expect(info).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('writes the breadcrumb as a STRUCTURED payload beside a fixed message', () => {
    const sink = createSink();

    emitHeadResolution(sink, { head: 'v9', headProtocolVersion: V9_HEAD }, 'operation-start');

    // The payload first and the message second: an operator filters on the
    // fields, so they must not be interpolated into the message string.
    expect(sink.debug.mock.calls[0]?.[1]).toBe(DISPATCH_BREADCRUMB_MESSAGE);
    expect(emitted(sink)).toStrictEqual([
      {
        decision: 'head-resolution',
        version: 'v9',
        protocolVersion: V9_HEAD,
        source: 'public-data-provider',
        readingProvenance: 'operation-start'
      }
    ]);
  });

  it('carries the pipeline and the contract address when the operation names a contract', () => {
    const sink = createSink();

    emitPipelineSelection(sink, { head: 'v8', headProtocolVersion: V8_HEAD }, 'ledger8', CONTRACT_ADDRESS);

    expect(emitted(sink)).toStrictEqual([
      {
        decision: 'pipeline-selection',
        version: 'v8',
        protocolVersion: V8_HEAD,
        source: 'compiled-contract-shape',
        readingProvenance: 'operation-start',
        path: 'ledger8',
        contractAddress: CONTRACT_ADDRESS
      }
    ]);
  });

  it('OMITS the contract address entirely for an operation that names no contract', () => {
    // A deploy has no address until the composition mints one, so the field is
    // absent rather than present and empty -- an empty string would read as a
    // deployment at the zero address.
    const sink = createSink();

    emitPipelineSelection(sink, { head: 'v8', headProtocolVersion: V8_HEAD }, 'ledger8');

    const [breadcrumb] = emitted(sink);
    expect(breadcrumb).toBeDefined();
    expect([breadcrumb]).toStrictEqual([
      {
        decision: 'pipeline-selection',
        version: 'v8',
        protocolVersion: V8_HEAD,
        source: 'compiled-contract-shape',
        readingProvenance: 'operation-start',
        path: 'ledger8'
      }
    ]);
    expect('contractAddress' in breadcrumb).toBe(false);
  });

  it('reports the encoding era the envelope tag declared', () => {
    const sink = createSink();

    emitEncoding(sink, 'v8');

    expect(emitted(sink)).toStrictEqual([
      { decision: 'encoding', version: 'v8', source: 'contract-state-envelope-tag' }
    ]);
  });

  it('does nothing at all when no logger is configured', () => {
    // The logger provider is OPTIONAL on every provider set, so this is the
    // ordinary case and must not be a throw.
    expect(() => emitHeadResolution(undefined, { head: 'v9', headProtocolVersion: V9_HEAD }, 'operation-start')).not.toThrow();
    expect(() => emitPipelineSelection(undefined, { head: 'v9', headProtocolVersion: V9_HEAD }, 'v9native')).not.toThrow();
    expect(() => emitEncoding(undefined, 'v9')).not.toThrow();
  });

  it('does nothing when the configured logger implements no debug level', () => {
    // Every member of `LoggerProvider` is optional except `isLevelEnabled`, so
    // a logger with no `debug` is a legal provider and not a broken one.
    const sink = {};

    expect(() => emitHeadResolution(sink, { head: 'v9', headProtocolVersion: V9_HEAD }, 'operation-start')).not.toThrow();
  });
});

describe('head resolution leaves a breadcrumb naming the integer AND the era', () => {
  it('reports the raw head integer beside the era it resolved to', async () => {
    const sink = createSink();

    await resolveOperationEra(headSource(V9_HEAD), sink);

    expect(emitted(sink)).toStrictEqual([
      {
        decision: 'head-resolution',
        version: 'v9',
        protocolVersion: V9_HEAD,
        source: 'public-data-provider',
        readingProvenance: 'operation-start'
      }
    ]);
  });

  it('distinguishes two node minor versions the era deliberately collapses', async () => {
    // The whole reason the integer is carried beside the era name: both of
    // these resolve to `v9`, and only the integer says which node answered.
    const first = createSink();
    const second = createSink();

    await resolveOperationEra(headSource(V9_HEAD), first);
    await resolveOperationEra(headSource(V9_HEAD_MINOR_BUMP), second);

    expect(emitted(first)[0]).toStrictEqual({
      decision: 'head-resolution',
      version: 'v9',
      protocolVersion: V9_HEAD,
      source: 'public-data-provider',
      readingProvenance: 'operation-start'
    });
    expect(emitted(second)[0]).toStrictEqual({
      decision: 'head-resolution',
      version: 'v9',
      protocolVersion: V9_HEAD_MINOR_BUMP,
      source: 'public-data-provider',
      readingProvenance: 'operation-start'
    });
  });

  it('leaves one breadcrumb per operation and never reports a cached reading', async () => {
    // Two operations against a head that moved between them. Nothing caches
    // across operations (docs/adr/0008-never-latch-the-network-head-version.md),
    // so there are two breadcrumbs and they disagree, which is the observable
    // form of that rule.
    const sink = createSink();
    const pdp = headSource(V8_HEAD, V9_HEAD);

    await resolveOperationEra(pdp, sink);
    await resolveOperationEra(pdp, sink);

    expect(emitted(sink).map((breadcrumb) => breadcrumb.version)).toEqual<LedgerVersion[]>(['v8', 'v9']);
    expect(pdp.queryLatestProtocolVersion).toHaveBeenCalledTimes(2);
  });

  it('emits nothing when no logger is configured, and still resolves', async () => {
    const resolved = await resolveOperationEra(headSource(V9_HEAD));

    expect(resolved.head).toBe<LedgerVersion>('v9');
  });
});

describe('the scope head read leaves a breadcrumb, and a refused scope leaves only that', () => {
  it('breadcrumbs the one head reading a scope resolves', async () => {
    const sink = createSink();

    await resolveScopeEra(headSource(V9_HEAD), sink);

    expect(emitted(sink)).toStrictEqual([
      {
        decision: 'head-resolution',
        version: 'v9',
        protocolVersion: V9_HEAD,
        source: 'public-data-provider',
        readingProvenance: 'operation-start'
      }
    ]);
  });

  it('breadcrumbs the reading a REFUSED scope was refused on, and selects no pipeline', async () => {
    // A pre-fork scope is refused outright, so there is no pipeline selection
    // to report -- but the reading the refusal rests on is exactly what an
    // operator needs to see, and it is reported BEFORE the refusal.
    const sink = createSink();

    await expect(resolveScopeEra(headSource(V8_HEAD), sink)).rejects.toThrow();

    expect(emitted(sink)).toStrictEqual([
      {
        decision: 'head-resolution',
        version: 'v8',
        protocolVersion: V8_HEAD,
        source: 'public-data-provider',
        readingProvenance: 'operation-start'
      }
    ]);
  });
});

describe('pipeline selection pairs the artifact pipeline with the head era', () => {
  it('breadcrumbs the retained pipeline on a pre-fork head, after the era gate accepted it', async () => {
    const sink = createSink();

    await acquireLedger8Runtime(headSource(V8_HEAD), 'call', { logger: sink, contractAddress: CONTRACT_ADDRESS });

    expect(emitted(sink)).toStrictEqual([
      {
        decision: 'head-resolution',
        version: 'v8',
        protocolVersion: V8_HEAD,
        source: 'public-data-provider',
        readingProvenance: 'operation-start'
      },
      {
        decision: 'pipeline-selection',
        version: 'v8',
        protocolVersion: V8_HEAD,
        source: 'compiled-contract-shape',
        readingProvenance: 'operation-start',
        path: 'ledger8',
        contractAddress: CONTRACT_ADDRESS
      }
    ]);
  });

  it('breadcrumbs the SAME pipeline against a post-fork head, which is the keep-state route', async () => {
    // The pipeline and the head era together identify the route, and they are
    // reported as the pair rather than as a derived third value that could
    // disagree with it: `path: 'ledger8'` with `version: 'v9'` IS keep-state.
    const sink = createSink();

    await acquireLedger8Runtime(headSource(V9_HEAD), 'call', { logger: sink, contractAddress: CONTRACT_ADDRESS });

    expect(emitted(sink).at(-1)).toStrictEqual({
      decision: 'pipeline-selection',
      version: 'v9',
      protocolVersion: V9_HEAD,
      source: 'compiled-contract-shape',
      readingProvenance: 'operation-start',
      path: 'ledger8',
      contractAddress: CONTRACT_ADDRESS
    });
  });

  it('selects NO pipeline when the era gate refused the pairing', async () => {
    // A retained-era deploy on a post-fork head is refused. The head reading
    // is still reported, because that is what the refusal rests on, but no
    // selection breadcrumb claims a pipeline ran.
    const sink = createSink();

    await expect(
      acquireLedger8Runtime(headSource(V9_HEAD), 'deploy', { logger: sink })
    ).rejects.toThrow(Ledger8DeployOnV9Error);

    expect(emitted(sink).map((breadcrumb) => breadcrumb.decision)).toEqual(['head-resolution']);
  });

  it('reports the retained pipeline on the attach path too, naming the contract', async () => {
    const sink = createSink();
    const providers = createMockProviders();
    const publicDataProvider = {
      ...providers.publicDataProvider,
      queryLatestProtocolVersion: vi.fn<() => Promise<number>>().mockResolvedValue(V8_HEAD),
      // Resolves ABSENT, so the attach refuses right after the selection
      // breadcrumb. That keeps this test about the breadcrumb rather than
      // about a state fixture, and the refusal is what proves the breadcrumb
      // was written before it.
      queryRawContractState: vi.fn().mockResolvedValue(undefined)
    };

    await expect(
      findLedger8Contract(
        { ...providers, publicDataProvider, loggerProvider: sink },
        {
          contract: { impureCircuits: {}, initialState: () => ({}) },
          contractAddress: CONTRACT_ADDRESS,
          circuitIds: ['increment']
        }
      )
    ).rejects.toThrow(/No contract deployed/);

    expect(emitted(sink).at(-1)).toStrictEqual({
      decision: 'pipeline-selection',
      version: 'v8',
      protocolVersion: V8_HEAD,
      source: 'compiled-contract-shape',
      readingProvenance: 'operation-start',
      path: 'ledger8',
      contractAddress: CONTRACT_ADDRESS
    });
  });
});

describe('the encoding breadcrumb dates the fetched state from its envelope tag', () => {
  const v8Envelope = readHexFixture('state-v8.hex');
  const v9Envelope = readHexFixture('state-migrated-v9.hex');

  it('reports the envelope era on an agreeing head, carrying none of the state bytes', async () => {
    const sink = createSink();

    await assertHeadStateEraAgreement('v8', rawState(v8Envelope, V8_HEAD, 'v8'), headSource(), sink);

    const [breadcrumb] = emitted(sink);
    expect(breadcrumb).toBeDefined();
    expect([breadcrumb]).toStrictEqual([
      { decision: 'encoding', version: 'v8', source: 'contract-state-envelope-tag' }
    ]);
    // The privacy gate, over the real envelope the breadcrumb was derived
    // from: the era name came out, the bytes did not. Read directly rather
    // than through a `??` fallback -- a fallback here would compare the
    // breadcrumb against a hand-built copy of the expectation if none had been
    // emitted, which is the shape of an assertion that cannot fail.
    expectCarriesNoSecrets(breadcrumb, [v8Envelope]);
  });

  it('dates the envelope by its TAG, not by the era the record claims', async () => {
    // The record's own `version` says v9 and its envelope says v8. The
    // breadcrumb reports the envelope, which is the byte-level truth --
    // `RawContractState.version` is explicitly not a verified statement about
    // the envelope.
    const sink = createSink();

    await expect(
      assertHeadStateEraAgreement('v9', rawState(v8Envelope, V9_HEAD, 'v9'), headSource(V8_HEAD), sink)
    ).rejects.toThrow(HeadStateEraMismatchError);

    expect(emitted(sink)[0]).toStrictEqual({
      decision: 'encoding',
      version: 'v8',
      source: 'contract-state-envelope-tag'
    });
  });

  it('breadcrumbs the DISAGREEMENT RE-READ as a second head resolution, with its own provenance', async () => {
    // The re-read is a genuinely different reading from the one the operation
    // started on, and telling them apart in a log is the whole point of
    // carrying the provenance: this is the fork window's most diagnostic
    // moment.
    const sink = createSink();

    await expect(
      assertHeadStateEraAgreement('v9', rawState(v8Envelope, V8_HEAD, 'v8'), headSource(V8_HEAD), sink)
    ).rejects.toThrow(HeadStateEraMismatchError);

    expect(emitted(sink)).toStrictEqual([
      { decision: 'encoding', version: 'v8', source: 'contract-state-envelope-tag' },
      {
        decision: 'head-resolution',
        version: 'v8',
        protocolVersion: V8_HEAD,
        source: 'public-data-provider',
        readingProvenance: 'disagreement-re-read'
      }
    ]);
  });

  it('breadcrumbs a re-read that still disagrees, before reporting an inconsistent read surface', async () => {
    const sink = createSink();

    await expect(
      assertHeadStateEraAgreement('v8', rawState(v9Envelope, V9_HEAD, 'v9'), headSource(V8_HEAD), sink)
    ).rejects.toThrow(IndexerInconsistencyError);

    expect(emitted(sink)).toStrictEqual([
      { decision: 'encoding', version: 'v9', source: 'contract-state-envelope-tag' },
      {
        decision: 'head-resolution',
        version: 'v8',
        protocolVersion: V8_HEAD,
        source: 'public-data-provider',
        readingProvenance: 'disagreement-re-read'
      }
    ]);
  });

  it('leaves no re-read breadcrumb when the head and the envelope agree', async () => {
    const sink = createSink();
    const pdp = headSource();

    await assertHeadStateEraAgreement('v9', rawState(v9Envelope, V9_HEAD_MINOR_BUMP, 'v9'), pdp, sink);

    expect(pdp.queryLatestProtocolVersion).not.toHaveBeenCalled();
    expect(emitted(sink).map((breadcrumb) => breadcrumb.decision)).toEqual(['encoding']);
  });
});

describe('no breadcrumb carries a payload, a key or decoded state', () => {
  const v8Envelope = readHexFixture('state-v8.hex');
  const verifierKey = Uint8Array.from(
    readFileSync(resolve(FIXTURES_DIR, 'twin-contract/compiled/keys/increment.verifier'))
  );

  let breadcrumbs: DispatchBreadcrumb[];

  beforeEach(async () => {
    const sink = createSink();

    // One breadcrumb of every kind, produced by real code paths rather than
    // hand-built, so this gate is over what actually ships.
    await acquireLedger8Runtime(headSource(V8_HEAD), 'call', { logger: sink, contractAddress: CONTRACT_ADDRESS });
    await assertHeadStateEraAgreement('v8', rawState(v8Envelope, V8_HEAD, 'v8'), headSource(), sink);
    breadcrumbs = emitted(sink);
  });

  it('produced one breadcrumb of each kind, so the gate below covers all three', () => {
    expect(breadcrumbs.map((breadcrumb) => breadcrumb.decision).sort()).toEqual(
      ['encoding', 'head-resolution', 'pipeline-selection'].sort()
    );
  });

  it('carries no state envelope and no verifier key in any field, in any breadcrumb', () => {
    for (const breadcrumb of breadcrumbs) {
      expectCarriesNoSecrets(breadcrumb, [v8Envelope, verifierKey]);
    }
  });

  it('carries every mandated field and nothing outside the permitted surface', () => {
    // Stated once more on its own, separately from the secret search: an added
    // field that happened not to match a secret in THIS scenario, or a
    // mandated field that silently stopped being emitted, both fail here.
    for (const breadcrumb of breadcrumbs) {
      const present = Object.keys(breadcrumb);
      const required = REQUIRED_FIELDS[breadcrumb.decision];

      expect(required.filter((field) => present.includes(field)).sort()).toEqual([...required].sort());
      expect(
        present.filter((field) => ![...required, ...OPTIONAL_FIELDS[breadcrumb.decision]].includes(field))
      ).toEqual([]);
    }
  });

  it('keeps both exhaustive maps self-consistent, so neither drives the wrong values', () => {
    // The maps are compile-time gates whose VALUES are what the two tests
    // below actually emit. A copy-paste slip -- a key mapped to a sibling's
    // value -- would compile and would quietly test one member twice while
    // never testing another.
    expect(Object.keys(ALL_PROVENANCES)).toEqual(Object.values(ALL_PROVENANCES));
    expect(Object.keys(ALL_PIPELINES)).toEqual(Object.values(ALL_PIPELINES));
  });

  it('places every pipeline the type admits on the allow-listed field, so a new one cannot leak', () => {
    // A REAL exhaustiveness gate, via ALL_PIPELINES above. The earlier form
    // here was `const pipelines: readonly PipelineEra[] = [...]`, which only
    // asserted that each element IS a member and never that all members are
    // listed -- so a third pipeline compiled and tested clean. This test was
    // also the model the provenance gate below was copied from, so the
    // weakness propagated once already.
    const pipelines = Object.values(ALL_PIPELINES);
    const sink = createSink();

    for (const pipeline of pipelines) {
      emitPipelineSelection(sink, { head: 'v9', headProtocolVersion: V9_HEAD }, pipeline);
    }

    expect(emitted(sink).map((breadcrumb) => ('path' in breadcrumb ? breadcrumb.path : undefined))).toEqual(pipelines);
  });
});

describe('the post-rejection head read leaves a breadcrumb too', () => {
  // The rejection in the shape the submit seam actually produces: already
  // sanitized, with the provider's failure on `cause`.
  const wrappedRejection = (): Ledger8SeamFailedError =>
    new Ledger8SeamFailedError('submitTx', 'receive_coin', new Error('node refused the transaction'));

  const callOperation = (head: LedgerVersion): SubmittedOperation => ({
    head,
    kind: 'call',
    circuitId: 'receive_coin',
    contractAddress: CONTRACT_ADDRESS
  });

  it('reports the fresh reading behind a fork-crossing refusal, with its own provenance', async () => {
    // The single most diagnostic head reading in the stack: bytes were already
    // on the wire, and this reading is what turns a bare rejection into a
    // two-step re-run remediation. An operator acting on that remediation
    // needs the integer it returned.
    const sink = createSink();

    await expect(
      handleSubmitRejection(headSource(V9_HEAD), callOperation('v8'), wrappedRejection(), sink)
    ).rejects.toThrow(StaleHeadError);

    expect(emitted(sink)).toStrictEqual([
      {
        decision: 'head-resolution',
        version: 'v9',
        protocolVersion: V9_HEAD,
        source: 'public-data-provider',
        readingProvenance: 'post-rejection-re-read'
      }
    ]);
  });

  it('distinguishes the post-rejection reading from the operation-start one', async () => {
    // Both readings on one sink, which is what a real operation produces. If
    // they carried the same provenance a log could not tell which reading the
    // fork verdict rested on -- the whole point of carrying it.
    const sink = createSink();

    await resolveOperationEra(headSource(V8_HEAD), sink);
    await expect(
      handleSubmitRejection(headSource(V9_HEAD), callOperation('v8'), wrappedRejection(), sink)
    ).rejects.toThrow(StaleHeadError);

    expect(emitted(sink).map((breadcrumb) => 'readingProvenance' in breadcrumb ? breadcrumb.readingProvenance : undefined))
      .toEqual<(HeadReadingProvenance | undefined)[]>(['operation-start', 'post-rejection-re-read']);
  });

  it('reports the reading even when the head did NOT move, so the re-thrown rejection is accounted for', async () => {
    // The same-era arm re-throws the rejection unchanged, so without the
    // breadcrumb there is no record that the network was asked at all.
    const sink = createSink();
    const rejection = wrappedRejection();

    await expect(
      handleSubmitRejection(headSource(V8_HEAD), callOperation('v8'), rejection, sink)
    ).rejects.toBe(rejection);

    expect(emitted(sink)).toStrictEqual([
      {
        decision: 'head-resolution',
        version: 'v8',
        protocolVersion: V8_HEAD,
        source: 'public-data-provider',
        readingProvenance: 'post-rejection-re-read'
      }
    ]);
  });

  it('emits NOTHING when the head read itself failed, because there is no reading to report', async () => {
    const sink = createSink();
    const pdp = { queryLatestProtocolVersion: vi.fn<() => Promise<number>>().mockRejectedValue(new Error('offline')) };

    await expect(
      handleSubmitRejection(pdp, callOperation('v8'), wrappedRejection(), sink)
    ).rejects.toThrow(SubmitRejectionUndiagnosedError);

    expect(emitted(sink)).toStrictEqual([]);
  });

  it('never asks the network about one of this framework\'s own coded refusals, so emits nothing', async () => {
    const sink = createSink();
    const pdp = headSource(V9_HEAD);
    const ownRefusal = new StaleHeadError(callOperation('v8'), 'v9', new Error('inner'));

    await expect(handleSubmitRejection(pdp, callOperation('v8'), ownRefusal, sink)).rejects.toBe(ownRefusal);

    expect(pdp.queryLatestProtocolVersion).not.toHaveBeenCalled();
    expect(emitted(sink)).toStrictEqual([]);
  });

  it('names every provenance the type admits, so a new head read cannot go unreported', () => {
    // The test whose NAME makes the claim, so the claim has to be enforced.
    // ALL_PROVENANCES above is what enforces it: there are four head reads in
    // this package and three provenances -- the two operation-start reads
    // share one -- and a fifth read that adds a member breaks the build there
    // until it is listed and emitted.
    const provenances = Object.values(ALL_PROVENANCES);
    const sink = createSink();

    for (const readingProvenance of provenances) {
      emitHeadResolution(sink, { head: 'v9', headProtocolVersion: V9_HEAD }, readingProvenance);
    }

    expect(
      emitted(sink).map((breadcrumb) => ('readingProvenance' in breadcrumb ? breadcrumb.readingProvenance : undefined))
    ).toEqual(provenances);
  });
});

describe('a faulty logger cannot fail an operation that otherwise succeeds', () => {
  // `loggerProvider` is a PUBLIC interface a consumer implements, with every
  // level optional, so `debug` is arbitrary third-party code sitting on the
  // success path of every retained-era operation. A breadcrumb has no bearing
  // on the outcome, so a fault in it must not change the outcome.
  const throwingSink = (): { readonly debug: DebugSpy } => ({
    debug: vi.fn<(breadcrumb: DispatchBreadcrumb, message: string) => void>().mockImplementation(() => {
      throw new Error('the configured logger is broken');
    })
  });

  it('resolves the era despite the logger throwing, instead of rejecting', async () => {
    const sink = throwingSink();

    await expect(resolveOperationEra(headSource(V9_HEAD), sink)).resolves.toBeDefined();

    // The logger really was called and really did throw -- otherwise this test
    // would pass against a build that had stopped emitting altogether.
    expect(sink.debug).toHaveBeenCalledTimes(1);
    expect(sink.debug.mock.results.map((result) => result.type)).toEqual(['throw']);
  });

  it('returns the SAME result as a run with no logger at all', async () => {
    // The second direction, and the one that matters: not failing is not
    // enough if the guard changed what the operation produced.
    const withoutLogger = await resolveOperationEra(headSource(V9_HEAD_MINOR_BUMP));
    const withBrokenLogger = await resolveOperationEra(headSource(V9_HEAD_MINOR_BUMP), throwingSink());

    expect(withBrokenLogger.head).toBe(withoutLogger.head);
    expect(withBrokenLogger.headProtocolVersion).toBe(withoutLogger.headProtocolVersion);
    expect(withBrokenLogger.era.version).toBe(withoutLogger.era.version);
  });

  it('does not turn a REFUSAL into a different failure', async () => {
    // The guard must not swallow anything but the emission, so a genuine
    // refusal still arrives as itself rather than as the logger's error.
    const sink = throwingSink();

    await expect(
      acquireLedger8Runtime(headSource(V9_HEAD), 'deploy', { logger: sink })
    ).rejects.toThrow(Ledger8DeployOnV9Error);
  });

  it('still completes the pipeline selection that follows a failed emission', async () => {
    // A fault in the FIRST breadcrumb must not skip the second one, which is
    // what a guard placed around the whole block instead of around the
    // emission would do.
    const sink = throwingSink();

    await expect(
      acquireLedger8Runtime(headSource(V8_HEAD), 'call', { logger: sink, contractAddress: CONTRACT_ADDRESS })
    ).resolves.toBeDefined();

    expect(sink.debug).toHaveBeenCalledTimes(2);
  });

  it('lets the era disagreement refusal through unchanged when the logger throws', async () => {
    const sink = throwingSink();
    const v8Envelope = readHexFixture('state-v8.hex');

    await expect(
      assertHeadStateEraAgreement('v9', rawState(v8Envelope, V8_HEAD, 'v8'), headSource(V8_HEAD), sink)
    ).rejects.toThrow(HeadStateEraMismatchError);
  });
});
