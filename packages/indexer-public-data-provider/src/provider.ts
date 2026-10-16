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

import type {
  ContractAddress,
  TransactionId
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type {
  BlockHashConfig,
  BlockHeightConfig,
  BlockInfo,
  ContractEvent,
  ContractEventCursor,
  ContractEventQueryFilter,
  ContractEventsPage,
  ContractEventSubscriptionFilter,
  ContractStateObservableConfig,
  PositionedRecord,
  PublicDataProvider,
  RawContractState,
  UnshieldedBalances,
  VersionedContractState,
  VersionedFinalizedTxData,
  VersionedPublicStates
} from '@midnight-ntwrk/midnight-js-types';
import { assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';
import * as Rx from 'rxjs';

import { toRawContractState, toUnshieldedBalances, toVersionedContractState, toVersionedPublicStates } from './codec';
import { DEFAULT_CONTRACT_EVENTS_PAGE_SIZE } from './config';
import { IndexerDataError, IndexerInvariantError, IndexerProviderConfigError } from './errors';
import { buildQueryVariables, buildSubscriptionVariables } from './events-filter';
import { toContractEvent } from './events-mapping';
import type { BlockOffset, ContractActionOffset, DeployContractStateTxQueryQuery } from './gen/graphql';
import type { InputMaybe, RegularTransaction } from './gen/schema-types';
import {
  type ExcludeEmptyAndNull,
  extractRegularDeployTransaction,
  isRegularTransaction,
  toFinalizedDeployTxData,
  toFinalizedTxData
} from './mapping';
import {
  blockOffsetToState$,
  blockOffsetToUnshieldedBalances$,
  type ChainPosition,
  contractAddressToLatestBlockOffset$,
  contractEvents$,
  type ContractStateMapper,
  dropReplayed,
  fromTransaction,
  type Identified,
  type LatestAnchor,
  maybeThrowQueryError,
  ordinalWithinBlock,
  pollUntilPresent,
  transactionToBlockOffset$,
  waitForBlockToAppear,
  waitForContractToAppear,
  waitForUnshieldedBalancesToAppear
} from './observables';
import {
  BLOCK_QUERY,
  CONTRACT_AND_ZSWAP_STATE_QUERY,
  CONTRACT_EVENTS_QUERY,
  CONTRACT_STATE_QUERY,
  DEPLOY_CONTRACT_STATE_TX_QUERY,
  DEPLOY_TX_QUERY,
  HEAD_PROTOCOL_VERSION_QUERY,
  QUERY_UNSHIELDED_BALANCES_WITH_OFFSET,
  RAW_CONTRACT_STATE_QUERY,
  TX_ID_QUERY
} from './query-definitions';
import type { ApolloHandle } from './transport';

/** Maps a block-height/block-hash config to the indexer's `BlockOffset` input. */
const toStartOffset = (config: BlockHeightConfig | BlockHashConfig): BlockOffset =>
  config.type === 'blockHeight' ? { height: config.blockHeight } : { hash: config.blockHash };

/**
 * Maps an optional block-height/block-hash config to the indexer's `BlockOffset` input, or `null`
 * to select the latest block.
 */
const toBlockOffset = (config?: BlockHeightConfig | BlockHashConfig): InputMaybe<BlockOffset> =>
  config ? toStartOffset(config) : null;

/** Rebuilds the public record so the feed's ordinal and identifiers never reach a consumer. */
const toPositionedRecord = <T>({ value, blockHeight, blockHash }: PositionedRecord<T>): PositionedRecord<T> => ({
  value,
  blockHeight,
  blockHash
});

/** The branch both contract-state streams select when the caller names none. */
const DEFAULT_STATE_CONFIG: ContractStateObservableConfig = { type: 'latest' };

/** The offset `all` subscribes from: the feed serves a contract's actions from its deploy onward. */
const GENESIS: BlockOffset = { height: 0 };

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

  async queryBlock(config?: BlockHeightConfig | BlockHashConfig): Promise<BlockInfo | null> {
    const offset = toBlockOffset(config);
    const block = await this.client
      .query({
        query: BLOCK_QUERY,
        variables: {
          offset
        },
        fetchPolicy: 'no-cache'
      })
      .then(maybeThrowQueryError)
      .then((queryResult) => queryResult.data?.block ?? null);
    return block ? { hash: block.hash, height: block.height, protocolVersion: block.protocolVersion } : null;
  }

  /**
   * Reads the protocol-version integer of the network's head block.
   *
   * The indexer's `block` root field with no offset resolves to the latest
   * indexed block, so this is the head version.
   *
   * This implementation does not cache: every call issues a request. The
   * interface permits a cache bounded short of block time — see
   * `PublicDataProvider.queryLatestProtocolVersion` — but there is no measured
   * cost here to spend that budget on, and an expiring cache is not free to
   * get right. For the era of a record already read, use
   * {@link queryRawContractState}, which costs no request at all.
   *
   * @throws {IndexerDataError} When the indexer has not indexed a block yet
   *   and therefore reports no head block.
   */
  async queryLatestProtocolVersion(): Promise<number> {
    const block = await this.client
      .query({
        query: HEAD_PROTOCOL_VERSION_QUERY,
        fetchPolicy: 'no-cache'
      })
      .then(maybeThrowQueryError)
      .then((queryResult) => queryResult.data?.block ?? null);
    if (block === null) {
      throw IndexerDataError.missingHeadBlock();
    }
    return block.protocolVersion;
  }

  /**
   * Reads the contract state at `address` as the bytes the indexer served,
   * without deserializing them, tagged with the ledger era that wrote them.
   *
   * `version` is read off the envelope of the bytes. `protocolVersion` dates the
   * block the read resolved; on a pinned read an envelope newer than that block
   * is refused. The block and the state are asked for in a single document. That
   * saves a round trip; it does **not** make the two fields a consistent
   * snapshot — the indexer resolves Query-root siblings concurrently, from
   * independent reads, so they can still come from different blocks. Neither
   * field is a reading of where the network is now: for that, ask
   * {@link queryLatestProtocolVersion}, which reads it.
   *
   * @throws {TagParseError} When the served state does not carry a
   *   contract-state envelope from a supported ledger runtime.
   * @throws {IndexerDataError} When the served state is not hex-encoded, when a
   *   state is served with no block to date it, or when a pinned read serves an
   *   envelope newer than its block.
   */
  async queryRawContractState(
    address: ContractAddress,
    config?: BlockHeightConfig | BlockHashConfig
  ): Promise<RawContractState | null> {
    assertIsContractAddress(address);
    const offset = toBlockOffset(config);
    const data = await this.client
      .query({
        query: RAW_CONTRACT_STATE_QUERY,
        variables: {
          address,
          offset
        },
        fetchPolicy: 'no-cache'
      })
      .then(maybeThrowQueryError)
      .then((queryResult) => queryResult.data);
    const state = data?.contract?.state ?? null;
    if (state === null) {
      return null;
    }
    const block = data?.block ?? null;
    if (block === null) {
      // A served state with no block to date it is an inconsistent indexer,
      // not an absent contract. Reporting it as "nothing here" would hand the
      // caller a wrong answer that reads exactly like a correct one.
      throw IndexerDataError.undatedState();
    }
    // Unpinned, `block` and `contract` are siblings that can straddle a fork; see `queryContractState`.
    return toRawContractState(state, block.protocolVersion, block.ledgerParameters, {
      upperBound: offset === null ? 'withheld' : 'enforced'
    });
  }

  queryContractState(
    address: ContractAddress,
    config?: BlockHeightConfig | BlockHashConfig
  ): Promise<VersionedContractState | null> {
    assertIsContractAddress(address);
    // The deployed indexer resolves `contract(offset:)` "as of" the given block (the latest
    // contract action at or before it), which is what cross-contract reads require.
    const offset = toBlockOffset(config);
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
      .then((queryResult) => queryResult.data)
      .then((data) => {
        const state = data?.contract?.state ?? null;
        if (state === null) {
          return null;
        }
        const block = data?.block ?? null;
        if (block === null) {
          // A served state with no block to date it is an inconsistent indexer,
          // not an absent contract — the same call `queryRawContractState`
          // makes. Decoding it would mean guessing the era.
          throw IndexerDataError.undatedState();
        }
        // Unpinned: `block` is a Query-root sibling of `contract` and both
        // followed the chain tip, so a block indexed between the two reads
        // leaves them on either side of a fork. Pinned: both resolved against
        // the offset the caller named, so the bound is real.
        return toVersionedContractState(state, block.protocolVersion, {
          upperBound: offset === null ? 'withheld' : 'enforced'
        });
      });
  }

  queryZSwapAndContractState(
    address: ContractAddress,
    config?: BlockHeightConfig | BlockHashConfig
  ): Promise<VersionedPublicStates | null> {
    assertIsContractAddress(address);
    // One request pinned to a single block yields a coherent triple: `block` supplies the ledger
    // parameters and the contract's zswap commitment tree resolved from that block's ledger state,
    // and `contract` supplies the contract state as of the same block. The zswap tree is taken from
    // the block (not the contract's last action) on purpose — the ledger keeps only a window of past
    // commitment-tree roots, so a tree from the contract's last modification can age out and be
    // unusable for building transactions; the queried block's tree is the one execution needs.
    // With `offset` pinned, both fields resolve at that one anchor with no race between them.
    // `getPublicStates` also reaches here with no offset, and then they do race — which is why the
    // era bound on the contract state is withheld for exactly that case below.
    const offset = toBlockOffset(config);
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
      .then((queryResult) => queryResult.data)
      .then((data) => {
        const block = data?.block;
        const contractState = data?.contract?.state;
        const contractZswapState = block?.contractZswapState;
        // `contractZswapState`/`contract` are null when the contract does not exist as of the block.
        if (!block || contractState == null || contractZswapState == null) {
          return null;
        }
        // The zswap chain state carries no era to date: both runtimes write
        // `zswap-ledger-state[v5]` and each reads the other's bytes back unchanged. That is
        // measured, not assumed — see `test/ledger-parameters.test.ts` and
        // `docs/architecture/era-tagged-payload-decoders.md`.
        return toVersionedPublicStates(contractZswapState, contractState, block.ledgerParameters, block.protocolVersion, {
          upperBound: offset === null ? 'withheld' : 'enforced'
        });
      });
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
        return contractAction.unshieldedBalances;
      })
      .then((maybeUnshieldedBalances) =>
        maybeUnshieldedBalances ? toUnshieldedBalances(maybeUnshieldedBalances) : null
      );
  }

  /**
   * Reads the deploy's record, or the latest update's record when the contract
   * has been updated. The record keeps the encoding its block wrote: a v8-era
   * record comes back as its stored bytes, never translated to the v9 encoding.
   */
  queryDeployContractState(contractAddress: ContractAddress): Promise<VersionedContractState | null> {
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
        if (!queryResult.data?.contractAction) {
          return null;
        }
        const contract = queryResult.data.contractAction as ExcludeEmptyAndNull<
          DeployContractStateTxQueryQuery['contractAction']
        >;
        const { contractActions } = 'deploy' in contract ? contract.deploy.transaction : contract.transaction;
        const record = contractActions.find(({ address }) => address === contractAddress);
        if (!record) {
          throw IndexerDataError.missingContractAction(contractAddress);
        }
        return toVersionedContractState(record.state, record.stateAt.protocolVersion);
      });
  }

  watchForContractState(contractAddress: ContractAddress): Promise<VersionedContractState> {
    assertIsContractAddress(contractAddress);
    return Rx.firstValueFrom(
      waitForContractToAppear(this.client, this.pollInterval)(contractAddress)(null).pipe(
        // `waitForContractToAppear` polls an unpinned `CONTRACT_STATE_QUERY`, so
        // the block dating the state is an independently-resolved sibling of it
        // and the two can straddle a fork. No caller can pin this one.
        Rx.map(({ state, protocolVersion }) =>
          toVersionedContractState(state, protocolVersion, { upperBound: 'withheld' })
        )
      )
    );
  }

  watchForUnshieldedBalances(contractAddress: ContractAddress): Promise<UnshieldedBalances> {
    assertIsContractAddress(contractAddress);
    return Rx.firstValueFrom(
      waitForUnshieldedBalancesToAppear(this.client, this.pollInterval)(contractAddress).pipe(Rx.map(toUnshieldedBalances))
    );
  }

  /**
   * Not declared `async`, so an invalid address is refused synchronously. The
   * record itself is built after the poll resolves, because the era's runtime
   * may still have to be acquired.
   */
  watchForDeployTxData(contractAddress: ContractAddress): Promise<VersionedFinalizedTxData> {
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
          return transaction;
        },
        this.pollInterval
      )
    ).then((transaction) => toFinalizedDeployTxData(contractAddress, transaction));
  }

  watchForTxData(txId: TransactionId): Promise<VersionedFinalizedTxData> {
    return Rx.firstValueFrom(
      pollUntilPresent(
        this.client,
        TX_ID_QUERY,
        { offset: { identifier: txId } },
        (data) => {
          const first = data.transactions[0];
          return first !== undefined && isRegularTransaction(first);
        },
        (data): RegularTransaction & { hash: string; identifiers: string[] } => {
          const first = data.transactions[0];
          if (first === undefined || !isRegularTransaction(first)) {
            throw new IndexerInvariantError(
              'watchForTxData: transactions array unexpectedly empty or non-regular after predicate'
            );
          }
          return first;
        },
        this.pollInterval
      )
    ).then((transaction) => toFinalizedTxData(txId, transaction));
  }

  /**
   * The stream both public contract-state observables are built from, differing
   * only in what one served contract action becomes.
   *
   * See `docs/subscription-shapes.md` for why the topology is written once.
   *
   * @param contractAddress Validated here, so both public members refuse an
   *   invalid address synchronously.
   * @param config Selects the branch; required here, defaulted by the callers.
   * @param mapState Turns one served contract action into a stream element.
   * @returns One element per contract action the selected branch delivers.
   */
  private contractStates$<T>(
    contractAddress: ContractAddress,
    config: ContractStateObservableConfig,
    mapState: ContractStateMapper<T>
  ): Rx.Observable<PositionedRecord<T>> {
    assertIsContractAddress(contractAddress);
    const feed = (offset: BlockOffset) =>
      blockOffsetToState$(mapState)(this.client)(contractAddress)(offset).pipe(
        ordinalWithinBlock(this.handle.connectionCount)
      );
    return this.contractStatesFeed$(contractAddress, config, feed).pipe(dropReplayed(), Rx.map(toPositionedRecord));
  }

  private contractStatesFeed$<R extends ChainPosition & Identified>(
    contractAddress: ContractAddress,
    config: ContractStateObservableConfig,
    feed: (offset: BlockOffset) => Rx.Observable<R>
  ): Rx.Observable<R> {
    if (config.type === 'txId') {
      const inclusive = config.inclusive ?? true;
      return transactionToBlockOffset$(this.client, this.pollInterval)(config.txId, contractAddress).pipe(
        Rx.concatMap((offset) => feed(offset).pipe(fromTransaction(config.txId, offset.height, inclusive)))
      );
    }
    if (config.type === 'all') {
      return waitForContractToAppear(this.client, this.pollInterval)(contractAddress)(null).pipe(
        Rx.concatMap(() => feed(GENESIS))
      );
    }
    return this.fromBlock$(contractAddress, config, feed, 'stateAt');
  }

  /**
   * Starts a per-contract feed at the block a `blockHeight` or `blockHash`
   * config names, or, for `latest`, at the block `latestAnchor` names.
   * `inclusive: false` is a filter on the block height rather than a count of
   * skipped records, so a reconnect cannot spend it.
   */
  private fromBlock$<R extends ChainPosition>(
    contractAddress: ContractAddress,
    config: Exclude<ContractStateObservableConfig, { readonly type: 'txId' | 'all' }>,
    feed: (offset: BlockOffset) => Rx.Observable<R>,
    latestAnchor: LatestAnchor
  ): Rx.Observable<R> {
    if (config.type === 'latest') {
      return contractAddressToLatestBlockOffset$(this.client, this.pollInterval)(contractAddress, latestAnchor).pipe(
        Rx.concatMap(feed)
      );
    }
    const offset = toStartOffset(config);
    const inclusive = config.inclusive ?? true;
    return waitForBlockToAppear(this.client, this.pollInterval)(offset).pipe(
      Rx.concatMap((start) =>
        inclusive ? feed(offset) : feed(offset).pipe(Rx.filter((record) => record.blockHeight > start.height))
      )
    );
  }

  /**
   * Creates a stream of contract states for `contractAddress`.
   *
   * Each state is tagged with the ledger era that wrote it: a v9 state arrives
   * decoded, a v8 state as its stored bytes. A v8 state does not end the stream,
   * so a stream started before the ledger fork keeps going across it.
   *
   * Every branch reads the indexer's feed of this contract's actions, filtered
   * by address on the server. A transport reconnect makes the indexer replay
   * from the subscription's original offset; every branch suppresses what it
   * has already delivered, and `inclusive: false` keeps holding.
   *
   * @param contractAddress The address of the contract of interest.
   * @param config The configuration of the stream. Defaults to `latest`.
   * @see {@link SubscriptionShapes} for how each branch starts and how replays
   *   are suppressed.
   */
  contractStateObservable(
    contractAddress: ContractAddress,
    config: ContractStateObservableConfig = DEFAULT_STATE_CONFIG
  ): Rx.Observable<PositionedRecord<VersionedContractState>> {
    return this.contractStates$(contractAddress, config, toVersionedContractState);
  }

  /**
   * Creates a stream of contract states for `contractAddress` as the bytes the
   * indexer served, without deserializing them.
   *
   * The streaming twin of {@link queryRawContractState}: no state is
   * deserialized here, in either era. `version` on each record is the era read
   * off its envelope.
   *
   * `ledgerParameters` IS ALWAYS ABSENT ON THIS STREAM. The subscription does
   * not ask for the parameters, which would cost one blob per contract action.
   * A caller that needs them reads {@link queryRawContractState} with the
   * `blockHash` of the same record.
   *
   * Every branch and every replay-suppression rule is exactly
   * {@link contractStateObservable}'s; only the element type differs.
   *
   * WHAT IS WITHHELD, PRECISELY: the deserialization only. `version` is the era
   * read off the envelope, and the envelope is checked against the record's
   * dating block exactly as {@link contractStateObservable} checks it, so a
   * payload carrying no supported contract-state envelope still fails the stream
   * as a `TagParseError`, and an envelope newer than its dating block as an
   * `IndexerDataError`.
   *
   * @param contractAddress The address of the contract of interest.
   * @param config The configuration of the stream. Defaults to `latest`.
   * @see {@link SubscriptionShapes} for how each branch starts.
   */
  rawContractStateObservable(
    contractAddress: ContractAddress,
    config: ContractStateObservableConfig = DEFAULT_STATE_CONFIG
  ): Rx.Observable<PositionedRecord<RawContractState>> {
    return this.contractStates$(contractAddress, config, toRawContractState);
  }

  /**
   * Creates a stream of unshielded balances for `contractAddress`.
   *
   * Reads the same feed of this contract's actions as
   * {@link contractStateObservable}, through `UNSHIELDED_BALANCE_SUB`, with the
   * same start rules and the same replay suppression.
   *
   * The `txId` configuration is not supported and throws
   * {@link IndexerProviderConfigError}; this provider offers no tx-anchored
   * balance stream.
   *
   * See {@link blockOffsetToUnshieldedBalances$} for the per-subscription doc.
   *
   * @param contractAddress The address of the contract of interest.
   * @param config The configuration of the stream. Defaults to `latest`.
   */
  unshieldedBalancesObservable(
    contractAddress: ContractAddress,
    config: ContractStateObservableConfig = { type: 'latest' }
  ): Rx.Observable<PositionedRecord<UnshieldedBalances>> {
    assertIsContractAddress(contractAddress);
    if (config.type === 'txId') {
      throw new IndexerProviderConfigError(
        'txId configuration not supported for unshielded balances observable'
      );
    }
    const feed = (offset: BlockOffset) =>
      blockOffsetToUnshieldedBalances$(this.client)(contractAddress)(offset).pipe(
        ordinalWithinBlock(this.handle.connectionCount)
      );
    const balances =
      config.type === 'all'
        ? waitForUnshieldedBalancesToAppear(this.client, this.pollInterval)(contractAddress).pipe(
            Rx.concatMap(() => feed(GENESIS))
          )
        : this.fromBlock$(contractAddress, config, feed, 'action');
    return balances.pipe(dropReplayed(), Rx.map(toPositionedRecord));
  }

  /**
   * Queries contract events for `filter.contractAddress`. Request building and
   * validation are delegated to {@link buildQueryVariables}, which throws
   * **synchronously** (before any network call) on an invalid address, empty
   * `types`, illegal `fieldPrefixes`, or an unknown `fieldName`. When
   * `page.limit` is omitted {@link DEFAULT_CONTRACT_EVENTS_PAGE_SIZE} is applied.
   *
   * Results are mapped in the indexer's ascending-`id` order. GraphQL /
   * transport errors reject the promise via {@link maybeThrowQueryError} — an
   * empty array always means "no matching events", never a swallowed error.
   */
  queryContractEvents(filter: ContractEventQueryFilter, page?: ContractEventsPage): Promise<ContractEvent[]> {
    const variables = buildQueryVariables(filter, page, DEFAULT_CONTRACT_EVENTS_PAGE_SIZE);
    return this.client
      .query({
        query: CONTRACT_EVENTS_QUERY,
        variables,
        fetchPolicy: 'no-cache'
      })
      .then(maybeThrowQueryError)
      .then((queryResult) => (queryResult.data?.contractEvents ?? []).map(toContractEvent));
  }

  /**
   * Streams contract events for `filter.contractAddress`, replaying from
   * `opts.startAt` then continuing live. Request building and validation are
   * delegated to {@link buildSubscriptionVariables}, which throws
   * **synchronously** on an invalid filter (mirroring the other observable
   * methods). See the {@link PublicDataProvider.contractEventsObservable}
   * contract for cursor, completion, and at-least-once semantics.
   */
  contractEventsObservable(
    filter: ContractEventSubscriptionFilter,
    opts?: { startAt?: ContractEventCursor }
  ): Rx.Observable<ContractEvent> {
    const variables = buildSubscriptionVariables(filter, opts);
    return contractEvents$(this.client)(variables);
  }
}
