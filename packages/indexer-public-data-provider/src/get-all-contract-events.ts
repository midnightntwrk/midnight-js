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

import type { ContractEvent, ContractEventQueryFilter, PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';

import { DEFAULT_CONTRACT_EVENTS_PAGE_SIZE } from './config';

/**
 * Iterates **all** contract events matching `filter`, safely paged, yielding in
 * ascending `id` order. The recommended way to read full history — it hides the
 * off-by-one and offset-instability traps of manual `queryContractEvents`
 * paging (spec §3.3).
 *
 * Provider-agnostic: depends only on the `queryContractEvents` primitive.
 *
 * Stability: the upper bound is pinned **once**, at the first page. When
 * `filter.toBlock` is given the indexer bounds the set server-side; otherwise
 * the highest event id known at the first page (`maxId`) is the snapshot tip,
 * and events appended after it (`id > tip`) are excluded — so a page-boundary
 * insert can neither duplicate nor skip. Iteration ends on the first short page
 * (a page shorter than the page size) or once the snapshot tip is passed.
 *
 * The consumer can stop early by `break`ing the `for await` loop — no further
 * requests are issued.
 *
 * @param provider Anything exposing `queryContractEvents`.
 * @param filter The events to iterate; `contractAddress` is required.
 */
export async function* getAllContractEvents(
  provider: Pick<PublicDataProvider, 'queryContractEvents'>,
  filter: ContractEventQueryFilter
): AsyncIterable<ContractEvent> {
  const limit = DEFAULT_CONTRACT_EVENTS_PAGE_SIZE;
  let offset = 0;
  let snapshotTipId: number | undefined;

  for (;;) {
    const page = await provider.queryContractEvents(filter, { limit, offset });
    if (page.length === 0) return;

    snapshotTipId ??= page[0].maxId;

    for (const event of page) {
      if (event.id > snapshotTipId) return;
      yield event;
    }

    if (page.length < limit) return;
    offset += limit;
  }
}
