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

import type { Contract } from '@midnight-ntwrk/compact-js/effect/Contract';
import { type PrivateStateId } from '@midnight-ntwrk/midnight-js-types';

import { type ContractProviders } from './contract-providers';
import { type ContractStates,type PublicContractStates } from './get-states';
import * as Internal from './internal/transaction';
import type { FinalizedCallTxData, UnsubmittedCallTxData } from './tx-model';

export const TypeId: unique symbol = Internal.TypeId;
export type TypeId = typeof TypeId;

/**
 * Encapsulates the context for managing a scoped contract transaction.
 */
export interface TransactionContext<
  C extends Contract.Any,
  ICK extends Contract.ImpureCircuitId<C> = Contract.ImpureCircuitId<C>
> {
  readonly [TypeId]: TypeId;
  readonly [Internal.Submit]: () => Promise<FinalizedCallTxData<C, ICK>>;
  readonly [Internal.MergeUnsubmittedCallTxData]: (
    circuitId: ICK,
    callData: UnsubmittedCallTxData<C, ICK>,
    privateStateId?: PrivateStateId
  ) => void;
  readonly [Internal.CacheStates]: (
    states: ContractStates<Contract.PrivateState<C>> | PublicContractStates,
    identity: Internal.CachedStateIdentity
  ) => void;
  readonly [Internal.GetCurrentStatesForIdentity]: (
    identity: Internal.CachedStateIdentity
  ) => ContractStates<Contract.PrivateState<C>> | PublicContractStates | undefined;

  /**
   * Gets the current cached contract states within the transaction context.
   *
   * @return A cached {@link ContractStates} instance, or `undefined` if circuit calls are yet to be made.
   *
   * @remarks
   * The returned states represent the unsubmitted _running_ state of the contract within the transaction context,
   * reflecting any unsubmitted circuit calls made to the contract during the scope of the transaction.
   */
  getCurrentStates(): ContractStates<Contract.PrivateState<C>> | PublicContractStates | undefined;

  /**
   * Gets the last unsubmitted call transaction data.
   *
   * @return A tuple containing an {@link UnsubmittedCallTxData} instance, and an optional private state
   * ID, or `undefined` if circuit calls are yet to be made.
   */
  getLastUnsubmittedCallTxDataToTransact(): [UnsubmittedCallTxData<C, ICK>, PrivateStateId?] | undefined;
}

/**
 * Options for use when creating scoped transactions.
 */
export type ScopedTransactionOptions = {
  /**
   * An optional name for the transaction scope.
   */
  readonly scopeName?: string;
}

/**
 * Type guard to determine if a value is a TransactionContext.
 *
 * @param u The value to check.
 * @returns `true` if `u` is a {@link TransactionContext}, otherwise `false`.
 */
export const isTransactionContext: (u: unknown) => u is TransactionContext<Contract.Any> =
  Internal.isTransactionContext;

  /**
   * Executes a function within the context of a contract-scoped transaction.
   *
   * @param providers The contract providers to use within the transaction.
   * @param fn The function to execute within the transaction context.
   * @param options Optional transaction scope options.
   * @returns A `Promise` that resolves with the finalized transaction data of the single transaction
   * created for all circuit calls made within `fn`.
   * 
   * @remarks
   * Where `fn` make circuit calls, these are batched together and submitted as a single transaction when
   * the function completes successfully. If `fn` throws an error, any unsubmitted circuit calls are discarded.
   */
export const withContractScopedTransaction: <
  C extends Contract.Any,
  ICK extends Contract.ImpureCircuitId<C> = Contract.ImpureCircuitId<C>
>(
  providers: ContractProviders<C, ICK>,
  fn: (txCtx: TransactionContext<C, ICK>) => Promise<void>,
  options?: ScopedTransactionOptions
) => Promise<FinalizedCallTxData<C, ICK>> =
  async(providers, fn, options?) =>  Internal.scoped(providers, fn, options);
