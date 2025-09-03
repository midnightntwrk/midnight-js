/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
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

import { ApolloClient, InMemoryCache } from '@apollo/client/core/core.cjs';
import type { ApolloQueryResult, FetchResult, NormalizedCacheObject } from '@apollo/client/core/index.js';
import { from,split } from '@apollo/client/link/core/core.cjs';
import { createHttpLink } from '@apollo/client/link/http/http.cjs';
import { RetryLink } from '@apollo/client/link/retry/retry.cjs';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions/subscriptions.cjs';
import { getMainDefinition } from '@apollo/client/utilities/utilities.cjs';
import { ContractState } from '@midnight-ntwrk/compact-runtime';
import {
  type Binding,
  type ContractAddress,
  type IntentHash,
  type Proof,
  type RawTokenType,
  type SignatureEnabled,
  type TransactionId
} from '@midnight-ntwrk/ledger';
import { Transaction as LedgerTransaction, ZswapChainState } from '@midnight-ntwrk/ledger';
import type {
  BlockHashConfig,
  BlockHeightConfig,
  ContractStateObservableConfig,
  FinalizedTxData,
  PublicDataProvider,
  SegmentStatus,
  TxStatus,
  UnshieldedBalances,
  UnshieldedUtxo,
  UnshieldedUtxos} from '@midnight-ntwrk/midnight-js-types';
import {
  FailEntirely,
  FailFallible,
  InvalidProtocolSchemeError,
  SegmentFail,
  SegmentSuccess,
  SucceedEntirely} from '@midnight-ntwrk/midnight-js-types';
import { assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';
import { Buffer } from 'buffer';
import fetch from 'cross-fetch';
import { createClient } from 'graphql-ws';
import * as ws from 'isomorphic-ws';
import * as Rx from 'rxjs';
import type * as Zen from 'zen-observable-ts';

import { IndexerFormattedError } from './errors';
import {
  type BlockOffset,
  type ContractActionOffset,
  type ContractBalance,
  type DeployContractStateTxQueryQuery,
  type DeployTxQueryQuery,
  type InputMaybe,
  type LatestContractTxBlockHeightQueryQuery,
  type Segment,
  type TransactionResult,
} from './gen/graphql';
import {
  BLOCK_QUERY,
  CONTRACT_AND_ZSWAP_STATE_QUERY,
  CONTRACT_STATE_QUERY,
  CONTRACT_STATE_SUB,
  DEPLOY_CONTRACT_STATE_TX_QUERY,
  DEPLOY_TX_QUERY,
  LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY,
  QUERY_UNSHIELDED_BALANCES_WITH_OFFSET,
  TX_ID_QUERY,
  TXS_FROM_BLOCK_SUB,
  UNSHIELDED_BALANCE_QUERY,
  UNSHIELDED_BALANCE_SUB
} from './query-definitions';

type IsEmptyObject<T> = keyof T extends never ? true : false;
type ExcludeEmptyAndNull<T> = T extends null ? never : IsEmptyObject<T> extends true ? never : T;

const maybeThrowGraphQLErrors = <A, R extends FetchResult<A> | ApolloQueryResult<A>>(result: R): R => {
  if (result.errors && result.errors.length > 0) {
    throw new IndexerFormattedError(result.errors);
  }
  return result;
};

const maybeThrowApolloError = <A>(result: ApolloQueryResult<A>): ApolloQueryResult<A> => {
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result;
};

const maybeThrowErrors = <A>(queryResult: ApolloQueryResult<A>): ApolloQueryResult<A> => {
  maybeThrowApolloError(queryResult);
  return maybeThrowGraphQLErrors(queryResult);
};

const toByteArray = (s: string): Buffer => Buffer.from(s, 'hex');

const deserializeContractState = (s: string): ContractState =>
  ContractState.deserialize(toByteArray(s));

const deserializeZswapState = (s: string): ZswapChainState =>
  ZswapChainState.deserialize(toByteArray(s));

const deserializeTransaction = (s: string): LedgerTransaction<SignatureEnabled, Proof, Binding> =>
  LedgerTransaction.deserialize('signature', 'proof', 'binding', toByteArray(s));

const zenToRx = <T>(zenObservable: Zen.Observable<T>): Rx.Observable<T> =>
  new Rx.Observable((subscriber) => zenObservable.subscribe(subscriber));

/**
 * The default time (in milliseconds) to wait between queries when polling.
 */
const DEFAULT_POLL_INTERVAL = 1000;

type Block = {
  hash: string;
  height: number;
  transactions: {
    hash: string;
    identifiers: string[];
    contractActions: { state: string; address: string }[];
  }[];
}

// Assumes that the block exists.
const blockOffsetToBlock$ = (apolloClient: ApolloClient<NormalizedCacheObject>) => (offset: InputMaybe<BlockOffset>) =>
  zenToRx(
    apolloClient
      .subscribe({
        query: TXS_FROM_BLOCK_SUB,
        variables: {
          offset
        },
        fetchPolicy: 'no-cache'
      })
      .map(maybeThrowGraphQLErrors)
      .map((fetchResult) => fetchResult.data!.blocks!)
  );

const transactionIdToTransaction$ =
  (apolloClient: ApolloClient<NormalizedCacheObject>) => (identifier: TransactionId) =>
    zenToRx(
      apolloClient
        .watchQuery({
          query: TX_ID_QUERY,
          variables: {
            offset: { identifier }
          },
          pollInterval: DEFAULT_POLL_INTERVAL,
          fetchPolicy: 'no-cache',
          initialFetchPolicy: 'no-cache',
          nextFetchPolicy: 'no-cache'
        })
        .map(maybeThrowErrors)
        .filter((maybeQueryResult) => maybeQueryResult.data.transactions.length !== 0)
        .map((maybeQueryResult) => ({
          height: maybeQueryResult.data.transactions[0]!.block.height
        }))
    ).pipe(
      Rx.concatMap(blockOffsetToBlock$(apolloClient)),
      Rx.concatMap(({ transactions }) => Rx.from(transactions))
    );

type Transaction = {
  hash: string;
  identifiers: string[];
  contractActions: { state: string; address: string }[];
}

const transactionToContractState$ =
  (transactionId: TransactionId) =>
  ({ identifiers, contractActions }: Transaction) =>
    Rx.zip(identifiers, contractActions).pipe(
      Rx.skipWhile((pair) => pair[0] !== transactionId),
      Rx.map((pair) => deserializeContractState(pair[1].state))
    );

const toTxStatus = (transactionResult: TransactionResult): TxStatus => {
  const result = transactionResult.status;
  const map = {
    'FAILURE': FailEntirely,
    'PARTIAL_SUCCESS': FailFallible,
    'SUCCESS': SucceedEntirely
  } as const
  if (result === 'FAILURE' || result === 'PARTIAL_SUCCESS' || result === 'SUCCESS') {
    return map[result];
  }
  throw new Error(`Unexpected 'status' value ${result}`);
};

const toSegmentStatus = (success: boolean): SegmentStatus =>
  success ? SegmentSuccess : SegmentFail;

const toSegmentStatusMap = (transactionResult: TransactionResult): Map<number, SegmentStatus> | undefined => {
  if (transactionResult.status !== 'PARTIAL_SUCCESS') {
    return undefined;
  }

  if (!transactionResult.segments) {
    return undefined;
  }

  return new Map(
    transactionResult.segments.map((segment: Segment) => [segment.id, toSegmentStatus(segment.success)])
  );
}

export type IndexerUtxo = {
  owner: string,
  intentHash: string,
  tokenType: string,
  value: string
};

const transformIndexerUtxoToUnshieldedUtxo = (indexerUtxo: IndexerUtxo): UnshieldedUtxo => ({
  owner: indexerUtxo.owner as ContractAddress,
  intentHash: indexerUtxo.intentHash as IntentHash,
  tokenType: indexerUtxo.tokenType as RawTokenType,
  value: BigInt(indexerUtxo.value)
});

export const toUnshieldedUtxos = (createdUtxo: IndexerUtxo[], spentUtxo: IndexerUtxo[]): UnshieldedUtxos => ({
  created: createdUtxo.map(transformIndexerUtxoToUnshieldedUtxo),
  spent: spentUtxo.map(transformIndexerUtxoToUnshieldedUtxo)
});

const transformContractBalanceToUnshieldedBalance = (contractBalance: ContractBalance): UnshieldedBalances[0] => ({
  balance: BigInt(contractBalance.amount),
  tokenType: contractBalance.tokenType as RawTokenType
});

export const toUnshieldedBalances = (contractBalances: ContractBalance[]): UnshieldedBalances =>
  contractBalances.map(transformContractBalanceToUnshieldedBalance);

const blockToContractState$ = (contractAddress: ContractAddress) => (block: Block) =>
  Rx.from(block.transactions).pipe(
    Rx.concatMap(({ contractActions }) => Rx.from(contractActions)),
    Rx.filter((call) => call.address === contractAddress),
    Rx.map((call) => deserializeContractState(call.state))
  );

const contractAddressToLatestBlockOffset$ =
  (apolloClient: ApolloClient<NormalizedCacheObject>) => (contractAddress: ContractAddress) =>
    zenToRx(
      apolloClient
        .watchQuery({
          query: LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY,
          variables: {
            address: contractAddress
          },
          pollInterval: DEFAULT_POLL_INTERVAL,
          fetchPolicy: 'no-cache',
          initialFetchPolicy: 'no-cache',
          nextFetchPolicy: 'no-cache'
        })
        .map(maybeThrowErrors)
        .filter((maybeQueryResult) => maybeQueryResult.data.contractAction !== null)
        .map((queryResult) => {
          const contract = queryResult.data.contractAction as ExcludeEmptyAndNull<
            LatestContractTxBlockHeightQueryQuery['contractAction']
          >;
          return contract.transaction.block.height;
        })
    ).pipe(
      Rx.take(1),
      Rx.map((height) => ({ height }))
    );

// Assumes block already exists
const blockOffsetToContractState$ =
  (apolloClient: ApolloClient<NormalizedCacheObject>) =>
  (contractAddress: ContractAddress) =>
  (offset: InputMaybe<BlockOffset>) =>
    zenToRx(
      apolloClient
        .subscribe({
          query: CONTRACT_STATE_SUB,
          variables: {
            address: contractAddress,
            offset
          },
          fetchPolicy: 'no-cache'
        })
        .map(maybeThrowGraphQLErrors)
        .map((queryResult) => queryResult.data!.contractActions!.state)
        .map(deserializeContractState)
    );

const waitForContractToAppear =
  (apolloClient: ApolloClient<NormalizedCacheObject>) =>
  (contractAddress: ContractAddress) =>
  (offset: InputMaybe<ContractActionOffset>) =>
    zenToRx(
      apolloClient
        .watchQuery({
          query: CONTRACT_STATE_QUERY,
          variables: {
            address: contractAddress,
            offset
          },
          pollInterval: DEFAULT_POLL_INTERVAL,
          fetchPolicy: 'no-cache',
          initialFetchPolicy: 'no-cache',
          nextFetchPolicy: 'no-cache'
        })
        .map(maybeThrowErrors)
        .filter((maybeQueryResult) => maybeQueryResult.data.contractAction !== null)
        .map((queryResult) => queryResult.data.contractAction!.state)
    ).pipe(Rx.take(1));

const waitForBlockToAppear = (apolloClient: ApolloClient<NormalizedCacheObject>) => (offset: InputMaybe<BlockOffset>) =>
  zenToRx(
    apolloClient
      .watchQuery({
        query: BLOCK_QUERY,
        variables: {
          offset
        },
        pollInterval: DEFAULT_POLL_INTERVAL,
        fetchPolicy: 'no-cache',
        initialFetchPolicy: 'no-cache',
        nextFetchPolicy: 'no-cache'
      })
      .map(maybeThrowErrors)
      .filter((fetchResult) => fetchResult.data.block !== null)
  ).pipe(Rx.take(1));

const waitForUnshieldedBalancesToAppear =
  (apolloClient: ApolloClient<NormalizedCacheObject>) => (contractAddress: ContractAddress) =>
    zenToRx(
      apolloClient
        .watchQuery({
          query: UNSHIELDED_BALANCE_QUERY,
          variables: {
            address: contractAddress
          },
          pollInterval: DEFAULT_POLL_INTERVAL,
          fetchPolicy: 'no-cache',
          initialFetchPolicy: 'no-cache',
          nextFetchPolicy: 'no-cache'
        })
        .map(maybeThrowErrors)
        .filter((maybeQueryResult) => maybeQueryResult.data.contractAction !== null)
        .map((queryResult) => {
          const contractAction = queryResult.data.contractAction!;
          if ('unshieldedBalances' in contractAction) {
            return contractAction.unshieldedBalances;
          }
          if ('deploy' in contractAction) {
            return contractAction.deploy.unshieldedBalances;
          }
          return [];
        })
    ).pipe(Rx.take(1));

const blockOffsetToUnshieldedBalances$ =
  (apolloClient: ApolloClient<NormalizedCacheObject>) =>
  (contractAddress: ContractAddress) =>
  (offset: InputMaybe<BlockOffset>) =>
    zenToRx(
      apolloClient
        .subscribe({
          query: UNSHIELDED_BALANCE_SUB,
          variables: {
            address: contractAddress,
            offset
          },
          fetchPolicy: 'no-cache'
        })
        .map(maybeThrowGraphQLErrors)
        .map((queryResult) => {
          const contractAction = queryResult.data!.contractActions!;
          if ('unshieldedBalances' in contractAction) {
            return contractAction.unshieldedBalances;
          }
          if ('deploy' in contractAction) {
            return contractAction.deploy.unshieldedBalances;
          }
          return [];
        })
        .map(toUnshieldedBalances)
    );

const indexerPublicDataProviderInternal = (
  queryURL: string,
  subscriptionURL: string,
  webSocketImpl: typeof ws.WebSocket = ws.WebSocket
): PublicDataProvider => {
  const queryURLObj = new URL(queryURL);

  if (queryURLObj.protocol !== 'http:' && queryURLObj.protocol !== 'https:') {
    throw new InvalidProtocolSchemeError(queryURLObj.protocol, ['http:', 'https:']);
  }
  const subscriptionURLObj = new URL(subscriptionURL);

  if (subscriptionURLObj.protocol !== 'ws:' && subscriptionURLObj.protocol !== 'wss:') {
    throw new InvalidProtocolSchemeError(subscriptionURLObj.protocol, ['ws:', 'wss:']);
  }
  // Construct the Apollo client.
  const link = createHttpLink({ fetch, uri: queryURL });
  // Retry link with exponential backoff.
  const retryLink = new RetryLink({
    delay: {
      initial: 1000,
      max: 10000,
      jitter: true
    },
    attempts: {
      max: 5
    }
  });
  // Combine the retry link with the HTTP link to form the final link.
  const apolloLink = from([retryLink, link]);
  const apolloClient = new ApolloClient({
    link: split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
      },
      new GraphQLWsLink(createClient({ url: subscriptionURL, webSocketImpl })),
      apolloLink
    ),
    cache: new InMemoryCache()
  });
  return {
    async queryContractState(
      address: ContractAddress,
      config?: BlockHeightConfig | BlockHashConfig
    ): Promise<ContractState | null> {
      let offset: InputMaybe<ContractActionOffset>;
      if (config) {
        offset = {
          blockOffset: config.type === 'blockHeight' ? { height: config.blockHeight } : { hash: config.blockHash }
        };
      } else {
        offset = null;
      }
      const maybeContractState = await apolloClient
        .query({
          query: CONTRACT_STATE_QUERY,
          variables: {
            address,
            offset
          },
          fetchPolicy: 'no-cache'
        })
        .then(maybeThrowErrors)
        .then((queryResult) => queryResult.data?.contractAction?.state ?? null);
      return maybeContractState ? deserializeContractState(maybeContractState) : null;
    },
    async queryZSwapAndContractState(
      address: ContractAddress,
      config?: BlockHeightConfig | BlockHashConfig
    ): Promise<[ZswapChainState, ContractState] | null> {
      let offset;
      if (config) {
        offset = {
          blockOffset: config.type === 'blockHeight' ? { height: config.blockHeight } : { hash: config.blockHash }
        };
      } else {
        offset = null;
      }
      const maybeContractStates = await apolloClient
        .query({
          query: CONTRACT_AND_ZSWAP_STATE_QUERY,
          variables: {
            address,
            offset
          },
          fetchPolicy: 'no-cache'
        })
        .then(maybeThrowErrors)
        .then((queryResult) => queryResult.data.contractAction);
      return maybeContractStates
        ? [deserializeZswapState(maybeContractStates.chainState), deserializeContractState(maybeContractStates.state)]
        : null;
    },
    async queryUnshieldedBalances(
      address: ContractAddress,
      config?: BlockHeightConfig | BlockHashConfig
    ): Promise<UnshieldedBalances | null> {
      let offset: InputMaybe<ContractActionOffset>;
      if (config) {
        offset = {
          blockOffset: config.type === 'blockHeight' ? { height: config.blockHeight } : { hash: config.blockHash }
        };
      } else {
        offset = null;
      }
      const maybeUnshieldedBalances = await apolloClient
        .query({
          query: QUERY_UNSHIELDED_BALANCES_WITH_OFFSET,
          variables: {
            address,
            offset
          },
          fetchPolicy: 'no-cache'
        })
        .then(maybeThrowErrors)
        .then((queryResult) => {
          const contractAction = queryResult.data.contractAction;
          if (!contractAction) {
            return null;
          }
          if ('unshieldedBalances' in contractAction) {
            return contractAction.unshieldedBalances;
          }
          if ('deploy' in contractAction) {
            return contractAction.deploy.unshieldedBalances;
          }
          return [];
        });
      return maybeUnshieldedBalances ? toUnshieldedBalances(maybeUnshieldedBalances) : null;
    },
    async queryDeployContractState(contractAddress: ContractAddress): Promise<ContractState | null> {
      return apolloClient
        .query({
          query: DEPLOY_CONTRACT_STATE_TX_QUERY,
          variables: {
            address: contractAddress
          },
          fetchPolicy: 'no-cache'
        })
        .then((queryResult) => {
          if (queryResult.data.contractAction) {
            const contract = queryResult.data.contractAction as ExcludeEmptyAndNull<
              DeployContractStateTxQueryQuery['contractAction']
            >;
            return 'deploy' in contract
              ? contract.deploy.transaction.contractActions.find(({ address }) => address === contractAddress)!.state
              : contract.state;
          }
          return null;
        })
        .then((maybeContractState) => (maybeContractState ? deserializeContractState(maybeContractState) : null));
    },
    async watchForContractState(contractAddress: ContractAddress): Promise<ContractState> {
      return Rx.firstValueFrom(
        waitForContractToAppear(apolloClient)(contractAddress)(null).pipe(Rx.map(deserializeContractState))
      );
    },
    async watchForUnshieldedBalances(contractAddress: ContractAddress): Promise<UnshieldedBalances> {
      return Rx.firstValueFrom(
        waitForUnshieldedBalancesToAppear(apolloClient)(contractAddress).pipe(Rx.map(toUnshieldedBalances))
      );
    },
    async watchForDeployTxData(contractAddress: ContractAddress): Promise<FinalizedTxData> {
      return Rx.firstValueFrom(
        zenToRx(
          apolloClient
            .watchQuery({
              query: DEPLOY_TX_QUERY,
              variables: {
                address: contractAddress
              },
              pollInterval: DEFAULT_POLL_INTERVAL,
              fetchPolicy: 'no-cache',
              initialFetchPolicy: 'no-cache',
              nextFetchPolicy: 'no-cache'
            })
            .filter((maybeQueryResult) => maybeQueryResult.data.contractAction !== null)
            .map(maybeThrowErrors)
            .map((queryResults) => {
              const contract = queryResults.data.contractAction as ExcludeEmptyAndNull<
                DeployTxQueryQuery['contractAction']
              >;

              return 'deploy' in contract ? contract.deploy.transaction : contract.transaction;
            })
            .map(
              (transaction): FinalizedTxData => ({
                tx: deserializeTransaction(transaction.raw),
                status: toTxStatus(transaction.transactionResult),
                txId: transaction.identifiers[
                  transaction.contractActions.findIndex(({ address }) => address === contractAddress)
                ]!,
                txHash: transaction.hash,
                blockHeight: transaction.block.height,
                blockHash: transaction.block.hash,
                blockTimestamp: transaction.block.timestamp,
                blockAuthor: transaction.block.author,
                segmentStatusMap: toSegmentStatusMap(transaction.transactionResult),
                unshielded: toUnshieldedUtxos(transaction.unshieldedCreatedOutputs, transaction.unshieldedSpentOutputs),
                indexerId: transaction.id,
                protocolVersion: transaction.protocolVersion,
                fees: {
                  estimatedFees: transaction.fees.estimatedFees,
                  paidFees: transaction.fees.paidFees
                },
              })
            )
        )
      );
    },
    async watchForTxData(txId: TransactionId): Promise<FinalizedTxData> {
      return Rx.firstValueFrom(
        zenToRx(
          apolloClient
            .watchQuery({
              query: TX_ID_QUERY,
              variables: { offset: { identifier: txId } },
              pollInterval: DEFAULT_POLL_INTERVAL,
              fetchPolicy: 'no-cache',
              initialFetchPolicy: 'no-cache',
              nextFetchPolicy: 'no-cache'
            })
            .map(maybeThrowErrors)
            .filter((maybeQueryResult) => maybeQueryResult.data.transactions.length !== 0)
            .map((queryResult) => queryResult.data.transactions[0]!)
            .map(
              (transaction): FinalizedTxData => ({
                tx: deserializeTransaction(transaction.raw),
                status: toTxStatus(transaction.transactionResult),
                txId,
                txHash: transaction.hash,
                blockHeight: transaction.block.height,
                blockHash: transaction.block.hash,
                segmentStatusMap: toSegmentStatusMap(transaction.transactionResult),
                unshielded: toUnshieldedUtxos(transaction.unshieldedCreatedOutputs, transaction.unshieldedSpentOutputs),
                blockTimestamp: transaction.block.timestamp,
                blockAuthor: transaction.block.author,
                indexerId: transaction.id,
                protocolVersion: transaction.protocolVersion,
                fees: {
                  paidFees: transaction.fees.paidFees,
                  estimatedFees: transaction.fees.estimatedFees
                }
              })
            )
        )
      );
    },
    contractStateObservable(
      contractAddress: ContractAddress,
      config: ContractStateObservableConfig = { type: 'latest' }
    ): Rx.Observable<ContractState> {
      if (config.type === 'txId') {
        const contractStates = transactionIdToTransaction$(apolloClient)(config.txId).pipe(
          Rx.concatMap(transactionToContractState$(config.txId))
        );
        return (config.inclusive ?? true) ? contractStates : contractStates.pipe(Rx.skip(1));
      }
      if (config.type === 'latest') {
        return contractAddressToLatestBlockOffset$(apolloClient)(contractAddress).pipe(
          Rx.concatMap(blockOffsetToBlock$(apolloClient)),
          Rx.concatMap(blockToContractState$(contractAddress))
        );
      }
      if (config.type === 'all') {
        return waitForContractToAppear(apolloClient)(contractAddress)(null).pipe(
          Rx.concatMap(() => blockOffsetToContractState$(apolloClient)(contractAddress)(null))
        );
      }
      const offset = config.type === 'blockHash' ? { hash: config.blockHash } : { height: config.blockHeight };
      const blocks = waitForBlockToAppear(apolloClient)(offset).pipe(
        Rx.concatMap(() => blockOffsetToBlock$(apolloClient)(offset))
      );
      const maybeShortenedBlocks =
        config.type === 'blockHeight' || config.type === 'blockHash'
          ? Rx.iif(() => config.inclusive ?? true, blocks, blocks.pipe(Rx.skip(1)))
          : blocks;
      return maybeShortenedBlocks.pipe(Rx.concatMap(blockToContractState$(contractAddress)));
    },
    unshieldedBalancesObservable(
      contractAddress: ContractAddress,
      config: ContractStateObservableConfig = { type: 'latest' }
    ): Rx.Observable<UnshieldedBalances> {
      if (config.type === 'txId') {
        throw new Error('txId configuration not supported for unshielded balances observable');
      }
      if (config.type === 'latest') {
        return contractAddressToLatestBlockOffset$(apolloClient)(contractAddress).pipe(
          Rx.concatMap(blockOffsetToUnshieldedBalances$(apolloClient)(contractAddress))
        );
      }
      if (config.type === 'all') {
        return waitForUnshieldedBalancesToAppear(apolloClient)(contractAddress).pipe(
          Rx.concatMap(() => blockOffsetToUnshieldedBalances$(apolloClient)(contractAddress)(null))
        );
      }
      const offset = config.type === 'blockHash' ? { hash: config.blockHash } : { height: config.blockHeight };
      const balances = waitForBlockToAppear(apolloClient)(offset).pipe(
        Rx.concatMap(() => blockOffsetToUnshieldedBalances$(apolloClient)(contractAddress)(offset))
      );
      return config.type === 'blockHeight' || config.type === 'blockHash'
        ? Rx.iif(() => config.inclusive ?? true, balances, balances.pipe(Rx.skip(1)))
        : balances;
    }
  };
};

