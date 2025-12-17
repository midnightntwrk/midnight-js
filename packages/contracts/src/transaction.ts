/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
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

import type * as Contract from '@midnight-ntwrk/compact-js/effect/Contract';
import { type PrivateStateId } from '@midnight-ntwrk/midnight-js-types';

import { type ContractProviders } from './contract-providers';
import * as Internal from './internal/transaction';
import type { FinalizedCallTxData, UnsubmittedCallTxData } from './tx-model';

export const TypeId: unique symbol = Internal.TypeId;
export type TypeId = typeof TypeId;

export interface TransactionContext<
  C extends Contract.Contract.Any,
  ICK extends Contract.Contract.ImpureCircuitId<C>
> {
  readonly [TypeId]: TypeId;
  readonly [Internal.Submit]: () => Promise<FinalizedCallTxData<C, ICK>>;
  readonly [Internal.MergeUnsubmittedCallTxData]: (
    circuitId: ICK,
    callData: UnsubmittedCallTxData<C, ICK>,
    privateStateId?: PrivateStateId
  ) => void;

  getLastUnsubmittedCallTxDataToTransact(): [UnsubmittedCallTxData<C, ICK>, PrivateStateId?] | undefined;
}

export type ScopedTransactionOptions = {
  readonly scopeName?: string;
}

export const withContractScopedTransaction: <
  C extends Contract.Contract.Any,
  ICK extends Contract.Contract.ImpureCircuitId<C>
>(
  providers: ContractProviders<C, ICK>,
  fn: (txCtx: TransactionContext<C, ICK>) => Promise<void>,
  options?: ScopedTransactionOptions
) => Promise<FinalizedCallTxData<C, ICK>> =
  async(providers, fn, options?) =>  Internal.scoped(providers, fn, options);
