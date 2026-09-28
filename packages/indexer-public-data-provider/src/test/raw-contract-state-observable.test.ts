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
import type { RawContractState } from '@midnight-ntwrk/midnight-js-types';
import { contractStateEnvelopeVersion, fromHex, TagParseError, toHex } from '@midnight-ntwrk/midnight-js-utils';
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
  TX_ID_QUERY,
  TXS_FROM_BLOCK_SUB
} from '../query-definitions';
import { type ApolloRequest, stubApolloHandle } from './apollo-stub';
import {
  mintV8ContractStateHex,
  mintV9ContractStateHex,
  mintV9TransactionHex,
  V8_ERA_PROTOCOL_VERSION,
  V9_ERA_PROTOCOL_VERSION
} from './state-fixtures';

const ADDRESS = '12'.repeat(32) as ContractAddress;
const OTHER_ADDRESS = 'ab'.repeat(32) as ContractAddress;
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

const action = (address: ContractAddress, state: string) => ({ state, address });

/** One `TXS_FROM_BLOCK_SUB` frame: a block, its era, and one transaction per action group. */
const blockFrame = (
  height: number,
  protocolVersion: number,
  transactions: readonly (readonly { state: string; address: string }[])[]
): unknown => ({
  data: {
    blocks: {
      hash: `0x${height}`,
      height,
      protocolVersion,
      transactions: transactions.map((contractActions, index) => ({
        hash: `0xtx${height}-${index}`,
        identifiers: [TX_ID],
        contractActions
      }))
    }
  }
});

/** One `CONTRACT_STATE_SUB` frame: a single contract action, dated by its own transaction. */
const contractActionFrame = (state: string, protocolVersion: number): unknown => ({
  data: { contractActions: { state, transaction: { protocolVersion } } }
});

const collect = (source: Rx.Observable<RawContractState>): Promise<RawContractState[]> =>
  Rx.lastValueFrom(source.pipe(Rx.toArray()));

const rejectionOf = async (work: Promise<unknown>): Promise<unknown> =>
  work.then(
    () => undefined,
    (error: unknown) => error
  );

const envelopesOf = (records: readonly RawContractState[]): string[] =>
  records.map((record) => contractStateEnvelopeVersion(record.raw));

