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

import { type ContractProviders } from '@midnight-ntwrk/midnight-js-contract-core';
import { submitTx } from '@midnight-ntwrk/midnight-js-contract-core';
import { type Contract, type ImpureCircuitId, SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';

import { DeployTxFailedError } from './errors';
import type { FinalizedDeployTxData } from './tx-model';
import type { DeployTxOptionsBase, DeployTxOptionsWithPrivateStateId } from './unproven-deploy-tx';
import { createUnprovenDeployTx } from './unproven-deploy-tx';

/**
 * Providers necessary to submit a deployment transaction - all providers.
 */
export type SubmitDeployTxProviders<C extends Contract> =
  | ContractProviders<C, ImpureCircuitId<C>, unknown>
  | ContractProviders<C>;

/**
 * Configuration for creating deploy transactions.
 */
export type DeployTxOptions<C extends Contract> = DeployTxOptionsBase<C> | DeployTxOptionsWithPrivateStateId<C>;



export async function submitDeployTx<C extends Contract<undefined>>(
  providers: ContractProviders<C, ImpureCircuitId<C>, unknown>,
  options: DeployTxOptionsBase<C>
): Promise<FinalizedDeployTxData<C>>;

export async function submitDeployTx<C extends Contract>(
  providers: ContractProviders<C>,
  options: DeployTxOptionsWithPrivateStateId<C>
): Promise<FinalizedDeployTxData<C>>;

/**
 * Creates and submits a deploy transaction for the given contract.
 *
 * @param providers The providers used to manage the deploy lifecycle.
 * @param options Configuration.
 *
 * @returns A `Promise` that resolves with the finalized deployment transaction data;
 *          or rejects with an error if the deployment fails.
 */
export async function submitDeployTx<C extends Contract>(
  providers: SubmitDeployTxProviders<C>,
  options: DeployTxOptions<C>
): Promise<FinalizedDeployTxData<C>> {
  const unprovenDeployTxData = await createUnprovenDeployTx(providers, options);
  const finalizedTxData = await submitTx(providers, {
    unprovenTx: unprovenDeployTxData.private.unprovenTx,
    newCoins: unprovenDeployTxData.private.newCoins
  });
  if (finalizedTxData.status !== SucceedEntirely) {
    throw new DeployTxFailedError(finalizedTxData);
  }
  if ('privateStateId' in options) {
    await providers.privateStateProvider.set(options.privateStateId, unprovenDeployTxData.private.initialPrivateState);
  }
  await providers.privateStateProvider.setSigningKey(
    unprovenDeployTxData.public.contractAddress,
    unprovenDeployTxData.private.signingKey
  );
  return {
    private: unprovenDeployTxData.private,
    public: {
      ...finalizedTxData,
      ...unprovenDeployTxData.public
    }
  };
}
