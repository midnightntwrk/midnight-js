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

import { type Contract } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js';
import type { ContractAddress, ContractState, SigningKey,ZswapLocalState } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import type {
  Ledger8FinalizedTxData,
  Ledger9FinalizedTxData,
  SubmittedCallTxBase,
  UnprovenTx,
  UnsubmittedTxDataBase
} from '@midnight-ntwrk/midnight-js-types';

import type { Ledger9CallResult, Ledger9CallResultPrivate, Ledger9CallResultPublic } from './call';

/**
 * Data relevant to any unsubmitted transaction.
 *
 * @remarks
 * **Privacy-sensitive type.** Every field on this type is private: the
 * `unprovenTx` field carries the unproven transaction that the underlying
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
export interface Ledger9UnsubmittedTxData extends UnsubmittedTxDataBase {
  /**
   * The unproven transaction produced, as a v9 handle. Read it with
   * `LedgerTransaction.unwrap(unprovenTx, 'v9')`.
   */
  readonly unprovenTx: UnprovenTx;
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
export interface Ledger9UnsubmittedDeployTxPrivateData<C extends Contract.Any> {
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
 * {@link Ledger9UnsubmittedDeployTxPrivateData} via the `private` field (signing key
 * and initial private state). When logging, serializing, or transmitting,
 * read only the `public` field or destructure specific non-sensitive fields
 * — never spread or stringify the whole object.
 */
export interface Ledger9UnsubmittedDeployTxDataBase<C extends Contract.Any> {
  /**
   * The pipeline that produced this result: always ledger 9 here.
   *
   * Read off the compiled artifact, NEVER off a transaction record — the two
   * facts disagree after the fork, and only this one says which module the
   * objects in this result came from.
   */
  readonly era: 'v9';
  /**
   * The public data (data that will be revealed upon tx submission) relevant to the deployment transaction.
   */
  readonly public: UnsubmittedDeployTxPublicData;
  /**
   * The private data (data that will not be revealed upon tx submission) relevant to the deployment transaction.
   */
  readonly private: Ledger9UnsubmittedDeployTxPrivateData<C>;
}

/**
 * Data for an unsubmitted deployment transaction.
 *
 * @remarks
 * **Privacy-sensitive type.** Extends {@link Ledger9UnsubmittedDeployTxDataBase} and
 * further embeds {@link Ledger9UnsubmittedTxData} (carrying the
 * unproven transaction) plus the contract constructor's
 * `initialZswapState` under the `private` field. When logging, serializing,
 * or transmitting, read only the `public` field or destructure specific
 * non-sensitive fields — never spread or stringify the whole object.
 */
/**
 * The private data of an unsubmitted deployment transaction: the deploy-specific
 * private data ({@link Ledger9UnsubmittedDeployTxPrivateData}) combined with the
 * unproven transaction data ({@link Ledger9UnsubmittedTxData}) and the Zswap state
 * produced by running the contract constructor.
 */
export interface Ledger9UnsubmittedDeployTxPrivateDataFull<C extends Contract.Any>
  extends Ledger9UnsubmittedDeployTxPrivateData<C>,
    Ledger9UnsubmittedTxData {
  /**
   * The Zswap state produced as a result of running the contract constructor. Useful for when
   * inputs or outputs are created in the contract constructor.
   */
  readonly initialZswapState: ZswapLocalState;
}

export interface Ledger9UnsubmittedDeployTxData<C extends Contract.Any> extends Ledger9UnsubmittedDeployTxDataBase<C> {
  /**
   * The data of this transaction that is only visible on the user device.
   */
  readonly private: Ledger9UnsubmittedDeployTxPrivateDataFull<C>;
}

/**
 * Data for a finalized deploy transaction submitted in this process.
 *
 * @remarks
 * **Privacy-sensitive type.** Inherits {@link Ledger9UnsubmittedDeployTxDataBase}'s
 * `private` field (signing key, initial private state). Treat as confidential
 * when logging, serializing, or transmitting — destructure only the
 * non-sensitive fields (`public.txId`, `public.blockHeight`, etc.) rather
 * than spreading or stringifying the whole object.
 */
/**
 * The public data of a finalized deployment transaction: the deploy-specific
 * public data ({@link UnsubmittedDeployTxPublicData}) combined with the
 * finalized transaction data ({@link Ledger9FinalizedTxData}).
 */
export interface Ledger9FinalizedDeployTxPublicData extends UnsubmittedDeployTxPublicData, Ledger9FinalizedTxData {}

export interface Ledger9FinalizedDeployTxDataBase<C extends Contract.Any> extends Ledger9UnsubmittedDeployTxDataBase<C> {
  /**
   * The data of this transaction that is visible on the blockchain.
   */
  readonly public: Ledger9FinalizedDeployTxPublicData;
}

/**
 * The public data of a deployment found on chain whose deploy transaction was
 * recorded by the ledger-8 runtime, i.e. a contract deployed before the ledger fork.
 *
 * Carries no `initialContractState`: the deploy-time state of a ledger-8 contract
 * cannot be decoded by the current runtime. Read the current state with
 * `PublicDataProvider.queryContractState`.
 *
 * @remarks Unlike the other `Ledger8*` types, it outlives the retained pipeline:
 * it is part of `Ledger9FoundDeployTxData`.
 *
 * @see {@link ErrorTaxonomy} for how the `Ledger8` names are used.
 */
export interface Ledger8FoundDeployTxPublicData extends Ledger8FinalizedTxData {
  /**
   * The ledger address of the contract that was deployed.
   */
  readonly contractAddress: ContractAddress;
}

/**
 * The public data of a deployment found on chain, discriminated by the ledger
 * era that recorded the deploy transaction. Narrow on `era` before reading
 * `tx` or `initialContractState`; `contractAddress` is present on both variants.
 */
export type FoundDeployTxPublicData = Ledger8FoundDeployTxPublicData | Ledger9FinalizedDeployTxPublicData;

/**
 * What a contract maintenance update -- a verifier key inserted or removed, or the maintenance
 * authority replaced -- resolves with once the chain has recorded it.
 *
 * Nested like every other `contracts` result, so `era` names the pipeline and `public` carries the
 * record. The retained era's counterpart is `Ledger8FinalizedMaintenanceTxData`; the two together
 * are `FinalizedMaintenanceTxData`.
 */
export interface Ledger9FinalizedMaintenanceTxData {
  /** The pipeline that produced this result: always ledger 9 here. */
  readonly era: 'v9';
  /** The finalized record of the maintenance transaction. */
  readonly public: Ledger9FinalizedTxData;
}

/**
 * Data for a deployment found on chain by `findDeployedContract`.
 *
 * @remarks
 * **Privacy-sensitive type.** The `private` field carries the signing key and
 * the initial private state. When logging, serializing, or transmitting, read
 * only the `public` field or destructure specific non-sensitive fields.
 */
export interface Ledger9FoundDeployTxData<C extends Contract.Any> {
  /**
   * The pipeline this handle runs on: always ledger 9 here. The era that
   * recorded the deploy transaction is `public.era`.
   */
  readonly era: 'v9';
  /**
   * The data of the deploy transaction that is visible on the blockchain.
   */
  readonly public: FoundDeployTxPublicData;
  /**
   * The private data stored for this contract on this device.
   */
  readonly private: Ledger9UnsubmittedDeployTxPrivateData<C>;
}

/**
 * Data for a finalized deploy transaction submitted in this process.
 *
 * @remarks
 * **Privacy-sensitive type.** Inherits {@link Ledger9UnsubmittedDeployTxData}'s
 * `private` field, which transitively carries the unproven transaction,
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
export interface Ledger9FinalizedDeployTxData<C extends Contract.Any> extends Ledger9UnsubmittedDeployTxData<C> {
  /**
   * The data of this transaction that is visible on the blockchain.
   */
  readonly public: Ledger9FinalizedDeployTxPublicData;
}

