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

import type { SigningKey } from '@midnight-ntwrk/compact-runtime';
import type { ContractAddress } from '@midnight-ntwrk/ledger';
import {
  type Contract,
  type FinalizedTxData,
  getImpureCircuitIds,
  type ImpureCircuitId,
  type VerifierKey
} from '@midnight-ntwrk/midnight-js-types';
import type { ContractProviders } from '@midnight-ntwrk/midnight-js-contract-core';
import { assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';

import { submitInsertVerifierKeyTx } from './submit-insert-vk-tx';
import { submitRemoveVerifierKeyTx } from './submit-remove-vk-tx';
import { submitReplaceAuthorityTx } from './submit-replace-authority-tx';

/**
 * An interface for creating maintenance transactions for a specific circuit defined in a
 * given contract.
 */
export type CircuitMaintenanceTxInterface = {
  /**
   * Constructs and submits a transaction that removes the current verifier key stored
   * on the blockchain for this circuit at this contract's address.
   */
  removeVerifierKey(): Promise<FinalizedTxData>;
  /**
   * Constructs and submits a transaction that adds a new verifier key to the
   * blockchain for this circuit at this contract's address.
   *
   * @param newVk The new verifier key to add for this circuit.
   */
  insertVerifierKey(newVk: VerifierKey): Promise<FinalizedTxData>;
}

/**
 * Creates a {@link CircuitMaintenanceTxInterface}.
 *
 * @param providers The providers to use to create and submit transactions.
 * @param circuitId The circuit ID the interface is for.
 * @param contractAddress The address of the deployed contract for which this
 *                        interface is being created.
 */
export const createCircuitMaintenanceTxInterface = <C extends Contract, ICK extends ImpureCircuitId<C>>(
  providers: ContractProviders<C, ICK>,
  circuitId: ICK,
  contractAddress: ContractAddress
): CircuitMaintenanceTxInterface => {
  assertIsContractAddress(contractAddress);
  return {
    removeVerifierKey(): Promise<FinalizedTxData> {
      return submitRemoveVerifierKeyTx(providers, contractAddress, circuitId);
    },
    insertVerifierKey(newVk: VerifierKey): Promise<FinalizedTxData> {
      return submitInsertVerifierKeyTx(providers, contractAddress, circuitId, newVk);
    }
  };
};

/**
 * A set of maintenance transaction creation interfaces, one for each circuit defined in
 * a given contract, keyed by the circuit name.
 */
export type CircuitMaintenanceTxInterfaces<C extends Contract> = Record<ImpureCircuitId<C>, CircuitMaintenanceTxInterface>;

/**
 * Creates a {@link CircuitMaintenanceTxInterfaces}.
 *
 * @param providers The providers to use to build transactions.
 * @param contract The contract to use to execute circuits.
 * @param contractAddress The ledger address of the contract.
 */
export const createCircuitMaintenanceTxInterfaces = <C extends Contract>(
  providers: ContractProviders<C>,
  contract: C,
  contractAddress: ContractAddress
): CircuitMaintenanceTxInterfaces<C> => {
  assertIsContractAddress(contractAddress);
  return getImpureCircuitIds(contract).reduce(
    (acc, circuitId) => ({
      ...acc,
      [circuitId]: createCircuitMaintenanceTxInterface(providers, circuitId, contractAddress)
    }),
    {}
  ) as CircuitMaintenanceTxInterfaces<C>;
};

/**
 * Interface for creating maintenance transactions for a contract that was
 * deployed.
 */
export interface ContractMaintenanceTxInterface {
  /**
   * Constructs and submits a transaction that replaces the maintenance
   * authority stored on the blockchain for this contract.
   *
   * @param newAuthority The new contract maintenance authority for this contract.
   */
  replaceAuthority(newAuthority: SigningKey): Promise<FinalizedTxData>;
}

/**
 * Creates a {@link ContractMaintenanceTxInterface}.
 *
 * @param providers The providers to use to build transactions.
 * @param contractAddress The ledger address of the contract.
 */
export const createContractMaintenanceTxInterface = (
  providers: ContractProviders,
  contractAddress: ContractAddress
): ContractMaintenanceTxInterface => {
  assertIsContractAddress(contractAddress);
  return {
    replaceAuthority: submitReplaceAuthorityTx(providers, contractAddress)
  };
};
