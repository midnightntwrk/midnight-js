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

import type { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { ContractAddress, LedgerParameters, ZswapChainState } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type {
  PrivateStateId,
  PrivateStateProvider,
  PublicDataProvider,
  PublicStatesRead
} from '@midnight-ntwrk/midnight-js-types';
import { assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';

import { ContractNotFoundError, PrivateStateNotFoundError } from './errors';

/**
 * The publicly visible states of a contract, as bytes, together with the private state of the
 * contract. Decode a public state with your own runtime, e.g.
 * `states.contractState.deserialize({ v9: ContractState })`.
 */
export type ContractStates<PS> = PublicStatesRead & {
  /**
   * The private state of a contract.
   */
  readonly privateState: PS;
};

/**
 * Fetches only the public visible (Zswap and ledger) states of a contract, as bytes with the
 * version of the ledger that wrote them.
 *
 * @param publicDataProvider The provider to use to fetch the public states (Zswap and ledger)
 *                           from the blockchain.
 * @param contractAddress The ledger address of the contract.
 * @param blockHash The block to read the states at. If `undefined`, the latest states are read.
 */
export const getPublicStates = async (
  publicDataProvider: PublicDataProvider,
  contractAddress: ContractAddress,
  blockHash?: string
): Promise<PublicStatesRead> => {
  assertIsContractAddress(contractAddress);
  const publicStates = await publicDataProvider.queryZSwapAndContractState(
    contractAddress,
    blockHash === undefined ? undefined : { type: 'blockHash', blockHash }
  );
  if (publicStates === undefined || publicStates === null) {
    throw new ContractNotFoundError(`No public state found at contract address '${contractAddress}'`);
  }
  return publicStates;
};

/**
 * The public states of a contract, decoded by the framework's own runtime to build a transaction.
 * Carried by a scoped transaction between its calls.
 */
export interface Ledger9PublicStates {
  readonly version: 'v9';
  readonly zswapChainState: ZswapChainState;
  readonly contractState: ContractState;
  readonly ledgerParameters: LedgerParameters;
}

/**
 * {@link Ledger9PublicStates} together with the private state of the contract.
 */
export type Ledger9ContractStates<PS> = Ledger9PublicStates & {
  /**
   * The private state of a contract.
   */
  readonly privateState: PS;
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
 * @param blockHash The block to read the public states at. If `undefined`, the latest states are read.
 */
export const getStates = async <PS>(
  publicDataProvider: PublicDataProvider,
  privateStateProvider: PrivateStateProvider<PrivateStateId, PS>,
  contractAddress: ContractAddress,
  privateStateId: PrivateStateId,
  blockHash?: string
): Promise<ContractStates<PS>> => {
  const publicStates = await getPublicStates(publicDataProvider, contractAddress, blockHash);
  const privateState = await privateStateProvider.get(privateStateId);
  if (privateState === undefined || privateState === null) {
    throw new PrivateStateNotFoundError(`No private state found at private state ID '${privateStateId}'`);
  }
  return { ...publicStates, privateState };
};
