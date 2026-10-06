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
import type { PositionedRecord, UnshieldedBalances } from '@midnight-ntwrk/midnight-js-types';
import type { DocumentNode } from 'graphql';
import * as Rx from 'rxjs';
import { describe, expect, test, vi } from 'vitest';

import { toUnshieldedBalances } from '../codec';
import {
  type Block,
  blockOffsetToBlock$,
  blockOffsetToState$,
  blockOffsetToUnshieldedBalances$,
  blockToPositionedState$,
  transactionToState$
} from '../observables';
import { IndexerPublicDataProvider } from '../provider';
import {
  BLOCK_QUERY,
  LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY,
  UNSHIELDED_BALANCE_QUERY,
  UNSHIELDED_BALANCE_SUB
} from '../query-definitions';
import { type ApolloRequest, resumableSubscribe, stubApolloHandle, subscribedOffsets } from './apollo-stub';

const ADDRESS = '12'.repeat(32) as ContractAddress;
const TX_ID = 'test-tx-id' as TransactionId;
const identity = (hexState: string): string => hexState;

const clientServing = (payloads: readonly unknown[]) =>
  stubApolloHandle({
    subscribe: vi.fn<(request: ApolloRequest) => unknown>().mockReturnValue(Rx.from(payloads))
  }).client;

const toArray = <T>(source: Rx.Observable<T>): Promise<T[]> => Rx.lastValueFrom(source.pipe(Rx.toArray()));

describe('stream pipelines carry the block that served each value', () => {
  test('the per-action state feed reads the block off the action’s transaction', async () => {
    const client = clientServing([
      { data: { contractActions: { state: 'aa', transaction: { protocolVersion: 1, block: { height: 7, hash: '0x07' } } } } }
    ]);

    const seen = await toArray(blockOffsetToState$(identity)(client)(ADDRESS)(null));

    expect(seen).toEqual([{ value: 'aa', blockHeight: 7, blockHash: '0x07' }]);
  });

  test('the balance feed reads the block off the action’s transaction', async () => {
    const balances = [{ tokenType: 'ab'.repeat(32), amount: '5' }];
    const client = clientServing([
      { data: { contractActions: { unshieldedBalances: balances, transaction: { block: { height: 8, hash: '0x08' } } } } }
    ]);

    const seen = await toArray(blockOffsetToUnshieldedBalances$(client)(ADDRESS)(null));

    expect(seen).toEqual([{ value: toUnshieldedBalances(balances), blockHeight: 8, blockHash: '0x08' }]);
  });

  test('a transaction flattened out of a block keeps that block', async () => {
    const client = clientServing([
      {
        data: {
          blocks: {
            hash: '0x09',
            height: 9,
            protocolVersion: 1,
            transactions: [{ hash: '0xtx', identifiers: [TX_ID], contractActions: [{ state: 'cc', address: ADDRESS }] }]
          }
        }
      }
    ]);

    const seen = await toArray(
      blockOffsetToBlock$(client)(null).pipe(
        Rx.concatMap(({ transactions }) => Rx.from(transactions)),
        Rx.concatMap(transactionToState$(identity)(TX_ID))
      )
    );

    expect(seen).toEqual([{ value: 'cc', blockHeight: 9, blockHash: '0x09' }]);
  });

  test('two states for one address in one block share the block and keep distinct ordinals', async () => {
    const block: Block = {
      hash: '0x0a',
      height: 10,
      protocolVersion: 1,
      transactions: [
        {
          hash: '0xtx',
          identifiers: [TX_ID],
          protocolVersion: 1,
          blockHeight: 10,
          blockHash: '0x0a',
          contractActions: [
            { state: 'd1', address: ADDRESS },
            { state: 'd2', address: ADDRESS }
          ]
        }
      ]
    };

    const seen = await toArray(blockToPositionedState$(identity)(ADDRESS)(block));

    expect(seen).toEqual([
      { height: 10, hash: '0x0a', ordinal: 0, state: 'd1' },
      { height: 10, hash: '0x0a', ordinal: 1, state: 'd2' }
    ]);
  });
});

describe('unshieldedBalancesObservable — every element carries the block that served it', () => {
  const balances = [{ tokenType: 'ab'.repeat(32), amount: '5' }];

  const balanceFrame = (height: number): unknown => ({
    data: { contractActions: { unshieldedBalances: balances, transaction: { block: { height, hash: `0x${height}` } } } }
  });

  const providerAnswering = (pollDocument: DocumentNode, pollAnswer: unknown): IndexerPublicDataProvider =>
    new IndexerPublicDataProvider(
      stubApolloHandle({
        watchQuery: vi.fn<(request: ApolloRequest) => unknown>().mockImplementation(({ query }: ApolloRequest) =>
          query === pollDocument
            ? Rx.of({ data: pollAnswer, dataState: 'complete', loading: false, networkStatus: 7, partial: false })
            : Rx.throwError(() => new Error('test setup: no poll response registered for the requested document'))
        ),
        subscribe: vi.fn<(request: ApolloRequest) => unknown>().mockImplementation(({ query }: ApolloRequest) =>
          query === UNSHIELDED_BALANCE_SUB
            ? Rx.of(balanceFrame(10))
            : Rx.throwError(() => new Error('test setup: unexpected subscription document'))
        )
      }),
      1000
    );

  test.each([
    [
      'latest',
      { type: 'latest' },
      LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY,
      { contractAction: { transaction: { block: { height: 10 } } } }
    ],
    ['all', { type: 'all' }, UNSHIELDED_BALANCE_QUERY, { contractAction: { unshieldedBalances: balances } }],
    ['blockHeight', { type: 'blockHeight', blockHeight: 10 }, BLOCK_QUERY, { block: { height: 10, hash: '0x10' } }],
    ['blockHash', { type: 'blockHash', blockHash: '0x10' }, BLOCK_QUERY, { block: { height: 10, hash: '0x10' } }]
  ] as const)('%s', async (_name, config, pollDocument, pollAnswer) => {
    const provider = providerAnswering(pollDocument, pollAnswer);

    const seen = await toArray(provider.unshieldedBalancesObservable(ADDRESS, config));

    expect(seen).toEqual([{ value: toUnshieldedBalances(balances), blockHeight: 10, blockHash: '0x10' }]);
  });
});

