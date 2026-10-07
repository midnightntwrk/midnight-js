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

import type { ApolloClient, ApolloQueryResult, FetchResult, OperationVariables } from '@apollo/client/core';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { ContractAddress, TransactionId } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { ContractEvent, PositionedRecord, UnshieldedBalances } from '@midnight-ntwrk/midnight-js-types';
import * as Rx from 'rxjs';

import { toUnshieldedBalances } from './codec';
import {
  IndexerDataError,
  IndexerFormattedError,
  IndexerInvariantError,
  IndexerProviderConfigError,
  IndexerQueryError,
  IndexerSubscriptionDataError
} from './errors';
import { toContractEvent } from './events-mapping';
import type { BlockOffset, ContractEventsSubSubscriptionVariables } from './gen/graphql';
import type { InputMaybe } from './gen/schema-types';
import { hasBlock, hasContract, hasContractAction } from './mapping';
import {
  BLOCK_QUERY,
  CONTRACT_EVENTS_SUB,
  CONTRACT_STATE_QUERY,
  CONTRACT_STATE_SUB,
  LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY,
  TX_ID_QUERY,
  UNSHIELDED_BALANCE_QUERY,
  UNSHIELDED_BALANCE_SUB
} from './query-definitions';

/**
 * Where a served record sits in the chain: the block that carried it, and its
 * rank among this contract's records within that block. The indexer asserts no
 * rank, so {@link ordinalWithinBlock} counts it from the feed, and it is only as
 * stable as the order in which the indexer serves a block's actions.
 */
export type ChainPosition = {
  readonly blockHeight: number;
  readonly ordinal: number;
};

/** The identifiers of the transaction that carried a record; empty for a system transaction. */
export type Identified = {
  readonly identifiers: readonly string[];
};

/** One contract action off the per-contract feed. */
export type FeedRecord<T> = PositionedRecord<T> & Identified;

/**
 * Turns one served contract action into a stream element.
 *
 * The single point of variation between the decoded and the raw contract-state
 * stream: {@link blockOffsetToState$} is written once and bound twice by the
 * provider.
 *
 * @param hexState The action's serialized state, in the indexer's hex encoding.
 * @param protocolVersion The protocol version the indexer reported for the
 *   action's own transaction.
 */
export type ContractStateMapper<T> = (hexState: string, protocolVersion: number) => T;

/**
 * Ranks each record within its block. The rank restarts at every new block and
 * at every new connection: after a reconnect the indexer replays from the
 * subscription's original offset, so restarting there numbers the replayed
 * records exactly as they were numbered the first time.
 *
 * @param connectionCount Reads how many connections the transport has made.
 */
export const ordinalWithinBlock =
  (connectionCount: () => number) =>
  <R extends { readonly blockHeight: number }>(source: Rx.Observable<R>): Rx.Observable<R & ChainPosition> =>
    Rx.defer(() => {
      let previous: { connection: number; blockHeight: number; ordinal: number } | null = null;
      return source.pipe(
        Rx.map((record) => {
          const connection = connectionCount();
          const ordinal =
            previous?.connection === connection && previous.blockHeight === record.blockHeight
              ? previous.ordinal + 1
              : 0;
          previous = { connection, blockHeight: record.blockHeight, ordinal };
          return { ...record, ordinal };
        })
      );
    });

/**
 * Suppresses records at or behind the last one delivered. The indexer replays
 * from the subscription's original offset whenever the socket reconnects, so
 * without this a recovered stream re-delivers history as though it were new.
 */
export const dropReplayed =
  <T extends ChainPosition>(): Rx.MonoTypeOperatorFunction<T> =>
  (source) =>
    // `defer` so the cursor belongs to the subscription: sharing one would make a
    // second subscriber skip the history it has not seen.
    Rx.defer(() => {
      let last: ChainPosition | null = null;
      return source.pipe(
        Rx.filter((value) => {
          const replayed =
            last !== null &&
            (value.blockHeight < last.blockHeight ||
              (value.blockHeight === last.blockHeight && value.ordinal <= last.ordinal));
          if (replayed) {
            return false;
          }
          last = value;
          return true;
        })
      );
    });

/**
 * Starts a feed served from `blockHeight` at the transaction `transactionId`.
 * Records of that block before the named transaction are dropped, and so are
 * the named transaction's own when `inclusive` is false.
 *
 * The named transaction's rank is remembered once seen. A replay reproduces
 * ranks exactly, so the remembered rank keeps holding after a reconnect. The
 * named transaction must carry an action for the contract, which
 * {@link transactionToBlockOffset$} checks before the feed is subscribed.
 */
export const fromTransaction =
  (transactionId: TransactionId, blockHeight: number, inclusive: boolean) =>
  <R extends ChainPosition & Identified>(source: Rx.Observable<R>): Rx.Observable<R> =>
    Rx.defer(() => {
      let named: number | null = null;
      return source.pipe(
        Rx.filter((record) => {
          if (record.blockHeight !== blockHeight) {
            return record.blockHeight > blockHeight;
          }
          if (record.identifiers.includes(transactionId)) {
            named ??= record.ordinal;
            return inclusive;
          }
          return named !== null && record.ordinal > named;
        })
      );
    });

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
 * Apollo shares an in-flight subscription between identical requests without
 * replaying it, so a second subscriber would join mid-stream and miss the
 * history its offset asks for, and every rank after it.
 */
