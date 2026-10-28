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
import { fromHex, ledgerVersionOfContractState, requireLedger9, TagParseError, toHex } from '@midnight-ntwrk/midnight-js-utils';
import type { DocumentNode } from 'graphql';
import * as Rx from 'rxjs';
import { describe, expect, test, vi } from 'vitest';

import { IndexerDataError } from '../errors';
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
  LEDGER8_ERA_PROTOCOL_VERSION,
  LEDGER9_ERA_PROTOCOL_VERSION,
  mintLedger8ContractStateHex,
  mintLedger9ContractStateBytes,
  mintLedger9ContractStateHex,
  mintLedger9TransactionHex,
  UNRESOLVABLE_PROTOCOL_VERSION} from './state-fixtures';

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
    contractActions: {
      state,
      stateAt: { height, hash: `0x${height}`, protocolVersion },
      transaction: { identifiers }
    }
  }
});

const ACTION_HEIGHT = 10;
const FORK_HEIGHT = 12;

/**
 * The action of block {@link ACTION_HEIGHT}, re-emitted by the indexer at the fork block
 * {@link FORK_HEIGHT} with its state translated: `stateAt` names the fork block and its era,
 * while the transaction, and so its identifiers, are still the pre-fork action's.
 */
const reEmittedFrame = (translatedState: string): unknown => ({
  data: {
    contractActions: {
      state: translatedState,
      stateAt: { height: FORK_HEIGHT, hash: `0x${FORK_HEIGHT}`, protocolVersion: LEDGER9_ERA_PROTOCOL_VERSION },
      transaction: { identifiers: [TX_ID] }
    }
  }
});

/** The `LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY` answer for a contract whose latest action sits in `height`. */
const latestAt = (height: number, stateAtHeight = height): unknown => ({
  contractAction: { stateAt: { height: stateAtHeight }, transaction: { block: { height } } }
});

const collect = <T>(source: Rx.Observable<PositionedRecord<T>>): Promise<PositionedRecord<T>[]> =>
  Rx.lastValueFrom(source.pipe(Rx.toArray()));

const rejectionOf = async (work: Promise<unknown>): Promise<unknown> =>
  work.then(
    () => undefined,
    (error: unknown) => error
  );

const envelopesOf = (records: readonly PositionedRecord<RawContractState>[]): string[] =>
  records.map((record) => ledgerVersionOfContractState(record.value.raw));

const positionsOf = (records: readonly PositionedRecord<unknown>[]) =>
  records.map(({ blockHeight, blockHash }) => ({ blockHeight, blockHash }));