describe('unshieldedBalancesObservable — resume from an emitted position', () => {
  const STUBBED_FAILURE = new Error('stubbed transport failure');
  const balanceOf = (amount: string) => [{ tokenType: 'ab'.repeat(32), amount }];

  const actionFrame = (height: number, amount: string): unknown => ({
    data: {
      contractActions: { unshieldedBalances: balanceOf(amount), transaction: { block: { height, hash: `0x${height}` } } }
    }
  });

  const arrange = async () => {
    const subscribe = resumableSubscribe(
      [
        { height: 10, frame: actionFrame(10, '1') },
        { height: 10, frame: actionFrame(10, '2') },
        { height: 11, frame: actionFrame(11, '3') }
      ],
      1,
      STUBBED_FAILURE
    );
    const provider = new IndexerPublicDataProvider(
      stubApolloHandle({
        watchQuery: vi.fn<(request: ApolloRequest) => unknown>().mockImplementation(({ query }: ApolloRequest) =>
          Rx.of({
            data:
              query === BLOCK_QUERY
                ? { block: { height: 10, hash: '0x10' } }
                : { contractAction: { transaction: { block: { height: 10 } } } },
            dataState: 'complete',
            loading: false,
            networkStatus: 7,
            partial: false
          })
        ),
        subscribe
      }),
      1000
    );
    const first: PositionedRecord<UnshieldedBalances>[] = [];
    const failure = await Rx.lastValueFrom(
      provider.unshieldedBalancesObservable(ADDRESS, { type: 'latest' }).pipe(Rx.tap((record) => first.push(record)))
    ).then(
      () => undefined,
      (error: unknown) => error
    );
    expect(failure).toBe(STUBBED_FAILURE);
    const last = first.at(-1);
    if (last === undefined) {
      throw new Error('test setup: the first run emitted nothing');
    }
    return { provider, subscribe, first, last };
  };

  const trace = (records: readonly PositionedRecord<UnshieldedBalances>[]) =>
    records.map((record) => `${record.blockHeight}:${record.value.map(({ balance }) => balance.toString()).join()}`);

  test('resuming mid-block from the last emitted height leaves no gap and repeats only that block', async () => {
    const { provider, subscribe, first, last } = await arrange();

    const resumed = await toArray(
      provider.unshieldedBalancesObservable(ADDRESS, { type: 'blockHeight', blockHeight: last.blockHeight })
    );

    expect(trace([...first, ...resumed])).toEqual(['10:1', '10:1', '10:2', '11:3']);
    expect(subscribedOffsets(subscribe)).toEqual([{ height: 10 }, { height: 10 }]);
  });

  test('a record’s blockHash resumes the stream as a blockHash config', async () => {
    const { provider, subscribe, last } = await arrange();

    const resumed = await toArray(
      provider.unshieldedBalancesObservable(ADDRESS, { type: 'blockHash', blockHash: last.blockHash })
    );

    expect(subscribedOffsets(subscribe)).toEqual([{ height: 10 }, { hash: '0x10' }]);
    expect(trace(resumed)).toEqual(['10:1', '10:2', '11:3']);
  });

  test('an exclusive resume from an emitted block skips that whole block', async () => {
    const { provider, last } = await arrange();

    const resumed = await toArray(
      provider.unshieldedBalancesObservable(ADDRESS, { type: 'blockHash', blockHash: last.blockHash, inclusive: false })
    );

    expect(trace(resumed)).toEqual(['11:3']);
  });

  test('an exclusive start at a block with no action for the contract drops nothing after it', async () => {
    const provider = new IndexerPublicDataProvider(
      stubApolloHandle({
        watchQuery: vi.fn<(request: ApolloRequest) => unknown>().mockReturnValue(
          Rx.of({
            data: { block: { height: 9, hash: '0x9' } },
            dataState: 'complete',
            loading: false,
            networkStatus: 7,
            partial: false
          })
        ),
        subscribe: vi
          .fn<(request: ApolloRequest) => unknown>()
          .mockReturnValue(Rx.of(actionFrame(10, '1'), actionFrame(10, '2'), actionFrame(11, '3')))
      }),
      1000
    );

    const records = await toArray(
      provider.unshieldedBalancesObservable(ADDRESS, { type: 'blockHeight', blockHeight: 9, inclusive: false })
    );

    expect(trace(records)).toEqual(['10:1', '10:2', '11:3']);
  });
});