const FRESH_SUBSCRIPTION = { queryDeduplication: false };

/**
 * Waits for the transaction `identifier` to be indexed, then emits the height of
 * its block. Refuses a transaction that carries no action for `contractAddress`:
 * a stream started from it has no transaction to start at.
 */
export const transactionToBlockOffset$ =
  (apolloClient: ApolloClient, pollInterval: number) =>
  (identifier: TransactionId, contractAddress: ContractAddress) =>
    pollUntilPresent(
      apolloClient,
      TX_ID_QUERY,
      { offset: { identifier } },
      (data) => data.transactions.length !== 0,
      (data) => {
        const first = data.transactions[0];
        if (first === undefined) {
          throw new IndexerInvariantError(
            'transactionToBlockOffset$: transactions array unexpectedly empty after predicate'
          );
        }
        if (!first.contractActions.some(({ address }) => address === contractAddress)) {
          throw new IndexerProviderConfigError(
            `Transaction ${identifier} carries no action for contract ${contractAddress}`
          );
        }
        return { height: first.block.height };
      },
      pollInterval
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
 * Subscribes to `CONTRACT_STATE_SUB($address, $offset)`, the indexer's feed of
 * this contract's actions, filtered by address on the server. It serves every
 * action from the block at `offset` onward, that block included, then continues
 * live.
 *
 * Emits one element per action, mapped by `mapState`, carrying the block and the
 * identifiers of the action's transaction. A system transaction carries no
 * identifiers.
 *
 * @see {@link SubscriptionShapes} for how every branch is built on this feed.
 */
export const blockOffsetToState$ =
  <T>(mapState: ContractStateMapper<T>) =>
  (apolloClient: ApolloClient) =>
  (contractAddress: ContractAddress) =>
  (offset: BlockOffset): Rx.Observable<FeedRecord<T>> =>
    apolloClient
      .subscribe({
        query: CONTRACT_STATE_SUB,
        variables: {
          address: contractAddress,
          offset
        },
        fetchPolicy: 'no-cache',
        context: FRESH_SUBSCRIPTION
      })
      .pipe(
        withValidFetchData(),
        Rx.map((data) => {
          const contractActions = data.contractActions;
          if (!contractActions) {
            throw new IndexerSubscriptionDataError('contractActions');
          }
          return contractActions;
        }),
        Rx.map(({ state, transaction }) => ({
          value: mapState(state, transaction.protocolVersion),
          blockHeight: transaction.block.height,
          blockHash: transaction.block.hash,
          identifiers: 'identifiers' in transaction ? transaction.identifiers : []
        }))
      );

export const waitForContractToAppear =
  (apolloClient: ApolloClient, pollInterval: number) =>
  (contractAddress: ContractAddress) =>
  (offset: InputMaybe<BlockOffset>) =>
    pollUntilPresent(
      apolloClient,
      CONTRACT_STATE_QUERY,
      { address: contractAddress, offset },
      hasContract,
      (data) => {
        if (data.block === null) {
          // A served state with no block to date it is an inconsistent
          // indexer, not a contract that has yet to appear.
          throw IndexerDataError.undatedState();
        }
        return { state: data.contract.state, protocolVersion: data.block.protocolVersion };
      },
      pollInterval
    );

export const waitForBlockToAppear =
  (apolloClient: ApolloClient, pollInterval: number) => (offset: InputMaybe<BlockOffset>) =>
    pollUntilPresent(
      apolloClient,
      BLOCK_QUERY,
      { offset },
      hasBlock,
      (data) => data.block,
      pollInterval
    );

export const waitForUnshieldedBalancesToAppear =
  (apolloClient: ApolloClient, pollInterval: number) => (contractAddress: ContractAddress) =>
    pollUntilPresent(
      apolloClient,
      UNSHIELDED_BALANCE_QUERY,
      { address: contractAddress },
      hasContractAction,
      (data) => data.contractAction.unshieldedBalances,
      pollInterval
    );

/**
 * Subscribes to `UNSHIELDED_BALANCE_SUB($address, $offset)`: the same
 * server-filtered feed of this contract's actions as {@link blockOffsetToState$},
 * selecting the balances each action leaves instead of the state.
 */
export const blockOffsetToUnshieldedBalances$ =
  (apolloClient: ApolloClient) =>
  (contractAddress: ContractAddress) =>
  (offset: BlockOffset): Rx.Observable<PositionedRecord<UnshieldedBalances>> =>
    apolloClient
      .subscribe({
        query: UNSHIELDED_BALANCE_SUB,
        variables: {
          address: contractAddress,
          offset
        },
        fetchPolicy: 'no-cache',
        context: FRESH_SUBSCRIPTION
      })
      .pipe(
        withValidFetchData(),
        Rx.map((data) => {
          const contractAction = data.contractActions;
          if (!contractAction) {
            throw new IndexerSubscriptionDataError('contractActions');
          }
          return {
            value: toUnshieldedBalances(contractAction.unshieldedBalances),
            blockHeight: contractAction.transaction.block.height,
            blockHash: contractAction.transaction.block.hash
          };
        })
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
