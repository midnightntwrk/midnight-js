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

import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { HttpLink } from '@apollo/client/link/http';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import * as Rx from 'rxjs';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { DEFAULT_CONTRACT_EVENTS_PAGE_SIZE } from '../config';
import { IndexerError } from '../errors';
import { IndexerPublicDataProvider } from '../provider';

const ADDRESS = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as ContractAddress;

/**
 * Builds a provider around a real ApolloClient whose `query`/`subscribe` are
 * spy-able instance methods — the cleanest seam without reaching into the
 * provider's private handle.
 */
const buildProvider = () => {
  const client = new ApolloClient({ link: new HttpLink({ uri: 'http://localhost:4000/graphql' }), cache: new InMemoryCache() });
  const provider = new IndexerPublicDataProvider({ client, dispose: () => Promise.resolve() }, 1000);
  return { client, provider };
};

const eventNode = (id: number) => ({
  __typename: 'ShieldedSpendEvent' as const,
  id,
  maxId: 100,
  version: 1,
  contractAddress: ADDRESS,
  transactionId: id * 10,
  raw: `raw${id}`,
  nullifier: `n${id}`
});

afterEach(() => vi.restoreAllMocks());

describe('queryContractEvents', () => {
  test('maps the list preserving ascending id order', async () => {
    const { client, provider } = buildProvider();
    vi.spyOn(client, 'query').mockResolvedValue({ data: { contractEvents: [eventNode(1), eventNode(2), eventNode(3)] } } as never);

    const events = await provider.queryContractEvents({ contractAddress: ADDRESS });

    expect(events.map((e) => e.id)).toEqual([1, 2, 3]);
    expect(events[0]).toMatchObject({ eventType: 'ShieldedSpend', nullifier: 'n1' });
  });

  test('applies DEFAULT_CONTRACT_EVENTS_PAGE_SIZE when limit omitted', async () => {
    const { client, provider } = buildProvider();
    const querySpy = vi.spyOn(client, 'query').mockResolvedValue({ data: { contractEvents: [] } } as never);

    await provider.queryContractEvents({ contractAddress: ADDRESS });

    expect(querySpy).toHaveBeenCalledWith(
      expect.objectContaining({ variables: expect.objectContaining({ limit: DEFAULT_CONTRACT_EVENTS_PAGE_SIZE }) })
    );
  });

  test('forwards explicit limit/offset', async () => {
    const { client, provider } = buildProvider();
    const querySpy = vi.spyOn(client, 'query').mockResolvedValue({ data: { contractEvents: [] } } as never);

    await provider.queryContractEvents({ contractAddress: ADDRESS }, { limit: 5, offset: 10 });

    expect(querySpy).toHaveBeenCalledWith(
      expect.objectContaining({ variables: expect.objectContaining({ limit: 5, offset: 10 }) })
    );
  });

  test('rejects with a typed error on GraphQL failure (never an empty array)', async () => {
    const { client, provider } = buildProvider();
    vi.spyOn(client, 'query').mockResolvedValue({ data: undefined, error: { message: 'boom' } } as never);

    await expect(provider.queryContractEvents({ contractAddress: ADDRESS })).rejects.toBeInstanceOf(IndexerError);
  });

  test('throws synchronously on an invalid contract address', () => {
    const { provider } = buildProvider();
    expect(() => provider.queryContractEvents({ contractAddress: 'bad' as ContractAddress })).toThrow();
  });

  test('throws synchronously on empty types', () => {
    const { provider } = buildProvider();
    expect(() => provider.queryContractEvents({ contractAddress: ADDRESS, types: [] })).toThrow();
  });
});

describe('contractEventsObservable - cursor mapping', () => {
  const captureSubscribeVars = () => {
    const { client, provider } = buildProvider();
    const subscribeSpy = vi
      .spyOn(client, 'subscribe')
      .mockReturnValue(Rx.NEVER as unknown as ReturnType<ApolloClient['subscribe']>);
    return { provider, subscribeSpy };
  };

  test('startAt { fromId } maps to the subscription id arg', () => {
    const { provider, subscribeSpy } = captureSubscribeVars();
    provider.contractEventsObservable({ contractAddress: ADDRESS }, { startAt: { fromId: 12 } }).subscribe();
    expect(subscribeSpy).toHaveBeenCalledWith(expect.objectContaining({ variables: expect.objectContaining({ id: 12 }) }));
  });

  test('startAt { fromBlock } maps to filter.fromBlock and leaves id null', () => {
    const { provider, subscribeSpy } = captureSubscribeVars();
    provider.contractEventsObservable({ contractAddress: ADDRESS }, { startAt: { fromBlock: 33 } }).subscribe();
    expect(subscribeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({ id: null, filter: expect.objectContaining({ fromBlock: 33 }) })
      })
    );
  });

  test('omitted startAt sends neither cursor', () => {
    const { provider, subscribeSpy } = captureSubscribeVars();
    provider.contractEventsObservable({ contractAddress: ADDRESS }).subscribe();
    expect(subscribeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({ id: null, filter: expect.objectContaining({ fromBlock: null }) })
      })
    );
  });

  test('throws synchronously on an invalid contract address', () => {
    const { provider } = buildProvider();
    expect(() => provider.contractEventsObservable({ contractAddress: 'bad' as ContractAddress })).toThrow();
  });
});

describe('contractEventsObservable - emission, completion, and errors', () => {
  test('emits mapped events in id order', async () => {
    const { client, provider } = buildProvider();
    vi.spyOn(client, 'subscribe').mockReturnValue(
      Rx.from([{ data: { contractEvents: eventNode(1) } }, { data: { contractEvents: eventNode(2) } }]) as unknown as ReturnType<
        ApolloClient['subscribe']
      >
    );

    const emitted = await Rx.firstValueFrom(provider.contractEventsObservable({ contractAddress: ADDRESS }).pipe(Rx.toArray()));

    expect(emitted.map((e) => e.id)).toEqual([1, 2]);
  });

  test('completes (does not error) when the stream completes — e.g. toBlock reached', async () => {
    const { client, provider } = buildProvider();
    vi.spyOn(client, 'subscribe').mockReturnValue(Rx.EMPTY as unknown as ReturnType<ApolloClient['subscribe']>);

    const completed = await new Promise<boolean>((resolve, reject) => {
      provider
        .contractEventsObservable({ contractAddress: ADDRESS, toBlock: 5 })
        .subscribe({ error: reject, complete: () => resolve(true) });
    });
    expect(completed).toBe(true);
  });

  test('surfaces a GraphQL error as an observable error, not a silent completion', async () => {
    const { client, provider } = buildProvider();
    vi.spyOn(client, 'subscribe').mockReturnValue(
      Rx.of({ errors: [{ message: 'socket failure' }] }) as unknown as ReturnType<ApolloClient['subscribe']>
    );

    const result = await new Promise<{ errored: boolean; error?: unknown }>((resolve) => {
      provider.contractEventsObservable({ contractAddress: ADDRESS }).subscribe({
        error: (error: unknown) => resolve({ errored: true, error }),
        complete: () => resolve({ errored: false })
      });
    });
    expect(result.errored).toBe(true);
    expect(result.error).toBeInstanceOf(IndexerError);
  });
});
