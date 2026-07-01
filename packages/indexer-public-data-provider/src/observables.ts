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

import type { ApolloClient, ApolloQueryResult, FetchResult, OperationVariables } from '@apollo/client/core';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { ContractAddress, TransactionId } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { ContractEvent } from '@midnight-ntwrk/midnight-js-types';
import * as Rx from 'rxjs';

import { parseHexContractState, toUnshieldedBalances } from './codec';
import {
  IndexerFormattedError,
  IndexerInvariantError,
  IndexerQueryError,
  IndexerSubscriptionDataError
} from './errors';
import { toContractEvent } from './events-mapping';
import type {
  BlockOffset,
  ContractActionOffset,
  ContractEventsSubSubscriptionVariables,
  InputMaybe,
  RegularTransaction
} from './gen/graphql';
import { extractUnshieldedBalances, hasContractAction } from './mapping';
import {
  BLOCK_QUERY,
  CONTRACT_EVENTS_SUB,
  CONTRACT_STATE_QUERY,
  CONTRACT_STATE_SUB,
  LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY,
  TX_ID_QUERY,
  TXS_FROM_BLOCK_SUB,
  UNSHIELDED_BALANCE_QUERY,
  UNSHIELDED_BALANCE_SUB
} from './query-definitions';

export type Block = {
  hash: string;
  height: number;
  transactions: {
    hash: string;
    identifiers: readonly string[];
    contractActions: readonly { state: string; address: string }[];
  }[];
};

export type Transaction = {
  hash: string;
  identifiers: readonly string[];
  contractActions: readonly { state: string; address: string }[];
};

export const maybeThrowQueryError = <R extends { error?: { message: string } }>(result: R): R => {
  if (result.error) {
    throw new IndexerQueryError(result.error.message, { cause: result.error });
  }
  return result;
};

export const withCompleteQueryData = <A>(): Rx.OperatorFunction<ApolloQueryResult<A>, A> =>
  Rx.pipe(
    Rx.filter((result: ApolloQueryResult<A>) => {
      if (result.error) throw new IndexerQueryError(result.error.message, { cause: result.error });
      return result.dataState === 'complete';
    }),
    // Safe: dataState === 'complete' guarantees data is Complete<A> which defaults to A
    Rx.map((result: ApolloQueryResult<A>) => result.data as A)
  );

export const withValidFetchData = <A>(): Rx.OperatorFunction<FetchResult<A>, NonNullable<A>> =>
  Rx.pipe(
    Rx.map((result: FetchResult<A>) => {
      if (result.errors && result.errors.length > 0) {
        throw new IndexerFormattedError(result.errors);
      }
      return result.data;
    }),
    Rx.filter((data): data is NonNullable<A> => data != null)
  );

/**
 * Polls `query` immediately and then every `pollInterval` ms until
 * `predicate(data)` holds, then emits `mapFn(data)` once and completes.
 * Centralizes the cache policy (`no-cache` on initial/next/fetch), the
 * `withCompleteQueryData` unwrap, and the `take(1)` semantics that every
 * poll-until-first-match call site previously hand-rolled.
 *
 * Two forms:
 * 1. Type-guard `predicate` — `mapFn` receives the narrowed type and may
 *    access fields the predicate proved present without a cast.
 * 2. Plain `boolean` `predicate` — `mapFn` receives the un-narrowed
 *    `TQuery` and must cast or guard inside its body (the established
 *    `ExcludeEmptyAndNull<>` pattern at sites where the codegen union
 *    includes empty-object members).
 */
export function pollUntilPresent<TQuery, TVars extends OperationVariables, TNarrowed extends TQuery, TResult>(
  apolloClient: ApolloClient,
  query: TypedDocumentNode<TQuery, TVars>,
  variables: TVars,
  predicate: (data: TQuery) => data is TNarrowed,
  mapFn: (data: TNarrowed) => TResult,
  pollInterval: number
): Rx.Observable<TResult>;
export function pollUntilPresent<TQuery, TVars extends OperationVariables, TResult>(
  apolloClient: ApolloClient,
  query: TypedDocumentNode<TQuery, TVars>,
  variables: TVars,
  predicate: (data: TQuery) => boolean,
  mapFn: (data: TQuery) => TResult,
  pollInterval: number
): Rx.Observable<TResult>;
export function pollUntilPresent<TQuery, TVars extends OperationVariables, TResult>(
  apolloClient: ApolloClient,
  query: TypedDocumentNode<TQuery, TVars>,
  variables: TVars,
  predicate: (data: TQuery) => boolean,
  mapFn: (data: TQuery) => TResult,
  pollInterval: number
): Rx.Observable<TResult> {
  return apolloClient
    .watchQuery({
      query,
      variables,
      pollInterval,
      fetchPolicy: 'no-cache',
      initialFetchPolicy: 'no-cache',
      nextFetchPolicy: 'no-cache'
    })
    .pipe(
      withCompleteQueryData<TQuery>(),
      Rx.filter(predicate),
      Rx.map(mapFn),
      Rx.take(1)
    );
}

