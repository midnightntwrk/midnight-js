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
import { CURRENT_PIPELINE_ERA, RETAINED_PIPELINE_ERA } from './era';
import type { FoundContract } from './find-deployed-contract';
import {
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface
} from './governance/tx-interfaces';
import { isLedger8Request, resolveArtifactEra } from './internal/era';
import { submitLedger8DeployTx } from './internal/ledger8-entry';
import {
  type AnyLedger8DeployContractOptions,
  type AnyLedger8DeployedContract,
  type Ledger8CircuitId,
  type Ledger8Contract,
  type Ledger8ContractProviders,
  type Ledger8DeployContractOptions,
  type Ledger8DeployedContract
} from './ledger8-contract';
import { type DeployTxOptions, submitDeployTx } from './submit-deploy-tx';
import { createCircuitCallTxInterface, createLedger8CircuitCallTxInterface } from './tx-interfaces';
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
 * Reachable only on a PRE-FORK head: the retained era has no post-fork deployment, so a retained
 * artifact against a post-fork head is refused with `Ledger8DeployOnV9Error`. Recompile with the
 * current toolchain and deploy that artifact instead; the retained artifact keeps working for calls
 * against contracts deployed before the fork.
 *
 * A verifier key is registered for every entry point the artifact declares, because a retained
 * constructor builds every slot BLANK and the retained deploy registers none of its own.
 *
 * KEEP THE SIGNING KEY THE RESULT CARRIES. This arm registers a maintenance authority of one key
 * at threshold 1, sampling that key when `options.signingKey` names none, and this framework
 * stores it nowhere — not in the private-state provider, not on chain. It appears once, on
 * `Ledger8DeployedContract.signingKey`, and a contract whose key was never copied off that handle
 * can never have a verifier key inserted, removed or replaced by anyone. Decide where the key is
 * going before calling this, not after.
 *
 * @see {@link OverloadTyping} for how the two eras are discriminated.
 */
export async function deployContract<C extends Ledger8Contract>(
  providers: Ledger8ContractProviders<C, Ledger8CircuitId<C>>,
  options: Ledger8DeployContractOptions<C>
): Promise<Ledger8DeployedContract<C>>;

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
 *                             when executed by the node. Current-era arms only; the retained arm
 *                             raises `Ledger8DeployTxFailedError`, which carries a version-tagged
 *                             record and the signing key, instead.
 * @throws EraArtifactMismatchError If `options.compiledContract` belongs to neither Compact era, is
 *                                  a raw current-era contract instance passed instead of its
 *                                  `CompiledContract` container, or its artifacts declare no
 *                                  toolchain this framework can place. Raised before anything is
 *                                  built or submitted; the ZK config provider is asked for the
 *                                  artifacts' declared runtime version, and no other provider is
 *                                  consulted.
 * @throws Ledger8DeployOnV9Error If a retained-era artifact is deployed against a post-fork head.
 *                                Raised before the constructor runs and before any verifier key is
 *                                fetched.
 * @throws Ledger8DeployTxFailedError If the retained-era deployment was recorded with a non-success
 *                                    status. Carries the signing key, because a `FailFallible`
 *                                    deployment landed.
 * @throws Ledger8DeployRecordEraError If the record of a submitted retained-era deployment comes
 *                                     back from an era the head it composed on cannot have
 *                                     recorded. Carries the signing key.
 * @throws Ledger8DeployRecordUnavailableError If the record of a submitted retained-era deployment
 *                                             cannot be read back at all. Carries the signing key
 *                                             and the read surface's own rejection on `cause`.
 * @throws IncompleteDeployContractPrivateStateConfig If an `initialPrivateState` reaches the
 *                                                    retained arm with no `privateStateId` to store
 *                                                    it under.
 */
export async function deployContract<C extends Contract.Any>(
  providers: ContractProviders<C>,
  options: DeployContractOptions<C> | AnyLedger8DeployContractOptions
): Promise<DeployedContract<C> | AnyLedger8DeployedContract> {
  const artifactEra = await resolveArtifactEra(options.compiledContract, providers.zkConfigProvider);
  if (isLedger8Request<AnyLedger8DeployContractOptions>(options, artifactEra)) {
    // `args`, `privateStateId` and `initialPrivateState` are CONDITIONAL members on the caller's
    // type -- a nullary constructor carries no `args` at all, and the no-private-state arm admits
    // only `undefined` for the other two -- so each is read with an `in` check rather than accessed.
    //
    // The two private-state members are FORWARDED BY KEY, not by value: the layer below reads both
    // off their key, so writing `privateStateId: undefined` here would turn a caller that named an
    // undefined id -- which is refused, because it believes it named one -- into a caller that
    // named none, and turn an `initialPrivateState: undefined` -- a legitimate private state --
    // into a caller that supplied none.
    const deployed = await submitLedger8DeployTx(providers, {
      compiledContract: options.compiledContract,
      args: 'args' in options ? options.args : [],
      ...('privateStateId' in options ? { privateStateId: options.privateStateId } : {}),
      ...('initialPrivateState' in options ? { initialPrivateState: options.initialPrivateState } : {}),
      signingKey: options.signingKey
    });
    return {
      era: RETAINED_PIPELINE_ERA,
      compiledContract: options.compiledContract,
      contractAddress: deployed.contractAddress,
      deployTxData: deployed.deployTxData,
      signingKey: deployed.signingKey,
      initialState: deployed.initialState,
      initialContractState: deployed.initialContractState,
      initialPrivateState: deployed.initialPrivateState,
      initialZswapState: deployed.initialZswapState,
      // Built AFTER the chain has recorded the deployment, so a handle a caller receives names an
      // address the chain actually holds a contract at.
      callTx: createLedger8CircuitCallTxInterface(
        providers,
        options.compiledContract,
        deployed.contractAddress,
        'privateStateId' in options ? options.privateStateId : undefined
      )
    };
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
