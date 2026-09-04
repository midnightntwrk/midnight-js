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

import { HeadStateEraMismatchError, IndexerInconsistencyError, Ledger8DeployOnV9Error } from '../errors';
import type { DispatchBreadcrumb } from '../internal/breadcrumbs';
import { DISPATCH_BREADCRUMB_MESSAGE, emitEncoding, emitHeadResolution, emitPipelineSelection } from '../internal/breadcrumbs';
import { assertHeadStateEraAgreement, type PipelineEra, resolveOperationEra } from '../internal/era';
import { acquireLedger8Runtime, findLedger8Contract } from '../internal/ledger8-entry';
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

// The field surface each decision is allowed to carry. Asserted as a set as
// well as by strict equality on values: strict equality catches a field whose
// VALUE changed, this catches a field that was ADDED, which is the direction a
// privacy regression arrives from.
const ALLOWED_FIELDS: Readonly<Record<DispatchBreadcrumb['decision'], readonly string[]>> = {
  'head-resolution': ['decision', 'version', 'protocolVersion', 'source', 'readingProvenance'],
  'pipeline-selection': ['decision', 'version', 'protocolVersion', 'source', 'readingProvenance', 'path', 'contractAddress'],
  encoding: ['decision', 'version', 'source']
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
  expect(Object.keys(breadcrumb).sort()).toEqual(
    ALLOWED_FIELDS[breadcrumb.decision].filter((field) => field in breadcrumb).sort()
  );
  // And no field outside the allowed surface.
  expect(Object.keys(breadcrumb).every((field) => ALLOWED_FIELDS[breadcrumb.decision].includes(field))).toBe(true);
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

    expect(emitted(sink)).toStrictEqual([
      {
        decision: 'pipeline-selection',
        version: 'v8',
        protocolVersion: V8_HEAD,
        source: 'compiled-contract-shape',
        readingProvenance: 'operation-start',
        path: 'ledger8'
      }
    ]);
    expect('contractAddress' in (emitted(sink)[0] ?? {})).toBe(false);
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

    const breadcrumbs = emitted(sink);
    expect(breadcrumbs).toStrictEqual([
      { decision: 'encoding', version: 'v8', source: 'contract-state-envelope-tag' }
    ]);
    // The privacy gate, over the real envelope the breadcrumb was derived
    // from: the era name came out, the bytes did not.
    expectCarriesNoSecrets(breadcrumbs[0] ?? { decision: 'encoding', version: 'v8', source: 'contract-state-envelope-tag' }, [
      v8Envelope
    ]);
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

  it('carries only names, era labels, integers and the contract address', () => {
    // The allow-list, asserted positively as well: an added field that
    // happened not to match a secret in THIS scenario would still fail here.
    for (const breadcrumb of breadcrumbs) {
      expect(Object.keys(breadcrumb).every((field) => ALLOWED_FIELDS[breadcrumb.decision].includes(field))).toBe(true);
    }
  });

  it('places every pipeline the type admits on the allow-listed field, so a new one cannot leak', () => {
    // A cheap exhaustiveness gate on `path`: the breadcrumb's pipeline field
    // is the pipeline vocabulary itself, so a third pipeline would have to be
    // added here too.
    const pipelines: readonly PipelineEra[] = ['ledger8', 'v9native'];
    const sink = createSink();

    for (const pipeline of pipelines) {
      emitPipelineSelection(sink, { head: 'v9', headProtocolVersion: V9_HEAD }, pipeline);
    }

    expect(emitted(sink).map((breadcrumb) => ('path' in breadcrumb ? breadcrumb.path : undefined))).toEqual(pipelines);
  });
});
