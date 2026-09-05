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

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type * as protocol from '@midnight-ntwrk/midnight-js-protocol';
import type { ProtocolV8 } from '@midnight-ntwrk/midnight-js-protocol';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { type LedgerVersion, protocolVersionToLedger } from '@midnight-ntwrk/midnight-js-protocol/version';
import type { ReadSeam, VersionedFinalizedTxData } from '@midnight-ntwrk/midnight-js-types';
import { DeserializationError, hasErrorCode, PROVIDER_ERROR_CODES, toHex } from '@midnight-ntwrk/midnight-js-utils';
import * as Rx from 'rxjs';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { decodeVersionedTransaction } from '../codec';
import {
  DecodeVersionMismatchError,
  EraUnresolvableError,
  EraUnsupportedError,
  IndexerDataError,
  IndexerError
} from '../errors';
import type { RegularTransaction } from '../gen/schema-types';
import { toFinalizedDeployTxData, toFinalizedTxData } from '../mapping';
import { IndexerPublicDataProvider } from '../provider';
import { type ApolloRequest, stubApolloHandle, type WatchQueryStub } from './apollo-stub';
import {
  mintV8TransactionHex,
  mintV9TransactionHex,
  UNRESOLVABLE_PROTOCOL_VERSION,
  V8_ERA_PROTOCOL_VERSION,
  V9_ERA_PROTOCOL_VERSION
} from './state-fixtures';

// The v8 runtime is reached through `loadLedger8()` and nowhere else, so
// spying on that one accessor is what makes "a v9-only session never touches
// the v8 WASM" observable. The spy delegates to the real accessor — these
// tests decode with the genuine runtimes, never with a stand-in — and its
// memo is the single load authority, so a stable module identity across N
// records is what "loaded once" means here.
const { loadLedger8Spy } = vi.hoisted(() => ({ loadLedger8Spy: vi.fn<() => Promise<ProtocolV8>>() }));

vi.mock('@midnight-ntwrk/midnight-js-protocol', async (importOriginal) => {
  const original = await importOriginal<typeof protocol>();
  loadLedger8Spy.mockImplementation(original.loadLedger8);
  return { ...original, loadLedger8: loadLedger8Spy };
});

const CONTRACT_ADDRESS = '12'.repeat(32) as ContractAddress;
const TX_ID = 'test-tx-id';

let v9TransactionHex: string;
let v8TransactionHex: string;

beforeAll(async () => {
  v9TransactionHex = mintV9TransactionHex();
  v8TransactionHex = await mintV8TransactionHex();
});

beforeEach(() => {
  // Minting the v8 fixture above loads the v8 runtime once, for the whole
  // file. Clearing here is what keeps every "was v8 reached?" assertion a
  // statement about the code under test rather than about the arrange step.
  loadLedger8Spy.mockClear();
});

const transactionAt = (protocolVersion: number, raw: string): RegularTransaction & { hash: string; identifiers: string[] } =>
  ({
    id: 1,
    protocolVersion,
    raw,
    hash: 'ab'.repeat(32),
    identifiers: [TX_ID],
    block: { height: 10, hash: 'cd'.repeat(32), author: null, timestamp: 0 },
    contractActions: [{ address: CONTRACT_ADDRESS }],
    unshieldedCreatedOutputs: [],
    unshieldedSpentOutputs: [],
    fees: { estimatedFees: '1', paidFees: '1' },
    transactionResult: { status: 'SUCCESS' as const, segments: null }
  }) as unknown as RegularTransaction & { hash: string; identifiers: string[] };

type QueryMock = ReturnType<typeof vi.fn<(request: ApolloRequest) => Promise<unknown>>>;

const emissionOf = (transaction: RegularTransaction): unknown =>
  Rx.of({
    data: { transactions: [transaction] },
    dataState: 'complete',
    loading: false,
    networkStatus: 7,
    partial: false
  });

/**
 * A provider whose poll resolves to `transaction` at once. `query` rejects on
 * every call: the read path under test must issue no request of its own, so a
 * provider that quietly served one would fail here rather than pass.
 */
