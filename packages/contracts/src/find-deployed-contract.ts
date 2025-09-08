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

import {
  type ContractAddress,
  type ContractState,
  sampleSigningKey,
  type SigningKey
} from '@midnight-ntwrk/compact-runtime';
import {
  type Contract,
  getImpureCircuitIds,
  type ImpureCircuitId,
  type PrivateState,
  type PrivateStateId,
  type PrivateStateProvider,
  type VerifierKey
} from '@midnight-ntwrk/midnight-js-types';
import { assertDefined, assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';

import { type ContractProviders } from './contract-providers';
import { ContractTypeError, IncompleteFindContractPrivateStateConfig } from './errors';
import {
  type CircuitCallTxInterface,
  type CircuitMaintenanceTxInterfaces,
  type ContractMaintenanceTxInterface,
  createCircuitCallTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface
} from './tx-interfaces';
import type { FinalizedDeployTxDataBase } from './tx-model';

const setOrGetInitialSigningKey = async (
  privateStateProvider: PrivateStateProvider,
  options: FindDeployedContractOptions<Contract>
): Promise<SigningKey> => {
  if (options.signingKey) {
    await privateStateProvider.setSigningKey(options.contractAddress, options.signingKey);
    return options.signingKey;
  }
  const existingSigningKey = await privateStateProvider.getSigningKey(options.contractAddress);
  if (existingSigningKey) {
    return existingSigningKey;
  }
  const freshSigningKey = sampleSigningKey();
  await privateStateProvider.setSigningKey(options.contractAddress, freshSigningKey);
  return freshSigningKey;
};

const setOrGetInitialPrivateState = async <C extends Contract>(
  privateStateProvider: PrivateStateProvider<PrivateStateId, PrivateState<C>>,
  options: FindDeployedContractOptions<C>
): Promise<PrivateState<C>> => {
  /**
   * If both 'privateStateId' and 'initialPrivateState' are defined,
   * then 'initialPrivateState' is stored in private state provider at 'privateStateId'.
   *
   * If 'privateStateId' is defined and 'initialPrivateState' is undefined,
   * and the private state provider has an entry at 'privateStateId',
   * then the find reports the stored private state as the initialPrivateState.
   *
   * If 'privateStateId' is defined and 'initialPrivateState' is undefined,
   * and the private state provider does not have an entry at 'privateStateId',
   * then an error is returned.
   *
   * If 'privateStateId' is undefined and 'initialPrivateState' is defined,
   * then an error is returned.
   *
   * If 'privateStateId' is undefined and 'initialPrivateState' is undefined,
   * then no private state is stored.
   */
  const hasPrivateStateId = 'privateStateId' in options;
  const hasInitialPrivateState = 'initialPrivateState' in options;

  if (hasPrivateStateId) {
    if (hasInitialPrivateState) {
      await privateStateProvider.set(options.privateStateId, options.initialPrivateState);
      return options.initialPrivateState;
    }
    const currentPrivateState = await privateStateProvider.get(options.privateStateId);
    assertDefined(currentPrivateState, `No private state found at private state ID '${options.privateStateId}'`);
    return currentPrivateState;
  }
  if (hasInitialPrivateState) {
    throw new IncompleteFindContractPrivateStateConfig();
  }
  // Cast to 'PrivateState<C>' because if we've reached this point, the private state of
  // the contract should be 'undefined'.
  return undefined as PrivateState<C>;
};

/**
 * Checks that two verifier keys are equal. Does initial length check match for efficiency.
 *
 * @param a First verifier key.
 * @param b Second verifier key.
 */
export const verifierKeysEqual = (a: Uint8Array, b: Uint8Array): boolean =>
  a.length === b.length && toHex(a) === toHex(b);

/**
 * Checks that the given `contractState` contains the given `verifierKeys`.
 *
 * @param verifierKeys The verifier keys the client has for the deployed contract we're checking.
 * @param contractState The (typically already deployed) contract state containing verifier keys.
 *
 * @throws ContractTypeError When one or more of the local and deployed verifier keys do not match.
 */
export const verifyContractState = (
  verifierKeys: [ImpureCircuitId, VerifierKey][],
  contractState: ContractState
): void => {
  const mismatchedCircuitIds = verifierKeys.reduce(
    (acc, [circuitId, localVk]) =>
      !contractState.operation(circuitId) ||
      !verifierKeysEqual(localVk, contractState.operation(circuitId)!.verifierKey)
        ? [...acc, circuitId]
        : acc,
    [] as string[]
  );
  if (mismatchedCircuitIds.length > 0) {
    throw new ContractTypeError(contractState, mismatchedCircuitIds);
  }
};

/**
 * Base type for the configuration options for {@link findDeployedContract}.
 */
export type FindDeployedContractOptionsBase<C extends Contract> = {
  /**
   * The contract to use to execute circuits.
   */
  readonly contract: C;
  /**
   * The address of a previously deployed contract.
   */
  readonly contractAddress: ContractAddress;
  /**
   * The signing key to use to perform contract maintenance updates. If defined, the given signing
   * key is stored for this contract address. This is useful when someone has already added the given signing
   * key to the contract maintenance authority. If undefined, and there is an existing signing key for the
   * contract address locally, the existing signing key is kept. This is useful when the contract was
   * deployed locally. If undefined, and there is not an existing signing key for the contract address
   * locally, a fresh signing key is generated and stored for the contract address locally. This is
   * useful when you want to give a signing key to someone else to add you as a maintenance authority.
   */
  readonly signingKey?: SigningKey;
}

/**
 * {@link findDeployedContract} base configuration that includes an initial private
 * state to store and the private state ID at which to store it. Only used if
 * the intention is to overwrite the private state currently stored at the given
 * private state ID.
 */
export type FindDeployedContractOptionsExistingPrivateState<C extends Contract> = FindDeployedContractOptionsBase<C> & {
  /**
   * An identifier for the private state of the contract being found.
   */
  readonly privateStateId: PrivateStateId;
};

/**
 * {@link findDeployedContract} configuration that includes an initial private
 * state to store and the private state ID at which to store it. Only used if
 * the intention is to overwrite the private state currently stored at the given
 * private state ID.
 */
export type FindDeployedContractOptionsStorePrivateState<C extends Contract> =
  FindDeployedContractOptionsExistingPrivateState<C> & {
    /**
     * For types of contract that make no use of private state and or witnesses that operate upon it, this
     * property may be `undefined`. Otherwise, the value provided via this property should be same initial
     * state that was used when calling {@link deployContract}.
     */
    readonly initialPrivateState: PrivateState<C>;
  };

/**
 * Configuration for {@link findDeployedContract}.
 */
export type FindDeployedContractOptions<C extends Contract> =
  | FindDeployedContractOptionsBase<C>
  | FindDeployedContractOptionsExistingPrivateState<C>
  | FindDeployedContractOptionsStorePrivateState<C>;

/**
 * Base type for a deployed contract that has been found on the blockchain.
 */
export type FoundContract<C extends Contract> = {
  /**
   * Data for the finalized deploy transaction corresponding to this contract.
   */
  readonly deployTxData: FinalizedDeployTxDataBase<C>;
  /**
   * Interface for creating call transactions for a contract.
   */
  readonly callTx: CircuitCallTxInterface<C>;
  /**
   * An interface for creating maintenance transactions for circuits defined in the
   * contract that was deployed.
   */
  readonly circuitMaintenanceTx: CircuitMaintenanceTxInterfaces<C>;
  /**
   * Interface for creating maintenance transactions for the contract that was
   * deployed.
   */
  readonly contractMaintenanceTx: ContractMaintenanceTxInterface;
}



export async function findDeployedContract<C extends Contract<undefined>>(
  providers: ContractProviders<C, ImpureCircuitId<C>, unknown>,
  options: FindDeployedContractOptionsBase<C>
): Promise<FoundContract<C>>;

export async function findDeployedContract<C extends Contract>(
  providers: ContractProviders<C>,
  options: FindDeployedContractOptionsExistingPrivateState<C>
): Promise<FoundContract<C>>;

export async function findDeployedContract<C extends Contract>(
  providers: ContractProviders<C>,
  options: FindDeployedContractOptionsStorePrivateState<C>
): Promise<FoundContract<C>>;

/**
 * Creates an instance of {@link FoundContract} given the address of a deployed contract and an
 * optional private state ID at which an existing private state is stored. When given, the current value
 * at the private state ID is used as the `initialPrivateState` value in the `finalizedDeployTxData`
 * property of the returned `FoundContract`.
 *
 * @param providers The providers used to manage transaction lifecycles.
 * @param options Configuration.
 *
 * @throws Error Improper `privateStateId` and `initialPrivateState` configuration.
 * @throws Error No contract state could be found at `contractAddress`.
 * @throws TypeError Thrown if `contractAddress` is not correctly formatted as a contract address.
 * @throws ContractTypeError One or more circuits defined on `contract` are undefined on the contract
 *                           state found at `contractAddress`, or have mis-matched verifier keys.
 * @throws IncompleteFindContractPrivateStateConfig If an `initialPrivateState` is given but no
 *                                                  `privateStateId` is given to store it under.
 */
export async function findDeployedContract<C extends Contract>(
  providers: ContractProviders<C>,
  options: FindDeployedContractOptions<C>
): Promise<FoundContract<C>> {
  const { contract, contractAddress } = options;
  assertIsContractAddress(contractAddress);

  const finalizedTxData = await providers.publicDataProvider.watchForDeployTxData(contractAddress);

  const initialContractState = await providers.publicDataProvider.queryDeployContractState(contractAddress);
  assertDefined(initialContractState, `No contract deployed at contract address '${contractAddress}'`);

  const currentContractState = await providers.publicDataProvider.queryContractState(contractAddress);
  assertDefined(currentContractState, `No contract deployed at contract address '${contractAddress}'`);

  const verifierKeys = await providers.zkConfigProvider.getVerifierKeys(getImpureCircuitIds(contract));
  verifyContractState(verifierKeys, currentContractState);

  const signingKey = await setOrGetInitialSigningKey(providers.privateStateProvider, options);
  const initialPrivateState = await setOrGetInitialPrivateState(providers.privateStateProvider, options);

  return {
    deployTxData: {
      private: {
        signingKey,
        initialPrivateState
      },
      public: {
        ...finalizedTxData,
        contractAddress,
        initialContractState
      }
    },
    callTx: createCircuitCallTxInterface(
      providers,
      contract,
      contractAddress,
      'privateStateId' in options ? options.privateStateId : undefined
    ),
    circuitMaintenanceTx: createCircuitMaintenanceTxInterfaces(providers, contract, contractAddress),
    contractMaintenanceTx: createContractMaintenanceTxInterface(providers, contractAddress)
  };
}
