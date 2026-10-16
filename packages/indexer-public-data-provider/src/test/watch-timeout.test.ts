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
import { type WatchTarget, WatchTimeoutError } from '@midnight-ntwrk/midnight-js-types/errors';
import * as Rx from 'rxjs';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { IndexerQueryError } from '../errors';
import { IndexerPublicDataProvider } from '../provider';
import { type ApolloRequest, stubApolloHandle } from './apollo-stub';
import {
  LEDGER9_ERA_PROTOCOL_VERSION,
  mintLedger9ContractStateHex,
  mintLedger9TransactionHex,
  regularTransactionRow} from './state-fixtures';

const ADDRESS = '12'.repeat(32) as ContractAddress;
const TX_ID = 'test-tx-id';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TIMER_DELAY_MS = 2 ** 31 - 1;

type WatchCall = (provider: IndexerPublicDataProvider, options?: WatchOptions) => Promise<unknown>;

const reply = (data: unknown): unknown => ({
  data,
  dataState: 'complete',
  loading: false,
  networkStatus: 7,
  partial: false
});

const transaction = regularTransactionRow({
  protocolVersion: LEDGER9_ERA_PROTOCOL_VERSION,
  raw: mintLedger9TransactionHex(),
  identifiers: [TX_ID],
  contractAddresses: [ADDRESS]
});

const contractStateHex = mintLedger9ContractStateHex();

/** Each method, what it waits for, an indexer reply that does not satisfy it yet, and one that does. */
const watchCalls: readonly [WatchTarget['operation'], WatchTarget, WatchCall, unknown, unknown][] = [
  [
    'watchForContractState',
    { operation: 'watchForContractState', contractAddress: ADDRESS },
    (p, o) => p.watchForContractState(ADDRESS, o),
    reply({ block: null, contract: null }),
    reply({ block: { protocolVersion: LEDGER9_ERA_PROTOCOL_VERSION }, contract: { state: contractStateHex } })
  ],
  [
    'watchForUnshieldedBalances',
    { operation: 'watchForUnshieldedBalances', contractAddress: ADDRESS },
    (p, o) => p.watchForUnshieldedBalances(ADDRESS, o),
    reply({ contractAction: null }),
    reply({ contractAction: { unshieldedBalances: [] } })
  ],
  [
    'watchForDeployTxData',
    { operation: 'watchForDeployTxData', contractAddress: ADDRESS },
    (p, o) => p.watchForDeployTxData(ADDRESS, o),
    reply({ contractAction: null }),
    reply({ contractAction: { transaction } })
  ],
  [
    'watchForTxData',
    { operation: 'watchForTxData', txId: TX_ID },
    (p, o) => p.watchForTxData(TX_ID, o),
    reply({ transactions: [] }),
    reply({ transactions: [transaction] })
  ]
];

type WatchQueryMock = ReturnType<typeof vi.fn<(request: ApolloRequest) => unknown>>;

/** A poll that emits `replies`, recording whether it was torn down. */
const pollOf = (replies: Rx.Observable<unknown>): { watchQuery: WatchQueryMock; isTornDown: () => boolean } => {
  let tornDown = false;
  const watchQuery = vi
    .fn<(request: ApolloRequest) => unknown>()
    .mockImplementation(() => replies.pipe(Rx.finalize(() => (tornDown = true))));
  return { watchQuery, isTornDown: () => tornDown };
};

const silentPoll = (): ReturnType<typeof pollOf> => pollOf(Rx.NEVER);

const buildProvider = (watchQuery: WatchQueryMock): IndexerPublicDataProvider =>
  new IndexerPublicDataProvider(stubApolloHandle({ watchQuery }), 1000);

const settledFlag = (promise: Promise<unknown>): (() => boolean) => {
  let settled = false;
  promise.then(
    () => (settled = true),
    () => (settled = true)
  );
  return () => settled;
};

/** Options as they arrive from untyped JavaScript, which the compiler cannot vet. */
const untypedOptions = (json: string): WatchOptions => JSON.parse(json);

afterEach(() => {
  vi.useRealTimers();
});