const providerReturning = (transaction: RegularTransaction): IndexerPublicDataProvider => {
  const query: QueryMock = vi
    .fn<(request: ApolloRequest) => Promise<unknown>>()
    .mockRejectedValue(new Error('test setup: this read must issue no query of its own'));
  const watchQuery: WatchQueryStub = () => emissionOf(transaction);
  return new IndexerPublicDataProvider(stubApolloHandle({ query, watchQuery }), 1000);
};

/** The same payload with one byte inverted, as lower-case hex. */
const flipByte = (hex: string, byteIndex: number): string => {
  const bytes = Buffer.from(hex, 'hex');
  bytes[byteIndex] ^= 0xff;
  return bytes.toString('hex');
};

const rejectionOf = async (work: Promise<unknown>): Promise<unknown> =>
  work.then(
    () => {
      throw new Error('expected the read to reject, but it resolved');
    },
    (error: unknown) => error
  );

describe('per-record dual decode on the finalized-transaction read path', () => {
  it('decodes a v9 record through the statically bound runtime, byte-unchanged', async () => {
    const record = await toFinalizedTxData(TX_ID, transactionAt(V9_ERA_PROTOCOL_VERSION, v9TransactionHex));

    expect(record.version).toBe('v9');
    // Re-serialized rather than merely non-null: proves the bytes went through
    // the v9 runtime instead of being handed back untouched.
    expect(toHex(record.tx.serialize())).toBe(v9TransactionHex);
  });

  it('decodes a v8 record through the lazily loaded runtime, byte-unchanged', async () => {
    const record = await toFinalizedTxData(TX_ID, transactionAt(V8_ERA_PROTOCOL_VERSION, v8TransactionHex));

    expect(record.version).toBe('v8');
    expect(toHex(record.tx.serialize())).toBe(v8TransactionHex);
  });

  it('decodes a v8 deploy record on the deploy seam too', async () => {
    const record = await toFinalizedDeployTxData(
      CONTRACT_ADDRESS,
      transactionAt(V8_ERA_PROTOCOL_VERSION, v8TransactionHex)
    );

    expect(record.version).toBe('v8');
    expect(record.txId).toBe(TX_ID);
  });

  // The version-truth invariant, stated on both arms: the discriminant is not
  // merely present, it is the answer the era resolver gives for the
  // `protocolVersion` sitting on the same record. A stamped literal would pass
  // on one arm and fail on the other.
  it.each([
    ['v9', V9_ERA_PROTOCOL_VERSION, (): string => v9TransactionHex],
    ['v8', V8_ERA_PROTOCOL_VERSION, (): string => v8TransactionHex]
  ])('carries a %s discriminant that agrees with the record own protocolVersion', async (era, protocolVersion, raw) => {
    const record = await toFinalizedTxData(TX_ID, transactionAt(protocolVersion, raw()));

    expect(record.version).toBe(protocolVersionToLedger(record.protocolVersion, 'read'));
    expect(record.version).toBe(era);
  });
});

describe('the v8 runtime is reached lazily, and only when a v8 record needs it', () => {
  it('never acquires the v8 runtime while decoding v9 records', async () => {
    const records = await Promise.all(
      [0, 1, 2].map(() => toFinalizedTxData(TX_ID, transactionAt(V9_ERA_PROTOCOL_VERSION, v9TransactionHex)))
    );

    expect(records.map((record) => record.version)).toEqual(['v9', 'v9', 'v9']);
    expect(loadLedger8Spy).not.toHaveBeenCalled();
  });

  it('acquires the v8 runtime once across many v8 records', async () => {
    const RECORD_COUNT = 4;

    const records = await Promise.all(
      Array.from({ length: RECORD_COUNT }, () =>
        toFinalizedTxData(TX_ID, transactionAt(V8_ERA_PROTOCOL_VERSION, v8TransactionHex))
      )
    );
    const modules = await Promise.all(loadLedger8Spy.mock.results.map((result) => result.value));

    expect(records).toHaveLength(RECORD_COUNT);
    expect(loadLedger8Spy).toHaveBeenCalledTimes(RECORD_COUNT);
    // The accessor is called per record; the memo behind it is what makes
    // those calls one physical load, and a single module identity is how that
    // shows from here.
    expect(new Set(modules).size).toBe(1);
  });

  it('awaits the acquisition inside the query method, so the caller sees a resolved record', async () => {
    const provider = providerReturning(transactionAt(V8_ERA_PROTOCOL_VERSION, v8TransactionHex));

    const record: VersionedFinalizedTxData = await provider.watchForTxData(TX_ID);

    expect(record.version).toBe('v8');
    expect(loadLedger8Spy).toHaveBeenCalledTimes(1);
  });

  it('resolves a v9 record through the query method without touching the v8 runtime', async () => {
    const provider = providerReturning(transactionAt(V9_ERA_PROTOCOL_VERSION, v9TransactionHex));

    const record: VersionedFinalizedTxData = await provider.watchForTxData(TX_ID);

    expect(record.version).toBe('v9');
    expect(loadLedger8Spy).not.toHaveBeenCalled();
  });
});

