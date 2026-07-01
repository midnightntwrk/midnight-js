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
  ContractEventQueryFilter,
  ContractEventsPage,
  ContractEventSubscriptionFilter,
  ContractEventType} from '@midnight-ntwrk/midnight-js-types';
import { assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';

import { IndexerProviderConfigError } from './errors';
import type {
  ContractEventFilter,
  ContractEventsQueryQueryVariables,
  ContractEventsSubSubscriptionVariables,
  ContractEventType as IndexerContractEventType
} from './gen/graphql';

/**
 * PascalCase (public) → SCREAMING_SNAKE (indexer) translation for every event
 * type. Kept exhaustive via the `Record<ContractEventType, ...>` index so a new
 * public variant fails to compile until it is added here.
 */
const EVENT_TYPE_TO_INDEXER: Record<ContractEventType, IndexerContractEventType> = {
  ShieldedSpend: 'SHIELDED_SPEND',
  ShieldedReceive: 'SHIELDED_RECEIVE',
  ShieldedMint: 'SHIELDED_MINT',
  ShieldedBurn: 'SHIELDED_BURN',
  UnshieldedSpend: 'UNSHIELDED_SPEND',
  UnshieldedReceive: 'UNSHIELDED_RECEIVE',
  UnshieldedMint: 'UNSHIELDED_MINT',
  UnshieldedBurn: 'UNSHIELDED_BURN',
  Paused: 'PAUSED',
  Unpaused: 'UNPAUSED',
  Misc: 'MISC'
};

/**
 * Indexed (prefix-filterable) fields per standard variant, derived from the
 * schema's "Indexed." annotations. `recipient` (UnshieldedReceive) and
 * `ciphertext` (ShieldedReceive) are deliberately excluded pending indexer
 * confirmation (spec §3.2 / §7.5) — they remain in the response type, only the
 * *filter* is conservative. `Paused`/`Unpaused`/`Misc` have no indexed fields.
 */
const INDEXED_FIELDS: Record<ContractEventType, readonly string[]> = {
  ShieldedSpend: ['nullifier'],
  ShieldedReceive: ['commitment'],
  ShieldedMint: ['commitment', 'domainSep'],
  ShieldedBurn: ['nullifier'],
  UnshieldedSpend: ['sender', 'domainSep', 'tokenType'],
  UnshieldedReceive: ['domainSep', 'tokenType'],
  UnshieldedMint: ['domainSep', 'tokenType'],
  UnshieldedBurn: ['sender', 'tokenType'],
  Paused: [],
  Unpaused: [],
  Misc: []
};

const toIndexerEventType = (type: ContractEventType): IndexerContractEventType => {
  const translated = EVENT_TYPE_TO_INDEXER[type];
  if (translated === undefined) {
    throw new IndexerProviderConfigError(`Unknown contract event type: ${String(type)}`);
  }
  return translated;
};

/**
 * Enforces: `fieldPrefixes` is only legal when `types` is present and every
 * filtered type is a standard (non-`Misc`) variant, and each `fieldName` is an
 * indexed field of *every* filtered type.
 */
const validateFieldPrefixes = (
  types: readonly ContractEventType[] | undefined,
  fieldPrefixes: readonly { fieldName: string; prefix: string }[]
): void => {
  if (types === undefined) {
    throw new IndexerProviderConfigError(
      'fieldPrefixes requires `types` to be set (and to contain only standard event types)'
    );
  }
  if (types.includes('Misc')) {
    throw new IndexerProviderConfigError(
      'fieldPrefixes cannot be combined with the `Misc` event type — Misc has no indexed fields'
    );
  }
  for (const { fieldName } of fieldPrefixes) {
    const notIndexedFor = types.filter((type) => !INDEXED_FIELDS[type].includes(fieldName));
    if (notIndexedFor.length > 0) {
      throw new IndexerProviderConfigError(
        `fieldName '${fieldName}' is not an indexed field of: ${notIndexedFor.join(', ')}`
      );
    }
  }
};

/**
 * Validates the shared filter fields and builds the indexer `ContractEventFilter`
 * for the common fields (address, types, fieldPrefixes, transactionHash). Block
 * bounds and the subscription cursor are layered on by the callers.
 */
const buildBaseFilter = (
  filter: ContractEventQueryFilter | ContractEventSubscriptionFilter
): ContractEventFilter => {
  assertIsContractAddress(filter.contractAddress);

  if (filter.types !== undefined && filter.types.length === 0) {
    throw new IndexerProviderConfigError(
      'types: [] is not allowed — omit `types` to match all event types'
    );
  }

  const types = filter.types?.map(toIndexerEventType) ?? null;

  if (filter.fieldPrefixes !== undefined && filter.fieldPrefixes.length > 0) {
    validateFieldPrefixes(filter.types, filter.fieldPrefixes);
  }

  return {
    contractAddress: filter.contractAddress,
    types,
    fieldPrefixes: filter.fieldPrefixes ?? null,
    fromBlock: null,
    toBlock: filter.toBlock ?? null,
    transactionHash: filter.transactionHash ?? null
  };
};

/**
 * Builds the variables for `CONTRACT_EVENTS_QUERY`: validated filter plus
 * inclusive `fromBlock`/`toBlock` bounds and `limit`/`offset` pagination. The
 * `defaultLimit` is applied when `page.limit` is omitted.
 */
export const buildQueryVariables = (
  filter: ContractEventQueryFilter,
  page: ContractEventsPage | undefined,
  defaultLimit: number
): ContractEventsQueryQueryVariables => ({
  filter: { ...buildBaseFilter(filter), fromBlock: filter.fromBlock ?? null },
  limit: page?.limit ?? defaultLimit,
  offset: page?.offset ?? null
});

/**
 * Builds the variables for `CONTRACT_EVENTS_SUB`: validated filter plus the
 * stream start. `{ fromId }` maps to the subscription `id` arg; `{ fromBlock }`
 * maps to `filter.fromBlock`; omitting `startAt` sends neither.
 */
export const buildSubscriptionVariables = (
  filter: ContractEventSubscriptionFilter,
  opts?: { startAt?: ContractEventCursor }
): ContractEventsSubSubscriptionVariables => {
  const base = buildBaseFilter(filter);
  const startAt = opts?.startAt;
  const fromBlock = startAt !== undefined && 'fromBlock' in startAt ? startAt.fromBlock : null;
  const id = startAt !== undefined && 'fromId' in startAt ? startAt.fromId : null;
  return {
    filter: { ...base, fromBlock },
    id
  };
};
