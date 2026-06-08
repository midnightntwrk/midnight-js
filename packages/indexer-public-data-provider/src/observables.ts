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

import type { ApolloClient, ApolloQueryResult, FetchResult } from '@apollo/client/core';
import type { ContractAddress, TransactionId } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import * as Rx from 'rxjs';

import { parseHexContractState, toUnshieldedBalances } from './codec';
import { IndexerFormattedError, IndexerQueryError, IndexerSubscriptionDataError } from './errors';
import type {
  BlockOffset,
  ContractActionOffset,
  InputMaybe,
  LatestContractTxBlockHeightQueryQuery,
  RegularTransaction
} from './gen/graphql';
import { type ExcludeEmptyAndNull, hasContractAction } from './mapping';
import {
  BLOCK_QUERY,
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

// Assumes that the block exists.
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
    apolloClient
      .watchQuery({
        query: TX_ID_QUERY,
        variables: {
          offset: { identifier }
        },
        pollInterval,
        fetchPolicy: 'no-cache',
        initialFetchPolicy: 'no-cache',
        nextFetchPolicy: 'no-cache'
      })
      .pipe(
        withCompleteQueryData(),
        Rx.filter((data) => data.transactions.length !== 0),
        Rx.map((data) => ({
          height: data.transactions[0]!.block.height
        })),
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

export const blockToContractState$ = (contractAddress: ContractAddress) => (block: Block) =>
  Rx.from(block.transactions).pipe(
    Rx.concatMap(({ contractActions }) => Rx.from(contractActions)),
    Rx.filter((call) => call.address === contractAddress),
    Rx.map((call) => parseHexContractState(call.state))
  );

export const contractAddressToLatestBlockOffset$ =
  (apolloClient: ApolloClient, pollInterval: number) => (contractAddress: ContractAddress) =>
    apolloClient
      .watchQuery({
        query: LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY,
        variables: {
          address: contractAddress
        },
        pollInterval,
        fetchPolicy: 'no-cache',
        initialFetchPolicy: 'no-cache',
        nextFetchPolicy: 'no-cache'
      })
      .pipe(
        withCompleteQueryData(),
        Rx.filter((data) => data.contractAction !== null),
        Rx.map((data) => {
          const contract = data.contractAction as ExcludeEmptyAndNull<
            LatestContractTxBlockHeightQueryQuery['contractAction']
          >;
          return contract.transaction.block.height;
        }),
        Rx.take(1),
        Rx.map((height) => ({ height }))
      );

// Assumes block already exists
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
    apolloClient
      .watchQuery({
        query: CONTRACT_STATE_QUERY,
        variables: {
          address: contractAddress,
          offset
        },
        pollInterval,
        fetchPolicy: 'no-cache',
        initialFetchPolicy: 'no-cache',
        nextFetchPolicy: 'no-cache'
      })
      .pipe(
        withCompleteQueryData(),
        Rx.filter(hasContractAction),
        Rx.map((data) => data.contractAction.state),
        Rx.take(1)
      );

export const waitForBlockToAppear =
  (apolloClient: ApolloClient, pollInterval: number) => (offset: InputMaybe<BlockOffset>) =>
    apolloClient
      .watchQuery({
        query: BLOCK_QUERY,
        variables: {
          offset
        },
        pollInterval,
        fetchPolicy: 'no-cache',
        initialFetchPolicy: 'no-cache',
        nextFetchPolicy: 'no-cache'
      })
      .pipe(
        withCompleteQueryData(),
        Rx.filter((data) => data.block !== null),
        Rx.take(1)
      );

export const waitForUnshieldedBalancesToAppear =
  (apolloClient: ApolloClient, pollInterval: number) => (contractAddress: ContractAddress) =>
    apolloClient
      .watchQuery({
        query: UNSHIELDED_BALANCE_QUERY,
        variables: {
          address: contractAddress
        },
        pollInterval,
        fetchPolicy: 'no-cache',
        initialFetchPolicy: 'no-cache',
        nextFetchPolicy: 'no-cache'
      })
      .pipe(
        withCompleteQueryData(),
        Rx.filter(hasContractAction),
        Rx.map((data) => {
          const { contractAction } = data;
          if ('unshieldedBalances' in contractAction) {
            return contractAction.unshieldedBalances;
          }
          if ('deploy' in contractAction) {
            return contractAction.deploy.unshieldedBalances;
          }
          return [];
        }),
        Rx.take(1)
      );

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
          if ('unshieldedBalances' in contractAction) {
            return contractAction.unshieldedBalances;
          }
          if ('deploy' in contractAction) {
            return contractAction.deploy.unshieldedBalances;
          }
          return [];
        }),
        Rx.map(toUnshieldedBalances)
      );
