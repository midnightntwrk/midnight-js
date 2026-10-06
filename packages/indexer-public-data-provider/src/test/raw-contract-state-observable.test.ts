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

import type { ContractAddress, TransactionId } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { PositionedRecord, RawContractState } from '@midnight-ntwrk/midnight-js-types';
import { contractStateEnvelopeVersion, fromHex, TagParseError, toHex } from '@midnight-ntwrk/midnight-js-utils';
import type { DocumentNode } from 'graphql';
import * as Rx from 'rxjs';
import { describe, expect, test, vi } from 'vitest';

import { IndexerDataError, IndexerError } from '../errors';
import { IndexerPublicDataProvider } from '../provider';
import {
  BLOCK_QUERY,
  CONTRACT_STATE_QUERY,
  CONTRACT_STATE_SUB,
  LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY,
  TX_ID_QUERY
} from '../query-definitions';
import { type ApolloRequest, resumableSubscribe, stubApolloHandle, subscribedOffsets } from './apollo-stub';
import {
  mintV8ContractStateHex,
  mintV9ContractStateHex,
  mintV9TransactionHex,
  UNRESOLVABLE_PROTOCOL_VERSION,
  V8_ERA_PROTOCOL_VERSION,
  V9_ERA_PROTOCOL_VERSION
} from './state-fixtures';

const ADDRESS = '12'.repeat(32) as ContractAddress;
const INVALID_ADDRESS = 'not-a-contract-address' as ContractAddress;
const TX_ID = 'test-tx-id' as TransactionId;

type WatchQueryMock = ReturnType<typeof vi.fn<(request: ApolloRequest) => unknown>>;
type SubscribeMock = ReturnType<typeof vi.fn<(request: ApolloRequest) => unknown>>;

/**
 * One `ApolloQueryResult`-shaped emission. `withCompleteQueryData` gates on
 * `dataState`, so a poll that omits it never resolves and the test would hang
 * rather than fail.
 */
const queryEmission = (data: unknown): Rx.Observable<unknown> =>
  Rx.of({ data, dataState: 'complete', loading: false, networkStatus: 7, partial: false });

/** A `watchQuery` stub that answers per document, and refuses anything unregistered. */
const dispatchingWatchQuery = (responses: ReadonlyMap<DocumentNode, unknown>): WatchQueryMock =>
  vi.fn<(request: ApolloRequest) => unknown>().mockImplementation(({ query }: ApolloRequest) => {
    if (!responses.has(query)) {
      return Rx.throwError(() => new Error('test setup: no poll response registered for the requested document'));
    }
    return queryEmission(responses.get(query));
  });

/** A `subscribe` stub that replays `payloads` for the registered document, then completes. */
const dispatchingSubscribe = (document: DocumentNode, payloads: readonly unknown[]): SubscribeMock =>
  vi.fn<(request: ApolloRequest) => unknown>().mockImplementation(({ query }: ApolloRequest) => {
    if (query !== document) {
      return Rx.throwError(() => new Error('test setup: unexpected subscription document'));
    }
    return Rx.from(payloads);
  });

const buildProvider = (stubs: {
  readonly watchQuery?: WatchQueryMock;
  readonly subscribe?: SubscribeMock;
}): IndexerPublicDataProvider => new IndexerPublicDataProvider(stubApolloHandle(stubs), 1000);

/** One `CONTRACT_STATE_SUB` frame: a single contract action, dated and identified by its own transaction. */
const actionFrame = (
  state: string,
  protocolVersion: number,
  height = 10,
  identifiers: readonly string[] = [TX_ID]
): unknown => ({
  data: {
    contractActions: { state, transaction: { protocolVersion, identifiers, block: { height, hash: `0x${height}` } } }
  }
});

const collect = (
  source: Rx.Observable<PositionedRecord<RawContractState>>
): Promise<PositionedRecord<RawContractState>[]> => Rx.lastValueFrom(source.pipe(Rx.toArray()));

const rejectionOf = async (work: Promise<unknown>): Promise<unknown> =>
  work.then(
    () => undefined,
    (error: unknown) => error
  );

const envelopesOf = (records: readonly PositionedRecord<RawContractState>[]): string[] =>
  records.map((record) => contractStateEnvelopeVersion(record.value.raw));

