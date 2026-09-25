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

import { ApolloClient, type ObservableQuery } from '@apollo/client/core';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import * as Rx from 'rxjs';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { indexerPublicDataProvider } from '..';
import {
  type Block,
  blockToPositionedContractState$,
  type ChainPosition,
  dropReplayed,
  type PositionedContractState
} from '../observables';
import { mintV9ContractStateHex } from './state-fixtures';

const contractAddress =
  '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as ContractAddress;
const otherAddress =
  'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321' as ContractAddress;

/** The protocol version the v9 ledger runtime answers to, matching the fixtures below. */
const V9_PROTOCOL_VERSION = 1000;

const positions = (...pairs: [number, number][]): Rx.Observable<ChainPosition> =>
  Rx.from(pairs.map(([height, ordinal]) => ({ height, ordinal })));

const collect = async (source: Rx.Observable<ChainPosition>): Promise<[number, number][]> => {
  const seen = await Rx.lastValueFrom(source.pipe(Rx.toArray()));
  return seen.map((p) => [p.height, p.ordinal]);
};

describe('dropReplayed', () => {
  test('passes through positions that advance', async () => {
    const seen = await collect(positions([10, 0], [11, 0], [12, 0]).pipe(dropReplayed()));

    expect(seen).toEqual([
      [10, 0],
      [11, 0],
      [12, 0]
    ]);
  });

  test('drops a position that has already been delivered', async () => {
    const seen = await collect(positions([10, 0], [11, 0], [10, 0], [11, 0]).pipe(dropReplayed()));

    expect(seen).toEqual([
      [10, 0],
      [11, 0]
    ]);
  });

  test('drops a position behind the last delivered one', async () => {
    const seen = await collect(positions([10, 0], [11, 0], [9, 4]).pipe(dropReplayed()));

    expect(seen).toEqual([
      [10, 0],
      [11, 0]
    ]);
  });

  test('drops an earlier ordinal within a block already delivered', async () => {
    const seen = await collect(positions([10, 0], [10, 2], [10, 1]).pipe(dropReplayed()));

    expect(seen).toEqual([
      [10, 0],
      [10, 2]
    ]);
  });

  test('passes a later action in a block already partly delivered', async () => {
    const seen = await collect(positions([10, 0], [10, 1], [10, 2]).pipe(dropReplayed()));

    expect(seen).toEqual([
      [10, 0],
      [10, 1],
      [10, 2]
    ]);
  });

  test('resumes after a replay, delivering the states that follow it', async () => {
    const seen = await collect(positions([10, 0], [11, 0], [10, 0], [11, 0], [12, 0]).pipe(dropReplayed()));

    expect(seen).toEqual([
      [10, 0],
      [11, 0],
      [12, 0]
    ]);
  });

  test('tracks each subscription separately', async () => {
    const guarded = positions([10, 0], [11, 0]).pipe(dropReplayed());

    const first = await collect(guarded);
    const second = await collect(guarded);

    expect(first).toEqual([
      [10, 0],
      [11, 0]
    ]);
    expect(second).toEqual([
      [10, 0],
      [11, 0]
    ]);
  });
});

const action = (address: ContractAddress, state: string) => ({ state, address });

const blockWith = (height: number, transactions: { state: string; address: string }[][]): Block => ({
  hash: `0x${height}`,
  height,
  protocolVersion: V9_PROTOCOL_VERSION,
  transactions: transactions.map((contractActions, index) => ({
    hash: `0xtx${height}-${index}`,
    identifiers: [],
    protocolVersion: V9_PROTOCOL_VERSION,
    contractActions
  }))
});

/** Subscribes synchronously — `blockToPositionedContractState$` emits from an array. */
const drain = (
  source: Rx.Observable<PositionedContractState>
): { seen: PositionedContractState[]; error: unknown } => {
  const seen: PositionedContractState[] = [];
  let error: unknown = null;
  source.subscribe({
    next: (value) => seen.push(value),
    error: (caught: unknown) => {
      error = caught;
    }
  });
  return { seen, error };
};

