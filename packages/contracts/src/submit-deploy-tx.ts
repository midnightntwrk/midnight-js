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
import { SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import { assertNever } from '@midnight-ntwrk/midnight-js-utils';

import { type Ledger9ContractProviders } from './contract-providers';
import { TxFailedError } from './errors';
import { requireLedger9Contract, resolveArtifactEra, unsupportedContractEra } from './internal/era';
import { assertDeployPrivateStatePairing } from './internal/private-state-pairing';
import { submitLedger9Payload } from './submit-tx';
import type { Ledger9FinalizedDeployTxData } from './tx-model';
import type { Ledger9DeployTxOptionsBase, Ledger9DeployTxOptionsWithPrivateStateId } from './unproven-deploy-tx';
import { createLedger9UnprovenDeployTx } from './unproven-deploy-tx';

/**
 * Providers necessary to submit a deployment transaction - all providers.
 */
export type SubmitDeployTxProviders<C extends Contract.Any> =
  | Ledger9ContractProviders<C, Contract.ProvableCircuitId<C>, unknown>
  | Ledger9ContractProviders<C>;

/**
 * Configuration for creating deploy transactions.
  * @throws EraMismatchError with reason `'contract-era-unsupported'` for a contract whose artifacts
 *         do not declare ledger 9, before anything else.
*/
export type Ledger9DeployTxOptions<C extends Contract.Any> = Ledger9DeployTxOptionsBase<C> | Ledger9DeployTxOptionsWithPrivateStateId<C>;

export async function submitLedger9DeployTx<C extends Contract<undefined>>(
  providers: Ledger9ContractProviders<C, Contract.ProvableCircuitId<C>, unknown>,
  options: Ledger9DeployTxOptionsBase<C>
): Promise<Ledger9FinalizedDeployTxData<C>>;

export async function submitLedger9DeployTx<C extends Contract.Any>(
  providers: Ledger9ContractProviders<C>,
  options: Ledger9DeployTxOptionsWithPrivateStateId<C>
): Promise<Ledger9FinalizedDeployTxData<C>>;

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
 * - `TxFailedError` is thrown with transaction data
 * - Private state (if `privateStateId` provided) is NOT stored
 * - Contract signing key is NOT stored in private state provider
 * - Contract is NOT deployed
 *
 * **Fallible Phase Failure:**
 * - Transaction is recorded on-chain with non-`SucceedEntirely` status
 * - `TxFailedError` is thrown with transaction data
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
 * @throws {TxFailedError} When transaction fails in either guaranteed or fallible phase.
 *         The error contains the finalized transaction data for debugging.
 * @throws {IncompleteDeployContractPrivateStateConfig} When `privateStateId` is present without
 *         `initialPrivateState`, or `initialPrivateState` holds a value without `privateStateId`.
 *         Raised before anything is built or submitted.
 * @throws {InvalidArgumentError} When `privateStateId` is present with an undefined value. Raised before anything
 *         is built or submitted, and ahead of the pairing refusal.
 *
 * @remarks
 * The returned {@link Ledger9FinalizedDeployTxData} is privacy-sensitive and carries
 * the unproven transaction, signing key, and initial private state. See that
 * type for handling guidance before logging, serializing, or transmitting the
 * result.
 */
export async function submitLedger9DeployTx<C extends Contract.Any>(
  providers: SubmitDeployTxProviders<C>,
  options: Ledger9DeployTxOptions<C>
): Promise<Ledger9FinalizedDeployTxData<C>> {
  await requireLedger9Contract(options.compiledContract, providers.zkConfigProvider, 'submitLedger9DeployTx');
  assertDeployPrivateStatePairing(options);
  const unprovenDeployTxData = await createLedger9UnprovenDeployTx(providers, options);
  const finalizedTxData = await submitLedger9Payload(providers, {
    unprovenTx: unprovenDeployTxData.private.unprovenTx
  });
  if (finalizedTxData.status !== SucceedEntirely) {
    throw new TxFailedError('deploy', finalizedTxData, {
      contractAddress: unprovenDeployTxData.public.contractAddress,
      signingKey: unprovenDeployTxData.private.signingKey
    });
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
    era: 'v9',
    private: unprovenDeployTxData.private,
    public: {
      ...finalizedTxData,
      ...unprovenDeployTxData.public
    }
  };
}

export async function submitDeployTx<C extends Contract<undefined>>(
  providers: Ledger9ContractProviders<C, Contract.ProvableCircuitId<C>, unknown>,
  options: Ledger9DeployTxOptionsBase<C>
): Promise<Ledger9FinalizedDeployTxData<C>>;

export async function submitDeployTx<C extends Contract.Any>(
  providers: Ledger9ContractProviders<C>,
  options: Ledger9DeployTxOptionsWithPrivateStateId<C>
): Promise<Ledger9FinalizedDeployTxData<C>>;

/**
 * Creates and submits a deploy transaction for a contract of the era its artifacts declare. A
 * ledger 9 contract runs {@link submitLedger9DeployTx}, whose documentation covers
 * the parameters and the privacy-sensitive result.
 *
 * @throws EraMismatchError with reason `'contract-era-unsupported'` for a contract of an era this
 *         function does not serve, after the artifact era is read and before anything else, and with
 *         the reasons of the artifact era read: `'unwrapped-ledger9-contract'`,
 *         `'unrecognised-contract-shape'`, `'artifact-era-undeclared'`, `'provider-cannot-declare-era'`,
 *         `'unknown-artifact-runtime-version'`. A failure of the ZK config provider propagates unchanged.
 *         `deployContract` deploys contracts of both eras.
 */
export async function submitDeployTx<C extends Contract.Any>(
  providers: SubmitDeployTxProviders<C>,
  options: Ledger9DeployTxOptions<C>
): Promise<Ledger9FinalizedDeployTxData<C>> {
  const era = await resolveArtifactEra(options.compiledContract, providers.zkConfigProvider);
  switch (era) {
    case 'v9':
      return submitLedger9DeployTx(providers, options);
    case 'v8':
      throw unsupportedContractEra('submitDeployTx', era);
    default:
      return assertNever(era, 'submitDeployTx');
  }
}