const positionsOf = (records: readonly PositionedRecord<unknown>[]) =>
  records.map(({ blockHeight, blockHash }) => ({ blockHeight, blockHash }));

describe('rawContractStateObservable — latest', () => {
  const latestPoll = new Map<DocumentNode, unknown>([
    [LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY, { contractAction: { transaction: { block: { height: 10 } } } }]
  ]);

  test('carries a pre-fork state through undecoded', async () => {
    const hexState = await mintV8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(latestPoll),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(hexState, V8_ERA_PROTOCOL_VERSION, 10)
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'latest' }));

    // The WHOLE record, not field by field: this is the one assertion that
    // fails if the record grows a field, and the one that pins
    // `ledgerParameters` as absent -- a promise three docs make and the
    // subscription's field list is the only thing keeping.
    expect(seen).toEqual([
      {
        value: {
          version: 'v8',
          protocolVersion: V8_ERA_PROTOCOL_VERSION,
          raw: new Uint8Array(fromHex(hexState)),
          ledgerParameters: undefined
        },
        blockHeight: 10,
        blockHash: '0x10'
      }
    ]);
    expect(envelopesOf(seen)).toEqual(['v8']);
  });

  test('the same payload terminates the decoded stream instead', async () => {
    // The gap this whole member exists to close: on the decoded stream a
    // pre-fork state is not a skipped emission, it is the end of the
    // subscription. The two assertions live in one test on purpose — the raw
    // stream's value is only visible against what the decoded one does with
    // the identical bytes.
    const hexState = await mintV8ContractStateHex();
    const frames = [actionFrame(hexState, V8_ERA_PROTOCOL_VERSION, 10)];
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(latestPoll),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, frames)
    });

    const rejection = await rejectionOf(
      Rx.lastValueFrom(provider.contractStateObservable(ADDRESS, { type: 'latest' }).pipe(Rx.toArray()))
    );

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({ kind: 'unsupported-decode-era', version: 'v8' });
  });

  test('carries one contract across the fork boundary in a single stream', async () => {
    const v8State = await mintV8ContractStateHex();
    const v9State = mintV9ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(latestPoll),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(v8State, V8_ERA_PROTOCOL_VERSION, 10),
        actionFrame(v9State, V9_ERA_PROTOCOL_VERSION, 11)
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'latest' }));

    expect(seen.map((record) => record.value.version)).toEqual(['v8', 'v9']);
    expect(envelopesOf(seen)).toEqual(['v8', 'v9']);
  });

  test('refuses a payload that is not a contract state at all', async () => {
    // Fail-fast is what the raw stream keeps: it withholds the DECODE, not the
    // envelope check. A transaction served where a state belongs is indexer
    // corruption, and passing those bytes on as a "contract state" would move
    // the failure to a caller who has no way to attribute it.
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(latestPoll),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(mintV9TransactionHex(), V9_ERA_PROTOCOL_VERSION, 10)
      ])
    });

    const rejection = await rejectionOf(collect(provider.rawContractStateObservable(ADDRESS, { type: 'latest' })));

    expect(rejection).toBeInstanceOf(TagParseError);
  });

  test('reports an unplaceable protocol version as an indexer error, not a bare protocol one', async () => {
    // `version` is not optional on the record, so a `protocolVersion` this
    // client cannot place on the era timeline ends the stream -- the one
    // asymmetry with `contractStateObservable`, which withholds only its
    // upper-bound check and decodes on the envelope alone. What must NOT
    // happen is that the failure escapes this package's error contract: a
    // consumer catches every failure from this provider with one
    // `instanceof IndexerError`.
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(latestPoll),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(mintV9ContractStateHex(), UNRESOLVABLE_PROTOCOL_VERSION, 10)
      ])
    });

    const rejection = await rejectionOf(collect(provider.rawContractStateObservable(ADDRESS, { type: 'latest' })));

    expect(rejection).toBeInstanceOf(IndexerError);
    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({
      kind: 'unresolvable-era',
      protocolVersion: UNRESOLVABLE_PROTOCOL_VERSION
    });
    // The protocol-level failure is preserved rather than discarded.
    expect((rejection as Error).cause).toBeInstanceOf(Error);
  });

  test('the decoded stream keeps going on that same unplaceable version', async () => {
    // The contrast that makes the asymmetry a documented fact rather than an
    // accident: the decoded path treats "cannot place this integer" as a
    // withheld check, not a failure, and decodes on the envelope.
    const hexState = mintV9ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(latestPoll),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(hexState, UNRESOLVABLE_PROTOCOL_VERSION, 10)
      ])
    });

    const seen = await Rx.lastValueFrom(
      provider.contractStateObservable(ADDRESS, { type: 'latest' }).pipe(Rx.toArray())
    );

    expect(seen).toHaveLength(1);
  });

  test('reports the version the action was served under, not that of the envelope the bytes carry', async () => {
    // The documented divergence. A contract dormant across the fork keeps its
    // v8 envelope under a v9 transaction indefinitely, so `version` and the envelope
    // disagree for exactly the records this member was added to serve. A
    // caller that needs the writing era reads it off `raw`.
    const hexState = await mintV8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(latestPoll),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(hexState, V9_ERA_PROTOCOL_VERSION, 10)
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'latest' }));

    expect(seen[0]!.value.version).toBe('v9');
    expect(contractStateEnvelopeVersion(seen[0]!.value.raw)).toBe('v8');
  });
});

