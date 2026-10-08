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
import { InvalidArgumentError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import type { ContractAddress, SigningKey } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { PrivateStateProvider, PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';

import { ContractNotFoundError } from '../errors';

/**
 * Narrows a contract-state read to a deployed contract.
 *
 * @param state The state a read returned for `contractAddress`.
 * @param contractAddress The address that was read.
 * @returns `state`, when it is present.
 * @throws ContractNotFoundError if no contract is deployed at `contractAddress`.
 */
export const requireDeployedContract = <T>(state: T | null | undefined, contractAddress: string): T => {
  if (state === undefined || state === null) {
    throw new ContractNotFoundError(`No contract deployed at contract address '${contractAddress}'`);
  }
  return state;
};

/**
 * Reads the latest on-chain state of the contract a maintenance transaction targets.
 *
 * @param publicDataProvider The read surface.
 * @param contractAddress The contract being maintained.
 * @returns The contract's latest state.
 * @throws ContractNotFoundError if no state is found on chain for `contractAddress`.
 */
export const queryExistingContractState = async (
  publicDataProvider: Pick<PublicDataProvider, 'queryContractState'>,
  contractAddress: ContractAddress
): Promise<ContractState> => {
  const state = await publicDataProvider.queryContractState(contractAddress);
  if (state === undefined || state === null) {
    throw new ContractNotFoundError(`No contract state found on chain for contract address '${contractAddress}'`);
  }
  return state;
};

/**
 * Reads the signing key stored for the contract a maintenance transaction targets.
 *
 * @param privateStateProvider The store holding the caller's signing keys.
 * @param contractAddress The contract being maintained.
 * @returns The stored signing key.
 * @throws InvalidArgumentError if no signing key is stored for `contractAddress`.
 */
export const getExistingSigningKey = async (
  privateStateProvider: Pick<PrivateStateProvider, 'getSigningKey'>,
  contractAddress: ContractAddress
): Promise<SigningKey> => {
  const signingKey = await privateStateProvider.getSigningKey(contractAddress);
  if (signingKey === undefined || signingKey === null) {
    throw new InvalidArgumentError(`Signing key for contract address '${contractAddress}' not found`);
  }
  return signingKey;
};
