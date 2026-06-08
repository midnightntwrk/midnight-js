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
import { assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';
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
import { IndexerDataError, IndexerInvariantError, IndexerProviderConfigError } from './errors';
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
import type { ApolloHandle } from './transport';

/**
 * Indexer-backed `PublicDataProvider`. Every method that takes a
 * `ContractAddress` validates the input up front via
 * `assertIsContractAddress`. The constructor shape `(handle, pollInterval)`
 * maps directly onto `Layer.scoped` in the future Effect migration (#843).
 *
 * TODO: Re-examine caching when 'ContractCall' and 'ContractDeploy' have
 * transaction identifiers included.
 */
export class IndexerPublicDataProvider implements PublicDataProvider {
  private readonly handle: ApolloHandle;
  private readonly pollInterval: number;

  constructor(handle: ApolloHandle, pollInterval: number) {
    this.handle = handle;
    this.pollInterval = pollInterval;
  }

  /**
   * Releases the WebSocket connection and Apollo state. Delegates to
   * {@link ApolloHandle.dispose} — see its docs for the
   * repeat/concurrent/rejection-replay semantics.
   */
  dispose(): Promise<void> {
    return this.handle.dispose();
  }

  private get client() {
    return this.handle.client;
  }

  queryContractState(
    address: ContractAddress,
    config?: BlockHeightConfig | BlockHashConfig
  ): Promise<ContractState | null> {
    assertIsContractAddress(address);
    const offset: InputMaybe<ContractActionOffset> = config
      ? {
          blockOffset:
            config.type === 'blockHeight' ? { height: config.blockHeight } : { hash: config.blockHash }
        }
      : null;
    return this.client
      .query({
        query: CONTRACT_STATE_QUERY,
        variables: {
          address,
          offset
        },
        fetchPolicy: 'no-cache'
      })
      .then(maybeThrowQueryError)
      .then((queryResult) => queryResult.data?.contractAction?.state ?? null)
      .then((maybeContractState) => (maybeContractState ? parseHexContractState(maybeContractState) : null));
  }

  queryZSwapAndContractState(
    address: ContractAddress,
    config?: BlockHeightConfig | BlockHashConfig
  ): Promise<[ZswapChainState, ContractState, LedgerParameters] | null> {
    assertIsContractAddress(address);
    const offset = config
      ? {
          blockOffset:
            config.type === 'blockHeight' ? { height: config.blockHeight } : { hash: config.blockHash }
        }
      : null;
    return this.client
      .query({
        query: CONTRACT_AND_ZSWAP_STATE_QUERY,
        variables: {
          address,
          offset
        },
        fetchPolicy: 'no-cache'
      })
      .then(maybeThrowQueryError)
      .then((queryResult) => queryResult.data?.contractAction)
      .then((maybeContractStates) =>
        maybeContractStates
          ? ([
              parseHexZswapState(maybeContractStates.zswapState),
              parseHexContractState(maybeContractStates.state),
              maybeContractStates.transaction?.block?.ledgerParameters
                ? parseHexLedgerParameters(maybeContractStates.transaction.block.ledgerParameters)
                : LedgerParameters.initialParameters()
            ] as [ZswapChainState, ContractState, LedgerParameters])
          : null
      );
  }

  queryUnshieldedBalances(
    address: ContractAddress,
    config?: BlockHeightConfig | BlockHashConfig
  ): Promise<UnshieldedBalances | null> {
    assertIsContractAddress(address);
    const offset: InputMaybe<ContractActionOffset> = config
      ? {
          blockOffset:
            config.type === 'blockHeight' ? { height: config.blockHeight } : { hash: config.blockHash }
        }
      : null;
    return this.client
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
      })
      .then((maybeUnshieldedBalances) =>
        maybeUnshieldedBalances ? toUnshieldedBalances(maybeUnshieldedBalances) : null
      );
  }

  queryDeployContractState(contractAddress: ContractAddress): Promise<ContractState | null> {
    assertIsContractAddress(contractAddress);
    return this.client
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
  }

  watchForContractState(contractAddress: ContractAddress): Promise<ContractState> {
    assertIsContractAddress(contractAddress);
    return Rx.firstValueFrom(
      waitForContractToAppear(this.client, this.pollInterval)(contractAddress)(null).pipe(Rx.map(parseHexContractState))
    );
  }

  watchForUnshieldedBalances(contractAddress: ContractAddress): Promise<UnshieldedBalances> {
    assertIsContractAddress(contractAddress);
    return Rx.firstValueFrom(
      waitForUnshieldedBalancesToAppear(this.client, this.pollInterval)(contractAddress).pipe(Rx.map(toUnshieldedBalances))
    );
  }

  watchForDeployTxData(contractAddress: ContractAddress): Promise<FinalizedTxData> {
    assertIsContractAddress(contractAddress);
    return Rx.firstValueFrom(
      this.client
        .watchQuery({
          query: DEPLOY_TX_QUERY,
          variables: {
            address: contractAddress
          },
          pollInterval: this.pollInterval,
          fetchPolicy: 'no-cache',
          initialFetchPolicy: 'no-cache',
          nextFetchPolicy: 'no-cache'
        })
        .pipe(
          withCompleteQueryData(),
          Rx.filter((data) => data.contractAction !== null),
          Rx.map((data) => {
            const contract = data.contractAction as ExcludeEmptyAndNull<DeployTxQueryQuery['contractAction']>;

            return 'deploy' in contract ? contract.deploy.transaction : contract.transaction;
          }),
          Rx.filter(isRegularTransaction),
          Rx.map((transaction: RegularTransaction) => toFinalizedDeployTxData(contractAddress, transaction))
        )
    );
  }

  watchForTxData(txId: TransactionId): Promise<FinalizedTxData> {
    return Rx.firstValueFrom(
      this.client
        .watchQuery({
          query: TX_ID_QUERY,
          variables: { offset: { identifier: txId } },
          pollInterval: this.pollInterval,
          fetchPolicy: 'no-cache',
          initialFetchPolicy: 'no-cache',
          nextFetchPolicy: 'no-cache'
        })
        .pipe(
          withCompleteQueryData(),
          Rx.filter((data) => data.transactions.length !== 0),
          Rx.map((data) => {
            const first = data.transactions[0];
            if (first === undefined) {
              throw new IndexerInvariantError(
                'watchForTxData: empty transactions array passed the non-empty filter'
              );
            }
            return first;
          }),
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
  }

  contractStateObservable(
    contractAddress: ContractAddress,
    config: ContractStateObservableConfig = { type: 'latest' }
  ): Rx.Observable<ContractState> {
    assertIsContractAddress(contractAddress);
    if (config.type === 'txId') {
      const contractStates = transactionIdToTransaction$(this.client, this.pollInterval)(config.txId).pipe(
        Rx.filter(isRegularTransaction),
        Rx.concatMap(transactionToContractState$(config.txId))
      );
      return (config.inclusive ?? true) ? contractStates : contractStates.pipe(Rx.skip(1));
    }
    if (config.type === 'latest') {
      return contractAddressToLatestBlockOffset$(this.client, this.pollInterval)(contractAddress).pipe(
        Rx.concatMap(blockOffsetToBlock$(this.client)),
        Rx.concatMap(blockToContractState$(contractAddress))
      );
    }
    if (config.type === 'all') {
      return waitForContractToAppear(this.client, this.pollInterval)(contractAddress)(null).pipe(
        Rx.concatMap(() => blockOffsetToContractState$(this.client)(contractAddress)(null))
      );
    }
    const offset = config.type === 'blockHash' ? { hash: config.blockHash } : { height: config.blockHeight };
    const blocks = waitForBlockToAppear(this.client, this.pollInterval)(offset).pipe(
      Rx.concatMap(() => blockOffsetToBlock$(this.client)(offset))
    );
    const maybeShortenedBlocks =
      config.type === 'blockHeight' || config.type === 'blockHash'
        ? Rx.iif(() => config.inclusive ?? true, blocks, blocks.pipe(Rx.skip(1)))
        : blocks;
    return maybeShortenedBlocks.pipe(Rx.concatMap(blockToContractState$(contractAddress)));
  }

  unshieldedBalancesObservable(
    contractAddress: ContractAddress,
    config: ContractStateObservableConfig = { type: 'latest' }
  ): Rx.Observable<UnshieldedBalances> {
    assertIsContractAddress(contractAddress);
    if (config.type === 'txId') {
      throw new IndexerProviderConfigError(
        'txId configuration not supported for unshielded balances observable'
      );
    }
    if (config.type === 'latest') {
      return contractAddressToLatestBlockOffset$(this.client, this.pollInterval)(contractAddress).pipe(
        Rx.concatMap(blockOffsetToUnshieldedBalances$(this.client)(contractAddress))
      );
    }
    if (config.type === 'all') {
      return waitForUnshieldedBalancesToAppear(this.client, this.pollInterval)(contractAddress).pipe(
        Rx.concatMap(() => blockOffsetToUnshieldedBalances$(this.client)(contractAddress)(null))
      );
    }
    const offset = config.type === 'blockHash' ? { hash: config.blockHash } : { height: config.blockHeight };
    const balances = waitForBlockToAppear(this.client, this.pollInterval)(offset).pipe(
      Rx.concatMap(() => blockOffsetToUnshieldedBalances$(this.client)(contractAddress)(offset))
    );
    return config.type === 'blockHeight' || config.type === 'blockHash'
      ? Rx.iif(() => config.inclusive ?? true, balances, balances.pipe(Rx.skip(1)))
      : balances;
  }
}