describe('rawContractStateObservable — address validation', () => {
  test('refuses an invalid address synchronously, issuing nothing', () => {
    const watchQuery = dispatchingWatchQuery(new Map());
    const subscribe = dispatchingSubscribe(CONTRACT_STATE_SUB, []);
    const provider = buildProvider({ watchQuery, subscribe });

    // Matched on what the hex validator says, not merely on `TypeError`: a
    // missing member throws `TypeError` too, so a bare `.toThrow()` here would
    // pass against a provider that has no such method at all.
    expect(() => provider.rawContractStateObservable(INVALID_ADDRESS, { type: 'latest' })).toThrow(
      /hex-digit/
    );
    expect(watchQuery).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
  });
});

describe('rawContractStateObservable — every configuration branch', () => {
  test('blockHeight: streams the blocks from the requested height', async () => {
    const hexState = await mintV8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map([[BLOCK_QUERY, { block: { height: 10, hash: '0x10' } }]])),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(hexState, V8_ERA_PROTOCOL_VERSION, 10)
      ])
    });

    const seen = await collect(
      provider.rawContractStateObservable(ADDRESS, { type: 'blockHeight', blockHeight: 10 })
    );

    expect(envelopesOf(seen)).toEqual(['v8']);
  });

  test('blockHash: streams the blocks from the requested hash', async () => {
    const hexState = await mintV8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map([[BLOCK_QUERY, { block: { height: 10, hash: '0x10' } }]])),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(hexState, V8_ERA_PROTOCOL_VERSION, 10)
      ])
    });

    const seen = await collect(
      provider.rawContractStateObservable(ADDRESS, { type: 'blockHash', blockHash: '0x10' })
    );

    expect(envelopesOf(seen)).toEqual(['v8']);
  });

  test('all: replays a pre-fork deploy state that the decoded stream can never get past', async () => {
    // The branch the README singles out as unrecoverable on the decoded
    // stream: it replays from the deploy, so a contract deployed before the
    // fork always hits its own pre-fork state, and no later write can change
    // what an earlier block already contains.
    const v8State = await mintV8ContractStateHex();
    const v9State = mintV9ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(
        new Map([
          [CONTRACT_STATE_QUERY, { block: { protocolVersion: V9_ERA_PROTOCOL_VERSION }, contract: { state: v9State } }]
        ])
      ),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(v8State, V8_ERA_PROTOCOL_VERSION),
        actionFrame(v9State, V9_ERA_PROTOCOL_VERSION)
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'all' }));

    expect(envelopesOf(seen)).toEqual(['v8', 'v9']);
    expect(seen.map((record) => record.value.version)).toEqual(['v8', 'v9']);
  });

  test('txId: streams the states from the named transaction onward', async () => {
    const hexState = await mintV8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map([[TX_ID_QUERY, { transactions: [{ block: { height: 10 } }] }]])),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(hexState, V8_ERA_PROTOCOL_VERSION, 10)
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'txId', txId: TX_ID }));

    expect(seen.map((record) => toHex(record.value.raw))).toEqual([hexState]);
    expect(envelopesOf(seen)).toEqual(['v8']);
  });

  test('txId: withholds the states of transactions that precede the named one', async () => {
    // The feed starts at the named transaction's block, so an earlier
    // transaction in that block is served too. The two payloads differ by era
    // so the emitted bytes say which transaction they came from.
    const earlier = await mintV8ContractStateHex();
    const named = mintV9ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map([[TX_ID_QUERY, { transactions: [{ block: { height: 10 } }] }]])),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(earlier, V9_ERA_PROTOCOL_VERSION, 10, ['a-different-tx-id']),
        actionFrame(named, V9_ERA_PROTOCOL_VERSION, 10, [TX_ID])
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'txId', txId: TX_ID }));

    expect(seen.map((record) => toHex(record.value.raw))).toEqual([named]);
  });

  test('txId: inclusive false drops the state of the named transaction itself', async () => {
    const first = mintV9ContractStateHex();
    const second = await mintV8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map([[TX_ID_QUERY, { transactions: [{ block: { height: 10 } }] }]])),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(first, V9_ERA_PROTOCOL_VERSION, 10, [TX_ID]),
        actionFrame(second, V8_ERA_PROTOCOL_VERSION, 10, ['a-later-tx-id'])
      ])
    });

    const seen = await collect(
      provider.rawContractStateObservable(ADDRESS, { type: 'txId', txId: TX_ID, inclusive: false })
    );

    expect(seen.map((record) => toHex(record.value.raw))).toEqual([second]);
  });

  test('blockHeight: inclusive false drops the requested block, not merely the first state', async () => {
    // This branch skips a BLOCK, while `txId` above skips a TRANSACTION. The
    // two readings diverge exactly when the first block carries more than one
    // action, which is what this fixture builds.
    const dropped = mintV9ContractStateHex();
    const kept = await mintV8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map([[BLOCK_QUERY, { block: { height: 10, hash: '0x10' } }]])),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(dropped, V9_ERA_PROTOCOL_VERSION, 10),
        actionFrame(dropped, V9_ERA_PROTOCOL_VERSION, 10),
        actionFrame(kept, V8_ERA_PROTOCOL_VERSION, 11)
      ])
    });

    const seen = await collect(
      provider.rawContractStateObservable(ADDRESS, { type: 'blockHeight', blockHeight: 10, inclusive: false })
    );

    expect(seen.map((record) => toHex(record.value.raw))).toEqual([kept]);
  });
});

