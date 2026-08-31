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

import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { DocumentNode } from 'graphql';
import * as Rx from 'rxjs';
import { describe, expect, test, vi } from 'vitest';

import { EraUnresolvableError, EraUnsupportedError } from '../errors';
import { IndexerPublicDataProvider } from '../provider';
import { HEAD_PROTOCOL_VERSION_QUERY, RAW_CONTRACT_STATE_QUERY } from '../query-definitions';
import { type ApolloRequest, stubApolloHandle, type WatchQueryStub } from './apollo-stub';
import {
  mintV8ContractStateHex,
  mintV9ContractStateHex,
  mintV9TransactionHex,
  UNRESOLVABLE_PROTOCOL_VERSION,
  V8_ERA_PROTOCOL_VERSION,
  V9_ERA_LATER_PROTOCOL_VERSION,
  V9_ERA_PROTOCOL_VERSION
} from './state-fixtures';

const ADDRESS = '12'.repeat(32) as ContractAddress;
const TX_ID = 'test-tx-id';

type QueryMock = ReturnType<typeof vi.fn<(request: ApolloRequest) => Promise<unknown>>>;

const buildProvider = (query: QueryMock, watchQuery?: WatchQueryStub): IndexerPublicDataProvider =>
  new IndexerPublicDataProvider(stubApolloHandle({ query, watchQuery }), 1000);

const dispatchingQuery = (responses: ReadonlyMap<DocumentNode, unknown>): QueryMock =>
  vi.fn<(request: ApolloRequest) => Promise<unknown>>().mockImplementation(({ query }: ApolloRequest) => {
    if (!responses.has(query)) {
      return Promise.reject(new Error('test setup: no response registered for the requested document'));
    }
    return Promise.resolve(responses.get(query));
  });

const headResponse = (protocolVersion: number): unknown => ({ data: { block: { protocolVersion } } });

/** The composed state read: the dating block and the state in one response. */
const composedResponse = (state: string, protocolVersion: number): unknown => ({
  data: { block: { protocolVersion }, contract: { state } }
});

/** How many of the recorded requests asked the indexer for the head version. */
const headRequestCount = (query: QueryMock): number =>
  query.mock.calls.filter(([request]) => request.query === HEAD_PROTOCOL_VERSION_QUERY).length;

/** A finalized-transaction payload shaped the way `TX_ID_QUERY` returns it. */
const finalizedTransactionEmission = (protocolVersion: number): unknown =>
  Rx.of({
    data: {
      transactions: [
        {
          id: 1,
          protocolVersion,
          raw: mintV9TransactionHex(),
          hash: 'ab'.repeat(32),
          identifiers: [TX_ID],
          block: { height: 10, hash: 'cd'.repeat(32), author: null, timestamp: 0 },
          unshieldedCreatedOutputs: [],
          unshieldedSpentOutputs: [],
          fees: { paidFees: '1', estimatedFees: '1' },
          transactionResult: { status: 'SUCCESS', segments: null }
        }
      ]
    },
    dataState: 'complete',
    loading: false,
    networkStatus: 7,
    partial: false
  });