describe('the module graph keeps both retained-era chunks off the eager path', () => {
  const SOURCE_ROOT = fileURLToPath(new URL('..', import.meta.url));

  const sourceFiles = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        // `gen/` is code-generated GraphQL types; `test/` is this suite itself.
        return entry.name === 'gen' || entry.name === 'test' ? [] : sourceFiles(path);
      }
      return entry.name.endsWith('.ts') ? [path] : [];
    });

  const sources = (): readonly { readonly path: string; readonly text: string }[] =>
    sourceFiles(SOURCE_ROOT).map((path) => ({ path, text: readFileSync(path, 'utf8') }));

  // Every lazy accessor the protocol package publishes. The engine accessor is
  // the one that pulls the retained compact-runtime 0.16 glue and the
  // onchain-runtime-v3 WASM, neither of which a decode-only read path has any
  // use for.
  const LAZY_ACCESSORS = ['loadLedger8', 'loadLedger8Engine'] as const;

  it('reaches the v8 era through loadLedger8 and through no other accessor', () => {
    const referenced = LAZY_ACCESSORS.filter((accessor) =>
      sources().some(({ text }) => new RegExp(`\\b${accessor}\\b`).test(text))
    );

    expect([...referenced].sort()).toEqual(['loadLedger8']);
  });

  // Every way a module specifier can be LINKED at runtime. `[^;]*?` spans the
  // newlines a multi-line import list contains but cannot cross the statement
  // terminator, so a clause is never attributed to the next statement's
  // specifier — and a single-line pattern would have skipped almost every
  // import in this package while still reporting no offenders.
  const RUNTIME_SPECIFIER_PATTERNS = [
    // `import … from '…'`. `import type` is erased and so is excluded.
    /^import\s+(?!type\b)[^;]*?from\s+'(?<specifier>[^']+)'/gm,
    // `import '…'` — a side-effect import has no clause that could be
    // type-erased, so it always links the module.
    /^import\s+'(?<specifier>[^']+)'/gm,
    // `export … from '…'` — a runtime re-export links the module exactly as an
    // import does. `export type … from` does not.
    /^export\s+(?!type\b)[^;]*?from\s+'(?<specifier>[^']+)'/gm
  ];

  const runtimeSpecifiers = (): readonly { readonly path: string; readonly specifier: string }[] =>
    sources().flatMap(({ path, text }) =>
      RUNTIME_SPECIFIER_PATTERNS.flatMap((pattern) =>
        [...text.matchAll(pattern)].map((match) => ({ path, specifier: match.groups?.specifier ?? '' }))
      )
    );

  it('never links a retained-era package or subpath at runtime, by import or by re-export', () => {
    const FORBIDDEN = [
      '@midnightntwrk/ledger-v8',
      '@midnight-ntwrk/midnight-js-protocol/v8',
      '@midnight-ntwrk/midnight-js-protocol/engine'
    ];

    const linked = runtimeSpecifiers();
    const offenders = linked
      .filter(({ specifier }) =>
        FORBIDDEN.some((forbidden) => specifier === forbidden || specifier.startsWith(`${forbidden}/`))
      )
      .map(({ path, specifier }) => `${path}: ${specifier}`);

    // The scan is worth nothing unless it really sees this package's imports:
    // the multi-line barrel import in `codec.ts` is the one it must find.
    expect(linked.map(({ specifier }) => specifier)).toContain('@midnight-ntwrk/midnight-js-protocol');
    expect(offenders).toEqual([]);
  });
});