/**
 * Data for an unsubmitted call transaction.
 *
 * @remarks
 * **Privacy-sensitive type.** Intersects {@link Ledger9CallResult} (whose `private`
 * field exposes ZK inputs/outputs, the private transcript outputs, and the
 * next private state) with an additional {@link Ledger9UnsubmittedTxData} under
 * `private` (carrying the unproven transaction and new shielded
 * coins). Treat as confidential when logging, serializing, or transmitting —
 * destructure specific non-sensitive fields rather than spreading or
 * stringifying the whole object.
 */
/**
 * The private data of an unsubmitted call transaction: the circuit execution's
 * private result ({@link Ledger9CallResultPrivate}) combined with the unproven
 * transaction data ({@link Ledger9UnsubmittedTxData}).
 */
export interface Ledger9UnsubmittedCallTxPrivateData<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>
  extends Ledger9CallResultPrivate<C, PCK>,
    Ledger9UnsubmittedTxData {}

export interface Ledger9UnsubmittedCallTxData<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>
  extends Ledger9CallResult<C, PCK> {
  /**
   * Private data relevant to this call transaction.
   */
  readonly private: Ledger9UnsubmittedCallTxPrivateData<C, PCK>;
}

/**
 * Data for a submitted, finalized call transaction.
 *
 * @remarks
 * **Privacy-sensitive type.** Inherits {@link Ledger9UnsubmittedCallTxData}'s
 * `private` field, which transitively carries the unproven transaction,
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
 * public result ({@link Ledger9CallResultPublic}) combined with the finalized
 * transaction data ({@link Ledger9FinalizedTxData}).
 */
