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

import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
import { sampleSigningKey, type SigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { CoinPublicKey, EncPublicKey } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { PrivateStateId } from '@midnight-ntwrk/midnight-js-types';

import type { ContractConstructorOptionsWithArguments } from './call-constructor';
import { type ContractProviders } from './contract-providers';
import { CURRENT_PIPELINE_ERA } from './era';
import { Ledger8DeployUnmaintainableError } from './errors';
import type { FoundContract } from './find-deployed-contract';
import {
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface
} from './governance/tx-interfaces';
import { isLedger8Request, resolveArtifactEra } from './internal/era';
import {
  type AnyLedger8DeployContractOptions,
  type AnyLedger8DeployedContract,
  type Ledger8CircuitId,
  type Ledger8Contract,
  type Ledger8ContractProviders,
  type Ledger8DeployContractOptions
} from './ledger8-contract';
import { type DeployTxOptions, submitDeployTx } from './submit-deploy-tx';
import { createCircuitCallTxInterface } from './tx-interfaces';
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
export interface DeployedContract<C extends Contract.Any> extends FoundContract<C> {
  /**
   * Data resulting from the deployment transaction that created this contract. The information in a
   * {@link deployTxData} contains additional private information that does not
   * exist in {@link FoundContract.deployTxData} because certain private data is only available to
   * the deployer of a contract.
   */
  readonly deployTxData: FinalizedDeployTxData<C>;
}

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

/*
 * ARM ORDER IS LOAD-BEARING: the retained-era arm below is declared FIRST, and the arm that was
 * already LAST stays last. Do not append. Pinned by `src/test/typecheck/overloads.test-d.ts`.
 * Every arm carries its own TSDoc, because TypeDoc gives an uncommented signature the comment of
 * the first commented sibling -- which published this arm's caveat on the current-era arms.
 */
/**
 * The retained-era arm. Accepts a contract produced by the PREVIOUS Compact toolchain, passed as
 * the raw contract instance rather than inside a `CompiledContract` container.
 *
 * ALWAYS REFUSED, with `Ledger8DeployUnmaintainableError`, for a MEASURED reason about the
 * maintenance authority rather than about the era pairing: nothing on this path sets one, and the
 * authority a retained constructor leaves behind is an empty committee with a threshold of one, so
 * the deployed contract could never be maintained by anyone. The deploy TRANSACTION path itself
 * composes and submits correctly — this refusal is about the result.
 *
 * Typed `Promise<never>` because that is what an arm that only ever throws returns. It also keeps
 * the signature free of `Ledger8DeployedContract`, which is deliberately NOT exported: naming an
 * unexported type in a published signature gives a caller a value they cannot annotate.
 *
 * The refusal is unconditional and comes BEFORE the network head is read, so `Ledger8DeployOnV9Error`
 * — the era pairing table's refusal for a retained-era deploy against a post-fork head — is not
 * reachable through this entry point today. Do NOT branch on it here: through `deployContract` that
 * branch is never taken.
 *
 * @see {@link KeepStatePipeline} for the measurement, what it would take to lift the refusal, and
 *      the test that pins it.
 *
 * @see {@link OverloadTyping} for how the two eras are discriminated.
 */
export async function deployContract<C extends Ledger8Contract>(
  providers: Ledger8ContractProviders<C, Ledger8CircuitId<C>>,
  options: Ledger8DeployContractOptions<C>
): Promise<never>;

/**
 * Deploys a contract that declares no private state, so no private state id is required.
 */
export async function deployContract<C extends Contract<undefined>>(
  providers: ContractProviders<C, Contract.ProvableCircuitId<C>, unknown>,
  options: DeployContractOptionsBase<C>
): Promise<DeployedContract<C>>;

/**
 * Deploys a contract that declares private state, naming where to store the initial state.
 */
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
 * @throws EraArtifactMismatchError If `options.compiledContract` belongs to neither Compact era, is
 *                                  a raw current-era contract instance passed instead of its
 *                                  `CompiledContract` container, or its artifacts declare no
 *                                  toolchain this framework can place. Raised before anything is
 *                                  built or submitted; the ZK config provider is asked for the
 *                                  artifacts' declared runtime version, and no other provider is
 *                                  consulted.
 */
export async function deployContract<C extends Contract.Any>(
  providers: ContractProviders<C>,
  options: DeployContractOptions<C> | AnyLedger8DeployContractOptions
): Promise<DeployedContract<C> | AnyLedger8DeployedContract> {
  const artifactEra = await resolveArtifactEra(options.compiledContract, providers.zkConfigProvider);
  if (isLedger8Request<AnyLedger8DeployContractOptions>(options, artifactEra)) {
    throw new Ledger8DeployUnmaintainableError();
  }
  const deployTxData = await submitDeployTx(providers, createDeployTxOptions(options));
  return {
    era: CURRENT_PIPELINE_ERA,
    compiledContract: options.compiledContract,
    contractAddress: deployTxData.public.contractAddress,
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