describe('a decode against the wrong runtime is refused, not mislabelled', () => {
  it.each([
    ['v8-era bytes dated to a v9 block', V9_ERA_PROTOCOL_VERSION, (): string => v8TransactionHex],
    ['v9-era bytes dated to a v8 block', V8_ERA_PROTOCOL_VERSION, (): string => v9TransactionHex]
  ])('reports %s with the registered version-mismatch code', async (_label, protocolVersion, raw) => {
    const error = await rejectionOf(toFinalizedTxData(TX_ID, transactionAt(protocolVersion, raw())));

    expect(error).toBeInstanceOf(DecodeVersionMismatchError);
    expect(hasErrorCode(error, PROVIDER_ERROR_CODES.DECODE_VERSION_MISMATCH)).toBe(true);
  });

  it('names the era it dispatched to, the raw protocolVersion, the seam and the record', async () => {
    const error = await rejectionOf(
      toFinalizedTxData(TX_ID, transactionAt(V8_ERA_PROTOCOL_VERSION, v9TransactionHex))
    );

    const mismatch = error as DecodeVersionMismatchError;
    expect(mismatch.era).toBe('v8');
    expect(mismatch.protocolVersion).toBe(V8_ERA_PROTOCOL_VERSION);
    expect(mismatch.seam).toBe('watchForTxData');
    expect(mismatch.recordRef).toContain(TX_ID);
  });

  it('names the contract address on the deploy seam, not just the transaction id', async () => {
    // Restores, against the error that now carries it, the assertion the era
    // wiring suite used to make: whichever read failed, the record it failed on
    // is identifiable.
    const error = await rejectionOf(
      toFinalizedDeployTxData(CONTRACT_ADDRESS, transactionAt(V8_ERA_PROTOCOL_VERSION, v9TransactionHex))
    );

    const mismatch = error as DecodeVersionMismatchError;
    expect(mismatch.seam).toBe('watchForDeployTxData');
    expect(mismatch.recordRef).toContain(CONTRACT_ADDRESS);
    expect(mismatch.message).toContain(CONTRACT_ADDRESS);
  });

  it('blames the indexer rather than the consumer dependency versions', async () => {
    const error = await rejectionOf(
      toFinalizedTxData(TX_ID, transactionAt(V8_ERA_PROTOCOL_VERSION, v9TransactionHex))
    );

    expect((error as Error).message).toContain('inconsistent indexer');
    expect(error).toBeInstanceOf(IndexerError);
  });

  it('preserves the runtime own diagnosis on cause rather than discarding it', async () => {
    const error = await rejectionOf(
      toFinalizedTxData(TX_ID, transactionAt(V8_ERA_PROTOCOL_VERSION, v9TransactionHex))
    );

    const cause = (error as Error).cause;
    expect(cause).toBeInstanceOf(DeserializationError);
    expect((cause as DeserializationError).context.classification).toBe('version-mismatch');
  });

  it('renders no payload of its own: not the hex, not a prefix of it, not a byte count', async () => {
    // Scoped to the error THIS package raises. The claim is about what this
    // class renders, and it is the only part of the chain this package
    // controls.
    const error = await rejectionOf(
      toFinalizedTxData(TX_ID, transactionAt(V8_ERA_PROTOCOL_VERSION, v9TransactionHex))
    );

    const own = `${(error as Error).message}\n${JSON.stringify(error, ['message', 'seam', 'era', 'protocolVersion', 'recordRef', 'code', 'name'])}`;
    // The era and the raw protocolVersion ARE the diagnosis and belong in the
    // text; asserting them is also what shows the refusals below are reading
    // populated text rather than an empty string.
    expect(own).toContain(String(V8_ERA_PROTOCOL_VERSION));
    expect(own).toContain('v8');
    for (const payload of [v9TransactionHex, v8TransactionHex]) {
      expect(own).not.toContain(payload);
      // A truncated dump would slip past a whole-payload check. Sixteen bytes
      // is already more than enough to identify a transaction.
      expect(own).not.toContain(payload.slice(0, 32));
    }
  });

  it('carries no hex encoding of the payload anywhere in the cause chain either', async () => {
    // Deliberately narrower than "renders nothing derived from the payload".
    // When a header tag fails to parse, the ledger WASM's own message embeds up
    // to ~64 bytes of the payload as LOSSY TEXT (`got '<replacement chars>…'`),
    // which no hex-encoded comparison can catch. That is produced upstream, it
    // pre-dates this change and occurs identically on the v9-only path, and the
    // bytes concerned are public indexer data rather than key material — so it
    // is recorded here rather than chased. What is asserted is the property
    // that does hold: nothing in the chain reproduces the payload in the
    // encoding it arrived in, which is the form that would be copied into a bug
    // report or a log aggregator verbatim.
    const error = await rejectionOf(
      toFinalizedTxData(TX_ID, transactionAt(V8_ERA_PROTOCOL_VERSION, v9TransactionHex))
    );

    const chain = [error, (error as Error).cause, ((error as Error).cause as Error).cause]
      .map((link) => (link instanceof Error ? `${link.message}\n${JSON.stringify(link)}` : String(link)))
      .join('\n');
    expect(chain).toContain(String(V8_ERA_PROTOCOL_VERSION));
    for (const payload of [v9TransactionHex, v8TransactionHex]) {
      expect(chain).not.toContain(payload);
      expect(chain).not.toContain(payload.slice(0, 32));
    }
  });

  // The invariant the error's own message asserts — "the record contradicts
  // itself, so this is an inconsistent indexer rather than a version mismatch
  // in your dApp's dependencies" — only holds if corruption stays out of this
  // class. It very nearly did not: the deserialization layer's tag-header
  // pattern is permissive on the incoming tag, so EVERY payload below arrives
  // classified `version-mismatch`, and a guard that trusted the classification
  // alone reported all of them as an era disagreement. Only the two genuine
  // cross-era payloads above carry a `direction`.
  //
  // A single corrupt case would leave that looking proven when it was not, so
  // the whole shape space is enumerated: nothing before the tag, a tag cut
  // short, a tag mangled in place, an intact tag over a truncated body, and a
  // byte flipped past the tag.
  it.each([
    ['a payload truncated inside its header tag', (): string => v9TransactionHex.slice(0, 6)],
    ['a payload truncated mid-body, its header tag intact', (): string => v9TransactionHex.slice(0, 90)],
    ['bytes that are not a serialized anything', (): string => 'ab'.repeat(64)],
    ['a payload whose first byte is flipped', (): string => flipByte(v9TransactionHex, 0)],
    ['a payload with a byte flipped inside its header tag', (): string => flipByte(v9TransactionHex, 5)],
    [
      'a payload with a byte flipped after its header tag',
      (): string => flipByte(v9TransactionHex, Buffer.from(v9TransactionHex, 'hex').length - 1)
    ]
  ])('leaves %s as a deserialization failure instead of blaming the era', async (_label, raw) => {
    const error = await rejectionOf(toFinalizedTxData(TX_ID, transactionAt(V9_ERA_PROTOCOL_VERSION, raw())));

    expect(error).toBeInstanceOf(DeserializationError);
    expect(error).not.toBeInstanceOf(DecodeVersionMismatchError);
  });

  it.each([
    ['an empty payload', ''],
    ['a payload that is not hex at all', 'zzzz'],
    ['a payload that is hex only up to a point', `${'ab'.repeat(8)}nothex`]
  ])('refuses %s as a bad encoding, before any decoder sees a truncated buffer', async (_label, raw) => {
    // `Buffer.from(s, 'hex')` stops at the first character it cannot read and
    // returns a SHORTER buffer without complaining, so without the hex guard
    // each of these reached a decoder as a silently truncated payload and was
    // diagnosed as a bad transaction rather than a bad encoding.
    const error = await rejectionOf(toFinalizedTxData(TX_ID, transactionAt(V9_ERA_PROTOCOL_VERSION, raw)));

    expect(error).toBeInstanceOf(IndexerDataError);
    expect((error as IndexerDataError).context.kind).toBe('malformed-transaction-encoding');
  });
});

