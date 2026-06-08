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
import type {
  ContractEventCursor,
  ContractEventFilter,
  LogEventType,
  PublicDataProvider,
  VersionedLogItem,
} from '@midnight-ntwrk/midnight-js-types';
import * as Rx from 'rxjs';

import type {
  ContractEventFilter as GqlContractEventFilter,
  ContractEventType,
} from './gen/graphql';

const LOG_EVENT_TYPE_TO_GQL: Readonly<Record<LogEventType, ContractEventType>> = {
  ShieldedSpend:     'SHIELDED_SPEND',
  ShieldedReceive:   'SHIELDED_RECEIVE',
  ShieldedMint:      'SHIELDED_MINT',
  ShieldedBurn:      'SHIELDED_BURN',
  UnshieldedSpend:   'UNSHIELDED_SPEND',
  UnshieldedReceive: 'UNSHIELDED_RECEIVE',
  UnshieldedMint:    'UNSHIELDED_MINT',
  UnshieldedBurn:    'UNSHIELDED_BURN',
  Paused:            'PAUSED',
  Unpaused:          'UNPAUSED',
  Misc:              'MISC',
};

/**
 * Translate the midnight-js boundary {@link ContractEventFilter} into the GraphQL
 * input type the indexer expects. The boundary type uses pascal-case event names;
 * the indexer enum is screaming-snake-case.
 */
export const toGraphQLFilter = (
  filter: ContractEventFilter,
): GqlContractEventFilter => ({
  contractAddress: filter.contractAddress,
  types: filter.types ? filter.types.map((t) => LOG_EVENT_TYPE_TO_GQL[t]) : null,
  fieldPrefixes: filter.fieldPrefixes
    ? filter.fieldPrefixes.map((f) => ({ fieldName: f.fieldName, prefix: f.prefix }))
    : null,
  fromBlock: filter.fromBlock ?? null,
  toBlock: filter.toBlock ?? null,
});

export type WatchContractEventsOptions = {
  /** Resume from this cursor. Omit to backfill from the earliest matching event. */
  readonly cursor?: ContractEventCursor;
  /** Page size for the backfill phase. Default 100. */
  readonly backfillPageSize?: number;
};

/**
 * Cold observable that backfills via {@link PublicDataProvider.queryContractEvents}
 * until the cursor drains, then hands off to {@link PublicDataProvider.contractEventsObservable}.
 *
 * The handoff is exact: the subscription resumes at the highest `id` the backfill
 * emitted. This relies on the indexer's monotonic-`id` contract and exclusive
 * subscription cursor semantics.
 *
 * Each subscriber gets its own backfill + tail (no shared state).
 */
export const watchContractEvents = (
  provider: PublicDataProvider,
  filter: ContractEventFilter,
  options: WatchContractEventsOptions = {},
): Rx.Observable<VersionedLogItem> => Rx.defer(() => {
  let cursor = options.cursor;
  let lastBackfilledId: number | undefined = options.cursor?.after;
  const pageSize = options.backfillPageSize ?? 100;

  const backfill$ = new Rx.Observable<VersionedLogItem>((subscriber) => {
    let cancelled = false;
    (async () => {
      try {
        while (!cancelled) {
          const page = await provider.queryContractEvents(filter, cursor, pageSize);
          for (const event of page.events) {
            if (cancelled) return;
            lastBackfilledId = event.id;
            subscriber.next(event);
          }
          if (page.nextCursor === null) break;
          cursor = page.nextCursor;
        }
        subscriber.complete();
      } catch (err) {
        subscriber.error(err);
      }
    })();
    return () => { cancelled = true; };
  });

  return backfill$.pipe(
    Rx.concatWith(
      Rx.defer(() =>
        provider.contractEventsObservable(
          filter,
          lastBackfilledId === undefined ? undefined : { after: lastBackfilledId },
        ),
      ),
    ),
  );
});
