// This file is part of MIDNIGHT-JS.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import type { Contract, ImpureCircuitId } from '@midnight-ntwrk/midnight-js-types';
import { SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import { assertDefined, assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';
import { CallTxFailedError, IncompleteCallTxPrivateStateConfig } from './errors';
import type { FinalizedCallTxData } from './tx-model';
import {
  type CallTxOptionsBase,
  type CallTxOptionsWithPrivateStateId,
  type CallTxOptions,
  createUnprovenCallTx
} from './unproven-call-tx';
import type { SubmitTxProviders } from './submit-tx';
import { submitTx } from './submit-tx';
import { type ContractProviders } from './contract-providers';

export type SubmitCallTxProviders<C extends Contract, ICK extends ImpureCircuitId<C>> =
  | ContractProviders<C>
  | SubmitTxProviders<C, ICK>;

/* eslint-disable no-redeclare */

export async function submitCallTx<C extends Contract<undefined>, ICK extends ImpureCircuitId<C>>(
  providers: SubmitTxProviders<C, ICK>,
  options: CallTxOptionsBase<C, ICK>
): Promise<FinalizedCallTxData<C, ICK>>;

export async function submitCallTx<C extends Contract, ICK extends ImpureCircuitId<C>>(
  providers: ContractProviders<C>,
  options: CallTxOptionsWithPrivateStateId<C, ICK>
): Promise<FinalizedCallTxData<C, ICK>>;

/**
 * Creates and submits a transaction for the invocation of a circuit on a given contract.
 *
 * @param providers The providers used to manage the invocation lifecycle.
 * @param options Configuration.
 *
 * @returns A `Promise` that resolves with the finalized transaction data for the invocation of
 *         `circuitId` on `contract` with the given `args`; or rejects with an error if the invocation fails.
 */
export async function submitCallTx<C extends Contract, ICK extends ImpureCircuitId<C>>(
  providers: SubmitCallTxProviders<C, ICK>,
  options: CallTxOptions<C, ICK>
): Promise<FinalizedCallTxData<C, ICK>> {
  assertIsContractAddress(options.contractAddress);
  assertDefined(
    options.contract.impureCircuits[options.circuitId],
    `Circuit '${options.circuitId}' is undefined`
  );

  const hasPrivateStateProvider = 'privateStateProvider' in providers;
  const hasPrivateStateId = 'privateStateId' in options;

  if (hasPrivateStateId && !hasPrivateStateProvider) {
    throw new IncompleteCallTxPrivateStateConfig();
  }

  const unprovenCallTxData = await createUnprovenCallTx(providers, options);

  const finalizedTxData = await submitTx(providers, {
    unprovenTx: unprovenCallTxData.private.unprovenTx,
    newCoins: unprovenCallTxData.private.newCoins,
    circuitId: options.circuitId
  });

  if (finalizedTxData.status !== SucceedEntirely) {
    throw new CallTxFailedError(finalizedTxData, options.circuitId);
  }

  if (hasPrivateStateId && hasPrivateStateProvider) {
    await providers.privateStateProvider.set(
      options.privateStateId,
      unprovenCallTxData.private.nextPrivateState
    );
  }

  return {
    private: unprovenCallTxData.private,
    public: {
      ...unprovenCallTxData.public,
      ...finalizedTxData
    }
  };
}
