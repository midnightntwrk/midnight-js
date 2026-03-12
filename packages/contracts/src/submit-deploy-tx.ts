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
import { SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';

import { type ContractProviders } from './contract-providers';
import { DeployTxFailedError } from './errors';
import { submitTx } from './submit-tx';
import type { FinalizedDeployTxData } from './tx-model';
import type { DeployTxOptionsBase, DeployTxOptionsWithPrivateStateId } from './unproven-deploy-tx';
import { createUnprovenDeployTx } from './unproven-deploy-tx';

/**
 * Providers necessary to submit a deployment transaction - all providers.
 */
export type SubmitDeployTxProviders<C extends Contract.Any> =
  | ContractProviders<C, Contract.ProvableCircuitId<C>, unknown>
  | ContractProviders<C>;

/**
 * Configuration for creating deploy transactions.
 */
export type DeployTxOptions<C extends Contract.Any> = DeployTxOptionsBase<C> | DeployTxOptionsWithPrivateStateId<C>;

export async function submitDeployTx<C extends Contract<undefined>>(
  providers: ContractProviders<C, Contract.ProvableCircuitId<C>, unknown>,
  options: DeployTxOptionsBase<C>
): Promise<FinalizedDeployTxData<C>>;

export async function submitDeployTx<C extends Contract.Any>(
  providers: ContractProviders<C>,
  options: DeployTxOptionsWithPrivateStateId<C>
): Promise<FinalizedDeployTxData<C>>;

/**
 * Creates and submits a deploy transaction for the given contract.
 *
 * ## Transaction Execution Phases
 *
 * Midnight transactions execute in two phases:
 * 1. **Guaranteed phase**: If failure occurs, the transaction is NOT included in the blockchain
 * 2. **Fallible phase**: If failure occurs, the transaction IS recorded on-chain as a partial success
 *
 * ## Failure Behavior
 *
 * **Guaranteed Phase Failure:**
 * - Transaction is rejected and not included in the blockchain
 * - `DeployTxFailedError` is thrown with transaction data
 * - Private state (if `privateStateId` provided) is NOT stored
 * - Contract signing key is NOT stored in private state provider
 * - Contract is NOT deployed
 *
 * **Fallible Phase Failure:**
 * - Transaction is recorded on-chain with non-`SucceedEntirely` status
 * - `DeployTxFailedError` is thrown with transaction data
 * - Private state (if `privateStateId` provided) is NOT stored
 * - Contract signing key is NOT stored in private state provider
 * - Transaction appears in blockchain history as partial success
 * - Contract may be partially deployed but not functional
 *
 * @param providers The providers used to manage the deploy lifecycle.
 * @param options Configuration.
 *
 * @returns A `Promise` that resolves with the finalized deployment transaction data;
 *          or rejects with an error if the deployment fails.
 *
 * @throws {DeployTxFailedError} When transaction fails in either guaranteed or fallible phase.
 *         The error contains the finalized transaction data for debugging.
 */
export async function submitDeployTx<C extends Contract.Any>(
  providers: SubmitDeployTxProviders<C>,
  options: DeployTxOptions<C>
): Promise<FinalizedDeployTxData<C>> {
  const unprovenDeployTxData = await createUnprovenDeployTx(providers, options);
  const finalizedTxData = await submitTx(providers, {
    unprovenTx: unprovenDeployTxData.private.unprovenTx
  });
  if (finalizedTxData.status !== SucceedEntirely) {
    throw new DeployTxFailedError(finalizedTxData);
  }
  providers.privateStateProvider.setContractAddress(unprovenDeployTxData.public.contractAddress);
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