describe('an era that resolves to no decoder at all', () => {
  it('refuses an unresolvable protocolVersion before any runtime is acquired', async () => {
    const error = await rejectionOf(
      toFinalizedTxData(TX_ID, transactionAt(UNRESOLVABLE_PROTOCOL_VERSION, v8TransactionHex))
    );

    expect(error).toBeInstanceOf(EraUnresolvableError);
    expect(loadLedger8Spy).not.toHaveBeenCalled();
  });

  // `EraUnsupportedError` is reachable only from an untyped JavaScript
  // consumer, which this package also serves: `era` is typed, so a TypeScript
  // caller cannot get here. The cast stands in for that consumer. Without the
  // guard the era-keyed lookup would answer an inherited `Object.prototype`
  // member instead of throwing. The class stays a public export with a
  // registered code, so its fields and its remediation text are asserted here
  // rather than left to whoever next reads the decoder table.
  const decodeWithEra = (era: string, seam: ReadSeam = 'watchForTxData', recordRef = `txId ${TX_ID}`): Promise<unknown> =>
    decodeVersionedTransaction(v9TransactionHex, era as LedgerVersion, {
      seam,
      protocolVersion: V9_ERA_PROTOCOL_VERSION,
      recordRef
    });

  it.each([['toString'], ['constructor'], ['v7']])(
    'refuses %s as an era rather than resolving it through the prototype chain',
    async (era) => {
      const error = await rejectionOf(decodeWithEra(era));

      expect(error).toBeInstanceOf(EraUnsupportedError);
      expect(hasErrorCode(error, PROVIDER_ERROR_CODES.ERA_UNSUPPORTED)).toBe(true);
    }
  );

  it('carries the era, the raw protocolVersion, the seam and the record', async () => {
    const error = await rejectionOf(decodeWithEra('v7', 'watchForDeployTxData', `contractAddress ${CONTRACT_ADDRESS}`));

    const unsupported = error as EraUnsupportedError;
    expect(unsupported.era).toBe('v7');
    expect(unsupported.protocolVersion).toBe(V9_ERA_PROTOCOL_VERSION);
    expect(unsupported.seam).toBe('watchForDeployTxData');
    expect(unsupported.recordRef).toContain(CONTRACT_ADDRESS);
  });

  it('names the record in its message, so one of several concurrent watches can be identified', async () => {
    const error = await rejectionOf(decodeWithEra('v7'));

    expect((error as Error).message).toContain(TX_ID);
    expect((error as Error).message).toContain(String(V9_ERA_PROTOCOL_VERSION));
  });

  it('tells the reader this build has no decoder for the era, not that the era cannot be decoded at all', async () => {
    // The remediation changed with dual decode: the era is no longer one this
    // provider refuses on principle, it is one this build ships no runtime for.
    const error = await rejectionOf(decodeWithEra('v7'));

    expect((error as Error).message).toContain("ledger era 'v7', which this build has no decoder for");
    expect((error as Error).message).toContain('upgrade to a release that knows this one');
  });

  it('does not claim the record was read from that era, which its protocolVersion contradicts', async () => {
    // The only way here is a caller supplying an off-vocabulary era, so the era
    // and the indexer-reported protocolVersion do not describe each other. The
    // message reports them as the separate facts they are; asserting they are
    // both present is what stops a future edit dropping one to fix the other.
    const error = await rejectionOf(decodeWithEra('v7'));

    const message = (error as Error).message;
    expect(message).not.toContain('read a record from the v7 ledger era');
    expect(message).toContain('was asked to decode with');
    expect(message).toContain(`indexer-reported protocolVersion ${V9_ERA_PROTOCOL_VERSION}`);
  });

  it('reaches consumers through the IndexerError hierarchy, like every other failure here', async () => {
    const unsupported = await rejectionOf(decodeWithEra('v7'));
    const unresolvable = await rejectionOf(
      toFinalizedTxData(TX_ID, transactionAt(UNRESOLVABLE_PROTOCOL_VERSION, v8TransactionHex))
    );

    expect(unsupported).toBeInstanceOf(IndexerError);
    expect(unresolvable).toBeInstanceOf(IndexerError);
  });
});
