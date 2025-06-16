// This file is part of MIDNIGHT-JS.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import {
  type PrivateStateProvider,
  type PrivateState,
  type PrivateStateId,
  type Contract
} from '@midnight-ntwrk/midnight-js-types';
import type { ContractAddress } from '@midnight-ntwrk/ledger';
import type { SigningKey } from '@midnight-ntwrk/compact-runtime';

/**
 * A simple in-memory implementation of private state provider. Makes it easy to capture and rewrite private state from deploy.
 * @template PSI - Type of the private state identifier.
 * @template PS - Type of the private state.
 * @returns {PrivateStateProvider<PSI, PS>} An in-memory private state provider.
 */
export const inMemoryPrivateStateProvider = <
  PSI extends PrivateStateId,
  PS extends PrivateState<Contract>
>(): PrivateStateProvider<PSI, PS> => {
  const record = new Map<PSI, PS>();
  const signingKeys = {} as { [address: ContractAddress]: SigningKey };

  return {
    /**
     * Sets the private state for a given key.
     * @param {PSI} key - The key for the private state.
     * @param {PS} state - The private state to set.
     * @returns {Promise<void>} A promise that resolves when the state is set.
     */
    set(key: PSI, state: PS): Promise<void> {
      record.set(key, state);
      return Promise.resolve();
    },
    /**
     * Gets the private state for a given key.
     * @param {PSI} key - The key for the private state.
     * @returns {Promise<PS | null>} A promise that resolves to the private state or null if not found.
     */
    get(key: PSI): Promise<PS | null> {
      const value = record.get(key) ?? null;
      return Promise.resolve(value);
    },
    /**
     * Removes the private state for a given key.
     * @param {PSI} key - The key for the private state.
     * @returns {Promise<void>} A promise that resolves when the state is removed.
     */
    remove(key: PSI): Promise<void> {
      record.delete(key);
      return Promise.resolve();
    },
    /**
     * Clears all private states.
     * @returns {Promise<void>} A promise that resolves when all states are cleared.
     */
    clear(): Promise<void> {
      record.clear();
      return Promise.resolve();
    },
    /**
     * Sets the signing key for a given contract address.
     * @param {ContractAddress} contractAddress - The contract address.
     * @param {SigningKey} signingKey - The signing key to set.
     * @returns {Promise<void>} A promise that resolves when the signing key is set.
     */
    setSigningKey(contractAddress: ContractAddress, signingKey: SigningKey): Promise<void> {
      signingKeys[contractAddress] = signingKey;
      return Promise.resolve();
    },
    /**
     * Gets the signing key for a given contract address.
     * @param {ContractAddress} contractAddress - The contract address.
     * @returns {Promise<SigningKey | null>} A promise that resolves to the signing key or null if not found.
     */
    getSigningKey(contractAddress: ContractAddress): Promise<SigningKey | null> {
      const value = signingKeys[contractAddress] ?? null;
      return Promise.resolve(value);
    },
    /**
     * Removes the signing key for a given contract address.
     * @param {ContractAddress} contractAddress - The contract address.
     * @returns {Promise<void>} A promise that resolves when the signing key is removed.
     */
    removeSigningKey(contractAddress: ContractAddress): Promise<void> {
      delete signingKeys[contractAddress];
      return Promise.resolve();
    },
    /**
     * Clears all signing keys.
     * @returns {Promise<void>} A promise that resolves when all signing keys are cleared.
     */
    clearSigningKeys(): Promise<void> {
      Object.keys(signingKeys).forEach((contractAddress) => {
        delete signingKeys[contractAddress];
      });
      return Promise.resolve();
    }
  };
};