describe('rawContractStateObservable — latest', () => {
  const latestPoll = new Map<DocumentNode, unknown>([
    [LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY, latestAt(10)]
  ]);

  test('carries a pre-fork state through undecoded', async () => {
    const hexState = await mintLedger8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(latestPoll),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(hexState, LEDGER8_ERA_PROTOCOL_VERSION, 10)
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'latest' }));

    // The WHOLE record, not field by field: this is the one assertion that
    // fails if the record grows a field, and the one that pins
    // `ledgerParameters` as absent, which only the subscription's field list
    // guarantees.
    expect(seen).toEqual([
      {
        value: {
          version: 'v8',
          protocolVersion: LEDGER8_ERA_PROTOCOL_VERSION,
          raw: new Uint8Array(fromHex(hexState)),
          ledgerParameters: undefined
        },
        blockHeight: 10,
        blockHash: '0x10'
      }
    ]);
    expect(envelopesOf(seen)).toEqual(['v8']);
  });

  test('the decoded stream carries the same pre-fork state as v8 and keeps going across the fork', async () => {
    const ledger8State = await mintLedger8ContractStateHex();
    const ledger9State = mintLedger9ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(latestPoll),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(ledger8State, LEDGER8_ERA_PROTOCOL_VERSION, 10),
        actionFrame(ledger9State, LEDGER9_ERA_PROTOCOL_VERSION, 11)
      ])
    });

    const seen = await collect(provider.contractStateObservable(ADDRESS, { type: 'latest' }));

    expect(
      seen.map(({ value, blockHeight }) =>
        value.version === 'v8'
          ? { blockHeight, version: 'v8', hex: Buffer.from(value.stateBytes).toString('hex') }
          : { blockHeight, version: 'v9', hex: Buffer.from(value.state.serialize()).toString('hex') }
      )
    ).toEqual([
      { blockHeight: 10, version: 'v8', hex: ledger8State },
      { blockHeight: 11, version: 'v9', hex: ledger9State }
    ]);
  });

  test('carries one contract across the fork boundary in a single stream', async () => {
    const ledger8State = await mintLedger8ContractStateHex();
    const ledger9State = mintLedger9ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(latestPoll),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(ledger8State, LEDGER8_ERA_PROTOCOL_VERSION, 10),
        actionFrame(ledger9State, LEDGER9_ERA_PROTOCOL_VERSION, 11)
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
        actionFrame(mintLedger9TransactionHex(), LEDGER9_ERA_PROTOCOL_VERSION, 10)
      ])
    });

    const rejection = await rejectionOf(collect(provider.rawContractStateObservable(ADDRESS, { type: 'latest' })));

    expect(rejection).toBeInstanceOf(TagParseError);
  });

  test('tags a record by its envelope when its protocol version cannot be placed, and keeps going', async () => {
    const hexState = mintLedger9ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(latestPoll),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [actionFrame(hexState, UNRESOLVABLE_PROTOCOL_VERSION, 10)])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'latest' }));

    expect(seen.map(({ value }) => value.version)).toEqual(['v9']);
  });

  test('ends the stream on a record whose envelope is newer than the block that dates it', async () => {
    // The stream dates each record by its own `stateAt`, the same resolution that produced the
    // bytes, so a newer envelope is an indexer fault rather than a race.
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(latestPoll),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(mintLedger9ContractStateHex(), LEDGER8_ERA_PROTOCOL_VERSION, 10)
      ])
    });

    const rejection = await rejectionOf(collect(provider.rawContractStateObservable(ADDRESS, { type: 'latest' })));

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({
      kind: 'era-disagreement',
      protocolVersion: LEDGER8_ERA_PROTOCOL_VERSION,
      reportedVersion: 'v8',
      stateVersion: 'v9'
    });
  });

  test('tags a pre-fork record served under a post-fork block with the era that wrote it', async () => {
    const hexState = await mintLedger8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(latestPoll),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [actionFrame(hexState, LEDGER9_ERA_PROTOCOL_VERSION, 10)])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'latest' }));

    expect(seen.map(({ value }) => ({ version: value.version, protocolVersion: value.protocolVersion }))).toEqual([
      { version: 'v8', protocolVersion: LEDGER9_ERA_PROTOCOL_VERSION }
    ]);
  });

  test('the decoded stream keeps going on that same unplaceable version', async () => {
    // The contrast that makes the asymmetry a documented fact rather than an
    // accident: the decoded path treats "cannot place this integer" as a
    // withheld check, not a failure, and decodes on the envelope.
    const hexState = mintLedger9ContractStateHex();
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
    const hexState = await mintLedger8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map([[BLOCK_QUERY, { block: { height: 10, hash: '0x10' } }]])),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(hexState, LEDGER8_ERA_PROTOCOL_VERSION, 10)
      ])
    });

    const seen = await collect(
      provider.rawContractStateObservable(ADDRESS, { type: 'blockHeight', blockHeight: 10 })
    );

    expect(envelopesOf(seen)).toEqual(['v8']);
  });

  test('blockHash: streams the blocks from the requested hash', async () => {
    const hexState = await mintLedger8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map([[BLOCK_QUERY, { block: { height: 10, hash: '0x10' } }]])),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(hexState, LEDGER8_ERA_PROTOCOL_VERSION, 10)
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
    const ledger8State = await mintLedger8ContractStateHex();
    const ledger9State = mintLedger9ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(
        new Map([
          [CONTRACT_STATE_QUERY, { block: { protocolVersion: LEDGER9_ERA_PROTOCOL_VERSION }, contract: { state: ledger9State } }]
        ])
      ),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(ledger8State, LEDGER8_ERA_PROTOCOL_VERSION),
        actionFrame(ledger9State, LEDGER9_ERA_PROTOCOL_VERSION)
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'all' }));

    expect(envelopesOf(seen)).toEqual(['v8', 'v9']);
    expect(seen.map((record) => record.value.version)).toEqual(['v8', 'v9']);
  });

  test('txId: streams the states from the named transaction onward', async () => {
    const hexState = await mintLedger8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map([[TX_ID_QUERY, { transactions: [{ block: { height: 10 }, contractActions: [{ address: ADDRESS }] }] }]])),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(hexState, LEDGER8_ERA_PROTOCOL_VERSION, 10)
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
    const earlier = await mintLedger8ContractStateHex();
    const named = mintLedger9ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map([[TX_ID_QUERY, { transactions: [{ block: { height: 10 }, contractActions: [{ address: ADDRESS }] }] }]])),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(earlier, LEDGER9_ERA_PROTOCOL_VERSION, 10, ['a-different-tx-id']),
        actionFrame(named, LEDGER9_ERA_PROTOCOL_VERSION, 10, [TX_ID])
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'txId', txId: TX_ID }));

    expect(seen.map((record) => toHex(record.value.raw))).toEqual([named]);
  });

  test('txId: inclusive false drops the state of the named transaction itself', async () => {
    const first = mintLedger9ContractStateHex();
    const second = await mintLedger8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map([[TX_ID_QUERY, { transactions: [{ block: { height: 10 }, contractActions: [{ address: ADDRESS }] }] }]])),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(first, LEDGER9_ERA_PROTOCOL_VERSION, 10, [TX_ID]),
        actionFrame(second, LEDGER8_ERA_PROTOCOL_VERSION, 10, ['a-later-tx-id'])
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
    const dropped = mintLedger9ContractStateHex();
    const kept = await mintLedger8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map([[BLOCK_QUERY, { block: { height: 10, hash: '0x10' } }]])),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(dropped, LEDGER9_ERA_PROTOCOL_VERSION, 10),
        actionFrame(dropped, LEDGER9_ERA_PROTOCOL_VERSION, 10),
        actionFrame(kept, LEDGER8_ERA_PROTOCOL_VERSION, 11)
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
      latestAt(10)
    ],
    ['blockHeight', { type: 'blockHeight', blockHeight: 10 }, BLOCK_QUERY, { block: { height: 10, hash: '0x10' } }],
    ['blockHash', { type: 'blockHash', blockHash: '0x10' }, BLOCK_QUERY, { block: { height: 10, hash: '0x10' } }]
  ] as const)('%s: two states in one block both carry that block', async (_name, config, pollDocument, pollAnswer) => {
    const v8 = await mintLedger8ContractStateHex();
    const v9 = mintLedger9ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map<DocumentNode, unknown>([[pollDocument, pollAnswer]])),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(v8, LEDGER9_ERA_PROTOCOL_VERSION, 10),
        actionFrame(v9, LEDGER9_ERA_PROTOCOL_VERSION, 10)
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
    const v8 = await mintLedger8ContractStateHex();
    const v9 = mintLedger9ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(
        new Map([
          [CONTRACT_STATE_QUERY, { block: { protocolVersion: LEDGER9_ERA_PROTOCOL_VERSION }, contract: { state: v9 } }]
        ])
      ),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(v8, LEDGER8_ERA_PROTOCOL_VERSION, 10),
        actionFrame(v9, LEDGER9_ERA_PROTOCOL_VERSION, 11)
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
    const hexState = await mintLedger8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map([[TX_ID_QUERY, { transactions: [{ block: { height: 10 }, contractActions: [{ address: ADDRESS }] }] }]])),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(hexState, LEDGER8_ERA_PROTOCOL_VERSION, 10)
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
    records.map((record) => `${record.blockHeight}:${ledgerVersionOfContractState(record.value.raw)}`);

  const arrange = async () => {
    const v8 = await mintLedger8ContractStateHex();
    const v9 = mintLedger9ContractStateHex();
    const subscribe = resumableSubscribe(
      [
        { height: 10, frame: actionFrame(v8, LEDGER9_ERA_PROTOCOL_VERSION, 10) },
        { height: 10, frame: actionFrame(v9, LEDGER9_ERA_PROTOCOL_VERSION, 10) },
        { height: 11, frame: actionFrame(v8, LEDGER9_ERA_PROTOCOL_VERSION, 11) }
      ],
      2,
      STUBBED_FAILURE
    );
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(
        new Map<DocumentNode, unknown>([
          [LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY, latestAt(10)],
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
    const hexState = await mintLedger8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(
        new Map([
          [LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY, latestAt(10)]
        ])
      ),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(hexState, LEDGER8_ERA_PROTOCOL_VERSION, 10)
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'latest' }));

    expect(Array.from(seen[0]!.value.raw)).toEqual(Array.from(new Uint8Array(fromHex(hexState))));
  });
});

