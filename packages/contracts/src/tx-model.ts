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

import type { CallResult } from './call';

/**
 * Data relevant to any unsubmitted transaction.
 *
 * ⚠️ **Privacy Notice:** The `unprovenTx` field contains a `UnprovenTransaction`
 * which references zero-knowledge proof inputs (private state, secret keys, and
 * transaction witnesses). Application code that logs, serializes, or transmits
 * `UnsubmittedTxData` or any containing type must filter or redact `unprovenTx`
 * before doing so. See `packages/contracts/src/` for privacy-sensitive field
 * locations.
 */
export type UnsubmittedTxData = {
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
export type UnsubmittedDeployTxPublicData = {
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
export type UnsubmittedDeployTxPrivateData<C extends Contract.Any> = {
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
export type UnsubmittedDeployTxDataBase<C extends Contract.Any> = {
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
 */
export type UnsubmittedDeployTxData<C extends Contract.Any> = UnsubmittedDeployTxDataBase<C> & {
  /**
   * The data of this transaction that is only visible on the user device.
   */
  readonly private: UnsubmittedTxData & {
    /**
     * The Zswap state produced as a result of running the contract constructor. Useful for when
     * inputs or outputs are created in the contract constructor.
     */
    readonly initialZswapState: ZswapLocalState;
  };
};

/**
 * Data for a finalized deploy transaction submitted in this process.
 */
export type FinalizedDeployTxDataBase<C extends Contract.Any> = UnsubmittedDeployTxDataBase<C> & {
  /**
   * The data of this transaction that is visible on the blockchain.
   */
  readonly public: FinalizedTxData;
};

/**
 * Data for a finalized deploy transaction submitted in this process.
 */
export type FinalizedDeployTxData<C extends Contract.Any> = UnsubmittedDeployTxData<C> & {
  /**
   * The data of this transaction that is visible on the blockchain.
   */
  readonly public: FinalizedTxData;
};

/**
 * Data for an unsubmitted call transaction.
 *
 * @remarks
 * **Privacy-sensitive type.** The `private` field (of type `UnsubmittedTxData`)
 * contains an `unprovenTx` with zero-knowledge proof inputs. Application code
 * must not log, serialize, or transmit this type without filtering the
 * `private` field.
 */
export type UnsubmittedCallTxData<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>> = CallResult<C, PCK> & {
  /**
   * Private data relevant to this call transaction.
   */
  readonly private: UnsubmittedTxData;
};

/**
 * Data for a submitted, finalized call transaction.
 *
 * @remarks
 * **Privacy-sensitive type.** This type contains a `callTxData.private.unprovenTx`
 * field (inherited from `UnsubmittedCallTxData` → `UnsubmittedTxData`) which
 * references zero-knowledge proof inputs. Application code must not log,
 * serialize, or transmit instances of this type without explicitly filtering
 * the `callTxData` field first.
 */
export type FinalizedCallTxData<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>> = UnsubmittedCallTxData<C, PCK> & {
  /**
   * Public data relevant to this call transaction.
   */
  readonly public: FinalizedTxData;
};

/**
 * Data returned from an asynchronous call transaction submission.
 * Contains the transaction ID and call transaction data without waiting for finalization.
 *
 * @remarks
 * **Privacy-sensitive type.** The `callTxData` field contains an
 * `UnprovenTransaction` (via `UnsubmittedCallTxData.private.unprovenTx`)
 * with zero-knowledge proof inputs. Do not log, serialize, or transmit
 * this type without filtering `callTxData` explicitly.
 */
export type SubmittedCallTx<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>> = {
  /**
   * The transaction ID returned from submission.
   */
  readonly txId: string;
  /**
   * The unproven call transaction data including private state.
   */
  readonly callTxData: UnsubmittedCallTxData<C, PCK>;
};