describe('rawContractStateObservable — every record carries the block that served it', () => {
  test.each([
    [
      'latest',
      { type: 'latest' },
      LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY,
      { contractAction: { transaction: { block: { height: 10 } } } }
    ],
    ['blockHeight', { type: 'blockHeight', blockHeight: 10 }, BLOCK_QUERY, { block: { height: 10, hash: '0x10' } }],
    ['blockHash', { type: 'blockHash', blockHash: '0x10' }, BLOCK_QUERY, { block: { height: 10, hash: '0x10' } }]
  ] as const)('%s: two states in one block both carry that block', async (_name, config, pollDocument, pollAnswer) => {
    const v8 = await mintV8ContractStateHex();
    const v9 = mintV9ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map<DocumentNode, unknown>([[pollDocument, pollAnswer]])),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(v8, V9_ERA_PROTOCOL_VERSION, 10),
        actionFrame(v9, V9_ERA_PROTOCOL_VERSION, 10)
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, config));

    expect(positionsOf(seen)).toEqual([
      { blockHeight: 10, blockHash: '0x10' },
      { blockHeight: 10, blockHash: '0x10' }
    ]);
    expect(envelopesOf(seen)).toEqual(['v8', 'v9']);
  });

  test('all: each state carries the block of its own transaction', async () => {
    const v8 = await mintV8ContractStateHex();
    const v9 = mintV9ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(
        new Map([
          [CONTRACT_STATE_QUERY, { block: { protocolVersion: V9_ERA_PROTOCOL_VERSION }, contract: { state: v9 } }]
        ])
      ),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(v8, V8_ERA_PROTOCOL_VERSION, 10),
        actionFrame(v9, V9_ERA_PROTOCOL_VERSION, 11)
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'all' }));

    expect(positionsOf(seen)).toEqual([
      { blockHeight: 10, blockHash: '0x10' },
      { blockHeight: 11, blockHash: '0x11' }
    ]);
    expect(envelopesOf(seen)).toEqual(['v8', 'v9']);
  });

  test('txId: the named transaction’s state carries its block', async () => {
    const hexState = await mintV8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map([[TX_ID_QUERY, { transactions: [{ block: { height: 10 } }] }]])),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(hexState, V8_ERA_PROTOCOL_VERSION, 10)
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'txId', txId: TX_ID }));

    expect(positionsOf(seen)).toEqual([{ blockHeight: 10, blockHash: '0x10' }]);
  });
});

