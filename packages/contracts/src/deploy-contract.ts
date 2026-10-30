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

import type { CoinPublicKey, EncPublicKey } from '@midnight-ntwrk/midnight-js-protocol/v9';
import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js/effect/Contract';
import { sampleSigningKey, type SigningKey } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import type { PrivateStateId } from '@midnight-ntwrk/midnight-js-types';
import { assertValidMidnightConfig } from '@midnight-ntwrk/midnight-js-utils';

import type { Ledger9ContractConstructorOptionsWithArguments } from './call-constructor';
import { type Ledger9ContractProviders } from './contract-providers';
import type { Ledger9FoundContract } from './find-deployed-contract';
import {
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface
} from './governance/tx-interfaces';
import { isLedger8Request, resolveArtifactEra } from './internal/era';
import { submitLedger8DeployTx } from './internal/ledger8-entry';
import { assertDeployPrivateStatePairing } from './internal/private-state-pairing';
import {
  type AnyLedger8DeployContractOptions,
  type AnyLedger8DeployedContract,
  type Ledger8CircuitId,
  type Ledger8Contract,
  type Ledger8ContractProviders,
  type Ledger8DeployContractOptions,
  type Ledger8DeployedContract
} from './ledger8-contract';
import { type Ledger9DeployTxOptions, submitDeployTx } from './submit-deploy-tx';
import { createCircuitCallTxInterface, createLedger8CircuitCallTxInterface } from './tx-interfaces';
import type { Ledger9FinalizedDeployTxData } from './tx-model';

/**
 * What both {@link deployContract} option variants carry, and nothing either variant
 * decides. Identical to {@link Ledger9ContractConstructorOptionsWithArguments} except
 * the `signingKey` is now optional, since {@link deployContract} will generate a
 * fresh signing key in the event that `signingKey` is undefined.
 *
 * Neither variant extends the other. Written as an intersection alias, a variant
 * declaring `privateStateId: PrivateStateId` over a base declaring
 * `privateStateId?: never` collapses that member to `never` and leaves the
 * private-state variant uninhabitable — so the pairing rule can only be stated by
 * making the two variants siblings over this.
 *
 * {@link Ledger8DeployContractOptionsShared} plays the same role for the
 * retained era, which arrives there by a different route: its variants are
 * interfaces, and an interface redeclaring the member is rejected outright as an
 * incompatible extension. This era cannot use interfaces, because `args` reaches
 * both variants through the {@link Ledger9ContractConstructorOptionsWithArguments}
 * conditional and an interface cannot extend a conditional type.
 *
 * PUBLISHED, unlike its retained-era counterpart, purely so the two members
 * below keep a documented page of their own: TypeDoc inlines the members an
 * interface inherits, but renders an unexported alias as bare text, which would
 * delete `signingKey` and `additionalCoinEncPublicKeyMappings` from the
 * reference for both variants.
 */
