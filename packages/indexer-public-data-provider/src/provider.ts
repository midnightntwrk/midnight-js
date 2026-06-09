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
  InputMaybe,
  RegularTransaction
} from './gen/graphql';
import {
  type ExcludeEmptyAndNull,
  extractRegularDeployTransaction,
  extractUnshieldedBalances,
  isRegularTransaction,
  toFinalizedDeployTxData
} from './mapping';
import {
  blockOffsetToBlock$,
  blockOffsetToContractState$,
  blockOffsetToUnshieldedBalances$,
  blockToContractState$,
  contractAddressToLatestBlockOffset$,
  maybeThrowQueryError,
  pollUntilPresent,
  transactionIdToTransaction$,
  transactionToContractState$,
  waitForBlockToAppear,
  waitForContractToAppear,
  waitForUnshieldedBalancesToAppear
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
        if (!contractAction) return null;
        return extractUnshieldedBalances(contractAction, 'queryUnshieldedBalances');
      })
      .then((maybeUnshieldedBalances) =>
        maybeUnshieldedBalances ? toUnshieldedBalances(maybeUnshieldedBalances) : null
      );
  }

  queryDeployContractState(contractAddress: ContractAddress): Promise<ContractState | null> {
    assertIsContractAddress(contractAddress);
    // Shape discrimination kept inline: this branch additionally does an
    // address-correlated `find` over `contractActions` and throws
    // `IndexerDataError.missingContractAction` (not `IndexerInvariantError`)
    // on missing match — different error semantics from the helpers in
    // `mapping.ts`, so extraction would obscure rather than simplify.
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
      pollUntilPresent(
        this.client,
        DEPLOY_TX_QUERY,
        { address: contractAddress },
        (data) => extractRegularDeployTransaction(data.contractAction) !== null,
        (data) => {
          const transaction = extractRegularDeployTransaction(data.contractAction);
          if (transaction === null) {
            throw new IndexerInvariantError(
              'watchForDeployTxData: extracted transaction unexpectedly null after predicate'
            );
          }
          return toFinalizedDeployTxData(contractAddress, transaction);
        },
        this.pollInterval
      )
    );
  }

  watchForTxData(txId: TransactionId): Promise<FinalizedTxData> {
    return Rx.firstValueFrom(
      pollUntilPresent(
        this.client,
        TX_ID_QUERY,
        { offset: { identifier: txId } },
        (data) => {
          const first = data.transactions[0];
          return first !== undefined && isRegularTransaction(first);
        },
        (data): FinalizedTxData => {
          const first = data.transactions[0];
          if (first === undefined || !isRegularTransaction(first)) {
            throw new IndexerInvariantError(
              'watchForTxData: transactions array unexpectedly empty or non-regular after predicate'
            );
          }
          const transaction: RegularTransaction & { hash: string; identifiers: string[] } = first;
          return {
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
          };
        },
        this.pollInterval
      )
    );
  }

  /**
   * Creates a stream of contract states for `contractAddress`.
   *
   * **Wire-traffic asymmetry by branch:**
   *
   * | Branch                                 | Pipeline                                                                                            | Wire traffic |
   * |----------------------------------------|-----------------------------------------------------------------------------------------------------|--------------|
   * | `latest` / `blockHeight` / `blockHash` | poll for block-presence → `TXS_FROM_BLOCK_SUB` + client-side address filter                          | **Heavy** — every block on chain flows over WS; client extracts states for this contract. |
   * | `txId`                                 | poll `TX_ID_QUERY` → `TXS_FROM_BLOCK_SUB` from the tx's block → walk states matching the identifier  | **Heavy** — same `TXS_FROM_BLOCK_SUB` subscription as above, opened once the tx is located. |
   * | `all`                                  | poll for contract-presence → `CONTRACT_STATE_SUB($address, offset: null)`                            | **Light** — server-side filter; only this contract's state changes flow over WS. |
   *
   * The heavy path emits one observable value per matching contract action
   * in each block — a per-block "states-at-this-block" view. It is used
   * everywhere a block-level anchor matters (latest block, specific block
   * with `inclusive`, transaction → containing-block). The light path
   * (`all`) emits one value per state change directly from the
   * server-filtered subscription — bandwidth scales with state changes
   * rather than chain activity.
   *
   * Why not unify: `CONTRACT_STATE_SUB` is per-change, so a downstream
   * `Rx.skip(1)` would skip the first state change rather than the first
   * block — `inclusive: false` on `blockHeight`/`blockHash` would have a
   * subtly different meaning. `TXS_FROM_BLOCK_SUB` for `all` would stream
   * every block on chain (orders of magnitude more bytes on a busy chain).
   *
   * See {@link blockOffsetToBlock$}, {@link blockOffsetToContractState$},
   * and {@link blockToContractState$} for per-subscription docs.
   *
   * @param contractAddress The address of the contract of interest.
   * @param config The configuration of the stream. Defaults to `latest`.
   */
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

  /**
   * Creates a stream of unshielded balances for `contractAddress`.
   *
   * All three non-`txId` branches (`latest`/`all`/`blockHeight`/`blockHash`)
   * use `UNSHIELDED_BALANCE_SUB($address, $offset)` as the terminal
   * subscription. **Wire traffic is uniformly light** — server-side
   * filtered by `contractAddress`. The indexer has no per-block
   * subscription analogue for balances, so there is no light/heavy
   * asymmetry comparable to {@link contractStateObservable}.
   *
   * The `txId` configuration is not supported and throws
   * {@link IndexerProviderConfigError}. Tx-anchored balance streams are
   * not exposed by the indexer's subscription surface — for the related
   * contract-state stream see {@link contractStateObservable}.
   *
   * See {@link blockOffsetToUnshieldedBalances$} for the per-subscription doc.
   *
   * @param contractAddress The address of the contract of interest.
   * @param config The configuration of the stream. Defaults to `latest`.
   */
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
