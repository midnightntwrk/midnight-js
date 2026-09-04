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

import { EraUnsupportedError } from '../errors';
import { IndexerPublicDataProvider } from '../provider';
import { HEAD_PROTOCOL_VERSION_QUERY, RAW_CONTRACT_STATE_QUERY } from '../query-definitions';
import { type ApolloRequest, stubApolloHandle, type WatchQueryStub } from './apollo-stub';
import {
  mintV9ContractStateHex,
  mintV9TransactionHex,
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

describe('head protocol-version freshness', () => {
  test('reads the network on every call, so a later era change cannot be missed', async () => {
    const query = dispatchingQuery(new Map([[HEAD_PROTOCOL_VERSION_QUERY, headResponse(V9_ERA_PROTOCOL_VERSION)]]));
    const provider = buildProvider(query);

    await provider.queryLatestProtocolVersion();
    await provider.queryLatestProtocolVersion();

    expect(headRequestCount(query)).toBe(2);
  });

  test('reports the era the network reports now, not the one it reported before', async () => {
    // The regression this guards: a provider that latched its first reading
    // would keep reporting it after the network moved on, and the construct
    // path would build for an era the network has left. An era only moves
    // forward, so a stale answer cannot be corrected by another reading of
    // its own kind - it has to be recognised as stale first, which is what
    // reading every time avoids having to do.
    const responses = new Map([[HEAD_PROTOCOL_VERSION_QUERY, headResponse(V9_ERA_PROTOCOL_VERSION)]]);
    const query = dispatchingQuery(responses);
    const provider = buildProvider(query);

    const before = await provider.queryLatestProtocolVersion();
    responses.set(HEAD_PROTOCOL_VERSION_QUERY, headResponse(V9_ERA_LATER_PROTOCOL_VERSION));
    const after = await provider.queryLatestProtocolVersion();

    expect(before).toBe(V9_ERA_PROTOCOL_VERSION);
    expect(after).toBe(V9_ERA_LATER_PROTOCOL_VERSION);
  });

  test('a state read answers the era of its own bytes and costs no head request', async () => {
    // The per-read `protocolVersion` is what makes a head read unnecessary on
    // the read path: the era arrives with the bytes it dates.
    const query = dispatchingQuery(
      new Map<DocumentNode, unknown>([
        [RAW_CONTRACT_STATE_QUERY, composedResponse(mintV9ContractStateHex(), V9_ERA_PROTOCOL_VERSION)]
      ])
    );
    const provider = buildProvider(query);

    const record = await provider.queryRawContractState(ADDRESS);

    expect(record?.version).toBe('v9');
    expect(record?.protocolVersion).toBe(V9_ERA_PROTOCOL_VERSION);
    expect(headRequestCount(query)).toBe(0);
  });

  test('a finalized read issues no head request of its own', async () => {
    // A finalization read must cost exactly the requests the caller asked
    // for. Nothing may ride along on it to warm a cache that no longer exists.
    const query = dispatchingQuery(new Map([[HEAD_PROTOCOL_VERSION_QUERY, headResponse(V9_ERA_PROTOCOL_VERSION)]]));
    const watchQuery = vi.fn().mockReturnValue(finalizedTransactionEmission(V9_ERA_PROTOCOL_VERSION));
    const provider = buildProvider(query, watchQuery);

    const finalized = await provider.watchForTxData(TX_ID);

    expect(finalized.version).toBe('v9');
    expect(headRequestCount(query)).toBe(0);
  });

  test('refuses an older-era finalized record, and still asks the head nothing', async () => {
    // The read path deserializes with the v9 runtime only, so an older-era
    // record is named and refused rather than decoded - and a refused read,
    // like a successful one, issues no request the caller did not ask for.
    const query = dispatchingQuery(new Map([[HEAD_PROTOCOL_VERSION_QUERY, headResponse(V8_ERA_PROTOCOL_VERSION)]]));
    const watchQuery = vi.fn().mockReturnValue(finalizedTransactionEmission(V8_ERA_PROTOCOL_VERSION));
    const provider = buildProvider(query, watchQuery);

    await expect(provider.watchForTxData(TX_ID)).rejects.toThrow(EraUnsupportedError);

    expect(headRequestCount(query)).toBe(0);
  });
});
