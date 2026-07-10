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

import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type {
  ContractEvent,
  ContractEventQueryFilter,
  ContractEventsPage,
  PublicDataProvider
} from '@midnight-ntwrk/midnight-js-types';
import { describe, expect, test, vi } from 'vitest';

import { DEFAULT_CONTRACT_EVENTS_PAGE_SIZE } from '../config';
import { getAllContractEvents } from '../get-all-contract-events';

const ADDRESS = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as ContractAddress;
const PAGE = DEFAULT_CONTRACT_EVENTS_PAGE_SIZE;

const event = (id: number, maxId: number): ContractEvent => ({
  eventType: 'Paused',
  id,
  maxId,
  version: 1,
  contractAddress: ADDRESS,
  transactionId: id,
  raw: `r${id}`
});

const range = (from: number, to: number, maxId: number): ContractEvent[] =>
  Array.from({ length: to - from + 1 }, (_, i) => event(from + i, maxId));

/** A provider stub that serves pre-baked pages keyed by offset. */
const stubProvider = (pageByOffset: (offset: number) => ContractEvent[]) => {
  const queryContractEvents = vi.fn(
    (_filter: ContractEventQueryFilter, page?: ContractEventsPage): Promise<ContractEvent[]> =>
      Promise.resolve(pageByOffset(page?.offset ?? 0))
  );
  return { provider: { queryContractEvents }, queryContractEvents };
};

const collect = async (
  filter: ContractEventQueryFilter,
  provider: Pick<PublicDataProvider, 'queryContractEvents'>
) => {
  const out: ContractEvent[] = [];
  for await (const e of getAllContractEvents(provider, filter)) out.push(e);
  return out;
};

describe('getAllContractEvents', () => {
  test('pages across multiple pages and yields the concatenation in ascending id order', async () => {
    const { provider, queryContractEvents } = stubProvider((offset) => {
      if (offset === 0) return range(1, PAGE, 9999);
      if (offset === PAGE) return range(PAGE + 1, 2 * PAGE, 9999);
      if (offset === 2 * PAGE) return range(2 * PAGE + 1, 2 * PAGE + 50, 9999); // short final page
      return [];
    });

    const events = await collect({ contractAddress: ADDRESS }, provider);

    expect(events.map((e) => e.id)).toEqual(Array.from({ length: 2 * PAGE + 50 }, (_, i) => i + 1));
    expect(queryContractEvents).toHaveBeenCalledTimes(3); // short page stops; no extra request
  });

  test('terminates on a short final page without an extra request', async () => {
    const { provider, queryContractEvents } = stubProvider((offset) => (offset === 0 ? range(1, 10, 10) : []));

    const events = await collect({ contractAddress: ADDRESS }, provider);

    expect(events).toHaveLength(10);
    expect(queryContractEvents).toHaveBeenCalledTimes(1);
  });

  test('pins the tip from the first page so a boundary insert does not duplicate/skip', async () => {
    // First page is full with maxId = PAGE (the snapshot tip). The second page
    // contains only events appended after the snapshot (id > PAGE) — they must
    // be excluded.
    const { provider } = stubProvider((offset) => {
      if (offset === 0) return range(1, PAGE, PAGE);
      return range(PAGE + 1, PAGE + 30, PAGE + 30);
    });

    const events = await collect({ contractAddress: ADDRESS }, provider);

    expect(events.map((e) => e.id)).toEqual(Array.from({ length: PAGE }, (_, i) => i + 1));
    expect(events.every((e) => e.id <= PAGE)).toBe(true);
  });

  test('early break stops iteration without further requests', async () => {
    const { provider, queryContractEvents } = stubProvider((offset) => (offset === 0 ? range(1, PAGE, 9999) : range(PAGE + 1, 2 * PAGE, 9999)));

    const first: ContractEvent[] = [];
    for await (const e of getAllContractEvents(provider, { contractAddress: ADDRESS })) {
      first.push(e);
      break;
    }

    expect(first).toHaveLength(1);
    expect(queryContractEvents).toHaveBeenCalledTimes(1);
  });

  test('empty history yields nothing and completes', async () => {
    const { provider, queryContractEvents } = stubProvider(() => []);

    const events = await collect({ contractAddress: ADDRESS }, provider);

    expect(events).toEqual([]);
    expect(queryContractEvents).toHaveBeenCalledTimes(1);
  });
});
