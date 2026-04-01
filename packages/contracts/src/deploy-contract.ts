/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import type { Contract } from '@midnight-ntwrk/compact-js/effect/Contract';
import { sampleSigningKey, type SigningKey } from '@midnight-ntwrk/compact-runtime';
import type { CoinPublicKey, EncPublicKey } from '@midnight-ntwrk/ledger-v8';
import type { PrivateStateId } from '@midnight-ntwrk/midnight-js-types';

import type { ContractConstructorOptionsWithArguments } from './call-constructor';
import { type ContractProviders } from './contract-providers';
import type { FoundContract } from './find-deployed-contract';
import { type DeployTxOptions, submitDeployTx } from './submit-deploy-tx';
import {
  createCircuitCallTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface
} from './tx-interfaces';
import type { FinalizedDeployTxData } from './tx-model';

/**
 * Base type for configuration for {@link deployContract}; identical to
 * {@link ContractConstructorOptionsWithArguments} except the `signingKey` is
 * now optional, since {@link deployContract} will generate a fresh signing key
 * in the event that `signingKey` is undefined.
 */
export type DeployContractOptionsBase<C extends Contract.Any> = ContractConstructorOptionsWithArguments<C> & {
  /**
   * An optional mapping of {@link CoinPublicKey} to {@link EncPublicKey} that can be used to resolve encryption
   * keys for coins created in the contract constructor. This is useful in cases where the constructor creates
   * outputs to addresses that don't belong to the current user.
   */
  readonly additionalCoinEncPublicKeyMappings?: ReadonlyMap<CoinPublicKey, EncPublicKey>;

  /**
   * The signing key to add as the to-be-deployed contract's maintenance authority.
   * If undefined, a new signing key is sampled and used as the CMA then stored
   * in the private state provider under the newly deployed contract's address.
   * Otherwise, the passed signing key is added as the CMA. The second case is
   * useful when you want to use the same CMA for two different contracts.
   */
  readonly signingKey?: SigningKey;
};

/**
 * {@link deployContract} base options with information needed to store private states;
 * only used if the contract being deployed has a private state.
 */
export type DeployContractOptionsWithPrivateState<C extends Contract.Any> = DeployContractOptionsBase<C> & {
  /**
   * An identifier for the private state of the contract being found.
   */
  readonly privateStateId: PrivateStateId;
  /**
   * The private state to run the circuit against.
   */
  readonly initialPrivateState: Contract.PrivateState<C>;
};

/**
 * Configuration for {@link deployContract}.
 */
export type DeployContractOptions<C extends Contract.Any> =
  | DeployContractOptionsBase<C>
  | DeployContractOptionsWithPrivateState<C>;

/**
 * Interface for a contract that has been deployed to the blockchain.
 */
export type DeployedContract<C extends Contract.Any> = FoundContract<C> & {
  /**
   * Data resulting from the deployment transaction that created this contract. The information in a
   * {@link deployTxData} contains additional private information that does not
   * exist in {@link FoundContract.deployTxData} because certain private data is only available to
   * the deployer of a contract.
   */
  readonly deployTxData: FinalizedDeployTxData<C>;
};

const createDeployTxOptions = <C extends Contract.Any>(
  deployContractOptions: DeployContractOptions<C>
): DeployTxOptions<C> => {
  const deployTxOptionsBase = {
    ...deployContractOptions,
    signingKey: deployContractOptions.signingKey ?? sampleSigningKey()
  };

  return 'privateStateId' in deployContractOptions
    ? ({
        ...deployTxOptionsBase,
        privateStateId: deployContractOptions.privateStateId,
        initialPrivateState: deployContractOptions.initialPrivateState
      } as DeployTxOptions<C>)
    : deployTxOptionsBase;
};

export async function deployContract<C extends Contract<undefined>>(
  providers: ContractProviders<C, Contract.ProvableCircuitId<C>, unknown>,
  options: DeployContractOptionsBase<C>
): Promise<DeployedContract<C>>;

export async function deployContract<C extends Contract.Any>(
  providers: ContractProviders<C>,
  options: DeployContractOptionsWithPrivateState<C>
): Promise<DeployedContract<C>>;

/**
 * Creates and submits a contract deployment transaction. This function is the entry point for the transaction
 * construction workflow and is used to create a {@link DeployedContract} instance.
 *
 * @param providers The providers used to manage the transaction lifecycle.
 * @param options Configuration.
 *
 * @throws DeployTxFailedError If the transaction is submitted successfully but produces an error
 *                             when executed by the node.
 */
export async function deployContract<C extends Contract.Any>(
  providers: ContractProviders<C>,
  options: DeployContractOptions<C>
): Promise<DeployedContract<C>> {
  const deployTxData = await submitDeployTx(providers, createDeployTxOptions(options));
  return {
    deployTxData,
    callTx: createCircuitCallTxInterface(
      providers,
      options.compiledContract,
      deployTxData.public.contractAddress,
      'privateStateId' in options ? options.privateStateId : undefined
    ),
    circuitMaintenanceTx: createCircuitMaintenanceTxInterfaces(
      providers,
      options.compiledContract,
      deployTxData.public.contractAddress
    ),
    contractMaintenanceTx: createContractMaintenanceTxInterface(
      providers,
      options.compiledContract,
      deployTxData.public.contractAddress
    )
  };
}
