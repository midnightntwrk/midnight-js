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

import type { PublicDataProvider, UnshieldedBalances } from '@midnight-ntwrk/midnight-js-types';
import type { ContractAddress } from '@midnight-ntwrk/ledger';
import { assertDefined, assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';

/**
 * Fetches the unshielded balances associated with a specific contract address.
 *
 * @param publicDataProvider The provider to use to fetch the unshielded balances from the blockchain.
 * @param contractAddress The ledger address of the contract.
 */
export const getUnshieldedBalances = async (
  publicDataProvider: PublicDataProvider,
  contractAddress: ContractAddress
): Promise<UnshieldedBalances> => {
  assertIsContractAddress(contractAddress);
  const unshieldedBalances = await publicDataProvider.queryUnshieldedBalances(contractAddress);
  assertDefined(unshieldedBalances, `No unshielded balances found at contract address '${contractAddress}'`);
  return unshieldedBalances;
};