describe('rawContractStateObservable — latest', () => {
  const latestPoll = new Map<DocumentNode, unknown>([
    [LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY, { contractAction: { transaction: { block: { height: 10 } } } }]
  ]);

  test('carries a pre-fork state through undecoded', async () => {
    const hexState = await mintV8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(latestPoll),
      subscribe: dispatchingSubscribe(TXS_FROM_BLOCK_SUB, [
        blockFrame(10, V8_ERA_PROTOCOL_VERSION, [[action(ADDRESS, hexState)]])
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'latest' }));

    // The WHOLE record, not field by field: this is the one assertion that
    // fails if the record grows a field, and the one that pins
    // `ledgerParameters` as absent -- a promise three docs make and the block
    // subscription's field list is the only thing keeping.
    expect(seen).toEqual([
      {
        version: 'v8',
        protocolVersion: V8_ERA_PROTOCOL_VERSION,
        raw: new Uint8Array(fromHex(hexState)),
        ledgerParameters: undefined
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
    const frames = [blockFrame(10, V8_ERA_PROTOCOL_VERSION, [[action(ADDRESS, hexState)]])];
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(latestPoll),
      subscribe: dispatchingSubscribe(TXS_FROM_BLOCK_SUB, frames)
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
      subscribe: dispatchingSubscribe(TXS_FROM_BLOCK_SUB, [
        blockFrame(10, V8_ERA_PROTOCOL_VERSION, [[action(ADDRESS, v8State)]]),
        blockFrame(11, V9_ERA_PROTOCOL_VERSION, [[action(ADDRESS, v9State)]])
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'latest' }));

    expect(seen.map((record) => record.version)).toEqual(['v8', 'v9']);
    expect(envelopesOf(seen)).toEqual(['v8', 'v9']);
  });

  test('still suppresses the blocks the indexer replays after a reconnect', async () => {
    // Block 11 carries two actions, so the emission count alone tells a
    // correctly deduplicated stream (3) from one that dropped block 11 and
    // delivered block 10 twice (2).
    const hexState = mintV9ContractStateHex();
    const ten = blockFrame(10, V9_ERA_PROTOCOL_VERSION, [[action(ADDRESS, hexState)]]);
    const eleven = blockFrame(11, V9_ERA_PROTOCOL_VERSION, [
      [action(ADDRESS, hexState), action(ADDRESS, hexState)]
    ]);
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(latestPoll),
      subscribe: dispatchingSubscribe(TXS_FROM_BLOCK_SUB, [ten, eleven, ten, eleven])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'latest' }));

    expect(seen).toHaveLength(3);
  });

  test('skips the actions of other contracts sharing a block', async () => {
    const mine = mintV9ContractStateHex();
    const theirs = await mintV8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(latestPoll),
      subscribe: dispatchingSubscribe(TXS_FROM_BLOCK_SUB, [
        blockFrame(10, V9_ERA_PROTOCOL_VERSION, [
          [action(OTHER_ADDRESS, theirs), action(ADDRESS, mine)],
          [action(OTHER_ADDRESS, theirs)]
        ])
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'latest' }));

    expect(seen.map((record) => toHex(record.raw))).toEqual([mine]);
  });

  test('refuses a payload that is not a contract state at all', async () => {
    // Fail-fast is what the raw stream keeps: it withholds the DECODE, not the
    // envelope check. A transaction served where a state belongs is indexer
    // corruption, and passing those bytes on as a "contract state" would move
    // the failure to a caller who has no way to attribute it.
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(latestPoll),
      subscribe: dispatchingSubscribe(TXS_FROM_BLOCK_SUB, [
        blockFrame(10, V9_ERA_PROTOCOL_VERSION, [[action(ADDRESS, mintV9TransactionHex())]])
      ])
    });

    const rejection = await rejectionOf(collect(provider.rawContractStateObservable(ADDRESS, { type: 'latest' })));

    expect(rejection).toBeInstanceOf(TagParseError);
  });

  test('reports the version of the BLOCK, not of the envelope the bytes carry', async () => {
    // The documented divergence. A contract dormant across the fork keeps its
    // v8 envelope under a v9 block indefinitely, so `version` and the envelope
    // disagree for exactly the records this member was added to serve. A
    // caller that needs the writing era reads it off `raw`.
    const hexState = await mintV8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(latestPoll),
      subscribe: dispatchingSubscribe(TXS_FROM_BLOCK_SUB, [
        blockFrame(10, V9_ERA_PROTOCOL_VERSION, [[action(ADDRESS, hexState)]])
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'latest' }));

    expect(seen[0]!.version).toBe('v9');
    expect(contractStateEnvelopeVersion(seen[0]!.raw)).toBe('v8');
  });
});