/**
 * Constructs a {@link PublicDataProvider} based on an {@link ApolloClient}.
 *
 * @param queryURL The URL of a GraphQL server query endpoint.
 * @param subscriptionURL The URL of a GraphQL server subscription (websocket) endpoint.
 * @param webSocketImpl An optional websocket implementation for the Apollo client to use.
 *
 * TODO: Re-examine caching when 'ContractCall' and 'ContractDeploy' have transaction identifiers included.
 */
export const indexerPublicDataProvider = (
  queryURL: string,
  subscriptionURL: string,
  webSocketImpl: typeof ws.WebSocket = ws.WebSocket
): PublicDataProvider => {
  /**
   * This current object is a wrapper around the real implementation of the indexer client constructed
   * below. This wrapper just asserts that the input contract addresses are valid, and prepends the hex
   * representation of the network ID to all input contract addresses to work around a discrepancy
   * as of ledger 3.0.0 between the contract address representation on the indexer (with network ID)
   * and the address representation in the ledger WASM API (without network ID).
   */
  const publicDataProvider = indexerPublicDataProviderInternal(queryURL, subscriptionURL, webSocketImpl);
  return {
    contractStateObservable(
      contractAddress: ContractAddress,
      config: ContractStateObservableConfig
    ): Rx.Observable<ContractState> {
      assertIsContractAddress(contractAddress);
      return publicDataProvider.contractStateObservable(contractAddress, config);
    },
    queryContractState(
      contractAddress: ContractAddress,
      config?: BlockHeightConfig | BlockHashConfig
    ): Promise<ContractState | null> {
      assertIsContractAddress(contractAddress);
      return publicDataProvider.queryContractState(contractAddress, config);
    },
    queryDeployContractState(contractAddress: ContractAddress): Promise<ContractState | null> {
      assertIsContractAddress(contractAddress);
      return publicDataProvider.queryDeployContractState(contractAddress);
    },
    queryZSwapAndContractState(
      contractAddress: ContractAddress,
      config?: BlockHeightConfig | BlockHashConfig
    ): Promise<[ZswapChainState, ContractState] | null> {
      assertIsContractAddress(contractAddress);
      return publicDataProvider.queryZSwapAndContractState(contractAddress, config);
    },
    queryUnshieldedBalances(
      contractAddress: ContractAddress,
      config?: BlockHeightConfig | BlockHashConfig
    ): Promise<UnshieldedBalances | null> {
      assertIsContractAddress(contractAddress);
      return publicDataProvider.queryUnshieldedBalances(contractAddress, config);
    },
    watchForContractState(contractAddress: ContractAddress): Promise<ContractState> {
      assertIsContractAddress(contractAddress);
      return publicDataProvider.watchForContractState(contractAddress);
    },
    watchForUnshieldedBalances(contractAddress: ContractAddress): Promise<UnshieldedBalances> {
      assertIsContractAddress(contractAddress);
      return publicDataProvider.watchForUnshieldedBalances(contractAddress);
    },
    watchForDeployTxData(contractAddress: ContractAddress): Promise<FinalizedTxData> {
      assertIsContractAddress(contractAddress);
      return publicDataProvider.watchForDeployTxData(contractAddress);
    },
    watchForTxData(txId: TransactionId): Promise<FinalizedTxData> {
      return publicDataProvider.watchForTxData(txId);
    },
    unshieldedBalancesObservable(
      contractAddress: ContractAddress,
      config: ContractStateObservableConfig
    ): Rx.Observable<UnshieldedBalances> {
      assertIsContractAddress(contractAddress);
      return publicDataProvider.unshieldedBalancesObservable(contractAddress, config);
    }
  };
};
