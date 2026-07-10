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

import { type Contract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import type { ContractAddress, ContractState, SigningKey,ZswapLocalState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type ShieldedCoinInfo, type UnprovenTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type {
  FinalizedTxData
} from '@midnight-ntwrk/midnight-js-types';

import type { CallResult, CallResultPrivate, CallResultPublic } from './call';

/**
 * Data relevant to any unsubmitted transaction.
 *
 * @remarks
 * **Privacy-sensitive type.** Every field on this type is private: the
 * `unprovenTx` field carries the `UnprovenTransaction` that the underlying
 * zero-knowledge proofs were designed to keep confidential, and `newCoins`
 * includes shielded coin material that must not leak.
 *
 * Application code must not log, serialize, or transmit instances of this
 * type. The framework deliberately exposes these references to support
 * retry, replay, debug, and redacted-telemetry workflows that require
 * access to the underlying transaction structure — raw transmission to
 * observability platforms (log shippers, error reporters, analytics) is
 * not an intended use.
 */
export interface UnsubmittedTxData {
  /**
   * The unproven ledger transaction produced.
   */
  readonly unprovenTx: UnprovenTransaction;
  /**
   * New coins created during the construction of the transaction.
   */
  readonly newCoins: ShieldedCoinInfo[];
}

/**
 * Base type for public data relevant to an unsubmitted deployment transaction.
 */
export interface UnsubmittedDeployTxPublicData {
  /**
   * The ledger address of the contract that was deployed.
   */
  readonly contractAddress: ContractAddress;
  /**
   * The initial public state of the contract deployed to the blockchain.
   */
  readonly initialContractState: ContractState;
}

/**
 * Base type for private data relevant to an unsubmitted deployment transaction.
 *
 * @remarks
 * **Privacy-sensitive type.** The `signingKey` field carries the contract's
 * maintenance authority, and `initialPrivateState` carries application-defined
 * private state that the zero-knowledge proofs were designed to keep
 * confidential. Every field on this type is private.
 *
 * Application code must not log, serialize, or transmit instances of this
 * type. If a non-sensitive identifier derived from the deployment is needed,
 * compute it explicitly outside this type rather than passing the whole
 * object across a trust boundary.
 */
export interface UnsubmittedDeployTxPrivateData<C extends Contract.Any> {
  /**
   * The signing key that was added as the deployed contract's maintenance authority.
   */
  readonly signingKey: SigningKey;
  /**
   * The initial private state of the contract deployed to the blockchain. This
   * value is persisted if the transaction succeeds.
   */
  readonly initialPrivateState: Contract.PrivateState<C>;
}

/**
 * Base type for data relevant to an unsubmitted deployment transaction.
 *
 * @remarks
 * **Privacy-sensitive type.** Transitively contains
 * {@link UnsubmittedDeployTxPrivateData} via the `private` field (signing key
 * and initial private state). When logging, serializing, or transmitting,
 * read only the `public` field or destructure specific non-sensitive fields
 * — never spread or stringify the whole object.
 */
export interface UnsubmittedDeployTxDataBase<C extends Contract.Any> {
  /**
   * The public data (data that will be revealed upon tx submission) relevant to the deployment transaction.
   */
  readonly public: UnsubmittedDeployTxPublicData;
  /**
   * The private data (data that will not be revealed upon tx submission) relevant to the deployment transaction.
   */
  readonly private: UnsubmittedDeployTxPrivateData<C>;
}

/**
 * Data for an unsubmitted deployment transaction.
 *
 * @remarks
 * **Privacy-sensitive type.** Extends {@link UnsubmittedDeployTxDataBase} and
 * further embeds {@link UnsubmittedTxData} (carrying the
 * `UnprovenTransaction`) plus the contract constructor's
 * `initialZswapState` under the `private` field. When logging, serializing,
 * or transmitting, read only the `public` field or destructure specific
 * non-sensitive fields — never spread or stringify the whole object.
 */
/**
 * The private data of an unsubmitted deployment transaction: the deploy-specific
 * private data ({@link UnsubmittedDeployTxPrivateData}) combined with the
 * unproven transaction data ({@link UnsubmittedTxData}) and the Zswap state
 * produced by running the contract constructor.
 */
export interface UnsubmittedDeployTxPrivateDataFull<C extends Contract.Any>
  extends UnsubmittedDeployTxPrivateData<C>,
    UnsubmittedTxData {
  /**
   * The Zswap state produced as a result of running the contract constructor. Useful for when
   * inputs or outputs are created in the contract constructor.
   */
  readonly initialZswapState: ZswapLocalState;
}

export interface UnsubmittedDeployTxData<C extends Contract.Any> extends UnsubmittedDeployTxDataBase<C> {
  /**
   * The data of this transaction that is only visible on the user device.
   */
  readonly private: UnsubmittedDeployTxPrivateDataFull<C>;
}

/**
 * Data for a finalized deploy transaction submitted in this process.
 *
 * @remarks
 * **Privacy-sensitive type.** Inherits {@link UnsubmittedDeployTxDataBase}'s
 * `private` field (signing key, initial private state). Treat as confidential
 * when logging, serializing, or transmitting — destructure only the
 * non-sensitive fields (`public.txId`, `public.blockHeight`, etc.) rather
 * than spreading or stringifying the whole object.
 */
/**
 * The public data of a finalized deployment transaction: the deploy-specific
 * public data ({@link UnsubmittedDeployTxPublicData}) combined with the
 * finalized transaction data ({@link FinalizedTxData}).
 */
export interface FinalizedDeployTxPublicData extends UnsubmittedDeployTxPublicData, FinalizedTxData {}

export interface FinalizedDeployTxDataBase<C extends Contract.Any> extends UnsubmittedDeployTxDataBase<C> {
  /**
   * The data of this transaction that is visible on the blockchain.
   */
  readonly public: FinalizedDeployTxPublicData;
}

/**
 * Data for a finalized deploy transaction submitted in this process.
 *
 * @remarks
 * **Privacy-sensitive type.** Inherits {@link UnsubmittedDeployTxData}'s
 * `private` field, which transitively carries the `UnprovenTransaction`,
 * `newCoins`, signing key, initial private state, and `initialZswapState`.
 * Treat as confidential when logging, serializing, or transmitting —
 * destructure only the non-sensitive fields (`public.txId`,
 * `public.blockHeight`, etc.) rather than spreading or stringifying the whole
 * object.
 *
 * The framework deliberately exposes these references to support retry,
 * replay, debug, and redacted-telemetry workflows — raw transmission to
 * observability platforms (log shippers, error reporters, analytics) is
 * not an intended use.
 */
export interface FinalizedDeployTxData<C extends Contract.Any> extends UnsubmittedDeployTxData<C> {
  /**
   * The data of this transaction that is visible on the blockchain.
   */
  readonly public: FinalizedDeployTxPublicData;
}

/**
 * Data for an unsubmitted call transaction.
 *
 * @remarks
 * **Privacy-sensitive type.** Intersects {@link CallResult} (whose `private`
 * field exposes ZK inputs/outputs, the private transcript outputs, and the
 * next private state) with an additional {@link UnsubmittedTxData} under
 * `private` (carrying the `UnprovenTransaction` and new shielded
 * coins). Treat as confidential when logging, serializing, or transmitting —
 * destructure specific non-sensitive fields rather than spreading or
 * stringifying the whole object.
 */
/**
 * The private data of an unsubmitted call transaction: the circuit execution's
 * private result ({@link CallResultPrivate}) combined with the unproven
 * transaction data ({@link UnsubmittedTxData}).
 */
export interface UnsubmittedCallTxPrivateData<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>
  extends CallResultPrivate<C, PCK>,
    UnsubmittedTxData {}

export interface UnsubmittedCallTxData<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>
  extends CallResult<C, PCK> {
  /**
   * Private data relevant to this call transaction.
   */
  readonly private: UnsubmittedCallTxPrivateData<C, PCK>;
}

/**
 * Data for a submitted, finalized call transaction.
 *
 * @remarks
 * **Privacy-sensitive type.** Inherits {@link UnsubmittedCallTxData}'s
 * `private` field, which transitively carries the `UnprovenTransaction`,
 * new shielded coins, ZK inputs/outputs, the private transcript outputs, and
 * the next private state. Treat as confidential when logging, serializing, or
 * transmitting — destructure only the non-sensitive fields (`public.txId`,
 * `public.blockHeight`, etc.) rather than spreading or stringifying the whole
 * object.
 *
 * The framework deliberately exposes these references to support retry,
 * replay, debug, and redacted-telemetry workflows — raw transmission to
 * observability platforms (log shippers, error reporters, analytics) is
 * not an intended use.
 */
/**
 * The public data of a finalized call transaction: the circuit execution's
 * public result ({@link CallResultPublic}) combined with the finalized
 * transaction data ({@link FinalizedTxData}).
 */
export interface FinalizedCallTxPublicData extends CallResultPublic, FinalizedTxData {}

export interface FinalizedCallTxData<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>
  extends UnsubmittedCallTxData<C, PCK> {
  /**
   * Public data relevant to this call transaction.
   */
  readonly public: FinalizedCallTxPublicData;
}

/**
 * Data returned from an asynchronous call transaction submission.
 * Contains the transaction ID and call transaction data without waiting for finalization.
 *
 * @remarks
 * **Privacy-sensitive type.** The `callTxData` field carries
 * {@link UnsubmittedCallTxData} and transitively the `UnprovenTransaction`
 * and the call's private state. Treat as confidential when logging,
 * serializing, or transmitting — read only `txId` or destructure specific
 * non-sensitive fields rather than spreading or stringifying the whole
 * object.
 */
export interface SubmittedCallTx<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>> {
  /**
   * The transaction ID returned from submission.
   */
  readonly txId: string;
  /**
   * The unproven call transaction data including private state.
   */
  readonly callTxData: UnsubmittedCallTxData<C, PCK>;
}