describe('blockToPositionedContractState$', () => {
  test('numbers the matching actions of a block from zero across its transactions', () => {
    const state = mintV9ContractStateHex();
    const block = blockWith(10, [[action(contractAddress, state)], [action(contractAddress, state)]]);

    const { seen, error } = drain(blockToPositionedContractState$(contractAddress)(block));

    expect(error).toBeNull();
    expect(seen.map((s) => [s.height, s.ordinal])).toEqual([
      [10, 0],
      [10, 1]
    ]);
  });

  test('does not let an action for another contract consume an ordinal', () => {
    const state = mintV9ContractStateHex();
    const block = blockWith(10, [
      [action(otherAddress, state), action(contractAddress, state)],
      [action(otherAddress, state), action(contractAddress, state)]
    ]);

    const { seen } = drain(blockToPositionedContractState$(contractAddress)(block));

    expect(seen.map((s) => s.ordinal)).toEqual([0, 1]);
  });

  test('emits nothing for a block with no action for the contract', () => {
    const block = blockWith(10, [[action(otherAddress, mintV9ContractStateHex())]]);

    const { seen, error } = drain(blockToPositionedContractState$(contractAddress)(block));

    expect(seen).toEqual([]);
    expect(error).toBeNull();
  });

  test('emits the states preceding an undecodable one before it errors', () => {
    const block = blockWith(10, [
      [action(contractAddress, mintV9ContractStateHex()), action(contractAddress, 'not-hex')]
    ]);

    const { seen, error } = drain(blockToPositionedContractState$(contractAddress)(block));

    expect(seen.map((s) => s.ordinal)).toEqual([0]);
    expect(error).toBeInstanceOf(Error);
  });
});

type QueryEmission = { data: unknown; dataState: string };

// Apollo's ObservableQuery is a class with private fields and an invariant
// TData generic; structural typing of an Rx.Observable widened to `unknown` is
// the cleanest test seam available without injecting a custom ApolloLink into
// the provider's internal client construction.
const buildQueryEmission = (data: unknown): ObservableQuery<unknown> =>
  Rx.of({
    data,
    dataState: 'complete',
    loading: false,
    networkStatus: 7,
    partial: false
  } satisfies QueryEmission & Record<string, unknown>) as unknown as ObservableQuery<unknown>;

describe('contractStateObservable — replayed blocks', () => {
  const queryURL = 'http://localhost:4000/api/v1/graphql';
  const subscriptionURL = 'ws://localhost:4000/api/v1/graphql/ws';

  /**
   * Block 10 carries one action for the contract and block 11 carries two, so the
   * emission count alone distinguishes a correctly deduplicated stream (3) from one
   * that dropped block 11 and delivered block 10 twice (2).
   */
  const blockPayload = (height: number, state: string) => ({
    data: {
      blocks: {
        hash: `0x${height}`,
        height,
        protocolVersion: V9_PROTOCOL_VERSION,
        transactions: [
          {
            hash: `0xtx${height}`,
            identifiers: [`id-${height}`],
            contractActions: Array.from({ length: height === 11 ? 2 : 1 }, () => ({
              state,
              address: contractAddress
            }))
          }
        ]
      }
    }
  });

  const stubSubscription = (payloads: unknown[]): void => {
    vi.spyOn(ApolloClient.prototype, 'subscribe').mockReturnValue(
      Rx.from(payloads) as unknown as ReturnType<ApolloClient['subscribe']>
    );
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('latest: emits each block once when the indexer replays after a reconnect', async () => {
    vi.spyOn(ApolloClient.prototype, 'watchQuery').mockReturnValue(
      buildQueryEmission({ contractAction: { transaction: { block: { height: 10 } } } })
    );
    const state = mintV9ContractStateHex();
    stubSubscription([
      blockPayload(10, state),
      blockPayload(11, state),
      blockPayload(10, state),
      blockPayload(11, state)
    ]);
    const provider = indexerPublicDataProvider(queryURL, subscriptionURL);

    const seen = await Rx.lastValueFrom(
      provider.contractStateObservable(contractAddress, { type: 'latest' }).pipe(Rx.toArray())
    );

    expect(seen).toHaveLength(3);
  });

  test('latest: emits every distinct block the subscription delivers', async () => {
    vi.spyOn(ApolloClient.prototype, 'watchQuery').mockReturnValue(
      buildQueryEmission({ contractAction: { transaction: { block: { height: 10 } } } })
    );
    const state = mintV9ContractStateHex();
    stubSubscription([blockPayload(10, state), blockPayload(11, state), blockPayload(12, state)]);
    const provider = indexerPublicDataProvider(queryURL, subscriptionURL);

    const seen = await Rx.lastValueFrom(
      provider.contractStateObservable(contractAddress, { type: 'latest' }).pipe(Rx.toArray())
    );

    expect(seen).toHaveLength(4);
  });

  test('blockHeight: emits each block once when the indexer replays after a reconnect', async () => {
    vi.spyOn(ApolloClient.prototype, 'watchQuery').mockReturnValue(
      buildQueryEmission({ block: { height: 10, hash: '0x10' } })
    );
    const state = mintV9ContractStateHex();
    stubSubscription([
      blockPayload(10, state),
      blockPayload(11, state),
      blockPayload(10, state),
      blockPayload(11, state)
    ]);
    const provider = indexerPublicDataProvider(queryURL, subscriptionURL);

    const seen = await Rx.lastValueFrom(
      provider
        .contractStateObservable(contractAddress, { type: 'blockHeight', blockHeight: 10 })
        .pipe(Rx.toArray())
    );

    expect(seen).toHaveLength(3);
  });
});