export interface Ledger9FinalizedCallTxPublicData extends Ledger9CallResultPublic, Ledger9FinalizedTxData {}

export interface Ledger9FinalizedCallTxData<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>
  extends Ledger9UnsubmittedCallTxData<C, PCK> {
  /**
   * The circuit whose call this result describes.
   *
   * On the result itself rather than only in the caller's own variables: a
   * handler that receives a finalized result -- from a queue, a retry, a
   * batch -- has the execution data and no way back to the options that
   * produced it. Both eras carry it.
   *
   * In a scope that made several calls this names the LAST one, which is the
   * call `public`, `private` and `calls` also describe: this type is one
   * call's result, not the transaction's. The transaction may carry more, and
   * a failure reports all of them -- `TxFailedError`'s `circuitId` is the
   * accumulated list. The two are answering different questions, and a caller
   * routing on this one is routing on the call, not the transaction.
   *
   * Typed as the contract's whole circuit-id union, NOT as `PCK`, and that is
   * load-bearing. This type is reachable through `Ledger9TransactionContext[Submit]`,
   * so naming `PCK` in a property position makes the context invariant in
   * `PCK`. A scope is legitimately typed with the union --
   * `withContractScopedTransaction<C>` defaults it that way -- while the calls
   * made inside it name one circuit each, and invariance refuses exactly that
   * pairing. `Ledger9SubmittedCallTx` has no scope on its path and names `PCK`
   * precisely.
   *
   * What catches a regression here is `testkit-js-e2e`'s scoped-transaction
   * test, through the repo-wide `typecheck:tests`. NOT an assertion in this
   * package: reproducing the failure needs a contract whose circuits differ in
   * arity, and every era-9 fixture here declares exactly one no-argument
   * circuit, so an in-package assertion passes whichever way this member is
   * typed. Do not add one and take it for a gate.
   */
  readonly circuitId: Contract.ProvableCircuitId<C>;
  /**
   * Public data relevant to this call transaction.
   */
  readonly public: Ledger9FinalizedCallTxPublicData;
}

/**
 * Data returned from an asynchronous call transaction submission.
 * Contains the transaction ID and call transaction data without waiting for finalization.
 *
 * @remarks
 * **Privacy-sensitive type.** The `callTxData` field carries
 * {@link Ledger9UnsubmittedCallTxData} and transitively the unproven transaction
 * and the call's private state. Treat as confidential when logging,
 * serializing, or transmitting — read only `txId` or destructure specific
 * non-sensitive fields rather than spreading or stringifying the whole
 * object.
 */
export interface Ledger9SubmittedCallTx<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>
  extends SubmittedCallTxBase<Ledger9UnsubmittedCallTxData<C, PCK>> {
  /** See {@link Ledger9FinalizedCallTxData.circuitId}. */
  readonly circuitId: PCK;
  /**
   * The pipeline that produced this result: always ledger 9 here.
   *
   * Read off the compiled artifact, NEVER off a transaction record — the two
   * facts disagree after the fork, and only this one says which module the
   * objects in this result came from.
   */
  readonly era: 'v9';
}
