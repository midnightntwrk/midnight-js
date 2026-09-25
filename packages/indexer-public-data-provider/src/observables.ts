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
import type { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { ContractAddress, TransactionId } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { ContractEvent } from '@midnight-ntwrk/midnight-js-types';
import * as Rx from 'rxjs';

import { parseHexContractState, toUnshieldedBalances } from './codec';
import {
  IndexerDataError,
  IndexerFormattedError,
  IndexerInvariantError,
  IndexerQueryError,
  IndexerSubscriptionDataError
} from './errors';
import { toContractEvent } from './events-mapping';
import type { BlockOffset, ContractEventsSubSubscriptionVariables } from './gen/graphql';
import type { InputMaybe, RegularTransaction } from './gen/schema-types';
import { extractUnshieldedBalances, hasContract, hasContractAction } from './mapping';
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
  protocolVersion: number;
  transactions: Transaction[];
};

/**
 * A transaction as the block subscription serves it. `protocolVersion` is the
 * containing block's, copied onto every transaction when the block is
 * flattened: the block is what dates the serialized states its transactions
 * carry, and downstream operators see transactions with the block already
 * gone.
 */
export type Transaction = {
  hash: string;
  identifiers: readonly string[];
  protocolVersion: number;
  contractActions: readonly { state: string; address: string }[];
};

/**
 * Where a contract state sits in the chain: the block that carried it, and its
 * rank among the states for one address within that block. The rank is derived
 * from the payload the indexer delivered, not asserted by the indexer, so it is
 * only as stable as that block's transaction order.
 */
export type ChainPosition = {
  readonly height: number;
  readonly ordinal: number;
};

/** A contract state carrying the {@link ChainPosition} it was served at. */
export type PositionedContractState = ChainPosition & {
  readonly state: ContractState;
};

/**
 * Suppresses states at or behind the last one delivered. The indexer replays
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
            (value.height < last.height || (value.height === last.height && value.ordinal <= last.ordinal));
          if (replayed) {
            return false;
          }
          last = value;
          return true;
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
 * Subscribes to `TXS_FROM_BLOCK_SUB`, which emits every block on the
 * indexer from `offset` onward. **Heavy wire traffic** — no server-side
 * filter by address; every block on chain flows through the WebSocket.
 *
 * Use when the caller needs the block-grouped "states-at-this-block"
 * view (typically paired with {@link blockToPositionedContractState$} to extract
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
          protocolVersion: blocks.protocolVersion,
          transactions: blocks.transactions
            .filter((tx): tx is RegularTransaction & { hash: string; contractActions: { state: string; address: string }[] } =>
              'identifiers' in tx
            )
            .map(tx => ({
              hash: tx.hash,
              identifiers: tx.identifiers,
              protocolVersion: blocks.protocolVersion,
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
  ({ identifiers, contractActions, protocolVersion }: Transaction) =>
    Rx.zip(identifiers, contractActions).pipe(
      Rx.skipWhile((pair) => pair[0] !== transactionId),
      Rx.map((pair) => parseHexContractState(pair[1].state, protocolVersion))
    );

/**
 * Walks a block's transactions and emits one {@link PositionedContractState}
 * per `contractAction` whose `address` matches `contractAddress`. Client-side
 * filter. Paired with {@link blockOffsetToBlock$} to produce the
 * block-grouped "states-at-this-block" view used by `contractStateObservable`
 * for the `latest`, `blockHeight`, and `blockHash` branches.
 *
 * Multiple states can come from a single block (every matching contract
 * action in every transaction of that block emits one), so the position
 * carries an ordinal as well as a height — see {@link dropReplayed}.
 */
export const blockToPositionedContractState$ =
  (contractAddress: ContractAddress) =>
  (block: Block): Rx.Observable<PositionedContractState> =>
    // Filtering eagerly is what makes the ordinal deterministic; deserializing stays
    // inside the pipe so a state that fails to decode does not withhold the states
    // that precede it in the same block.
    Rx.from(
      block.transactions
        .flatMap(({ contractActions }) => contractActions)
        .filter((call) => call.address === contractAddress)
    ).pipe(
      Rx.map((call, ordinal) => ({
        height: block.height,
        ordinal,
        state: parseHexContractState(call.state, block.protocolVersion)
      }))
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
 * Emits one {@link ContractState} per state change (per-change feed, not
 * per-block snapshot). Used by `contractStateObservable.all`; NOT used by
 * `latest`/`blockHeight`/`blockHash`, which need the per-block view from
 * {@link blockOffsetToBlock$} + {@link blockToPositionedContractState$}.
 *
 * Carries no position, so {@link dropReplayed} cannot guard it: a reconnect
 * re-delivers the states the indexer replays.
 *
 * Assumes block already exists.
 *
 * @see {@link SubscriptionShapes} for why a per-change feed cannot serve the
 * block-anchored branches.
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
          return contractActions;
        }),
        Rx.map((contractActions) =>
          parseHexContractState(contractActions.state, contractActions.transaction.protocolVersion)
        )
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
