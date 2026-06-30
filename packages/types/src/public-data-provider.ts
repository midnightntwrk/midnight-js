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
import type { ContractAddress, LedgerParameters, TransactionId, ZswapChainState } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { Observable } from 'rxjs';

import type { FinalizedTxData, UnshieldedBalances } from './midnight-types';

/**
 * Streams all previous states of a contract.
 */
export type All = {
  readonly type: 'all';
}

/**
 * Streams all states of a contract starting with the most recent.
 */
export type Latest = {
  readonly type: 'latest';
}

/**
 * Starts a contract state stream at the given transaction identifier.
 */
export type TxIdConfig = {
  readonly type: 'txId';
  /**
   * The transaction identifier indicating where to begin the state stream.
   */
  readonly txId: TransactionId;
}

/**
 * Starts a contract state stream at the given block height.
 * @type
 */
export type BlockHeightConfig = {
  readonly type: 'blockHeight';
  /**
   * The block height indicating where to begin the state stream.
   */
  readonly blockHeight: number;
}

/**
 * Starts a contract state stream at the given block hash.
 */
export type BlockHashConfig = {
  readonly type: 'blockHash';
  /**
   * The block height indicating where to begin the state stream.
   */
  readonly blockHash: string;
}

/**
 * The configuration for a contract state observable. The corresponding observables may begin at different
 * places (e.g. after a specific transaction identifier / block height) depending on the configuration, but
 * all state updates after the beginning are always included.
 */
export type ContractStateObservableConfig =
  | ((TxIdConfig | BlockHashConfig | BlockHeightConfig) & {
      /**
       * If `true`, the state of the contract after the last block or transaction specified by the configuration
       * is the first value emitted. If `false`, the state of the contract after the next state update is the
       * first value emitted. If `undefined`, defaults to `true`.
       */
      readonly inclusive?: boolean;
    })
  | Latest
  | All;

/**
 * The eleven contract event variants surfaced by the indexer (MIP-0002 public
 * contract log emission). The variant *set* is identical to compact-js's
 * `LogEventType`; only the string casing differs (PascalCase here, kebab-case
 * in compact-js, SCREAMING_SNAKE on the indexer wire). Adding a variant is a
 * breaking change — the mapping, filter translation, and exhaustiveness guards
 * all key off this union.
 */
export type ContractEventType =
  | 'ShieldedSpend'
  | 'ShieldedReceive'
  | 'ShieldedMint'
  | 'ShieldedBurn'
  | 'UnshieldedSpend'
  | 'UnshieldedReceive'
  | 'UnshieldedMint'
  | 'UnshieldedBurn'
  | 'Paused'
  | 'Unpaused'
  | 'Misc';

/**
 * A `sender` / `recipient` on an unshielded event. The indexer returns a tagged
 * union (`Either<ZswapCoinPublicKey, ContractAddress>`); this preserves the
 * discriminator so consumers can tell a user address from a contract address
 * rather than receiving a bare, ambiguous string.
 */
export interface ContractEventAddress {
  /** Which kind of address `value` holds. */
  readonly kind: 'user' | 'contract';
  /** The hex-encoded address. */
  readonly value: string;
}

/**
 * Fields common to every {@link ContractEvent} variant, regardless of type.
 */
export interface ContractEventBase {
  /**
   * Monotonic indexer cursor for this event. Inclusive resumption point — to
   * resume *after* this event, pass `{ fromId: id + 1 }`.
   */
  readonly id: number;
  /**
   * Highest event id the indexer currently knows (the chain tip for events).
   * Compare against {@link id} to detect catch-up / whether more events exist.
   */
  readonly maxId: number;
  /**
   * Payload schema version — selects the (future) per-event payload decoder.
   * Iteration-1 events are `version: 1`.
   */
  readonly version: number;
  /** Address of the contract that emitted the event. */
  readonly contractAddress: ContractAddress;
  /**
   * Indexer-internal `BIGSERIAL` row id of the emitting transaction — **not**
   * the chain transaction hash. To fetch the chain transaction, issue a
   * separate query. Note the asymmetry with {@link ContractEventFilterBase.transactionHash},
   * which narrows by chain hash.
   */
  readonly transactionId: number;
  /**
   * Opaque hex `VersionedLogItem` bytes, carried verbatim. Never decoded or
   * validated by this provider — the forward bridge to a future compact-js
   * payload decoder.
   */
  readonly raw: string;
}

