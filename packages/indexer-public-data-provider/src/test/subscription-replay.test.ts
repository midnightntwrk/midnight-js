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
import type { ContractStateObservableConfig, PositionedRecord } from '@midnight-ntwrk/midnight-js-types';
import type { DocumentNode } from 'graphql';
import * as Rx from 'rxjs';
import { describe, expect, test, vi } from 'vitest';

import { type ChainPosition, dropReplayed, ordinalWithinBlock } from '../observables';
import { IndexerPublicDataProvider } from '../provider';
import {
  BLOCK_QUERY,
  CONTRACT_STATE_QUERY,
  CONTRACT_STATE_SUB,
  LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY,
  TX_ID_QUERY,
  UNSHIELDED_BALANCE_QUERY,
  UNSHIELDED_BALANCE_SUB
} from '../query-definitions';
import { type ApolloRequest, reconnectingSubscription, stubApolloHandle, subscribedOffsets } from './apollo-stub';
import { mintV9ContractStateHex, V9_ERA_PROTOCOL_VERSION } from './state-fixtures';

const ADDRESS = '12'.repeat(32) as ContractAddress;
const STATE = mintV9ContractStateHex();

const positions = (...pairs: [number, number][]): Rx.Observable<ChainPosition> =>
  Rx.from(pairs.map(([blockHeight, ordinal]) => ({ blockHeight, ordinal })));

const collectPositions = async (source: Rx.Observable<ChainPosition>): Promise<[number, number][]> => {
  const seen = await Rx.lastValueFrom(source.pipe(Rx.toArray()));
  return seen.map((p) => [p.blockHeight, p.ordinal]);
};

describe('dropReplayed', () => {
  test('passes through positions that advance', async () => {
    const seen = await collectPositions(positions([10, 0], [11, 0], [12, 0]).pipe(dropReplayed()));

    expect(seen).toEqual([
      [10, 0],
      [11, 0],
      [12, 0]
    ]);
  });

  test('drops a position that has already been delivered', async () => {
    const seen = await collectPositions(positions([10, 0], [11, 0], [10, 0], [11, 0]).pipe(dropReplayed()));

    expect(seen).toEqual([
      [10, 0],
      [11, 0]
    ]);
  });

  test('drops an earlier ordinal within a block already delivered', async () => {
    const seen = await collectPositions(positions([10, 0], [10, 2], [10, 1]).pipe(dropReplayed()));

    expect(seen).toEqual([
      [10, 0],
      [10, 2]
    ]);
  });

  test('resumes after a replay, delivering the states that follow it', async () => {
    const seen = await collectPositions(
      positions([10, 0], [11, 0], [10, 0], [11, 0], [12, 0]).pipe(dropReplayed())
    );

    expect(seen).toEqual([
      [10, 0],
      [11, 0],
      [12, 0]
    ]);
  });

  test('tracks each subscription separately', async () => {
    const guarded = positions([10, 0], [11, 0]).pipe(dropReplayed());

    const first = await collectPositions(guarded);
    const second = await collectPositions(guarded);

    expect(first).toEqual(second);
    expect(second).toEqual([
      [10, 0],
      [11, 0]
    ]);
  });
});

describe('ordinalWithinBlock', () => {
  const numbered = (heights: readonly number[], connectionCount: () => number): Promise<[number, number][]> =>
    collectPositions(
      Rx.from(heights.map((blockHeight) => ({ blockHeight }))).pipe(ordinalWithinBlock(connectionCount))
    );

  test('numbers the records of one block from zero and starts again at the next block', async () => {
    const seen = await numbered([10, 10, 11, 12, 12, 12], () => 1);

    expect(seen).toEqual([
      [10, 0],
      [10, 1],
      [11, 0],
      [12, 0],
      [12, 1],
      [12, 2]
    ]);
  });

  test('numbers a block replayed on a new connection exactly as it was numbered first', async () => {
    let connection = 1;
    const replayAfterSecond = Rx.from([
      { blockHeight: 10, servedOn: 1 },
      { blockHeight: 10, servedOn: 1 },
      { blockHeight: 10, servedOn: 2 },
      { blockHeight: 10, servedOn: 2 }
    ]).pipe(
      Rx.tap(({ servedOn }) => {
        connection = servedOn;
      }),
      ordinalWithinBlock(() => connection)
    );

    const seen = await collectPositions(replayAfterSecond);

    expect(seen).toEqual([
      [10, 0],
      [10, 1],
      [10, 0],
      [10, 1]
    ]);
  });
});

