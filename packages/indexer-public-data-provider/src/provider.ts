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

import type { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  type ContractAddress,
  LedgerParameters,
  type TransactionId,
  type ZswapChainState
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type {
  BlockHashConfig,
  BlockHeightConfig,
  ContractStateObservableConfig,
  FinalizedTxData,
  PublicDataProvider,
  UnshieldedBalances
} from '@midnight-ntwrk/midnight-js-types';
import * as ws from 'isomorphic-ws';
import * as Rx from 'rxjs';

import {
  parseHexContractState,
  parseHexLedgerParameters,
  parseHexTransaction,
  parseHexZswapState,
  toSegmentStatusMap,
  toTxStatus,
  toUnshieldedBalances,
  toUnshieldedUtxos
} from './codec';
import { validateAndWarnUrls } from './config';
import { IndexerDataError, IndexerProviderConfigError } from './errors';
import type {
  ContractActionOffset,
  DeployContractStateTxQueryQuery,
  DeployTxQueryQuery,
  InputMaybe,
  RegularTransaction
} from './gen/graphql';
import { type ExcludeEmptyAndNull, isRegularTransaction, toFinalizedDeployTxData } from './mapping';
import {
  blockOffsetToBlock$,
  blockOffsetToContractState$,
  blockOffsetToUnshieldedBalances$,
  blockToContractState$,
  contractAddressToLatestBlockOffset$,
  DEFAULT_POLL_INTERVAL,
  maybeThrowQueryError,
  transactionIdToTransaction$,
  transactionToContractState$,
  waitForBlockToAppear,
  waitForContractToAppear,
  waitForUnshieldedBalancesToAppear,
  withCompleteQueryData
} from './observables';
import {
  CONTRACT_AND_ZSWAP_STATE_QUERY,
  CONTRACT_STATE_QUERY,
  DEPLOY_CONTRACT_STATE_TX_QUERY,
  DEPLOY_TX_QUERY,
  QUERY_UNSHIELDED_BALANCES_WITH_OFFSET,
  TX_ID_QUERY
} from './query-definitions';
import { createApolloClient } from './transport';

/**
 * Internal factory: constructs a {@link PublicDataProvider} without
 * `assertIsContractAddress` calls on input. The outer wrapper in `index.ts`
 * handles input validation and remains the supported entry point.
 *
 * TODO: Re-examine caching when 'ContractCall' and 'ContractDeploy' have transaction identifiers included.
 */
export const indexerPublicDataProviderInternal = (
  queryURL: string,
  subscriptionURL: string,
  webSocketImpl: typeof ws.WebSocket = ws.WebSocket
): PublicDataProvider => {
  validateAndWarnUrls(queryURL, subscriptionURL);
  const apolloClient = createApolloClient(queryURL, subscriptionURL, webSocketImpl);

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
        .then(maybeThrowQueryError)
        .then((queryResult) => queryResult.data?.contractAction?.state ?? null);
      return maybeContractState ? parseHexContractState(maybeContractState) : null;
    },
    async queryZSwapAndContractState(
      address: ContractAddress,
      config?: BlockHeightConfig | BlockHashConfig
    ): Promise<[ZswapChainState, ContractState, LedgerParameters] | null> {
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
        .then(maybeThrowQueryError)
        .then((queryResult) => queryResult.data?.contractAction);
      return maybeContractStates
        ? [
            parseHexZswapState(maybeContractStates.zswapState),
            parseHexContractState(maybeContractStates.state),
            maybeContractStates.transaction?.block?.ledgerParameters
              ? parseHexLedgerParameters(maybeContractStates.transaction.block.ledgerParameters)
              : LedgerParameters.initialParameters()
          ]
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
        .then(maybeThrowQueryError)
        .then((queryResult) => {
          const contractAction = queryResult.data?.contractAction;
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
          if (queryResult.data?.contractAction) {
            const contract = queryResult.data.contractAction as ExcludeEmptyAndNull<
              DeployContractStateTxQueryQuery['contractAction']
            >;
            if (!('deploy' in contract)) {
              return contract.state;
            }
            const deployAction = contract.deploy.transaction.contractActions.find(
              ({ address }) => address === contractAddress
            );
            if (!deployAction) {
              throw IndexerDataError.missingContractAction(contractAddress);
            }
            return deployAction.state;
          }
          return null;
        })
        .then((maybeContractState) => (maybeContractState ? parseHexContractState(maybeContractState) : null));
    },
    async watchForContractState(contractAddress: ContractAddress): Promise<ContractState> {
      return Rx.firstValueFrom(
        waitForContractToAppear(apolloClient)(contractAddress)(null).pipe(Rx.map(parseHexContractState))
      );
    },
    async watchForUnshieldedBalances(contractAddress: ContractAddress): Promise<UnshieldedBalances> {
      return Rx.firstValueFrom(
        waitForUnshieldedBalancesToAppear(apolloClient)(contractAddress).pipe(Rx.map(toUnshieldedBalances))
      );
    },
    async watchForDeployTxData(contractAddress: ContractAddress): Promise<FinalizedTxData> {
      return Rx.firstValueFrom(
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
          .pipe(
            withCompleteQueryData(),
            Rx.filter((data) => data.contractAction !== null),
            Rx.map((data) => {
              const contract = data.contractAction as ExcludeEmptyAndNull<
                DeployTxQueryQuery['contractAction']
              >;

              return 'deploy' in contract ? contract.deploy.transaction : contract.transaction;
            }),
            Rx.filter(isRegularTransaction),
            Rx.map((transaction: RegularTransaction) =>
              toFinalizedDeployTxData(contractAddress, transaction)
            )
          )
      );
    },
    async watchForTxData(txId: TransactionId): Promise<FinalizedTxData> {
      return Rx.firstValueFrom(
        apolloClient
          .watchQuery({
            query: TX_ID_QUERY,
            variables: { offset: { identifier: txId } },
            pollInterval: DEFAULT_POLL_INTERVAL,
            fetchPolicy: 'no-cache',
            initialFetchPolicy: 'no-cache',
            nextFetchPolicy: 'no-cache'
          })
          .pipe(
            withCompleteQueryData(),
            Rx.filter((data) => data.transactions.length !== 0),
            Rx.map((data) => data.transactions[0]!),
            Rx.filter(isRegularTransaction),
            Rx.map(
              (transaction: RegularTransaction): FinalizedTxData => ({
                tx: parseHexTransaction(transaction.raw),
                status: toTxStatus(transaction.transactionResult),
                txId,
                txHash: transaction.hash,
                identifiers: transaction.identifiers,
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
          Rx.filter(isRegularTransaction),
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
        throw new IndexerProviderConfigError(
          'txId configuration not supported for unshielded balances observable'
        );
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