/**
 * A decoded contract event. Discriminated union keyed on `eventType`; narrow on
 * it to access the variant-specific payload fields.
 *
 * `amount` is always a `string` (encodes up to a 16-byte integer) — never round
 * it through `Number()`. Absent nullable fields are normalized to `undefined`
 * (never `null`).
 */
export type ContractEvent =
  | (ContractEventBase & { readonly eventType: 'ShieldedSpend'; readonly nullifier: string })
  | (ContractEventBase & {
      readonly eventType: 'ShieldedReceive';
      readonly commitment: string;
      readonly ciphertext?: string;
      readonly receivingContractAddress?: string;
    })
  | (ContractEventBase & {
      readonly eventType: 'ShieldedMint';
      readonly commitment: string;
      readonly domainSep: string;
      readonly amount?: string;
    })
  | (ContractEventBase & { readonly eventType: 'ShieldedBurn'; readonly nullifier: string; readonly amount?: string })
  | (ContractEventBase & {
      readonly eventType: 'UnshieldedSpend';
      readonly sender: ContractEventAddress;
      readonly domainSep: string;
      readonly tokenType: string;
      readonly amount: string;
    })
  | (ContractEventBase & {
      readonly eventType: 'UnshieldedReceive';
      readonly recipient: ContractEventAddress;
      readonly domainSep: string;
      readonly tokenType: string;
      readonly amount: string;
    })
  | (ContractEventBase & {
      readonly eventType: 'UnshieldedMint';
      readonly domainSep: string;
      readonly tokenType: string;
      readonly amount: string;
    })
  | (ContractEventBase & {
      readonly eventType: 'UnshieldedBurn';
      readonly sender: ContractEventAddress;
      readonly tokenType: string;
      readonly amount: string;
    })
  | (ContractEventBase & { readonly eventType: 'Paused' })
  | (ContractEventBase & { readonly eventType: 'Unpaused' })
  | (ContractEventBase & { readonly eventType: 'Misc'; readonly name: string; readonly payload: string });

/**
 * A single prefix filter on an indexed field of a standard event. `prefix` is
 * hex-encoded; the empty string matches all values.
 */
export interface ContractEventFieldPrefix {
  readonly fieldName: string;
  readonly prefix: string;
}

/**
 * Filter fields shared by the query and the subscription.
 */
export interface ContractEventFilterBase {
  /** Required: the contract whose events to return. */
  readonly contractAddress: ContractAddress;
  /**
   * Optional subset of event types. Omit to mean "all types". An empty array
   * is rejected (it would silently match nothing).
   */
  readonly types?: ContractEventType[];
  /**
   * Optional prefix filters on indexed fields. Accepted only when every
   * filtered type is a standard (non-`Misc`) variant — see method docs.
   */
  readonly fieldPrefixes?: ContractEventFieldPrefix[];
  /** Optional: narrow to events emitted from the transaction with this chain hash. */
  readonly transactionHash?: string;
}

/**
 * Filter for {@link PublicDataProvider.queryContractEvents}. `fromBlock` /
 * `toBlock` are inclusive block-height bounds for a finite, point-in-time read.
 */
export interface ContractEventQueryFilter extends ContractEventFilterBase {
  readonly fromBlock?: number;
  readonly toBlock?: number;
}

/**
 * Filter for {@link PublicDataProvider.contractEventsObservable}. The stream
 * start is supplied separately via {@link ContractEventCursor}; `toBlock`
 * terminates the stream once the chain reaches that height.
 */