/** One `CONTRACT_STATE_SUB` frame: a single action, dated by its own transaction. */
const stateFrame = (height: number, identifier: string): unknown => ({
  data: {
    contractActions: {
      state: STATE,
      transaction: {
        protocolVersion: V9_ERA_PROTOCOL_VERSION,
        identifiers: [identifier],
        block: { height, hash: `0x${height}` }
      }
    }
  }
});

/** One `UNSHIELDED_BALANCE_SUB` frame. */
const balanceFrame = (height: number): unknown => ({
  data: {
    contractActions: {
      transaction: { block: { height, hash: `0x${height}` } },
      unshieldedBalances: []
    }
  }
});

const queryEmission = (data: unknown): Rx.Observable<unknown> =>
  Rx.of({ data, dataState: 'complete', loading: false, networkStatus: 7, partial: false });

/** Every poll a branch issues before it subscribes, each answered as though the contract sits at block 10. */
const POLLS: ReadonlyMap<DocumentNode, unknown> = new Map<DocumentNode, unknown>([
  [LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY, { contractAction: { transaction: { block: { height: 10 } } } }],
  [CONTRACT_STATE_QUERY, { block: { protocolVersion: V9_ERA_PROTOCOL_VERSION }, contract: { state: STATE } }],
  [UNSHIELDED_BALANCE_QUERY, { contractAction: { unshieldedBalances: [] } }],
  [BLOCK_QUERY, { block: { height: 10, hash: '0x10' } }],
  [TX_ID_QUERY, { transactions: [{ block: { height: 10 } }] }]
]);

const watchQuery = vi
  .fn<(request: ApolloRequest) => unknown>()
  .mockImplementation(({ query }: ApolloRequest) => queryEmission(POLLS.get(query)));

const providerOver = (subscription: ReturnType<typeof reconnectingSubscription>): IndexerPublicDataProvider =>
  new IndexerPublicDataProvider(stubApolloHandle({ watchQuery, ...subscription }), 1000);

const heightsOf = async (source: Rx.Observable<PositionedRecord<unknown>>): Promise<number[]> => {
  const records = await Rx.lastValueFrom(source.pipe(Rx.toArray()));
  return records.map(({ blockHeight }) => blockHeight);
};

const NAMED_TX = 'tx-10' as TransactionId;

const INCLUSIVE_STATE_CONFIGS: readonly [string, ContractStateObservableConfig][] = [
  ['latest', { type: 'latest' }],
  ['all', { type: 'all' }],
  ['blockHeight', { type: 'blockHeight', blockHeight: 10 }],
  ['blockHash', { type: 'blockHash', blockHash: '0x10' }],
  ['txId', { type: 'txId', txId: NAMED_TX }]
];

const EXCLUSIVE_STATE_CONFIGS: readonly [string, ContractStateObservableConfig][] = [
  ['blockHeight', { type: 'blockHeight', blockHeight: 10, inclusive: false }],
  ['blockHash', { type: 'blockHash', blockHash: '0x10', inclusive: false }],
  ['txId', { type: 'txId', txId: NAMED_TX, inclusive: false }]
];

describe('contract-state streams — one subscription for every branch', () => {
  test.each(INCLUSIVE_STATE_CONFIGS)('%s: subscribes to this contract’s action feed', async (_, config) => {
    const subscription = reconnectingSubscription([stateFrame(10, 'tx-10')], []);

    await heightsOf(providerOver(subscription).contractStateObservable(ADDRESS, config));

    expect(subscription.subscribe).toHaveBeenCalledTimes(1);
    expect(subscription.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ query: CONTRACT_STATE_SUB, variables: expect.objectContaining({ address: ADDRESS }) })
    );
  });

  test('all: subscribes from genesis, so the whole history is served', async () => {
    const subscription = reconnectingSubscription([], []);

    await heightsOf(providerOver(subscription).contractStateObservable(ADDRESS, { type: 'all' }));

    expect(subscribedOffsets(subscription.subscribe)).toEqual([{ height: 0 }]);
  });
});

