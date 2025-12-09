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

import type { ContractState } from '@midnight-ntwrk/compact-runtime';
import type { ContractAddress, ZswapChainState } from '@midnight-ntwrk/ledger-v6';
import type { PrivateStateId,PrivateStateProvider, PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';
import { assertDefined, assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';

/**
 * Object containing the publicly visible states of a contract.
 */
export type PublicContractStates = {
  /**
   * The (public) Zswap chain state of a contract.
   */
  readonly zswapChainState: ZswapChainState;
  /**
   * The (public) ledger state of a contract.
   */
  readonly contractState: ContractState;
}

/**
 * Object containing the publicly visible states of a contract and the private
 * state of a contract.
 */
export type ContractStates<PS> = PublicContractStates & {
  /**
   * The private state of a contract.
   */
  readonly privateState: PS;
};

/**
 * Fetches only the public visible (Zswap and ledger) states of a contract.
 *
 * @param publicDataProvider The provider to use to fetch the public states (Zswap and ledger)
 *                           from the blockchain.
 * @param contractAddress The ledger address of the contract.
 */
export const getPublicStates = async (
  publicDataProvider: PublicDataProvider,
  contractAddress: ContractAddress
): Promise<PublicContractStates> => {
  assertIsContractAddress(contractAddress);
  const zswapAndContractState = await publicDataProvider.queryZSwapAndContractState(contractAddress);
  assertDefined(zswapAndContractState, `No public state found at contract address '${contractAddress}'`);
  const [zswapChainState, contractState] = zswapAndContractState;
  return { contractState, zswapChainState };
};

/**
 * Retrieves the Zswap, ledger, and private states of the contract corresponding
 * to the given identifier using the given providers.
 *
 * @param publicDataProvider The provider to use to fetch the public states (Zswap and ledger)
 *                           from the blockchain.
 * @param privateStateProvider The provider to use to fetch the private state.
 * @param contractAddress The ledger address of the contract.
 * @param privateStateId The identifier for the private state of the contract.
 */
export const getStates = async <PS>(
  publicDataProvider: PublicDataProvider,
  privateStateProvider: PrivateStateProvider<PrivateStateId, PS>,
  contractAddress: ContractAddress,
  privateStateId: PrivateStateId
): Promise<ContractStates<PS>> => {
  const publicContractStates = await getPublicStates(publicDataProvider, contractAddress);
  const privateState = await privateStateProvider.get(privateStateId);
  assertDefined(privateState, `No private state found at private state ID '${privateStateId}'`);
  return { ...publicContractStates, privateState };
};
