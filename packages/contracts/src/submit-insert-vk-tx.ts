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

import type { CompiledContract } from '@midnight-ntwrk/compact-js';
import type { Contract } from '@midnight-ntwrk/compact-js/effect/Contract';
import type { ContractAddress } from '@midnight-ntwrk/ledger-v7';
import {
  type FinalizedTxData,
  SucceedEntirely,
  type VerifierKey} from '@midnight-ntwrk/midnight-js-types';
import { assertDefined, assertIsContractAddress, assertUndefined } from '@midnight-ntwrk/midnight-js-utils';

import { type ContractProviders } from './contract-providers';
import { InsertVerifierKeyTxFailedError } from './errors';
import { submitTx } from './submit-tx';
import { createUnprovenInsertVerifierKeyTx } from './utils';

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
 * - `InsertVerifierKeyTxFailedError` is thrown with transaction data
 * - Verifier key is NOT added to the contract
 * - No on-chain record of the failed transaction
 *
 * **Fallible Phase Failure:**
 * - Transaction is recorded on-chain with non-`SucceedEntirely` status
 * - `InsertVerifierKeyTxFailedError` is thrown with transaction data
 * - Verifier key may be partially added but not usable
 * - Transaction appears in blockchain history as partial success
 *
 * @param providers The providers to use to manage the transaction lifecycle.
 * @param compiledContract The compiled contract for which the maintenance authority
 *                         should be updated.
 * @param contractAddress The address of the contract containing the circuit for which
 *                        the verifier key should be inserted.
 * @param circuitId The circuit for which the verifier key should be inserted.
 * @param newVk The new verifier key for the circuit.
 *
 * @returns A promise that resolves with the finalized transaction data, or rejects if
 *          an error occurs along the way.
 *
 * @throws {InsertVerifierKeyTxFailedError} When transaction fails in either guaranteed or fallible phase.
 *         The error contains the finalized transaction data for debugging.
 *
 * TODO: We'll likely want to modify ZKConfigProvider provider so that the verifier keys are
 *       automatically rotated in this function. This likely involves storing key versions
 *       along with keys in ZKConfigProvider. By default, artifacts for the latest version
 *       would be fetched to build transactions.
 */
export const submitInsertVerifierKeyTx = async <C extends Contract.Any>(
  providers: ContractProviders,
  compiledContract: CompiledContract.CompiledContract<C, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  contractAddress: ContractAddress,
  circuitId: Contract.ImpureCircuitId<C>,
  newVk: VerifierKey
): Promise<FinalizedTxData> => {
  assertIsContractAddress(contractAddress);
  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  assertDefined(contractState, `No contract state found on chain for contract address '${contractAddress}'`);
  assertUndefined(
    contractState.operation(circuitId),
    `Circuit '${circuitId}' is already defined for contract at address '${contractAddress}'`
  );
  const signingKey = await providers.privateStateProvider.getSigningKey(contractAddress);
  assertDefined(signingKey, `Signing key for contract address '${contractAddress}' not found`);
  const unprovenTx = await createUnprovenInsertVerifierKeyTx(
    providers.zkConfigProvider,
    compiledContract,
    contractAddress, 
    circuitId, 
    newVk, 
    contractState, 
    signingKey,
    providers.walletProvider.getCoinPublicKey()
  );
  const submitTxResult = await submitTx(providers, { unprovenTx });
  if (submitTxResult.status !== SucceedEntirely) {
    throw new InsertVerifierKeyTxFailedError(submitTxResult);
  }
  return submitTxResult;
};
