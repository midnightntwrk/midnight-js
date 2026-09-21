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
import { assertDefined } from '@midnight-ntwrk/midnight-js-utils';

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
 * What both {@link deployContract} option arms carry, and nothing either arm
 * decides. Identical to {@link ContractConstructorOptionsWithArguments} except
 * the `signingKey` is now optional, since {@link deployContract} will generate a
 * fresh signing key in the event that `signingKey` is undefined.
 *
 * Neither arm extends the other. Written as an intersection alias, an arm
 * declaring `privateStateId: PrivateStateId` over a base declaring
 * `privateStateId?: never` collapses that member to `never` and leaves the
 * private-state arm uninhabitable — so the pairing rule can only be stated by
 * making the two arms siblings over this.
 *
 * {@link Ledger8DeployContractOptionsShared} plays the same role for the
 * retained era, which arrives there by a different route: its arms are
 * interfaces, and an interface redeclaring the member is rejected outright as an
 * incompatible extension. This era cannot use interfaces, because `args` reaches
 * both arms through the {@link ContractConstructorOptionsWithArguments}
 * conditional and an interface cannot extend a conditional type.
 *
 * PUBLISHED, unlike its retained-era counterpart, purely so the two members
 * below keep a documented page of their own: TypeDoc inlines the members an
 * interface inherits, but renders an unexported alias as bare text, which would
 * delete `signingKey` and `additionalCoinEncPublicKeyMappings` from the
 * reference for both arms.
 */
export type DeployContractOptionsShared<C extends Contract.Any> = ContractConstructorOptionsWithArguments<C> & {
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
 * The {@link deployContract} arm for a contract whose private state is stored
 * NOWHERE: the constructor runs against `undefined` and nothing is written.
 *
 * The other arm is {@link DeployContractOptionsWithPrivateState}.
 */
export type DeployContractOptionsBase<C extends Contract.Any> = DeployContractOptionsShared<C> & {
  /**
   * DECLARED on this arm, and only ever `undefined`.
   *
   * Left off the arm entirely, `{ compiledContract, privateStateId: 'x' }`
   * compiled: union excess-property checking admits a member declared on the
   * SIBLING arm as long as one arm is satisfied, and `compiledContract` alone
   * satisfies this one. The constructor then ran against `undefined`,
   * `undefined` was stored under the caller's id, and
   * `deployTxData.private.initialPrivateState` was typed non-optional while
   * actually undefined.
   */
  readonly privateStateId?: never;
  /**
   * DECLARED on this arm, and only ever `undefined` — see
   * {@link DeployContractOptionsBase.privateStateId} for why the member is
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
export type DeployContractOptionsWithPrivateState<C extends Contract.Any> = DeployContractOptionsShared<C> & {
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

/**
 * Narrows on the id's KEY, never on its value. The value is checked separately by the caller: the
 * no-private-state arm declares the key as `undefined`, so a `true` here does not yet mean a
 * usable id.
 *
 * For a caller the compiler has checked, the key does name the arm — the two arms declare the id
 * and the state together or neither. A caller that reached this without types can still carry the
 * key alone, which no check here refuses; see the `@throws` list on {@link deployContract}.
 */
const namesPrivateState = <C extends Contract.Any>(
  options: DeployContractOptions<C>
): options is DeployContractOptionsWithPrivateState<C> => 'privateStateId' in options;

const createDeployTxOptions = <C extends Contract.Any>(
  deployContractOptions: DeployContractOptions<C>
): DeployTxOptions<C> => {
  const signingKey = deployContractOptions.signingKey ?? sampleSigningKey();

  if (!namesPrivateState(deployContractOptions)) {
    return { ...deployContractOptions, signingKey };
  }
  const { privateStateId } = deployContractOptions;
  // Read off the KEY above and the VALUE here, exactly as `find-deployed-contract.ts` and the
  // retained arm read it. A caller that wrote `privateStateId: cfg.someId` with an undefined
  // `someId` BELIEVES it named one, and reading that as "no id given" would deploy the contract,
  // store nothing, and hand `callTx` an undefined id — so every later call proves against a state
  // the contract never had. Refused at the configuration instead, before anything is built.
  assertDefined(
    privateStateId,
    "'privateStateId' was given as undefined. Name a private state id, or omit the property entirely " +
      'for a contract that stores no private state.'
  );
  // Returned through a local rather than as a literal, which is what lets this be CHECKED instead
  // of asserted. The checker computes the spread fine; what it refuses is a FRESH literal typed
  // against `DeployTxOptions<C>` while `C` keeps that union's `args` conditional deferred. The
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
 * A maintenance authority of one key at threshold 1 is registered, that key being
 * `options.signingKey` or a freshly sampled one. Once the chain has recorded the deployment the key
 * is stored against the minted address through `providers.privateStateProvider`, exactly as the
 * current era's deploy stores its own, and it is reported on `Ledger8DeployedContract.signingKey`.
 * That provider is the only copy besides the returned handle: the key is not on chain and not
 * derivable from anything that is, so a store that is lost or cleared leaves a contract on which no
 * verifier key can ever be inserted, removed or replaced by anyone.
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
 * @throws Ledger8DeployUnconfirmedError If what the chain did with a submitted retained-era
 *                                        deployment cannot be confirmed - the record unreadable, or
 *                                        back from an era the head it composed on cannot have
 *                                        recorded. Carries the signing key, and the underlying
 *                                        failure on `cause`.
 * @throws IncompleteDeployContractPrivateStateConfig If an `initialPrivateState` reaches the
 *                                                    retained arm with no `privateStateId` to store
 *                                                    it under.
 * @throws Error If `privateStateId` is present with an undefined value, which is a caller that
 *               believes it named an id. Raised on both eras, before any transaction is built.
 *               NOT raised for a `privateStateId` present with a usable value and no
 *               `initialPrivateState` beside it: the option types refuse that pairing, so only a
 *               caller the compiler never checked can reach it, and it deploys as it always did.
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
