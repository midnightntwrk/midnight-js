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

import { type Contract } from '@midnight-ntwrk/compact-js';
import type { ContractAddress, ContractState, SigningKey,ZswapLocalState } from '@midnight-ntwrk/compact-runtime';
import { type ShieldedCoinInfo, type UnprovenTransaction } from '@midnight-ntwrk/ledger-v7';
import type {
  FinalizedTxData
} from '@midnight-ntwrk/midnight-js-types';

import type { CallResult, CallResultPrivate, CallResultPublic } from './call';

/**
 * Data relevant to any unsubmitted transaction.
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
 * Full private data for an unsubmitted deployment transaction, combining the base private data
 * with transaction data and the initial Zswap state.
 */
export interface UnsubmittedDeployTxPrivateDataFull<C extends Contract.Any>
  extends UnsubmittedDeployTxPrivateData<C>, UnsubmittedTxData {
  readonly initialZswapState: ZswapLocalState;
}

/**
 * Data for an unsubmitted deployment transaction.
 */
export interface UnsubmittedDeployTxData<C extends Contract.Any> extends UnsubmittedDeployTxDataBase<C> {
  /**
   * The data of this transaction that is only visible on the user device.
   */
  readonly private: UnsubmittedDeployTxPrivateDataFull<C>;
}

/**
 * Public data for a finalized deployment transaction, combining the base public data
 * with finalization data.
 */
export interface FinalizedDeployTxPublicData extends UnsubmittedDeployTxPublicData, FinalizedTxData {}

/**
 * Data for a finalized deploy transaction submitted in this process.
 */
export interface FinalizedDeployTxDataBase<C extends Contract.Any> extends UnsubmittedDeployTxDataBase<C> {
  /**
   * The data of this transaction that is visible on the blockchain.
   */
  readonly public: FinalizedDeployTxPublicData;
}

/**
 * Data for a finalized deploy transaction submitted in this process.
 */
export interface FinalizedDeployTxData<C extends Contract.Any> extends UnsubmittedDeployTxData<C> {
  /**
   * The data of this transaction that is visible on the blockchain.
   */
  readonly public: FinalizedDeployTxPublicData;
}

/**
 * Private data for an unsubmitted call transaction, combining the call result private data
 * with transaction data.
 */
export interface UnsubmittedCallTxPrivateData<C extends Contract.Any, ICK extends Contract.ImpureCircuitId<C>>
  extends CallResultPrivate<C, ICK>, UnsubmittedTxData {}

/**
 * Data for an unsubmitted call transaction.
 */
export interface UnsubmittedCallTxData<C extends Contract.Any, ICK extends Contract.ImpureCircuitId<C>> extends CallResult<C, ICK> {
  /**
   * Private data relevant to this call transaction.
   */
  readonly private: UnsubmittedCallTxPrivateData<C, ICK>;
}

/**
 * Public data for a finalized call transaction, combining the call result public data
 * with finalization data.
 */
export interface FinalizedCallTxPublicData extends CallResultPublic, FinalizedTxData {}

/**
 * Data for a submitted, finalized call transaction.
 */
export interface FinalizedCallTxData<C extends Contract.Any, ICK extends Contract.ImpureCircuitId<C>> extends UnsubmittedCallTxData<C, ICK> {
  /**
   * Public data relevant to this call transaction.
   */
  readonly public: FinalizedCallTxPublicData;
}

/**
 * Data returned from an asynchronous call transaction submission.
 * Contains the transaction ID and call transaction data without waiting for finalization.
 */
export interface SubmittedCallTx<C extends Contract.Any, ICK extends Contract.ImpureCircuitId<C>> {
  /**
   * The transaction ID returned from submission.
   */
  readonly txId: string;
  /**
   * The unproven call transaction data including private state.
   */
  readonly callTxData: UnsubmittedCallTxData<C, ICK>;
}
