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

import { InvalidArgumentError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { WatchOptions } from '@midnight-ntwrk/midnight-js-types';
import { type WatchOperation, WatchTimeoutError } from '@midnight-ntwrk/midnight-js-types/errors';
import * as Rx from 'rxjs';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { IndexerPublicDataProvider } from '../provider';
import { type ApolloRequest, stubApolloHandle } from './apollo-stub';
import { mintV9TransactionHex, V9_ERA_PROTOCOL_VERSION } from './state-fixtures';

const ADDRESS = '12'.repeat(32) as ContractAddress;
const TX_ID = 'test-tx-id';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type WatchCall = (provider: IndexerPublicDataProvider, options?: WatchOptions) => Promise<unknown>;

const watchCalls: readonly [WatchOperation, string, WatchCall][] = [
  ['watchForContractState', `contractAddress ${ADDRESS}`, (p, o) => p.watchForContractState(ADDRESS, o)],
  ['watchForUnshieldedBalances', `contractAddress ${ADDRESS}`, (p, o) => p.watchForUnshieldedBalances(ADDRESS, o)],
  ['watchForDeployTxData', `contractAddress ${ADDRESS}`, (p, o) => p.watchForDeployTxData(ADDRESS, o)],
  ['watchForTxData', `txId ${TX_ID}`, (p, o) => p.watchForTxData(TX_ID, o)]
];

type WatchQueryMock = ReturnType<typeof vi.fn<(request: ApolloRequest) => unknown>>;

/** A poll that never finds what it is looking for, recording whether it was torn down. */
const silentPoll = (): { watchQuery: WatchQueryMock; isTornDown: () => boolean } => {
  let tornDown = false;
  const watchQuery = vi
    .fn<(request: ApolloRequest) => unknown>()
    .mockImplementation(() => new Rx.Observable(() => () => (tornDown = true)));
  return { watchQuery, isTornDown: () => tornDown };
};

const buildProvider = (watchQuery: WatchQueryMock): IndexerPublicDataProvider =>
  new IndexerPublicDataProvider(stubApolloHandle({ watchQuery }), 1000);

const finalizedTransactionResponse = (): unknown => ({
  data: {
    transactions: [
      {
        id: 1,
        protocolVersion: V9_ERA_PROTOCOL_VERSION,
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

const settledFlag = (promise: Promise<unknown>): (() => boolean) => {
  let settled = false;
  promise.then(
    () => (settled = true),
    () => (settled = true)
  );
  return () => settled;
};

afterEach(() => {
  vi.useRealTimers();
});

describe('watchFor* with maxWaitMs', () => {
  test.each(watchCalls)('%s rejects with WatchTimeoutError and stops polling when nothing appears in time', async (operation, subject, call) => {
    const { watchQuery, isTornDown } = silentPoll();

    const error = await call(buildProvider(watchQuery), { maxWaitMs: 20 }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(WatchTimeoutError);
    expect(error).toMatchObject({
      code: 'MIDNIGHT_JS_PR_WATCH_TIMED_OUT',
      category: 'UNCERTAIN',
      operation,
      subject,
      maxWaitMs: 20
    });
    expect(isTornDown()).toBe(true);
  });

  test('resolves with the record when it appears before the bound', async () => {
    const watchQuery = vi
      .fn<(request: ApolloRequest) => unknown>()
      .mockReturnValue(Rx.timer(10).pipe(Rx.map(finalizedTransactionResponse)));

    const record = await buildProvider(watchQuery).watchForTxData(TX_ID, { maxWaitMs: 1000 });

    expect(record.version).toBe('v9');
  });
});

describe('watchFor* without maxWaitMs', () => {
  test.each(watchCalls)('%s keeps waiting, however long nothing appears', async (_operation, _subject, call) => {
    vi.useFakeTimers();
    const { watchQuery, isTornDown } = silentPoll();

    const isSettled = settledFlag(call(buildProvider(watchQuery)));
    await vi.advanceTimersByTimeAsync(30 * ONE_DAY_MS);

    expect(isSettled()).toBe(false);
    expect(isTornDown()).toBe(false);
  });
});

describe('an invalid maxWaitMs is refused before any request is issued', () => {
  const invalidValues = [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 31];
  const cases = watchCalls.flatMap(([operation, , call]) =>
    invalidValues.map((maxWaitMs) => [operation, maxWaitMs, call] as const)
  );

  test.each(cases)('%s refuses maxWaitMs %s synchronously', (_operation, maxWaitMs, call) => {
    const { watchQuery } = silentPoll();
    const provider = buildProvider(watchQuery);

    expect(() => call(provider, { maxWaitMs })).toThrow(InvalidArgumentError);
    expect(watchQuery).not.toHaveBeenCalled();
  });

  test.each(watchCalls)('%s accepts the largest bound a timer can hold', (_operation, _subject, call) => {
    vi.useFakeTimers();
    const { watchQuery } = silentPoll();

    const isSettled = settledFlag(call(buildProvider(watchQuery), { maxWaitMs: 2 ** 31 - 1 }));

    expect(isSettled()).toBe(false);
    expect(watchQuery).toHaveBeenCalledOnce();
  });
});
