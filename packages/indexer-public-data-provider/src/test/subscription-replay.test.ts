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
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { indexerPublicDataProvider } from '..';
import { type ChainPosition, dropReplayed } from '../observables';
import { mintV9ContractStateHex } from './state-fixtures';

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

    expect(second).toEqual(first);
  });
});

type LatestAnchorData = { contractAction: { transaction: { block: { height: number } } } };

// Apollo's ObservableQuery is a class with private fields and an invariant
// TData generic; structural typing of an Rx.Observable widened to `unknown` is
// the cleanest test seam available without injecting a custom ApolloLink into
// the provider's internal client construction.
const buildAnchorEmission = (height: number): ObservableQuery<unknown> =>
  Rx.of({
    data: { contractAction: { transaction: { block: { height } } } } satisfies LatestAnchorData,
    dataState: 'complete',
    loading: false,
    networkStatus: 7,
    partial: false
  }) as unknown as ObservableQuery<unknown>;

describe('contractStateObservable — replayed blocks', () => {
  const queryURL = 'http://localhost:4000/api/v1/graphql';
  const subscriptionURL = 'ws://localhost:4000/api/v1/graphql/ws';
  const contractAddress =
    '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as ContractAddress;

  const blockPayload = (height: number, state: string) => ({
    data: {
      blocks: {
        hash: `0x${height}`,
        height,
        protocolVersion: 1000,
        transactions: [
          {
            hash: `0xtx${height}`,
            identifiers: [`id-${height}`],
            contractActions: [{ state, address: contractAddress }]
          }
        ]
      }
    }
  });

  beforeEach(() => {
    vi.spyOn(ApolloClient.prototype, 'watchQuery').mockReturnValue(buildAnchorEmission(10));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('emits a block once when the indexer replays it after a reconnect', async () => {
    const state = mintV9ContractStateHex();
    vi.spyOn(ApolloClient.prototype, 'subscribe').mockReturnValue(
      Rx.of(blockPayload(10, state), blockPayload(11, state), blockPayload(10, state), blockPayload(11, state)) as unknown as ReturnType<
        ApolloClient['subscribe']
      >
    );
    const provider = indexerPublicDataProvider(queryURL, subscriptionURL);

    const seen = await Rx.lastValueFrom(
      provider.contractStateObservable(contractAddress, { type: 'latest' }).pipe(Rx.toArray())
    );

    expect(seen).toHaveLength(2);
  });

  test('emits every distinct block the subscription delivers', async () => {
    const state = mintV9ContractStateHex();
    vi.spyOn(ApolloClient.prototype, 'subscribe').mockReturnValue(
      Rx.of(blockPayload(10, state), blockPayload(11, state), blockPayload(12, state)) as unknown as ReturnType<
        ApolloClient['subscribe']
      >
    );
    const provider = indexerPublicDataProvider(queryURL, subscriptionURL);

    const seen = await Rx.lastValueFrom(
      provider.contractStateObservable(contractAddress, { type: 'latest' }).pipe(Rx.toArray())
    );

    expect(seen).toHaveLength(3);
  });
});
