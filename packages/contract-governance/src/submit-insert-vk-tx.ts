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

import type { ContractAddress } from '@midnight-ntwrk/ledger';
import {
  type FinalizedTxData,
  type ImpureCircuitId,
  SucceedEntirely,
  type VerifierKey} from '@midnight-ntwrk/midnight-js-types';
import { assertDefined, assertIsContractAddress, assertUndefined } from '@midnight-ntwrk/midnight-js-utils';

import { type ContractProviders } from '@midnight-ntwrk/midnight-js-contract-core';
import { InsertVerifierKeyTxFailedError } from './errors';
import { submitTx } from './submit-tx';
import { createUnprovenInsertVerifierKeyTx } from './utils';

/**
 * Constructs and submits a transaction that adds a new verifier key to the
 * blockchain for the given circuit ID at the given contract address.
 *
 * @param providers The providers to use to manage the transaction lifecycle.
 * @param contractAddress The address of the contract containing the circuit for which
 *                        the verifier key should be inserted.
 * @param circuitId The circuit for which the verifier key should be inserted.
 * @param newVk The new verifier key for the circuit.
 *
 * @returns A promise that resolves with the finalized transaction data, or rejects if
 *          an error occurs along the way.
 *
 * TODO: We'll likely want to modify ZKConfigProvider provider so that the verifier keys are
 *       automatically rotated in this function. This likely involves storing key versions
 *       along with keys in ZKConfigProvider. By default, artifacts for the latest version
 *       would be fetched to build transactions.
 */
export const submitInsertVerifierKeyTx = async (
  providers: ContractProviders,
  contractAddress: ContractAddress,
  circuitId: ImpureCircuitId,
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
  const unprovenTx = createUnprovenInsertVerifierKeyTx(contractAddress, circuitId, newVk, contractState, signingKey);
  const submitTxResult = await submitTx(providers, { unprovenTx });
  if (submitTxResult.status !== SucceedEntirely) {
    throw new InsertVerifierKeyTxFailedError(submitTxResult);
  }
  return submitTxResult;
};
