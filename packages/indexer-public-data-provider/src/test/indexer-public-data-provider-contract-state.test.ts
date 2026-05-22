/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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
import type { ContractStateObservableConfig } from '@midnight-ntwrk/midnight-js-types';
import * as Rx from 'rxjs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { indexerPublicDataProvider } from '../indexer-public-data-provider';
import { BLOCK_QUERY, TXS_FROM_BLOCK_SUB } from '../query-definitions';

type BlockQueryData = { block: { height: number; hash: string } | null };

// Apollo's ObservableQuery is a class with private fields and an invariant
// TData generic; structural typing of an Rx.Observable widened to `unknown` is
// the cleanest test seam available without injecting a custom ApolloLink into
// the provider's internal client construction.
const buildBlockQueryEmission = (data: BlockQueryData): ObservableQuery<unknown> =>
  Rx.of({
    data: data.block !== null ? data : undefined,
    dataState: data.block !== null ? 'complete' : 'empty',
    loading: false,
    networkStatus: 7,
    partial: false
  }) as unknown as ObservableQuery<unknown>;

describe('contractStateObservable - block offset configs', () => {
  const queryURL = 'http://localhost:4000/api/v1/graphql';
  const subscriptionURL = 'ws://localhost:4000/api/v1/graphql/ws';
  const mockContractAddress =
    '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as ContractAddress;

  let watchQuerySpy: ReturnType<typeof vi.spyOn>;
  let subscribeSpy: ReturnType<typeof vi.spyOn>;

  const subscribeAndCaptureErrors = (observable: Rx.Observable<unknown>): { errors: unknown[]; subscription: Rx.Subscription } => {
    const errors: unknown[] = [];
    const subscription = observable.subscribe({
      next: () => undefined,
      error: (e: unknown) => errors.push(e)
    });
    return { errors, subscription };
  };

  beforeEach(() => {
    watchQuerySpy = vi
      .spyOn(ApolloClient.prototype, 'watchQuery')
      .mockReturnValue(buildBlockQueryEmission({ block: { height: 1000, hash: '0xabc' } }));

    // SubscriptionObservable adds a `restart` method on top of rxjs Observable.
    // Test mock never emits, so the extra method is unreachable.
    subscribeSpy = vi
      .spyOn(ApolloClient.prototype, 'subscribe')
      .mockReturnValue(Rx.NEVER as unknown as ReturnType<ApolloClient['subscribe']>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('blockHeight config dispatches the block subscription', async () => {
    const provider = indexerPublicDataProvider(queryURL, subscriptionURL);
    const config: ContractStateObservableConfig = {
      type: 'blockHeight',
      blockHeight: 1000
    };

    const { errors, subscription } = subscribeAndCaptureErrors(
      provider.contractStateObservable(mockContractAddress, config)
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(errors).toEqual([]);
    expect(watchQuerySpy).toHaveBeenCalledTimes(1);
    expect(watchQuerySpy).toHaveBeenCalledWith(expect.objectContaining({ query: BLOCK_QUERY }));
    expect(subscribeSpy).toHaveBeenCalledTimes(1);
    expect(subscribeSpy).toHaveBeenCalledWith(expect.objectContaining({ query: TXS_FROM_BLOCK_SUB }));

    subscription.unsubscribe();
  });

  test('blockHash config dispatches the block subscription', async () => {
    const provider = indexerPublicDataProvider(queryURL, subscriptionURL);
    const config: ContractStateObservableConfig = {
      type: 'blockHash',
      blockHash: '0xabc'
    };

    const { errors, subscription } = subscribeAndCaptureErrors(
      provider.contractStateObservable(mockContractAddress, config)
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(errors).toEqual([]);
    expect(watchQuerySpy).toHaveBeenCalledTimes(1);
    expect(watchQuerySpy).toHaveBeenCalledWith(expect.objectContaining({ query: BLOCK_QUERY }));
    expect(subscribeSpy).toHaveBeenCalledTimes(1);
    expect(subscribeSpy).toHaveBeenCalledWith(expect.objectContaining({ query: TXS_FROM_BLOCK_SUB }));

    subscription.unsubscribe();
  });

  test('blockHeight config with no matching block does not dispatch the block subscription', async () => {
    watchQuerySpy.mockReturnValue(buildBlockQueryEmission({ block: null }));

    const provider = indexerPublicDataProvider(queryURL, subscriptionURL);
    const config: ContractStateObservableConfig = {
      type: 'blockHeight',
      blockHeight: 1000
    };

    const { errors, subscription } = subscribeAndCaptureErrors(
      provider.contractStateObservable(mockContractAddress, config)
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(errors).toEqual([]);
    expect(watchQuerySpy).toHaveBeenCalledTimes(1);
    expect(subscribeSpy).not.toHaveBeenCalled();

    subscription.unsubscribe();
  });
});
