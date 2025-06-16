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
import type { SigningKey, ContractAddress } from '@midnight-ntwrk/compact-runtime';

/**
 * A type representing an ID used to store a contract's private state.
 */
export type PrivateStateId = string;

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Interface for a typed key-valued store containing contract private states.
 *
 * @typeParam PSI - Parameter indicating the private state ID, sometimes a union of string literals.
 * @typeParam PS - Parameter indicating the private state type stored, sometimes a union of private state types.
 */
export interface PrivateStateProvider<PSI extends PrivateStateId = PrivateStateId, PS = any> {
  /**
   * Store the given private state at the given private state ID.
   *
   * @param privateStateId The private state identifier.
   * @param state The private state to store.
   */
  set(privateStateId: PSI, state: PS): Promise<void>;

  /**
   * Retrieve the private state at the given private state ID.
   *
   * @param privateStateId The private state identifier.
   */
  get(privateStateId: PSI): Promise<PS | null>;

  /**
   * Remove the value at the given private state ID.
   *
   * @param privateStateId The private state identifier.
   */
  remove(privateStateId: PSI): Promise<void>;

  /**
   * Remove all contract private states.
   */
  clear(): Promise<void>;

  /**
   * Store the given signing key at the given address.
   *
   * @param address The address of the contract having the given signing key.
   * @param signingKey The signing key to store.
   */
  setSigningKey(address: ContractAddress, signingKey: SigningKey): Promise<void>;

  /**
   * Retrieve the signing key for a contract.
   *
   * @param address The address of the contract for which to get the signing key.
   */
  getSigningKey(address: ContractAddress): Promise<SigningKey | null>;

  /**
   * Remove the signing key for a contract.
   *
   * @param address The address of the contract for which to delete the signing key.
   */
  removeSigningKey(address: ContractAddress): Promise<void>;

  /**
   * Remove all contract signing keys.
   */
  clearSigningKeys(): Promise<void>;
}