export interface ContractEventSubscriptionFilter extends ContractEventFilterBase {
  readonly toBlock?: number;
}

/**
 * Where a subscription begins. Exactly one addressing mode per call — two
 * competing start points are unrepresentable by construction.
 */
export type ContractEventCursor =
  | { readonly fromId: number }
  | { readonly fromBlock: number };

/**
 * Pagination window for {@link PublicDataProvider.queryContractEvents}.
 * `offset` is only stable within a window with a fixed upper bound — pin
 * `toBlock` for multi-page reads.
 */
export interface ContractEventsPage {
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Interface for a public data service. This service retrieves public data from the blockchain.
 * TODO: Add timeouts or retry limits to 'watchFor' queries.
 */
export interface PublicDataProvider {
  /**
   * Retrieves the on-chain state of a contract. If no block hash or block height are provided, the
   * contract state at the address in the latest block is returned.
   * Immediately returns null if no matching data is found.
   * @param contractAddress The address of the contract of interest.
   * @param config The configuration of the query.
   *               If `undefined` returns the latest states.
   */
  queryContractState(
    contractAddress: ContractAddress,
    config?: BlockHeightConfig | BlockHashConfig
  ): Promise<ContractState | null>;

  /**
   * Retrieves the zswap chain state (token balances), the contract state of the contract at the
   * given address, and the ledger parameters in effect on the associated block. Both states are
   * retrieved in a single query to ensure consistency between the two.
   * Immediately returns null if no matching data is found.
   * @param contractAddress The address of the contract of interest.
   * @param config The configuration of the query.
   *               If `undefined` returns the latest states.
   */
  queryZSwapAndContractState(
    contractAddress: ContractAddress,
    config?: BlockHeightConfig | BlockHashConfig
  ): Promise<[ZswapChainState, ContractState, LedgerParameters] | null>;

  /**
   * Retrieves the contract state included in the deployment of the contract at the given contract address.
   * Immediately returns null if no matching data is found.
   * @param contractAddress The address of the contract of interest.
   */
  queryDeployContractState(contractAddress: ContractAddress): Promise<ContractState | null>;

  /**
   * Retrieves the unshielded balances associated with a specific contract address.
   * @param contractAddress The address of the contract of interest.
   * @param config The configuration of the query.
   *               If `undefined` returns the latest states.
   */
  queryUnshieldedBalances(
    contractAddress: ContractAddress,
    config?: BlockHeightConfig | BlockHashConfig
  ): Promise<UnshieldedBalances | null>;

  /**
   * Retrieves the contract state of the contract with the given address.
   * Waits indefinitely for matching data to appear.
   * @param contractAddress The address of the contract of interest.
   */
  watchForContractState(contractAddress: ContractAddress): Promise<ContractState>;

  /**
   * Monitors for any unshielded balances associated with a specific contract address.
   *
   * @param {ContractAddress} contractAddress - The address of the contract to monitor for unshielded balances.
   * @return {Promise<UnshieldedBalances>} A promise that resolves to the detected unshielded balances.
   */
  watchForUnshieldedBalances(contractAddress: ContractAddress): Promise<UnshieldedBalances>;

  /**
   * Retrieves data of the deployment transaction for the contract at the given contract address.
   *
   * **IMPORTANT: This method waits indefinitely** until the deployment transaction appears on the
   * blockchain. It will never timeout or reject unless an error occurs.
   *
   * Custom implementations MUST maintain this indefinite waiting behavior to ensure consistency
   * across all PublicDataProvider implementations. Do not implement timeouts in this method.
   *
   * @param contractAddress The address of the contract of interest.
   *
   * @returns A promise that resolves with finalized transaction data when the deployment appears on-chain.
   *          The promise never rejects due to timeout.
   */
  watchForDeployTxData(contractAddress: ContractAddress): Promise<FinalizedTxData>;