describe('contract-state streams — a reconnect replays nothing already delivered', () => {
  test.each(INCLUSIVE_STATE_CONFIGS)(
    '%s: a single delivered state is not delivered again',
    async (_, config) => {
      const subscription = reconnectingSubscription(
        [stateFrame(10, 'tx-10')],
        [stateFrame(10, 'tx-10'), stateFrame(11, 'tx-11')]
      );

      const heights = await heightsOf(providerOver(subscription).contractStateObservable(ADDRESS, config));

      expect(heights).toEqual([10, 11]);
    }
  );

  test.each(INCLUSIVE_STATE_CONFIGS)(
    '%s: every state of a block with several is delivered exactly once',
    async (_, config) => {
      const served = [stateFrame(10, 'tx-10'), stateFrame(10, 'tx-10b'), stateFrame(11, 'tx-11')];
      const subscription = reconnectingSubscription(served, [...served, stateFrame(12, 'tx-12')]);

      const heights = await heightsOf(providerOver(subscription).contractStateObservable(ADDRESS, config));

      expect(heights).toEqual([10, 10, 11, 12]);
    }
  );

  test.each(EXCLUSIVE_STATE_CONFIGS)('%s: inclusive false still holds after a reconnect', async (_, config) => {
    const served = [stateFrame(10, 'tx-10'), stateFrame(11, 'tx-11')];
    const subscription = reconnectingSubscription(served, [...served, stateFrame(12, 'tx-12')]);

    const heights = await heightsOf(providerOver(subscription).contractStateObservable(ADDRESS, config));

    expect(heights).toEqual([11, 12]);
  });

  test('txId: the states of transactions before the named one stay withheld after a reconnect', async () => {
    const served = [stateFrame(10, 'tx-earlier'), stateFrame(10, 'tx-10'), stateFrame(11, 'tx-11')];
    const subscription = reconnectingSubscription(served, served);

    const records = await Rx.lastValueFrom(
      providerOver(subscription)
        .rawContractStateObservable(ADDRESS, { type: 'txId', txId: NAMED_TX })
        .pipe(Rx.toArray())
    );

    expect(records.map(({ blockHeight }) => blockHeight)).toEqual([10, 11]);
  });

  test('txId: a state in the named transaction’s block after it is kept when inclusive is false', async () => {
    const subscription = reconnectingSubscription(
      [stateFrame(10, 'tx-earlier'), stateFrame(10, 'tx-10'), stateFrame(10, 'tx-later')],
      []
    );

    const heights = await heightsOf(
      providerOver(subscription).contractStateObservable(ADDRESS, { type: 'txId', txId: NAMED_TX, inclusive: false })
    );

    expect(heights).toEqual([10]);
  });
});

describe('unshieldedBalancesObservable — a reconnect replays nothing already delivered', () => {
  test.each<[string, ContractStateObservableConfig]>([
    ['latest', { type: 'latest' }],
    ['all', { type: 'all' }],
    ['blockHeight', { type: 'blockHeight', blockHeight: 10 }],
    ['blockHash', { type: 'blockHash', blockHash: '0x10' }]
  ])('%s: a single delivered balance is not delivered again', async (_, config) => {
    const subscription = reconnectingSubscription([balanceFrame(10)], [balanceFrame(10), balanceFrame(11)]);

    const heights = await heightsOf(providerOver(subscription).unshieldedBalancesObservable(ADDRESS, config));

    expect(heights).toEqual([10, 11]);
    expect(subscription.subscribe).toHaveBeenCalledWith(expect.objectContaining({ query: UNSHIELDED_BALANCE_SUB }));
  });

  test('blockHeight: inclusive false still holds after a reconnect', async () => {
    const served = [balanceFrame(10), balanceFrame(11)];
    const subscription = reconnectingSubscription(served, [...served, balanceFrame(12)]);

    const heights = await heightsOf(
      providerOver(subscription).unshieldedBalancesObservable(ADDRESS, {
        type: 'blockHeight',
        blockHeight: 10,
        inclusive: false
      })
    );

    expect(heights).toEqual([11, 12]);
  });

  test('all: subscribes from genesis, so the whole history is served', async () => {
    const subscription = reconnectingSubscription([], []);

    await heightsOf(providerOver(subscription).unshieldedBalancesObservable(ADDRESS, { type: 'all' }));

    expect(subscribedOffsets(subscription.subscribe)).toEqual([{ height: 0 }]);
  });
});