describe('rawContractStateObservable — address validation', () => {
  test('refuses an invalid address synchronously, issuing nothing', () => {
    const watchQuery = dispatchingWatchQuery(new Map());
    const subscribe = dispatchingSubscribe(TXS_FROM_BLOCK_SUB, []);
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
      subscribe: dispatchingSubscribe(TXS_FROM_BLOCK_SUB, [
        blockFrame(10, V8_ERA_PROTOCOL_VERSION, [[action(ADDRESS, hexState)]])
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
      subscribe: dispatchingSubscribe(TXS_FROM_BLOCK_SUB, [
        blockFrame(10, V8_ERA_PROTOCOL_VERSION, [[action(ADDRESS, hexState)]])
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
        contractActionFrame(v8State, V8_ERA_PROTOCOL_VERSION),
        contractActionFrame(v9State, V9_ERA_PROTOCOL_VERSION)
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'all' }));

    expect(envelopesOf(seen)).toEqual(['v8', 'v9']);
    expect(seen.map((record) => record.version)).toEqual(['v8', 'v9']);
  });

  test('txId: streams the states from the named transaction onward', async () => {
    const hexState = await mintV8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map([[TX_ID_QUERY, { transactions: [{ block: { height: 10 } }] }]])),
      subscribe: dispatchingSubscribe(TXS_FROM_BLOCK_SUB, [
        blockFrame(10, V8_ERA_PROTOCOL_VERSION, [[action(ADDRESS, hexState)]])
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'txId', txId: TX_ID }));

    expect(seen.map((record) => toHex(record.raw))).toEqual([hexState]);
    expect(envelopesOf(seen)).toEqual(['v8']);
  });

  test('txId: withholds the states of transactions that precede the named one', async () => {
    // The identifier match is the ONLY filter on this branch -- it does not
    // filter by contract address -- so if the skip stops working the caller
    // silently receives every earlier transaction's states as though they were
    // its own. The two payloads differ by era so the emitted bytes say which
    // transaction they came from.
    const earlier = await mintV8ContractStateHex();
    const named = mintV9ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map([[TX_ID_QUERY, { transactions: [{ block: { height: 10 } }] }]])),
      subscribe: dispatchingSubscribe(TXS_FROM_BLOCK_SUB, [
        {
          data: {
            blocks: {
              hash: '0x10',
              height: 10,
              protocolVersion: V9_ERA_PROTOCOL_VERSION,
              transactions: [
                { hash: '0xtx-earlier', identifiers: ['a-different-tx-id'], contractActions: [action(ADDRESS, earlier)] },
                { hash: '0xtx-named', identifiers: [TX_ID], contractActions: [action(ADDRESS, named)] }
              ]
            }
          }
        }
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'txId', txId: TX_ID }));

    expect(seen.map((record) => toHex(record.raw))).toEqual([named]);
  });

  test('txId: inclusive false drops the state of the named transaction itself', async () => {
    const first = mintV9ContractStateHex();
    const second = await mintV8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map([[TX_ID_QUERY, { transactions: [{ block: { height: 10 } }] }]])),
      subscribe: dispatchingSubscribe(TXS_FROM_BLOCK_SUB, [
        {
          data: {
            blocks: {
              hash: '0x10',
              height: 10,
              protocolVersion: V9_ERA_PROTOCOL_VERSION,
              transactions: [
                {
                  hash: '0xtx10',
                  identifiers: [TX_ID, 'a-later-tx-id'],
                  contractActions: [action(ADDRESS, first), action(ADDRESS, second)]
                }
              ]
            }
          }
        }
      ])
    });

    const seen = await collect(
      provider.rawContractStateObservable(ADDRESS, { type: 'txId', txId: TX_ID, inclusive: false })
    );

    expect(seen.map((record) => toHex(record.raw))).toEqual([second]);
  });

  test('blockHeight: inclusive false drops the requested block, not merely the first state', async () => {
    // This branch skips a BLOCK, while `txId` above skips a STATE. The two
    // readings diverge exactly when the first block carries more than one
    // action, which is what this fixture builds.
    const dropped = mintV9ContractStateHex();
    const kept = await mintV8ContractStateHex();
    const provider = buildProvider({
      watchQuery: dispatchingWatchQuery(new Map([[BLOCK_QUERY, { block: { height: 10, hash: '0x10' } }]])),
      subscribe: dispatchingSubscribe(TXS_FROM_BLOCK_SUB, [
        blockFrame(10, V9_ERA_PROTOCOL_VERSION, [[action(ADDRESS, dropped), action(ADDRESS, dropped)]]),
        blockFrame(11, V8_ERA_PROTOCOL_VERSION, [[action(ADDRESS, kept)]])
      ])
    });

    const seen = await collect(
      provider.rawContractStateObservable(ADDRESS, { type: 'blockHeight', blockHeight: 10, inclusive: false })
    );

    expect(seen.map((record) => toHex(record.raw))).toEqual([kept]);
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
      subscribe: dispatchingSubscribe(TXS_FROM_BLOCK_SUB, [
        blockFrame(10, V8_ERA_PROTOCOL_VERSION, [[action(ADDRESS, hexState)]])
      ])
    });

    const seen = await collect(provider.rawContractStateObservable(ADDRESS, { type: 'latest' }));

    expect(Array.from(seen[0]!.raw)).toEqual(Array.from(new Uint8Array(fromHex(hexState))));
  });
});