  /**
   * Retrieves data of the transaction containing the call or deployment with the given identifier.
   *
   * **IMPORTANT: This method waits indefinitely** until the transaction appears on the blockchain.
   * It will never timeout or reject unless an error occurs.
   *
   * Custom implementations MUST maintain this indefinite waiting behavior to ensure consistency
   * across all PublicDataProvider implementations. Do not implement timeouts in this method.
   *
   * Applications using this method should be aware that:
   * - The promise will not resolve until the transaction appears on-chain
   * - If a transaction is invalid and never appears, this will never return
   * - Consider using application-level timeouts or cancellation mechanisms if needed
   *
   * @param txId The identifier of the call or deployment of interest.
   *
   * @returns A promise that resolves with finalized transaction data when the transaction appears on-chain.
   *          The promise never rejects due to timeout.
   */
  watchForTxData(txId: TransactionId): Promise<FinalizedTxData>;

  /**
   * Creates a stream of contract states. The observable emits a value every time a state is either
   * created or updated at the given address.
   * Waits indefinitely for matching data to appear.
   * @param address The address of the contract of interest.
   * @param config The configuration for the observable.
   */
  contractStateObservable(address: ContractAddress, config: ContractStateObservableConfig): Observable<ContractState>;

  /**
   * Retrieves an observable that tracks the unshielded balances for a specific contract address.
   *
   * @param {ContractAddress} address - The contract address for which unshielded balances are being observed.
   * @param {ContractStateObservableConfig} config - The configuration object for observing contract state changes.
   * @return {Observable<UnshieldedBalances>} An observable that emits the unshielded balances for the provided address.
   */
  unshieldedBalancesObservable(address: ContractAddress, config: ContractStateObservableConfig): Observable<UnshieldedBalances>;

  /**
   * Queries contract events for a contract address — a finite, paginated,
   * point-in-time read.
   *
   * Results are returned in ascending `id` order. The result is a plain array
   * with no total count: detect the end via `result.length < limit`, and read
   * `maxId` on the last item to see how far the tip is.
   *
   * When `page.limit` is omitted an implementation-defined default page size is
   * applied (never an undocumented server default). `offset` is only stable
   * within a window with a fixed upper bound — pin `filter.toBlock` for
   * multi-page reads, or prefer the `getAllContractEvents` helper / the
   * subscription for tailing.
   *
   * Fails fast (synchronously, before any network call) on an invalid
   * `contractAddress`, an empty `types` array, `fieldPrefixes` combined with
   * `Misc` (or with `types` omitted), or an unknown `fieldName`. Network /
   * GraphQL errors reject the promise — an empty array always means "no
   * matching events", never a swallowed error.
   *
   * @param filter The events to return; `contractAddress` is required.
   * @param page Optional pagination window.
   */
  queryContractEvents(filter: ContractEventQueryFilter, page?: ContractEventsPage): Promise<ContractEvent[]>;

  /**
   * Streams contract events for a contract address — replay from a cursor, then
   * live, in one continuous stream.
   *
   * The start is supplied via `opts.startAt`: `{ fromId }` resumes inclusively
   * from a known event id, `{ fromBlock }` starts from a block height. Omitting
   * `startAt` streams from the start of history. The indexer replays historical
   * events from that point in monotonic `id` order, then continues live — there
   * is no separate backfill query and no client-side dedup.
   *
   * `{ fromId }` is **inclusive**; to resume *after* the last seen event pass
   * `{ fromId: lastSeenId + 1 }`.
   *
   * `filter.toBlock` completes the stream once the chain reaches that height;
   * without it the stream runs until unsubscribed or the provider is disposed.
   * Delivery is **at-least-once** across transport reconnects (the provider
   * does not advance the cursor) — persisting consumers should dedup by `id`.
   * Transport failures surface as an observable `error`, never a silent
   * completion.
   *
   * @param filter The events to stream; `contractAddress` is required.
   * @param opts Optional stream start.
   */
  contractEventsObservable(
    filter: ContractEventSubscriptionFilter,
    opts?: { startAt?: ContractEventCursor }
  ): Observable<ContractEvent>;
}