describe('contract-state streams — an action re-emitted at the fork block', () => {
  test('the raw stream tags the re-emitted state with the fork block’s era', async () => {
    const translated = mintLedger9ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map([[BLOCK_QUERY, { block: { height: 11, hash: '0x11' } }]])),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [reEmittedFrame(translated)])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'blockHeight', blockHeight: 11 }));

    expect(seen).toEqual([
      {
        value: {
          version: 'v9',
          protocolVersion: LEDGER9_ERA_PROTOCOL_VERSION,
          raw: new Uint8Array(fromHex(translated)),
          ledgerParameters: undefined
        },
        blockHeight: FORK_HEIGHT,
        blockHash: `0x${FORK_HEIGHT}`
      }
    ]);
  });

  test('the decoded stream decodes the re-emitted state and stays open', async () => {
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map([[BLOCK_QUERY, { block: { height: 11, hash: '0x11' } }]])),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [reEmittedFrame(mintLedger9ContractStateHex())])
    });

    const seen = await Rx.lastValueFrom(
      provider.contractStateObservable(ADDRESS, { type: 'blockHeight', blockHeight: 11 }).pipe(Rx.toArray())
    );

    expect(positionsOf(seen)).toEqual([{ blockHeight: FORK_HEIGHT, blockHash: `0x${FORK_HEIGHT}` }]);
    expect(Array.from(requireLedger9(seen[0]!.value, 'test').state.serialize())).toEqual(
      Array.from(mintLedger9ContractStateBytes())
    );
  });

  test('carries the pre-fork action and its re-emission as two records in two blocks', async () => {
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map([[BLOCK_QUERY, { block: { height: 10, hash: '0x10' } }]])),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(await mintLedger8ContractStateHex(), LEDGER8_ERA_PROTOCOL_VERSION, ACTION_HEIGHT),
        reEmittedFrame(mintLedger9ContractStateHex())
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'blockHeight', blockHeight: 10 }));

    expect(seen.map((record) => record.value.version)).toEqual(['v8', 'v9']);
    expect(envelopesOf(seen)).toEqual(['v8', 'v9']);
    expect(positionsOf(seen)).toEqual([
      { blockHeight: ACTION_HEIGHT, blockHash: `0x${ACTION_HEIGHT}` },
      { blockHeight: FORK_HEIGHT, blockHash: `0x${FORK_HEIGHT}` }
    ]);
  });

  test('an exclusive start at the action’s block drops the action and still delivers the re-emission', async () => {
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(
        new Map([[BLOCK_QUERY, { block: { height: ACTION_HEIGHT, hash: `0x${ACTION_HEIGHT}` } }]])
      ),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(await mintLedger8ContractStateHex(), LEDGER8_ERA_PROTOCOL_VERSION, ACTION_HEIGHT),
        reEmittedFrame(mintLedger9ContractStateHex())
      ])
    });

    const seen = await collect(
      provider.rawContractStateObservable(ADDRESS, { type: 'blockHeight', blockHeight: ACTION_HEIGHT, inclusive: false })
    );

    expect(positionsOf(seen)).toEqual([{ blockHeight: FORK_HEIGHT, blockHash: `0x${FORK_HEIGHT}` }]);
  });

  test('an exclusive txId start at the action delivers the re-emission exactly once', async () => {
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(
        new Map([[TX_ID_QUERY, { transactions: [{ block: { height: ACTION_HEIGHT }, contractActions: [{ address: ADDRESS }] }] }]])
      ),
      subscribe: dispatchingSubscribe(CONTRACT_STATE_SUB, [
        actionFrame(await mintLedger8ContractStateHex(), LEDGER8_ERA_PROTOCOL_VERSION, ACTION_HEIGHT),
        reEmittedFrame(mintLedger9ContractStateHex())
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'txId', txId: TX_ID, inclusive: false }));

    expect(positionsOf(seen)).toEqual([{ blockHeight: FORK_HEIGHT, blockHash: `0x${FORK_HEIGHT}` }]);
  });

  type OpenStream = (provider: IndexerPublicDataProvider) => Rx.Observable<PositionedRecord<unknown>>;

  test.each<[string, OpenStream]>([
    ['contractStateObservable', (p) => p.contractStateObservable(ADDRESS, { type: 'latest' })],
    ['rawContractStateObservable', (p) => p.rawContractStateObservable(ADDRESS, { type: 'latest' })]
  ])('%s latest: starts at the block the state is dated by, not the action’s', async (_name, open) => {
    const subscribe = dispatchingSubscribe(CONTRACT_STATE_SUB, [reEmittedFrame(mintLedger9ContractStateHex())]);
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(
        new Map([[LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY, latestAt(ACTION_HEIGHT, FORK_HEIGHT)]])
      ),
      subscribe
    });

    const seen: PositionedRecord<unknown>[] = await Rx.lastValueFrom(open(provider).pipe(Rx.toArray()));

    expect(subscribedOffsets(subscribe)).toEqual([{ height: FORK_HEIGHT }]);
    expect(positionsOf(seen)).toEqual([{ blockHeight: FORK_HEIGHT, blockHash: `0x${FORK_HEIGHT}` }]);
  });
});
