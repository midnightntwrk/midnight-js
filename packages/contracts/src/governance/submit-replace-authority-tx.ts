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

import type { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
import type { ContractAddress, SigningKey } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { CURRENT_LEDGER_VERSION } from '@midnight-ntwrk/midnight-js-protocol/version';
import { SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import { assertIsContractAddress, assertValidMidnightConfig } from '@midnight-ntwrk/midnight-js-utils';

import { type ContractProviders } from '../contract-providers';
import { isLedger8Contract, resolveArtifactEra } from '../internal/era';
import { submitLedger8MaintenanceTx } from '../internal/ledger8-entry';
import { getExistingSigningKey, queryExistingContractState } from '../internal/required-reads';
import type {
  Ledger8CircuitId,
  Ledger8Contract,
  Ledger8ContractProviders,
  Ledger8FinalizedMaintenanceTxData
} from '../ledger8-contract';
import { submitLedger9Payload } from '../submit-tx';
import type { FinalizedMaintenanceTxData } from '../tx-model';
import { ReplaceMaintenanceAuthorityTxFailedError } from './errors';
import { createUnprovenReplaceAuthorityTx } from './unproven-tx';

/**
 * Constructs and submits a transaction that replaces the maintenance
 * authority stored on the blockchain for this contract. After the transaction is
 * finalized, the current signing key stored in the given private state provider
 * is overwritten with the given new authority key.
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
 * - `ReplaceMaintenanceAuthorityTxFailedError` is thrown with transaction data
 * - Signing key in private state provider is NOT updated (remains as current authority)
 * - Contract authority on-chain remains unchanged
 *
 * **Fallible Phase Failure:**
 * - Transaction is recorded on-chain with non-`SucceedEntirely` status
 * - `ReplaceMaintenanceAuthorityTxFailedError` is thrown with transaction data
 * - Signing key in private state provider is NOT updated (remains as current authority)
 * - Contract authority on-chain may be partially updated but inconsistent
 * - Transaction appears in blockchain history as partial success
 *
 * @param providers The providers to use to manage the transaction lifecycle.
 * @param compiledContract The contract whose maintenance authority should be replaced.
 * @param contractAddress The address of the contract for which the maintenance
 *                        authority should be updated.
 *
 * @returns A function that takes the signing key of the new contract maintenance authority and
 *          resolves with the finalized transaction data under `public`, tagged with the pipeline's
 *          `era`, or rejects if an error occurs along the way.
 *
 * @throws {ReplaceMaintenanceAuthorityTxFailedError} When transaction fails in either guaranteed or fallible phase.
 *         The error contains the finalized transaction data for debugging. The retained-era overload
 *         raises `Ledger8ReplaceMaintenanceAuthorityTxFailedError` instead, carrying the new key.
 * @throws {Ledger8MaintenanceOnLedger9Error} When a retained-era artifact is used on a post-fork head.
 * @throws {Ledger8SigningKeyUnusableError} When the retained-era overload is given a new key that era
 *         cannot sign with. Raised before anything is composed.
 * @throws {Ledger8SigningKeyUnavailableError} When the retained-era overload finds no usable current key.
 * @throws {MaintenanceAuthorityMismatchError} When the retained-era overload holds a key that is not
 *         the contract's maintenance authority. Raised before anything is proven.
 * @throws {Ledger8SigningKeyNotStoredError} When a retained-era replacement was confirmed and the
 *         store then refused the new key. It carries the key.
 * @throws {Ledger8ReplaceAuthorityUnconfirmedError} When a retained-era replacement was submitted but
 *         whether it landed could not be confirmed. It carries the new key, which was not stored.
 *
 * TODO: There are at least three options we should support in the future:
 *       1. Replace authority and maintain key (current).
 *       2. Replace authority and do not maintain key.
 *       3. Add additional authorities and maintain original key.
 */
export function submitReplaceAuthorityTx<C extends Ledger8Contract>(
  providers: Ledger8ContractProviders<C, Ledger8CircuitId<C>>,
  compiledContract: C,
  contractAddress: ContractAddress
): (newAuthority: SigningKey) => Promise<Ledger8FinalizedMaintenanceTxData>;
export function submitReplaceAuthorityTx<C extends Contract.Any>(
  providers: ContractProviders,
  compiledContract: CompiledContract.CompiledContract<C, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  contractAddress: ContractAddress
): (newAuthority: SigningKey) => Promise<FinalizedMaintenanceTxData>;
export function submitReplaceAuthorityTx<C extends Contract.Any>(
  providers: ContractProviders,
  compiledContract: CompiledContract.CompiledContract<C, any> | Ledger8Contract, // eslint-disable-line @typescript-eslint/no-explicit-any
  contractAddress: ContractAddress
): (newAuthority: SigningKey) => Promise<FinalizedMaintenanceTxData | Ledger8FinalizedMaintenanceTxData> {
  return async (newAuthority: SigningKey): Promise<FinalizedMaintenanceTxData | Ledger8FinalizedMaintenanceTxData> => {
    assertValidMidnightConfig(providers.config);
    if (isLedger8Contract(compiledContract, await resolveArtifactEra(compiledContract, providers.zkConfigProvider))) {
      return {
        era: 'v8',
        public: await submitLedger8MaintenanceTx(providers, {
          contract: compiledContract,
          contractAddress,
          update: { kind: 'replace-authority', newSigningKey: newAuthority }
        })
      };
    }
    assertIsContractAddress(contractAddress);
    const contractState = await queryExistingContractState(providers.publicDataProvider, contractAddress);
    const currentAuthority = await getExistingSigningKey(providers.privateStateProvider, contractAddress);
    const unprovenTx = await createUnprovenReplaceAuthorityTx(
      providers.zkConfigProvider,
      compiledContract,
      contractAddress,
      newAuthority,
      contractState,
      currentAuthority,
      providers.walletProvider.getCoinPublicKey(),
      providers.config
    );
    const submitTxResult = await submitLedger9Payload(providers, { unprovenTx });
    if (submitTxResult.status !== SucceedEntirely) {
      throw new ReplaceMaintenanceAuthorityTxFailedError(submitTxResult);
    }
    // TODO: What if machine crashes right before the following set executes? How to recover?
    //       Likely will need a history of pending transactions.
    await providers.privateStateProvider.setSigningKey(contractAddress, newAuthority);
    return { era: CURRENT_LEDGER_VERSION, public: submitTxResult };
  };
}