describe('head protocol-version cache', () => {
  test('does not cache on a bare head reading, even one that already reports the newer era', async () => {
    const query = dispatchingQuery(new Map([[HEAD_PROTOCOL_VERSION_QUERY, headResponse(V9_ERA_PROTOCOL_VERSION)]]));
    const provider = buildProvider(query);

    await provider.queryLatestProtocolVersion();
    await provider.queryLatestProtocolVersion();

    // A head integer on its own is not evidence the network has forked: the
    // indexer can report a newer head while still serving older-era state.
    expect(headRequestCount(query)).toBe(2);
  });

  test('caches once a state read reports both a newer-era head and a newer-era state envelope', async () => {
    const query = dispatchingQuery(
      new Map<DocumentNode, unknown>([
        [RAW_CONTRACT_STATE_QUERY, composedResponse(mintV9ContractStateHex(), V9_ERA_PROTOCOL_VERSION)],
        [HEAD_PROTOCOL_VERSION_QUERY, headResponse(V9_ERA_PROTOCOL_VERSION)]
      ])
    );
    const provider = buildProvider(query);

    await provider.queryRawContractState(ADDRESS);
    const before = headRequestCount(query);
    const cached = await provider.queryLatestProtocolVersion();
    await provider.queryLatestProtocolVersion();

    expect(cached).toBe(V9_ERA_PROTOCOL_VERSION);
    expect(headRequestCount(query)).toBe(before);
  });

  test('does not cache when the head reports the newer era but the state envelope is still the older one', async () => {
    const query = dispatchingQuery(
      new Map<DocumentNode, unknown>([
        [RAW_CONTRACT_STATE_QUERY, composedResponse(await mintV8ContractStateHex(), V9_ERA_PROTOCOL_VERSION)],
        [HEAD_PROTOCOL_VERSION_QUERY, headResponse(V9_ERA_PROTOCOL_VERSION)]
      ])
    );
    const provider = buildProvider(query);

    await provider.queryRawContractState(ADDRESS);
    const before = headRequestCount(query);
    await provider.queryLatestProtocolVersion();

    expect(headRequestCount(query)).toBe(before + 1);
  });

  test('caches the fetched head, not the record version, after decoding a newer-era finalized record', async () => {
    // The record and the head deliberately carry different v9-era integers: a
    // record only proves which era the network is on, it is not itself a head
    // reading, so the cached answer has to be the one that came back from the
    // head field.
    const query = dispatchingQuery(
      new Map([[HEAD_PROTOCOL_VERSION_QUERY, headResponse(V9_ERA_LATER_PROTOCOL_VERSION)]])
    );
    const watchQuery = vi.fn().mockReturnValue(finalizedTransactionEmission(V9_ERA_PROTOCOL_VERSION));
    const provider = buildProvider(query, watchQuery);

    await provider.watchForTxData(TX_ID);
    const afterCorroboration = headRequestCount(query);
    const cached = await provider.queryLatestProtocolVersion();

    expect(cached).toBe(V9_ERA_LATER_PROTOCOL_VERSION);
    // Exactly one request, to fetch the value being cached — and none after.
    expect(afterCorroboration).toBe(1);
    expect(headRequestCount(query)).toBe(1);
  });

  test('does not cache when the head still reports the older era, however new the finalized record is', async () => {
    // A replica lagging behind the record it just served. Caching its answer
    // would pin a version the network has already moved past.
    const query = dispatchingQuery(new Map([[HEAD_PROTOCOL_VERSION_QUERY, headResponse(V8_ERA_PROTOCOL_VERSION)]]));
    const watchQuery = vi.fn().mockReturnValue(finalizedTransactionEmission(V9_ERA_PROTOCOL_VERSION));
    const provider = buildProvider(query, watchQuery);

    await provider.watchForTxData(TX_ID);
    const afterCorroboration = headRequestCount(query);
    await provider.queryLatestProtocolVersion();

    expect(afterCorroboration).toBe(1);
    expect(headRequestCount(query)).toBe(2);
  });

  test('does not even look at the head when the finalized record is rejected as older-era', async () => {
    // The read path deserializes with the v9 runtime only, so an older-era
    // record is refused rather than decoded. Corroboration rides along behind
    // that read: a refused read must leave the cache exactly as cold as it
    // found it, so the next head reading still goes to the network.
    const query = dispatchingQuery(new Map([[HEAD_PROTOCOL_VERSION_QUERY, headResponse(V8_ERA_PROTOCOL_VERSION)]]));
    const watchQuery = vi.fn().mockReturnValue(finalizedTransactionEmission(V8_ERA_PROTOCOL_VERSION));
    const provider = buildProvider(query, watchQuery);

    await expect(provider.watchForTxData(TX_ID)).rejects.toThrow(EraUnsupportedError);
    const afterCorroboration = headRequestCount(query);
    await provider.queryLatestProtocolVersion();

    expect(afterCorroboration).toBe(0);
    expect(headRequestCount(query)).toBe(1);
  });

  test('delivers the finalized record, and leaves the cache cold, when the corroborating head read fails', async () => {
    // Corroboration rides along on a read the caller asked for. If the extra
    // head request fails, that means "cannot corroborate right now" — it must
    // not take the finalization read down with it, and it must not leave a
    // half-warmed cache behind.
    const query = vi
      .fn<(request: ApolloRequest) => Promise<unknown>>()
      .mockRejectedValueOnce(new Error('connection reset by peer'))
      .mockResolvedValue(headResponse(V9_ERA_PROTOCOL_VERSION));
    const watchQuery = vi.fn().mockReturnValue(finalizedTransactionEmission(V9_ERA_PROTOCOL_VERSION));
    const provider = buildProvider(query, watchQuery);

    const finalized = await provider.watchForTxData(TX_ID);
    const afterCorroboration = headRequestCount(query);
    const later = await provider.queryLatestProtocolVersion();

    expect(finalized.txId).toBe(TX_ID);
    expect(afterCorroboration).toBe(1);
    // The second request is the proof the cache stayed cold: a warm one would
    // have answered without going to the network at all.
    expect(later).toBe(V9_ERA_PROTOCOL_VERSION);
    expect(headRequestCount(query)).toBe(2);
  });

  test('leaves the cache cold when the finalized record carries a protocol version it cannot resolve', async () => {
    // An integer this client does not recognize means "cannot tell which era",
    // so the record is refused rather than labelled. The head answer here is a
    // resolvable one: were corroboration to run anyway, it would engage the
    // cache off a record that proved nothing, and the second reading below
    // would never reach the network.
    const query = dispatchingQuery(new Map([[HEAD_PROTOCOL_VERSION_QUERY, headResponse(V9_ERA_PROTOCOL_VERSION)]]));
    const watchQuery = vi.fn().mockReturnValue(finalizedTransactionEmission(UNRESOLVABLE_PROTOCOL_VERSION));
    const provider = buildProvider(query, watchQuery);

    await expect(provider.watchForTxData(TX_ID)).rejects.toThrow(EraUnresolvableError);
    const afterCorroboration = headRequestCount(query);
    await provider.queryLatestProtocolVersion();

    expect(afterCorroboration).toBe(0);
    expect(headRequestCount(query)).toBe(1);
  });

  test('a fresh reading always goes to the network, even once the cache is engaged', async () => {
    const query = dispatchingQuery(
      new Map<DocumentNode, unknown>([
        [RAW_CONTRACT_STATE_QUERY, composedResponse(mintV9ContractStateHex(), V9_ERA_PROTOCOL_VERSION)],
        [HEAD_PROTOCOL_VERSION_QUERY, headResponse(V9_ERA_PROTOCOL_VERSION)]
      ])
    );
    const provider = buildProvider(query);

    await provider.queryRawContractState(ADDRESS);
    const before = headRequestCount(query);
    await provider.queryLatestProtocolVersion({ fresh: true });

    expect(headRequestCount(query)).toBe(before + 1);
  });

  test('never lowers an engaged cache when a later reading reports the older era', async () => {
    const responses = new Map<DocumentNode, unknown>([
      [RAW_CONTRACT_STATE_QUERY, composedResponse(mintV9ContractStateHex(), V9_ERA_PROTOCOL_VERSION)],
      [HEAD_PROTOCOL_VERSION_QUERY, headResponse(V9_ERA_PROTOCOL_VERSION)]
    ]);
    const query = dispatchingQuery(responses);
    const provider = buildProvider(query);

    await provider.queryRawContractState(ADDRESS);
    responses.set(HEAD_PROTOCOL_VERSION_QUERY, headResponse(V8_ERA_PROTOCOL_VERSION));
    const fresh = await provider.queryLatestProtocolVersion({ fresh: true });
    const before = headRequestCount(query);
    const cached = await provider.queryLatestProtocolVersion();

    // The fresh reading is reported as-is; it must not clear or lower what the
    // corroborated evidence already established.
    expect(fresh).toBe(V8_ERA_PROTOCOL_VERSION);
    expect(cached).toBe(V9_ERA_PROTOCOL_VERSION);
    expect(headRequestCount(query)).toBe(before);
  });
});
