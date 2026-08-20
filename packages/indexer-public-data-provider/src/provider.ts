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

import { protocolVersionToLedger, UnknownProtocolVersionError } from '@midnight-ntwrk/midnight-js-protocol';
import type { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type {
  ContractAddress,
  LedgerParameters,
  TransactionId,
  ZswapChainState
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
  FinalizedTxData,
  PublicDataProvider,
  RawContractState,
  UnshieldedBalances
} from '@midnight-ntwrk/midnight-js-types';
import { assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';
import * as Rx from 'rxjs';

import {
  contractStateEnvelopeVersion,
  parseHexContractState,
  parseHexLedgerParameters,
  parseHexTransaction,
  parseHexZswapState,
  toRawContractState,
  toSegmentStatusMap,
  toTxStatus,
  toUnshieldedBalances,
  toUnshieldedUtxos
} from './codec';
import { DEFAULT_CONTRACT_EVENTS_PAGE_SIZE } from './config';
import { IndexerDataError, IndexerInvariantError, IndexerProviderConfigError } from './errors';
import { buildQueryVariables, buildSubscriptionVariables } from './events-filter';
import { toContractEvent } from './events-mapping';
import type { BlockOffset, ContractActionOffset, DeployContractStateTxQueryQuery } from './gen/graphql';
import type { InputMaybe, RegularTransaction } from './gen/schema-types';
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
  contractEvents$,
  maybeThrowQueryError,
  pollUntilPresent,
  transactionIdToTransaction$,
  transactionToContractState$,
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

/**
 * Indexer-backed `PublicDataProvider`. Every method that takes a
 * `ContractAddress` validates the input up front via
 * `assertIsContractAddress`. The constructor shape `(handle, pollInterval)`
 * maps directly onto `Layer.scoped` in the future Effect migration (#843).
 *
 * TODO: Re-examine caching when 'ContractCall' and 'ContractDeploy' have
 * transaction identifiers included.
 */
/**
 * Maps an optional block-height/block-hash config to the indexer's `BlockOffset` input, or `null`
 * to select the latest block.
 */
const toBlockOffset = (config?: BlockHeightConfig | BlockHashConfig): InputMaybe<BlockOffset> =>
  config ? (config.type === 'blockHeight' ? { height: config.blockHeight } : { hash: config.blockHash }) : null;

/**
 * How the provider came to know the network head is on the v9 ledger era.
 * Named so a wrong call site is identifiable from the thrown message.
 */
type CorroborationRoute = 'snapshot-envelope' | 'finalized-record';

/**
 * Whether `protocolVersion` belongs to the v9 ledger era, answering `false`
 * for an integer this client cannot resolve at all.
 *
 * Every caller here is warming a cache as a side effect of some other request
 * the user actually asked for, so "I do not recognize this integer" has to
 * mean "cannot tell which era" rather than failing that request. Only
 * {@link UnknownProtocolVersionError} is treated that way — anything else is a
 * real failure and propagates.
 */
const isV9Era = (protocolVersion: number): boolean => {
  try {
    return protocolVersionToLedger(protocolVersion, 'read') === 'v9';
  } catch (error) {
    if (error instanceof UnknownProtocolVersionError) {
      return false;
    }
    throw error;
  }
};

export class IndexerPublicDataProvider implements PublicDataProvider {
  private readonly handle: ApolloHandle;
  private readonly pollInterval: number;

  /**
   * The head protocol version, cached — but only once the provider has
   * corroborated evidence that the network really is on the v9 ledger era.
   * `undefined` means "no such evidence yet", and every head read then goes to
   * the network. Only {@link corroborateV9} ever writes this field.
   */
  private v9HeadProtocolVersion: number | undefined;

  constructor(handle: ApolloHandle, pollInterval: number) {
    this.handle = handle;
    this.pollInterval = pollInterval;
  }

  /**
   * Records corroborated evidence that the network head is on the v9 ledger
   * era, so later head reads can be served without a request.
   *
   * The bar is deliberately high, because caching the wrong answer is worse
   * than paying for a request: a head integer on its own proves nothing (an
   * indexer can report a v9 head while still serving v8-era state), so only
   * the two routes in {@link CorroborationRoute} may call this. The cached
   * answer also only ever moves forward — a later v8-era reading never clears
   * or lowers what was already established, because the ledger era does not go
   * backwards once the network has forked.
   *
   * @throws {IndexerInvariantError} When the caller passes a protocol version
   *   that is not on the v9 ledger era — the era check belongs to the caller,
   *   so getting here with a v8-era version means a call site is wrong.
   */
  private corroborateV9(headProtocolVersion: number, route: CorroborationRoute): void {
    if (!isV9Era(headProtocolVersion)) {
      throw new IndexerInvariantError(
        `corroborateV9: the ${route} route supplied protocol version ${headProtocolVersion}, which is not on the ` +
          'v9 ledger era; call sites must check the era before corroborating'
      );
    }
    if (this.v9HeadProtocolVersion === undefined || headProtocolVersion > this.v9HeadProtocolVersion) {
      this.v9HeadProtocolVersion = headProtocolVersion;
    }
  }

  /**
   * Route 1: a state read whose head version and whose state envelope both say
   * v9. The envelope is the part a head integer cannot stand in for — it comes
   * off the bytes the indexer actually served for that contract.
   */
  private corroborateFromStateSnapshot(record: RawContractState): void {
    if (record.version !== 'v9') {
      return;
    }
    if (contractStateEnvelopeVersion(record.raw) !== 'v9') {
      return;
    }
    this.corroborateV9(record.protocolVersion, 'snapshot-envelope');
  }

  /**
   * Route 2: a finalized transaction record this provider decoded itself,
   * whose own protocol version is on the v9 era. Such a record cannot exist
   * before the network has forked, so it is proof of the era.
   *
   * It is proof of the era and nothing more. The record's own integer is the
   * version of the block that contained it, which may sit well behind the
   * head, so it is never the value that gets cached: the era proof buys one
   * head read, and only that head reading is cached — and only if it, too, is
   * on the v9 era. A replica still answering from before the fork therefore
   * caches nothing, and is asked again next time.
   *
   * Best effort throughout: this runs as a side effect of a finalization read
   * the caller asked for, and never makes that read fail.
   */
  private async corroborateFromFinalizedRecord(protocolVersion: number): Promise<void> {
    if (this.v9HeadProtocolVersion !== undefined || !isV9Era(protocolVersion)) {
      return;
    }
    const headProtocolVersion = await this.fetchHeadProtocolVersion();
    if (!isV9Era(headProtocolVersion)) {
      return;
    }
    this.corroborateV9(headProtocolVersion, 'finalized-record');
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
    return block ? { hash: block.hash, height: block.height } : null;
  }

  /**
   * Reads the protocol-version integer of the network's head block.
   *
   * The indexer's `block` root field with no offset resolves to the latest
   * indexed block, so this is the head version. The answer is served from the
   * cache only once {@link corroborateV9} has engaged it; until then, and
   * whenever `options.fresh` is `true`, every call issues a request.
   *
   * @param options Pass `{ fresh: true }` to bypass the cache.
   *
   * @throws {IndexerDataError} When the indexer has not indexed a block yet
   *   and therefore reports no head block.
   */
  async queryLatestProtocolVersion(options?: { readonly fresh?: boolean }): Promise<number> {
    if (options?.fresh !== true && this.v9HeadProtocolVersion !== undefined) {
      return this.v9HeadProtocolVersion;
    }
    return this.fetchHeadProtocolVersion();
  }

  private async fetchHeadProtocolVersion(): Promise<number> {
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
   * without deserializing them, paired with the ledger era those bytes belong
   * to.
   *
   * The block that dates the state and the state itself are asked for in a
   * single document. That saves a round trip; it does **not** make the two
   * fields a consistent snapshot — the indexer resolves Query-root siblings
   * concurrently, from independent reads, so they can still come from
   * different blocks. Requiring the two to agree is exactly what makes a head
   * read usable as corroboration below.
   *
   * Only a read with no offset can corroborate, because only then is the block
   * field the network's head block.
   *
   * @throws {TagParseError} When the served state does not carry a
   *   contract-state envelope from a supported ledger runtime.
   * @throws {IndexerDataError} When the served state is not hex-encoded, or
   *   when a state is served with no block to date it.
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
      throw IndexerDataError.missingHeadBlock();
    }
    const record = toRawContractState(state, block.protocolVersion);
    if (offset === null) {
      this.corroborateFromStateSnapshot(record);
    }
    return record;
  }

  queryContractState(
    address: ContractAddress,
    config?: BlockHeightConfig | BlockHashConfig
  ): Promise<ContractState | null> {
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
      .then((queryResult) => queryResult.data?.contract?.state ?? null)
      .then((maybeContractState) => (maybeContractState ? parseHexContractState(maybeContractState) : null));
  }

  queryZSwapAndContractState(
    address: ContractAddress,
    config?: BlockHeightConfig | BlockHashConfig
  ): Promise<[ZswapChainState, ContractState, LedgerParameters] | null> {
    assertIsContractAddress(address);
    // One request pinned to a single block yields a coherent triple: `block` supplies the ledger
    // parameters and the contract's zswap commitment tree resolved from that block's ledger state,
    // and `contract` supplies the contract state as of the same block. The zswap tree is taken from
    // the block (not the contract's last action) on purpose — the ledger keeps only a window of past
    // commitment-tree roots, so a tree from the contract's last modification can age out and be
    // unusable for building transactions; the queried block's tree is the one execution needs.
    // Callers pin `offset` to a specific block, so both fields resolve at the same anchor with no
    // race between them.
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
        return [
          parseHexZswapState(contractZswapState),
          parseHexContractState(contractState),
          parseHexLedgerParameters(block.ledgerParameters)
        ] as [ZswapChainState, ContractState, LedgerParameters];
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

  async watchForDeployTxData(contractAddress: ContractAddress): Promise<FinalizedTxData> {
    assertIsContractAddress(contractAddress);
    const finalized = await Rx.firstValueFrom(
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
    await this.corroborateFromFinalizedRecord(finalized.protocolVersion);
    return finalized;
  }

  async watchForTxData(txId: TransactionId): Promise<FinalizedTxData> {
    const finalized = await Rx.firstValueFrom(
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
            version: 'v9',
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
    await this.corroborateFromFinalizedRecord(finalized.protocolVersion);
    return finalized;
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
    const offset = toBlockOffset(config);
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
    const offset = toBlockOffset(config);
    const balances = waitForBlockToAppear(this.client, this.pollInterval)(offset).pipe(
      Rx.concatMap(() => blockOffsetToUnshieldedBalances$(this.client)(contractAddress)(offset))
    );
    return config.type === 'blockHeight' || config.type === 'blockHash'
      ? Rx.iif(() => config.inclusive ?? true, balances, balances.pipe(Rx.skip(1)))
      : balances;
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