export type Ledger9DeployContractOptionsShared<C extends Contract.Any> = Ledger9ContractConstructorOptionsWithArguments<C> & {
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
 * The {@link deployContract} options variant for a contract whose private state is stored
 * NOWHERE: the constructor runs against `undefined` and nothing is written.
 *
 * The other variant is {@link Ledger9DeployContractOptionsWithPrivateState}.
 */
export type Ledger9DeployContractOptionsBase<C extends Contract.Any> = Ledger9DeployContractOptionsShared<C> & {
  /**
   * DECLARED on this variant, and only ever `undefined`.
   *
   * Left off the variant entirely, `{ compiledContract, privateStateId: 'x' }`
   * compiled: union excess-property checking admits a member declared on the
   * SIBLING variant as long as one variant is satisfied, and `compiledContract` alone
   * satisfies this one. The constructor then ran against `undefined`,
   * `undefined` was stored under the caller's id, and
   * `deployTxData.private.initialPrivateState` was typed non-optional while
   * actually undefined.
   */
  readonly privateStateId?: never;
  /**
   * DECLARED on this variant, and only ever `undefined` — see
   * {@link Ledger9DeployContractOptionsBase.privateStateId} for why the member is
   * present rather than absent.
   */
  readonly initialPrivateState?: never;
};

/**
 * {@link deployContract} options with information needed to store private states;
 * only used if the contract being deployed has a private state.
 *
 * Both members together or neither: a state with no id has nowhere to go, and
 * an id with no state stores `undefined` under a name a later call will read
 * back.
 */
export type Ledger9DeployContractOptionsWithPrivateState<C extends Contract.Any> = Ledger9DeployContractOptionsShared<C> & {
  /**
   * An identifier for the private state of the contract being deployed.
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
export type Ledger9DeployContractOptions<C extends Contract.Any> =
  | Ledger9DeployContractOptionsBase<C>
  | Ledger9DeployContractOptionsWithPrivateState<C>;

/**
 * Interface for a contract that has been deployed to the blockchain.
 */
export interface Ledger9DeployedContract<C extends Contract.Any> extends Ledger9FoundContract<C> {
  /**
   * Data resulting from the deployment transaction that created this contract. The information in a
   * {@link deployTxData} contains additional private information that does not
   * exist in {@link Ledger9FoundContract.deployTxData} because certain private data is only available to
   * the deployer of a contract.
   */
  readonly deployTxData: Ledger9FinalizedDeployTxData<C>;
}

/**
 * Narrows on the id's KEY. Only reached after `assertDeployPrivateStatePairing`, so the key names
 * the variant and the id is defined.
 */
const namesPrivateState = <C extends Contract.Any>(
  options: Ledger9DeployContractOptions<C>
): options is Ledger9DeployContractOptionsWithPrivateState<C> => 'privateStateId' in options;

const createDeployTxOptions = <C extends Contract.Any>(
  deployContractOptions: Ledger9DeployContractOptions<C>
): Ledger9DeployTxOptions<C> => {
  const signingKey = deployContractOptions.signingKey ?? sampleSigningKey();

  if (!namesPrivateState(deployContractOptions)) {
    return { ...deployContractOptions, signingKey };
  }
  const { privateStateId } = deployContractOptions;
  // Returned through a local rather than as a literal, which is what lets this be CHECKED instead
  // of asserted. The checker computes the spread fine; what it refuses is a FRESH literal typed
  // against `Ledger9DeployTxOptions<C>` while `C` keeps that union's `args` conditional deferred. The
  // local is not contextually typed, so the same object passes on its own inferred type.
  const deployTxOptions = {
    ...deployContractOptions,
    signingKey,
    privateStateId,
    initialPrivateState: deployContractOptions.initialPrivateState
  };
  return deployTxOptions;
};

/*
 * OVERLOAD ORDER IS LOAD-BEARING: the retained-era overload below is declared FIRST, and the
 * overload that was already LAST stays last. Do not append. Pinned by
 * `src/test/typecheck/overloads.test-d.ts`. Every overload carries its own TSDoc, because TypeDoc
 * gives an uncommented signature the comment of the first commented sibling -- which published
 * this overload's caveat on the current-era overloads.
 */
/**
 * The retained-era overload. Accepts a contract produced by the PREVIOUS Compact toolchain, passed as
 * the raw contract instance rather than inside a `CompiledContract` container.
 *
 * Reachable only BEFORE THE FORK: the retained era has no post-fork deployment, so a retained
 * artifact after the fork is refused with `EraMismatchError` (reason `'ledger8-deploy-on-ledger9-network'`). Recompile with the
 * current toolchain and deploy that artifact instead; the retained artifact keeps working for calls
 * against contracts deployed before the fork.
 *
 * A verifier key is registered for every entry point the artifact declares.
 *
 * A maintenance authority of one key at threshold 1 is registered, that key being
 * `options.signingKey` or a freshly sampled one. Once the chain has recorded the deployment the key
 * is stored against the minted address through `providers.privateStateProvider` and reported at
 * `deployTxData.private.signingKey`. THAT PROVIDER IS THE ONLY COPY besides the returned handle:
 * the key is not on chain and not derivable from anything that is, so a store that is lost or
 * cleared leaves a contract on which no verifier key can ever be inserted, removed or replaced by
 * anyone.
 *
 * @see {@link OverloadTyping} for how the two eras are discriminated.
 * @see {@link KeepStatePipeline} for why every slot has to be registered here, and for the
 * maintenance authority this builds.
 */
export async function deployContract<C extends Ledger8Contract>(
  providers: Ledger8ContractProviders<C, Ledger8CircuitId<C>>,
  options: Ledger8DeployContractOptions<C>
): Promise<Ledger8DeployedContract<C>>;

/**
 * Deploys a contract that declares no private state, so no private state id is required.
 */
export async function deployContract<C extends Contract<undefined>>(
  providers: Ledger9ContractProviders<C, Contract.ProvableCircuitId<C>, unknown>,
  options: Ledger9DeployContractOptionsBase<C>
): Promise<Ledger9DeployedContract<C>>;

/**
 * Deploys a contract that declares private state, naming where to store the initial state.
 */
export async function deployContract<C extends Contract.Any>(
  providers: Ledger9ContractProviders<C>,
  options: Ledger9DeployContractOptionsWithPrivateState<C>
): Promise<Ledger9DeployedContract<C>>;

/**
 * Creates and submits a contract deployment transaction. This function is the entry point for the transaction
 * construction workflow and is used to create a {@link Ledger9DeployedContract} instance.
 *
 * @param providers The providers used to manage the transaction lifecycle.
 * @param options Configuration.
 *
 * @throws TxFailedError If the transaction is submitted successfully but produces an error
 *                       when executed by the node, in either era. Carries the contract address and
 *                       the signing key, because a `FailFallible` deployment landed.
 * @throws EraMismatchError If `options.compiledContract` belongs to neither Compact era, is
 *                                  a raw current-era contract instance passed instead of its
 *                                  `CompiledContract` container, or its artifacts declare no
 *                                  toolchain this framework can place. Raised before anything is
 *                                  built or submitted; the ZK config provider is asked for the
 *                                  artifacts' declared runtime version, and no other provider is
 *                                  consulted.
 * @throws Ledger8SigningKeyError with reason `'unusable'` If a retained-era deploy is given a `signingKey` that is not a
 *                                        `schnorr` key of 64 hex characters. Raised before anything
 *                                        is composed.
 * @throws EraMismatchError with reason `'ledger8-deploy-on-ledger9-network'` If a retained-era artifact is deployed after the fork.
 *                                Raised before the constructor runs and before any verifier key is
 *                                fetched.
 * @throws Ledger8UnconfirmedError with operation `'deploy'` If what the chain did with a submitted retained-era
 *                                        deployment cannot be confirmed - the record unreadable, or
 *                                        back from an era the head it composed on cannot have
 *                                        recorded. Carries the signing key, and the underlying
 *                                        failure on `cause`.
 * @throws IncompleteDeployContractPrivateStateConfig If `privateStateId` is present without
 *                                                    `initialPrivateState`, or `initialPrivateState`
 *                                                    holds a value without `privateStateId`. The
 *                                                    option types refuse both shapes, so only a
 *                                                    caller the compiler never checked can reach it.
 *                                                    Raised on both eras, before any provider is
 *                                                    touched.
 * @throws InvalidArgumentError If `privateStateId` is present with an undefined value, which is a caller that
 *               believes it named an id. Raised on both eras, before any provider is touched, and
 *               ahead of the pairing refusal.
 */
export async function deployContract<C extends Contract.Any>(
  providers: Ledger9ContractProviders<C>,
  options: Ledger9DeployContractOptions<C> | AnyLedger8DeployContractOptions
): Promise<Ledger9DeployedContract<C> | AnyLedger8DeployedContract> {
  assertValidMidnightConfig(providers.config);
  assertDeployPrivateStatePairing(options);
  const artifactEra = await resolveArtifactEra(options.compiledContract, providers.zkConfigProvider);
  if (isLedger8Request<AnyLedger8DeployContractOptions>(options, artifactEra)) {
    // `args`, `privateStateId` and `initialPrivateState` are CONDITIONAL members on the caller's
    // type -- a nullary constructor carries no `args` at all, and the no-private-state variant admits
    // only `undefined` for the other two -- so each is read with an `in` check rather than accessed.
    const deployed = await submitLedger8DeployTx(providers, {
      compiledContract: options.compiledContract,
      args: 'args' in options ? options.args : [],
      ...('privateStateId' in options ? { privateStateId: options.privateStateId } : {}),
      ...('initialPrivateState' in options ? { initialPrivateState: options.initialPrivateState } : {}),
      signingKey: options.signingKey
    });
    return {
      era: 'v8',
      compiledContract: options.compiledContract,
      contractAddress: deployed.contractAddress,
      deployTxData: {
        era: 'v8',
        public: {
          ...deployed.deployTxData,
          contractAddress: deployed.contractAddress,
          initialContractState: deployed.initialContractState,
          initialContractStateBytes: deployed.initialContractStateBytes
        },
        private: {
          signingKey: deployed.signingKey,
          initialPrivateState: deployed.initialPrivateState,
          initialZswapState: deployed.initialZswapState
        }
      },
      // Built AFTER the chain has recorded the deployment, so a handle a caller receives names an
      // address the chain actually holds a contract at.
      callTx: createLedger8CircuitCallTxInterface(
        providers,
        options.compiledContract,
        deployed.contractAddress,
        'privateStateId' in options ? options.privateStateId : undefined
      ),
      circuitMaintenanceTx: createCircuitMaintenanceTxInterfaces(providers, options.compiledContract, deployed.contractAddress),
      contractMaintenanceTx: createContractMaintenanceTxInterface(providers, options.compiledContract, deployed.contractAddress)
    };
  }
  const deployTxData = await submitDeployTx(providers, createDeployTxOptions(options));
  return {
    era: 'v9',
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
