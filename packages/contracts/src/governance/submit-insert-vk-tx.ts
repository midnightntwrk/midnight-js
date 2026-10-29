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

import { InvalidArgumentError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/v9';
import type { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js';
import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js/effect/Contract';
import { SucceedEntirely, type VerifierKey } from '@midnight-ntwrk/midnight-js-types';
import { assertIsContractAddress, assertValidMidnightConfig } from '@midnight-ntwrk/midnight-js-utils';

import { type Ledger9ContractProviders } from '../contract-providers';
import { TxFailedError } from '../errors';
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
import type { Ledger9FinalizedMaintenanceTxData } from '../tx-model';
import { createUnprovenInsertVerifierKeyTx } from './unproven-tx';

/**
 * Constructs and submits a transaction that adds a new verifier key to the
 * blockchain for the given circuit ID at the given contract address.
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
 * - Verifier key is NOT added to the contract
 * - No on-chain record of the failed transaction
 *
 * **Fallible Phase Failure:**
 * - Transaction is recorded on-chain with non-`SucceedEntirely` status
 * - `TxFailedError` is thrown with transaction data
 * - Verifier key may be partially added but not usable
 * - Transaction appears in blockchain history as partial success
 *
 * @param providers The providers to use to manage the transaction lifecycle.
 * @param compiledContract The contract the circuit belongs to.
 * @param contractAddress The address of the contract containing the circuit for which
 *                        the verifier key should be inserted.
 * @param circuitId The circuit for which the verifier key should be inserted.
 * @param newVk The new verifier key for the circuit.
 *
 * @returns A promise that resolves with the finalized transaction data under `public`, tagged
 *          with the pipeline's `era`, or rejects if an error occurs along the way.
 *
 * @throws {TxFailedError} When transaction fails in either guaranteed or fallible phase.
 *         The error contains the finalized transaction data for debugging. Raised by both eras;
 *         `record.era` tells which.
 * @throws {EraMismatchError} with reason `'ledger8-maintenance-on-ledger9-network'` When a retained-era artifact is used after the fork.
 * @throws {Ledger8SigningKeyUnavailableError} When the retained-era overload finds no usable key.
 * @throws {MaintenanceAuthorityMismatchError} When the retained-era overload holds a key that is not
 *         the contract's maintenance authority. Raised before anything is proven.
 * @throws {InvalidArgumentError} When the circuit's verifier key slot already holds a key, or the
 *         retained-era artifact declares no such circuit. Raised before anything is composed.
 *
 * TODO: We'll likely want to modify ZKConfigProvider provider so that the verifier keys are
 *       automatically rotated in this function. This likely involves storing key versions
 *       along with keys in ZKConfigProvider. By default, artifacts for the latest version
 *       would be fetched to build transactions.
 */
export async function submitInsertVerifierKeyTx<C extends Ledger8Contract>(
  providers: Ledger8ContractProviders<C, Ledger8CircuitId<C>>,
  compiledContract: C,
  contractAddress: ContractAddress,
  circuitId: Ledger8CircuitId<C>,
  newVk: VerifierKey
): Promise<Ledger8FinalizedMaintenanceTxData>;
export async function submitInsertVerifierKeyTx<C extends Contract.Any>(
  providers: Ledger9ContractProviders,
  compiledContract: CompiledContract.CompiledContract<C, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  contractAddress: ContractAddress,
  circuitId: Contract.ProvableCircuitId<C>,
  newVk: VerifierKey
): Promise<Ledger9FinalizedMaintenanceTxData>;
export async function submitInsertVerifierKeyTx<C extends Contract.Any>(
  providers: Ledger9ContractProviders,
  compiledContract: CompiledContract.CompiledContract<C, any> | Ledger8Contract, // eslint-disable-line @typescript-eslint/no-explicit-any
  contractAddress: ContractAddress,
  circuitId: Contract.ProvableCircuitId<C> | string,
  newVk: VerifierKey
): Promise<Ledger9FinalizedMaintenanceTxData | Ledger8FinalizedMaintenanceTxData> {
  assertValidMidnightConfig(providers.config);
  if (isLedger8Contract(compiledContract, await resolveArtifactEra(compiledContract, providers.zkConfigProvider))) {
    return {
      era: 'v8',
      public: await submitLedger8MaintenanceTx(providers, {
        contract: compiledContract,
        contractAddress,
        update: { kind: 'insert-verifier-key', circuitId, verifierKey: newVk }
      })
    };
  }
  assertIsContractAddress(contractAddress);
  const contractState = await queryExistingContractState(providers.publicDataProvider, contractAddress);
  const existingVerifierKey: Uint8Array | undefined = contractState.operation(circuitId)?.verifierKey;
  if (existingVerifierKey !== undefined && existingVerifierKey !== null) {
    throw new InvalidArgumentError(`Circuit '${circuitId}' is already defined for contract at address '${contractAddress}'`);
  }
  const signingKey = await getExistingSigningKey(providers.privateStateProvider, contractAddress);
  const unprovenTx = await createUnprovenInsertVerifierKeyTx(
    providers.zkConfigProvider,
    compiledContract,
    contractAddress,
    circuitId,
    newVk,
    contractState,
    signingKey,
    providers.walletProvider.getCoinPublicKey(),
    providers.config
  );
  const submitTxResult = await submitLedger9Payload(providers, { unprovenTx });
  if (submitTxResult.status !== SucceedEntirely) {
    throw new TxFailedError('insert-verifier-key', submitTxResult, { contractAddress, circuitId });
  }
  return { era: 'v9', public: submitTxResult };
}
