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

import type { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { LedgerParameters, ZswapChainState } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';

import type { FinalizedTx } from './ledger-transaction';
import type { FinalizedTxData, FinalizedTxRecord } from './midnight-types';

/**
 * The v8 variant of {@link VersionedContractState}: a contract state written by
 * the v8 ledger runtime, as the serialized, tag-prefixed bytes the network
 * stored. Not decoded and not translated to the v9 encoding.
 */
export interface Ledger8ContractStateBytes {
  readonly version: 'v8';
  /** Serialized, tag-prefixed byte form (`contract-state[v6]`). */
  readonly stateBytes: Uint8Array;
}

/**
 * The v9 variant of {@link VersionedContractState}: the decoded contract state.
 */
export interface Ledger9ContractState {
  readonly version: 'v9';
  readonly state: ContractState;
}

/**
 * A contract state discriminated by the ledger runtime that wrote it: the stored
 * bytes for the v8 era ({@link Ledger8ContractStateBytes}), or the decoded state
 * for v9 ({@link Ledger9ContractState}). Narrow on `version` before touching it.
 */
export type VersionedContractState = Ledger8ContractStateBytes | Ledger9ContractState;

/**
 * The v8 variant of {@link VersionedPublicStates}: the contract state and the ledger parameters
 * as the stored bytes the v8 ledger runtime wrote, not decoded and not translated. The zswap
 * chain state is decoded, because both runtimes write the same `zswap-ledger-state[v5]` encoding.
 */
export interface Ledger8PublicStates {
  readonly version: 'v8';
  readonly zswapChainState: ZswapChainState;
  /** Serialized, tag-prefixed byte form (`contract-state[v6]`). */
  readonly stateBytes: Uint8Array;
  /** Serialized, tag-prefixed byte form of the ledger parameters. */
  readonly ledgerParametersBytes: Uint8Array;
}

/**
 * The v9 variant of {@link VersionedPublicStates}: every state decoded.
 */
export interface Ledger9PublicStates {
  readonly version: 'v9';
  readonly zswapChainState: ZswapChainState;
  readonly contractState: ContractState;
  readonly ledgerParameters: LedgerParameters;
}

/**
 * The public states read from one block for one contract, discriminated by the ledger runtime
 * that wrote them. The contract state and the ledger parameters always come from the same era;
 * a provider refuses a block where they do not. They agree on a supported indexer, because the
 * node translates every contract state at the fork. Narrow on `version` before touching it.
 */
export type VersionedPublicStates = Ledger8PublicStates | Ledger9PublicStates;

/**
 * The v8 variant of {@link VersionedFinalizedTxData}. Carries the same
 * finalized-transaction metadata as {@link FinalizedTxData} — both variants extend
 * {@link FinalizedTxRecord} — and the transaction as a {@link FinalizedTx}
 * handle whose era is v8: `record.tx.era === record.version`.
 *
 * `version` is derived from the record's own `protocolVersion` by the provider
 * that builds it, so this shape is only produced for a record that resolves to
 * the v8 ledger runtime.
 *
 * A provider that decodes per era produces this variant for any record whose
 * `protocolVersion` places it in the v8 era. A consumer that narrows on
 * `version` therefore has to handle it: it is a value the read surface really
 * returns, not a placeholder.
 */
export interface Ledger8FinalizedTxData extends FinalizedTxRecord {
  readonly version: 'v8';
  /** The finalized transaction, as a handle of the same era as `version`. */
  readonly tx: FinalizedTx;
}

/**
 * A finalized transaction record, discriminated by which ledger runtime
 * produced it. Both variants carry identical metadata and a {@link FinalizedTx}
 * handle; only the `version` discriminant differs, and it always equals
 * `record.tx.era`. Read the transaction with
 * `LedgerTransaction.unwrap(record.tx, record.version)`.
 *
 * The providers in this framework resolve `version` from the record's own
 * `protocolVersion` at the one construction point per provider, and throw
 * rather than mislabel a record from an era they cannot decode. Nothing in the
 * type system obliges a third-party `PublicDataProvider` to do the same, so the
 * discriminant is exactly as trustworthy as the provider that produced it.
 */
export type VersionedFinalizedTxData = Ledger8FinalizedTxData | FinalizedTxData;

// Compile-time-only bridge to the era vocabulary in
// `@midnight-ntwrk/midnight-js-protocol`, which owns the mapping from a raw
// `protocolVersion` to an era. These four assertions keep the discriminant sets
// here and `LedgerVersion` there as one fact: if either side gains an era the
// other lacks, the difference is non-empty and `Assert` fails to satisfy its
// `true` constraint. No runtime declarations, so `versioned.ts` stays
// types-only.
//
// The difference is wrapped in a tuple deliberately. A bare
// `Difference extends never ? true : false` is a *distributive* conditional:
// when `Difference` is `never` it distributes over the empty union and yields
// `never` rather than `true`, and `never` satisfies `T extends true`, so the
// assertion holds no matter what the two sides say. `[D] extends [never]`
// compares the types directly, which is what makes these load-bearing.
type Assert<T extends true> = T;
type _EveryEraHasAReadVariant = Assert<
  [Exclude<LedgerVersion, VersionedFinalizedTxData['version']>] extends [never] ? true : false
>;
type _NoReadVariantOutsideTheEraSet = Assert<
  [Exclude<VersionedFinalizedTxData['version'], LedgerVersion>] extends [never] ? true : false
>;
type _EveryEraHasAStateVariant = Assert<
  [Exclude<LedgerVersion, VersionedContractState['version']>] extends [never] ? true : false
>;
type _NoStateVariantOutsideTheEraSet = Assert<
  [Exclude<VersionedContractState['version'], LedgerVersion>] extends [never] ? true : false
>;