describe('rawContractStateObservable — resume from an emitted position', () => {
  const STUBBED_FAILURE = new Error('stubbed transport failure');

  const collectUntilError = async (
    source: Rx.Observable<PositionedRecord<RawContractState>>
  ): Promise<PositionedRecord<RawContractState>[]> => {
    const seen: PositionedRecord<RawContractState>[] = [];
    const failure = await rejectionOf(Rx.lastValueFrom(source.pipe(Rx.tap((record) => seen.push(record)))));
    expect(failure).toBe(STUBBED_FAILURE);
    return seen;
  };

  const trace = (records: readonly PositionedRecord<RawContractState>[]) =>
    records.map((record) => `${record.blockHeight}:${contractStateEnvelopeVersion(record.value.raw)}`);

  const arrange = async () => {
    const v8 = await mintV8ContractStateHex();
    const v9 = mintV9ContractStateHex();
    const subscribe = resumableSubscribe(
      [
        { height: 10, frame: actionFrame(v8, V9_ERA_PROTOCOL_VERSION, 10) },
        { height: 10, frame: actionFrame(v9, V9_ERA_PROTOCOL_VERSION, 10) },
        { height: 11, frame: actionFrame(v8, V9_ERA_PROTOCOL_VERSION, 11) }
      ],
      2,
      STUBBED_FAILURE
    );
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(
        new Map<DocumentNode, unknown>([
          [LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY, { contractAction: { transaction: { block: { height: 10 } } } }],
          [BLOCK_QUERY, { block: { height: 10, hash: '0x10' } }]
        ])
      ),
      subscribe
    });
    const first = await collectUntilError(provider.rawContractStateObservable(ADDRESS, { type: 'latest' }));
    const last = first.at(-1);
    if (last === undefined) {
      throw new Error('test setup: the first run emitted nothing');
    }
    return { provider, subscribe, first, last };
  };

  test('resuming from the last emitted height leaves no gap and repeats only that block', async () => {
    const { provider, subscribe, first, last } = await arrange();

    const resumed = await collect(
      provider.rawContractStateObservable(ADDRESS, { type: 'blockHeight', blockHeight: last.blockHeight })
    );

    expect(trace([...first, ...resumed])).toEqual(['10:v8', '10:v9', '10:v8', '10:v9', '11:v8']);
    expect(subscribedOffsets(subscribe)).toEqual([{ height: 10 }, { height: 10 }]);
  });

  test('a record’s blockHash resumes the stream as a blockHash config', async () => {
    const { provider, subscribe, last } = await arrange();

    const resumed = await collect(
      provider.rawContractStateObservable(ADDRESS, { type: 'blockHash', blockHash: last.blockHash })
    );

    expect(subscribedOffsets(subscribe)).toEqual([{ height: 10 }, { hash: '0x10' }]);
    expect(trace(resumed)).toEqual(['10:v8', '10:v9', '11:v8']);
  });
});

describe('rawContractStateObservable — the bytes are the indexer’s, unchanged', () => {
  test('hands back exactly the bytes served, envelope included', async () => {
    const hexState = await mintV8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(
        new Map([
          [LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY, { contractAction: { transaction: { block: { height: 10 } } } }]
        ])
      ),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(hexState, V8_ERA_PROTOCOL_VERSION, 10)
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'latest' }));

    expect(Array.from(seen[0]!.value.raw)).toEqual(Array.from(new Uint8Array(fromHex(hexState))));
  });
});