/**
 * Subscribes to `TXS_FROM_BLOCK_SUB`, which emits every block on the
 * indexer from `offset` onward. **Heavy wire traffic** — no server-side
 * filter by address; every block on chain flows through the WebSocket.
 *
 * Use when the caller needs the block-grouped "states-at-this-block"
 * view (typically paired with {@link blockToContractState$} to extract
 * contract states from each block's transactions). For a continuous
 * change feed of a single contract, prefer {@link blockOffsetToContractState$}
 * — it's server-side filtered (light).
 *
 * Assumes that the block at `offset` exists.
 */
export const blockOffsetToBlock$ = (apolloClient: ApolloClient) => (offset: InputMaybe<BlockOffset>) =>
  apolloClient
    .subscribe({
      query: TXS_FROM_BLOCK_SUB,
      variables: {
        offset
      },
      fetchPolicy: 'no-cache'
    })
    .pipe(
      withValidFetchData(),
      Rx.map((data) => {
        const blocks = data.blocks;
        if (!blocks) {
          throw new IndexerSubscriptionDataError('blocks');
        }
        return {
          hash: blocks.hash,
          height: blocks.height,
          transactions: blocks.transactions
            .filter((tx): tx is RegularTransaction & { hash: string; contractActions: { state: string; address: string }[] } =>
              'identifiers' in tx
            )
            .map(tx => ({
              hash: tx.hash,
              identifiers: tx.identifiers,
              contractActions: tx.contractActions
            }))
        };
      })
    );

export const transactionIdToTransaction$ =
  (apolloClient: ApolloClient, pollInterval: number) => (identifier: TransactionId) =>
    pollUntilPresent(
      apolloClient,
      TX_ID_QUERY,
      { offset: { identifier } },
      (data) => data.transactions.length !== 0,
      (data) => {
        const first = data.transactions[0];
        if (first === undefined) {
          throw new IndexerInvariantError(
            'transactionIdToTransaction$: transactions array unexpectedly empty after predicate'
          );
        }
        return { height: first.block.height };
      },
      pollInterval
    ).pipe(
      Rx.concatMap(blockOffsetToBlock$(apolloClient)),
      Rx.concatMap(({ transactions }) => Rx.from(transactions))
    );

export const transactionToContractState$ =
  (transactionId: TransactionId) =>
  ({ identifiers, contractActions }: Transaction) =>
    Rx.zip(identifiers, contractActions).pipe(
      Rx.skipWhile((pair) => pair[0] !== transactionId),
      Rx.map((pair) => parseHexContractState(pair[1].state))
    );

/**
 * Walks a block's transactions and emits one {@link ContractState} per
 * `contractAction` whose `address` matches `contractAddress`. Client-side
 * filter. Paired with {@link blockOffsetToBlock$} to produce the
 * block-grouped "states-at-this-block" view used by `contractStateObservable`
 * for the `latest`, `blockHeight`, and `blockHash` branches.
 *
 * Multiple states can come from a single block (every matching contract
 * action in every transaction of that block emits one).
 */
export const blockToContractState$ = (contractAddress: ContractAddress) => (block: Block) =>
  Rx.from(block.transactions).pipe(
    Rx.concatMap(({ contractActions }) => Rx.from(contractActions)),
    Rx.filter((call) => call.address === contractAddress),
    Rx.map((call) => parseHexContractState(call.state))
  );

export const contractAddressToLatestBlockOffset$ =
  (apolloClient: ApolloClient, pollInterval: number) => (contractAddress: ContractAddress) =>
    pollUntilPresent(
      apolloClient,
      LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY,
      { address: contractAddress },
      hasContractAction,
      (data) => ({ height: data.contractAction.transaction.block.height }),
      pollInterval
    );

/**
 * Subscribes to `CONTRACT_STATE_SUB($address, $offset)`. **Light wire
 * traffic** — server-side filtered by `contractAddress`; only state
 * changes for this contract flow through the WebSocket.
 *
 * Emits one {@link ContractState} per state change (per-change feed,
 * not per-block snapshot). Used by `contractStateObservable.all` where
 * the change-feed semantics fit. Not used by `latest`/`blockHeight`/`blockHash`
 * — those need the per-block view from {@link blockOffsetToBlock$} +
 * {@link blockToContractState$} because `Rx.skip(1)` on a per-change
 * stream would skip a single change rather than a single block, giving
 * `inclusive: false` a subtly different meaning.
 *
 * Assumes block already exists.
 */
