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

import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client/core';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import * as Rx from 'rxjs';
import { describe, expect, test } from 'vitest';

import { IndexerPublicDataProvider } from '../provider';
import { mintV9ContractStateHex, V9_ERA_PROTOCOL_VERSION } from './state-fixtures';

const ADDRESS = '12'.repeat(32) as ContractAddress;
const STATE = mintV9ContractStateHex();

const stateFrame = (height: number) => ({
  data: {
    contractActions: {
      state: STATE,
      transaction: {
        protocolVersion: V9_ERA_PROTOCOL_VERSION,
        identifiers: [`tx-${height}`],
        block: { height, hash: `0x${height}` }
      }
    }
  }
});

/**
 * A real client over a link that answers the `all` branch's poll and serves the
 * same two actions to every subscription it executes, then stays open as a live
 * feed does.
 */
const providerOverLiveFeed = (): IndexerPublicDataProvider => {
  const link = new ApolloLink((operation) =>
    operation.operationName === 'CONTRACT_STATE_SUB'
      ? new Rx.Observable((subscriber) => {
          subscriber.next(stateFrame(10));
          subscriber.next(stateFrame(11));
        })
      : Rx.of({ data: { block: { protocolVersion: V9_ERA_PROTOCOL_VERSION }, contract: { state: STATE } } })
  );
  const client = new ApolloClient({ link, cache: new InMemoryCache() });
  return new IndexerPublicDataProvider({ client, connectionCount: () => 1, dispose: () => Promise.resolve() }, 1000);
};

describe('contract streams — identical subscriptions are not shared', () => {
  test('a second subscriber to the same stream receives the whole history, not the live tail', async () => {
    const stream = providerOverLiveFeed().contractStateObservable(ADDRESS, { type: 'all' });
    const first = new Rx.ReplaySubject<number>();
    const firstSubscription = stream.pipe(Rx.map(({ blockHeight }) => blockHeight)).subscribe(first);
    try {
      await Rx.firstValueFrom(first.pipe(Rx.take(2), Rx.toArray()));

      const second = await Rx.firstValueFrom(
        stream.pipe(
          Rx.map(({ blockHeight }) => blockHeight),
          Rx.take(2),
          Rx.toArray(),
          Rx.timeout({ first: 1000 })
        )
      );

      expect(second).toEqual([10, 11]);
    } finally {
      firstSubscription.unsubscribe();
    }
  });
});