describe('watchFor* with maxWaitMs', () => {
  test.each(watchCalls)(
    '%s rejects with WatchTimeoutError and stops polling when only empty replies arrive in time',
    async (_operation, target, call, emptyReply) => {
      const { watchQuery, isTornDown } = pollOf(Rx.timer(0, 5).pipe(Rx.map(() => emptyReply)));

      const error = await call(buildProvider(watchQuery), { maxWaitMs: 30 }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(WatchTimeoutError);
      expect(error).toMatchObject({
        code: 'MIDNIGHT_JS_PR_WATCH_TIMED_OUT',
        category: 'UNCERTAIN',
        target,
        maxWaitMs: 30
      });
      expect(isTornDown()).toBe(true);
    }
  );

  test.each(watchCalls)(
    '%s rejects with the indexer error, not a timeout, when the query fails before the bound',
    async (_operation, _target, call) => {
      const { watchQuery, isTornDown } = pollOf(
        Rx.timer(5).pipe(Rx.map(() => ({ data: undefined, dataState: 'empty', error: { message: 'indexer down' } })))
      );

      const error = await call(buildProvider(watchQuery), { maxWaitMs: 1000 }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(IndexerQueryError);
      expect(isTornDown()).toBe(true);
    }
  );

  test('watchForContractState resolves with the state when it appears before the bound', async () => {
    const { watchQuery } = pollOf(Rx.timer(10).pipe(Rx.map(() => watchCalls[0][4])));

    const state = await buildProvider(watchQuery).watchForContractState(ADDRESS, { maxWaitMs: 1000 });

    expect(state.version).toBe('v9');
    expect(state.version === 'v9' && Buffer.from(state.state.serialize()).toString('hex')).toBe(contractStateHex);
  });

  test('watchForUnshieldedBalances resolves with the balances when they appear before the bound', async () => {
    const { watchQuery } = pollOf(Rx.timer(10).pipe(Rx.map(() => watchCalls[1][4])));

    const balances = await buildProvider(watchQuery).watchForUnshieldedBalances(ADDRESS, { maxWaitMs: 1000 });

    expect(balances).toEqual([]);
  });

  test('watchForDeployTxData resolves with the deploy record when it appears before the bound', async () => {
    const { watchQuery } = pollOf(Rx.timer(10).pipe(Rx.map(() => watchCalls[2][4])));

    const record = await buildProvider(watchQuery).watchForDeployTxData(ADDRESS, { maxWaitMs: 1000 });

    expect([record.version, record.txId, record.txHash]).toEqual(['v9', TX_ID, transaction.hash]);
  });

  test('watchForTxData resolves with the record when it appears before the bound', async () => {
    const { watchQuery } = pollOf(Rx.timer(10).pipe(Rx.map(() => watchCalls[3][4])));

    const record = await buildProvider(watchQuery).watchForTxData(TX_ID, { maxWaitMs: 1000 });

    expect([record.version, record.txId, record.txHash]).toEqual(['v9', TX_ID, transaction.hash]);
  });

  test.each(watchCalls)('%s holds the largest bound a timer can hold, then times out', async (_operation, _target, call) => {
    vi.useFakeTimers();
    const { watchQuery } = silentPoll();
    const outcome = call(buildProvider(watchQuery), { maxWaitMs: MAX_TIMER_DELAY_MS }).catch((e: unknown) => e);
    const isSettled = settledFlag(outcome);

    await vi.advanceTimersByTimeAsync(MAX_TIMER_DELAY_MS - 1);
    const settledBeforeBound = isSettled();
    await vi.advanceTimersByTimeAsync(1);

    expect(settledBeforeBound).toBe(false);
    expect(await outcome).toBeInstanceOf(WatchTimeoutError);
  });
});

describe('watchFor* without maxWaitMs', () => {
  const unbounded: readonly [string, WatchOptions | undefined][] = [
    ['no options', undefined],
    ['empty options', {}],
    ['an undefined maxWaitMs', { maxWaitMs: undefined }]
  ];
  const cases = watchCalls.flatMap(([operation, , call]) =>
    unbounded.map(([label, options]) => [operation, label, options, call] as const)
  );

  test.each(cases)('%s with %s keeps waiting, however long nothing appears', async (_operation, _label, options, call) => {
    vi.useFakeTimers();
    const { watchQuery, isTornDown } = silentPoll();

    const isSettled = settledFlag(call(buildProvider(watchQuery), options));
    await vi.advanceTimersByTimeAsync(30 * ONE_DAY_MS);

    expect(isSettled()).toBe(false);
    expect(isTornDown()).toBe(false);
  });
});

describe('invalid options are refused before any request is issued', () => {
  const invalidOptions: readonly [string, WatchOptions][] = [
    ...[0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 31].map(
      (maxWaitMs): [string, WatchOptions] => [`maxWaitMs ${maxWaitMs}`, { maxWaitMs }]
    ),
    ['a string maxWaitMs', untypedOptions('{"maxWaitMs":"5000"}')],
    ['a null maxWaitMs', untypedOptions('{"maxWaitMs":null}')],
    ['a misspelled option', untypedOptions('{"timeoutMs":5000}')],
    ['an unknown option next to maxWaitMs', untypedOptions('{"maxWaitMs":5000,"signal":true}')],
    ['null options', untypedOptions('null')],
    ['non-object options', untypedOptions('5000')]
  ];
  const cases = watchCalls.flatMap(([operation, , call]) =>
    invalidOptions.map(([label, options]) => [operation, label, options, call] as const)
  );

  test.each(cases)('%s refuses %s synchronously', (_operation, _label, options, call) => {
    const { watchQuery } = silentPoll();
    const provider = buildProvider(watchQuery);

    expect(() => call(provider, options)).toThrow(InvalidArgumentError);
    expect(watchQuery).not.toHaveBeenCalled();
  });
});