export const blockOffsetToContractState$ =
  (apolloClient: ApolloClient) =>
  (contractAddress: ContractAddress) =>
  (offset: InputMaybe<BlockOffset>) =>
    apolloClient
      .subscribe({
        query: CONTRACT_STATE_SUB,
        variables: {
          address: contractAddress,
          offset
        },
        fetchPolicy: 'no-cache'
      })
      .pipe(
        withValidFetchData(),
        Rx.map((data) => {
          const contractActions = data.contractActions;
          if (!contractActions) {
            throw new IndexerSubscriptionDataError('contractActions');
          }
          return contractActions.state;
        }),
        Rx.map(parseHexContractState)
      );

export const waitForContractToAppear =
  (apolloClient: ApolloClient, pollInterval: number) =>
  (contractAddress: ContractAddress) =>
  (offset: InputMaybe<ContractActionOffset>) =>
    pollUntilPresent(
      apolloClient,
      CONTRACT_STATE_QUERY,
      { address: contractAddress, offset },
      hasContractAction,
      (data) => data.contractAction.state,
      pollInterval
    );

export const waitForBlockToAppear =
  (apolloClient: ApolloClient, pollInterval: number) => (offset: InputMaybe<BlockOffset>) =>
    pollUntilPresent(
      apolloClient,
      BLOCK_QUERY,
      { offset },
      (data) => data.block !== null,
      (data) => data,
      pollInterval
    );

export const waitForUnshieldedBalancesToAppear =
  (apolloClient: ApolloClient, pollInterval: number) => (contractAddress: ContractAddress) =>
    pollUntilPresent(
      apolloClient,
      UNSHIELDED_BALANCE_QUERY,
      { address: contractAddress },
      hasContractAction,
      (data) => extractUnshieldedBalances(data.contractAction, 'waitForUnshieldedBalancesToAppear'),
      pollInterval
    );

/**
 * Subscribes to `UNSHIELDED_BALANCE_SUB($address, $offset)`. **Light wire
 * traffic** — server-side filtered by `contractAddress`. The indexer has
 * no `BALANCES_FROM_BLOCK_SUB` analogue, so this is the only subscription
 * for balances regardless of config branch. `unshieldedBalancesObservable`
 * uses it uniformly across `latest`/`all`/`blockHeight`/`blockHash` —
 * no light/heavy asymmetry analogous to {@link contractStateObservable}.
 */
export const blockOffsetToUnshieldedBalances$ =
  (apolloClient: ApolloClient) =>
  (contractAddress: ContractAddress) =>
  (offset: InputMaybe<BlockOffset>) =>
    apolloClient
      .subscribe({
        query: UNSHIELDED_BALANCE_SUB,
        variables: {
          address: contractAddress,
          offset
        },
        fetchPolicy: 'no-cache'
      })
      .pipe(
        withValidFetchData(),
        Rx.map((data) => {
          const contractAction = data.contractActions;
          if (!contractAction) {
            throw new IndexerSubscriptionDataError('contractActions');
          }
          return extractUnshieldedBalances(contractAction, 'blockOffsetToUnshieldedBalances$');
        }),
        Rx.map(toUnshieldedBalances)
      );

/**
 * Subscribes to `CONTRACT_EVENTS_SUB` with pre-built, pre-validated `variables`.
 * The indexer replays historical events from the supplied cursor in monotonic
 * `id` order, then continues live in the same stream. `toBlock` (carried in
 * `variables.filter`) completes the stream server-side; a missing
 * `contractEvents` field surfaces as {@link IndexerSubscriptionDataError} and
 * GraphQL errors as {@link IndexerFormattedError} (via {@link withValidFetchData})
 * — never a silent completion.
 */
export const contractEvents$ =
  (apolloClient: ApolloClient) =>
  (variables: ContractEventsSubSubscriptionVariables): Rx.Observable<ContractEvent> =>
    apolloClient
      .subscribe({
        query: CONTRACT_EVENTS_SUB,
        variables,
        fetchPolicy: 'no-cache'
      })
      .pipe(
        withValidFetchData(),
        Rx.map((data) => {
          const node = data.contractEvents;
          if (!node) {
            throw new IndexerSubscriptionDataError('contractEvents');
          }
          return toContractEvent(node);
        })
      );
