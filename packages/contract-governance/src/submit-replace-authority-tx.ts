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

import type { ContractAddress, SigningKey } from '@midnight-ntwrk/ledger';
import { type ContractProviders } from '@midnight-ntwrk/midnight-js-contract-core';
import { submitTx } from '@midnight-ntwrk/midnight-js-contract-core';
import { createUnprovenReplaceAuthorityTx } from '@midnight-ntwrk/midnight-js-contract-core';
import { type FinalizedTxData, SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import { assertDefined, assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';

import { ReplaceMaintenanceAuthorityTxFailedError } from './errors';

/**
 * Constructs and submits a transaction that replaces the maintenance
 * authority stored on the blockchain for this contract. After the transaction is
 * finalized, the current signing key stored in the given private state provider
 * is overwritten with the given new authority key.
 *
 * @param providers The providers to use to manage the transaction lifecycle.
 * @param contractAddress The address of the contract for which the maintenance
 *                        authority should be updated.
 *
 * TODO: There are at least three options we should support in the future:
 *       1. Replace authority and maintain key (current).
 *       2. Replace authority and do not maintain key.
 *       3. Add additional authorities and maintain original key.
 */
export const submitReplaceAuthorityTx =
  (providers: ContractProviders, contractAddress: ContractAddress) =>
  /**
   * @param newAuthority The signing key of the new contract maintenance authority.
   *
   * @returns A promise that resolves with the finalized transaction data, or rejects if
   *          an error occurs along the way.
   */
  async (newAuthority: SigningKey): Promise<FinalizedTxData> => {
    assertIsContractAddress(contractAddress);
    const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
    assertDefined(contractState, `No contract state found on chain for contract address '${contractAddress}'`);
    const currentAuthority = await providers.privateStateProvider.getSigningKey(contractAddress);
    assertDefined(currentAuthority, `Signing key for contract address '${contractAddress}' not found`);
    const unprovenTx = createUnprovenReplaceAuthorityTx(contractAddress, newAuthority, contractState, currentAuthority);
    const submitTxResult = await submitTx(providers, { unprovenTx });
    if (submitTxResult.status !== SucceedEntirely) {
      throw new ReplaceMaintenanceAuthorityTxFailedError(submitTxResult);
    }
    // TODO: What if machine crashes right before the following set executes? How to recover?
    //       Likely will need a history of pending transactions.
    await providers.privateStateProvider.setSigningKey(contractAddress, newAuthority);
    return submitTxResult;
  };
