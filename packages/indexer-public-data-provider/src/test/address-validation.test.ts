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
import { describe, expect, test, vi } from 'vitest';

import { IndexerPublicDataProvider } from '../provider';
import { type ApolloRequest, stubApolloHandle } from './apollo-stub';

const INVALID_ADDRESS = 'not-a-contract-address' as ContractAddress;

type QueryMock = ReturnType<typeof vi.fn<(request: ApolloRequest) => Promise<unknown>>>;

/**
 * A provider whose transport would answer anything. The point of every test
 * here is that the transport is never reached, so the mock's response does not
 * matter — only that it records nothing.
 */
const buildProvider = (): { provider: IndexerPublicDataProvider; query: QueryMock; watchQuery: QueryMock } => {
  const query: QueryMock = vi.fn<(request: ApolloRequest) => Promise<unknown>>().mockResolvedValue({ data: {} });
  const watchQuery: QueryMock = vi.fn<(request: ApolloRequest) => Promise<unknown>>().mockResolvedValue({ data: {} });
  return {
    provider: new IndexerPublicDataProvider(stubApolloHandle({ query, watchQuery }), 1000),
    query,
    watchQuery
  };
};

describe('an invalid contract address is refused before any request is issued', () => {
  // Every read that takes an address, with how it surfaces the refusal. The
  // family throws synchronously; `queryRawContractState` is the one that
  // rejects instead, because it is the one declared `async`. Both are pinned
  // rather than harmonised: a caller's `try`/`catch` placement depends on
  // which it is, so the shape is behaviour, not an implementation detail.
  const throwsSynchronously: readonly [string, (p: IndexerPublicDataProvider) => unknown][] = [
    ['queryContractState', (p) => p.queryContractState(INVALID_ADDRESS)],
    ['queryZSwapAndContractState', (p) => p.queryZSwapAndContractState(INVALID_ADDRESS)],
    ['queryUnshieldedBalances', (p) => p.queryUnshieldedBalances(INVALID_ADDRESS)],
    ['queryDeployContractState', (p) => p.queryDeployContractState(INVALID_ADDRESS)],
    ['watchForContractState', (p) => p.watchForContractState(INVALID_ADDRESS)],
    ['watchForUnshieldedBalances', (p) => p.watchForUnshieldedBalances(INVALID_ADDRESS)],
    ['watchForDeployTxData', (p) => p.watchForDeployTxData(INVALID_ADDRESS)],
    ['contractStateObservable', (p) => p.contractStateObservable(INVALID_ADDRESS, { type: 'all' })]
  ];

  test.each(throwsSynchronously)('%s throws synchronously, issuing nothing', (_name, call) => {
    const { provider, query, watchQuery } = buildProvider();

    expect(() => call(provider)).toThrow();
    expect(query).not.toHaveBeenCalled();
    expect(watchQuery).not.toHaveBeenCalled();
  });

  test('queryRawContractState rejects instead, being the one async member of the family', async () => {
    const { provider, query, watchQuery } = buildProvider();

    await expect(provider.queryRawContractState(INVALID_ADDRESS)).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
    expect(watchQuery).not.toHaveBeenCalled();
  });
});
