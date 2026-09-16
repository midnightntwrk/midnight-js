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

import { type CompiledContract, type Contract, ContractExecutable } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import {
  type ContractAddress,
  type ContractState,
  sampleSigningKey,
  type SigningKey
} from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  type AnyProvableCircuitId,
  type PrivateStateId,
  type PrivateStateProvider,
  type VerifierKey} from '@midnight-ntwrk/midnight-js-types';
import { assertDefined, assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';

import { type ContractProviders } from './contract-providers';
import { CURRENT_PIPELINE_ERA, type CurrentPipelineEra, RETAINED_PIPELINE_ERA } from './era';
import { ContractTypeError, IncompleteFindContractPrivateStateConfig } from './errors';
import {
  type CircuitMaintenanceTxInterfaces,
  type ContractMaintenanceTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface
} from './governance/tx-interfaces';
import { isLedger8Request, requireV9Record, resolveArtifactEra } from './internal/era';
import { findLedger8Contract } from './internal/ledger8-entry';
import {
  type AnyLedger8FindDeployedContractOptions,
  type AnyLedger8FoundContract,
  type Ledger8CircuitId,
  type Ledger8Contract,
  type Ledger8ContractProviders,
  type Ledger8FindDeployedContractOptions,
  type Ledger8FoundContract,
  type Ledger8PrivateState
} from './ledger8-contract';
import {
  type CircuitCallTxInterface,
  createCircuitCallTxInterface,
  createLedger8CircuitCallTxInterface
} from './tx-interfaces';
import type { FinalizedDeployTxDataBase } from './tx-model';

const setOrGetInitialSigningKey = async <C extends Contract.Any>(
  privateStateProvider: PrivateStateProvider,
  options: FindDeployedContractOptions<C>
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

/**
 * The private-state half of a find's configuration, as the rule below reads it.
 *
 * Structural rather than either era's own options type, because the rule is ONE rule and the
 * retained arm reaches it holding a `Ledger8FindDeployedContractOptions`. Both members are optional
 * because the current era's three option interfaces differ in which of them they declare, and the
 * retained era's declares both as optional.
 *
 * The `& object` on every use is load-bearing. With both members optional this is a WEAK type, and
 * TypeScript refuses a source that shares no property with it — which is exactly the current era's
 * `FindDeployedContractOptionsBase`, the commonest find of all. Intersecting with `object` adds no
 * member and disables no check other than that one.
 */
interface FindContractPrivateStateConfig<PS> {
  readonly privateStateId?: PrivateStateId;
  readonly initialPrivateState?: PS;
}

/**
 * Narrows to a configuration that CARRIES an initial private state, on the key's presence rather
 * than on its value.
 *
 * `undefined` is a legitimate private state — a contract that declares none stores exactly that —
 * so `initialPrivateState: undefined` means "store that", not "supplied nothing". `privateStateId`
 * is read off its key the same way, but an undefined VALUE there is refused rather than stored
 * under, because no id is a usable id.
 */
const hasInitialPrivateState = <PS>(
  options: FindContractPrivateStateConfig<PS> & object
): options is FindContractPrivateStateConfig<PS> & { readonly initialPrivateState: PS } =>
  'initialPrivateState' in options;

const setOrGetInitialPrivateState = async <PS>(
  privateStateProvider: PrivateStateProvider<PrivateStateId, PS>,
  options: FindContractPrivateStateConfig<PS> & object
): Promise<PS> => {
  /**
   * "Given" below means the PROPERTY IS PRESENT, not that its value is defined. The two differ,
   * and each difference is handled explicitly at the branch it belongs to.
   *
   * If both 'privateStateId' and 'initialPrivateState' are given,
   * then 'initialPrivateState' is stored in private state provider at 'privateStateId'.
   *
   * If 'privateStateId' is given and 'initialPrivateState' is not,
   * and the private state provider has an entry at 'privateStateId',
   * then the find reports the stored private state as the initialPrivateState.
   *
   * If 'privateStateId' is given and 'initialPrivateState' is not,
   * and the private state provider does not have an entry at 'privateStateId',
   * then an error is returned.
   *
   * If 'privateStateId' is given as undefined, then an error is returned, whether or not
   * an 'initialPrivateState' accompanies it.
   *
   * If 'privateStateId' is not given and 'initialPrivateState' is,
   * then an error is returned.
   *
   * If neither is given, then no private state is stored.
   */
  if ('privateStateId' in options) {
    const { privateStateId } = options;
    // Read off the KEY above and the VALUE here, rather than off the value alone. A caller that
    // wrote `privateStateId: cfg.someId` with an undefined `someId` BELIEVES it named one, and
    // reading that as "no id given" would attach against no state at all and leave every later
    // call running on a state the contract never had. Refused instead, at the configuration.
    assertDefined(
      privateStateId,
      "'privateStateId' was given as undefined. Name a private state id, or omit the property entirely " +
        'for a contract that carries no private state.'
    );
    if (hasInitialPrivateState(options)) {
      await privateStateProvider.set(privateStateId, options.initialPrivateState);
      return options.initialPrivateState;
    }
    const currentPrivateState = await privateStateProvider.get(privateStateId);
    assertDefined(currentPrivateState, `No private state found at private state ID '${privateStateId}'`);
    return currentPrivateState;
  }
  if (hasInitialPrivateState(options)) {
    throw new IncompleteFindContractPrivateStateConfig();
  }
  // Cast to 'PS' because if we've reached this point, the private state of
  // the contract should be 'undefined'.
  return undefined as PS;
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
 * A circuit fails the check when the state registers no operation for it, when the registered
 * operation carries no verifier key at all, or when the deployed key differs from the local one.
 * The three are reported separately on the thrown error, because only the last one means the local
 * artifacts are at fault.
 *
 * @param verifierKeys The verifier keys the client has for the deployed contract we're checking.
 * @param contractState The (typically already deployed) contract state containing verifier keys.
 * @param contractAddress The address `contractState` was read from, used to identify the contract
 *                        in the thrown error.
 *
 * @throws ContractTypeError When any circuit is missing from `contractState`, has no deployed
 *                           verifier key, or has a key differing from the local one.
 */
export const verifyContractState = (
  verifierKeys: [AnyProvableCircuitId, VerifierKey][],
  contractState: ContractState,
  contractAddress?: ContractAddress
): void => {
  const missing: AnyProvableCircuitId[] = [];
  const keyless: AnyProvableCircuitId[] = [];
  const mismatched: AnyProvableCircuitId[] = [];
  for (const [circuitId, localVk] of verifierKeys) {
    const operation = contractState.operation(circuitId);
    if (operation === undefined) {
      missing.push(circuitId);
      continue;
    }
    // Widened on purpose. The runtime declares 'verifierKey' as a non-optional 'Uint8Array', but a
    // registered operation can carry none, so the guard below is unreachable to the type checker
    // and load-bearing at runtime.
    const deployedVk: Uint8Array | undefined = operation.verifierKey;
    if (deployedVk === undefined) {
      keyless.push(circuitId);
    } else if (!verifierKeysEqual(localVk, deployedVk)) {
      mismatched.push(circuitId);
    }
  }
  if (missing.length > 0 || keyless.length > 0 || mismatched.length > 0) {
    throw new ContractTypeError(contractState, { missing, keyless, mismatched }, contractAddress);
  }
};

/**
 * Base type for the configuration options for {@link findDeployedContract}.
 */
export interface FindDeployedContractOptionsBase<C extends Contract.Any> {
  /**
   * The compiled contract to use to execute circuits.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly compiledContract: CompiledContract.CompiledContract<C, any>;
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
export interface FindDeployedContractOptionsExistingPrivateState<C extends Contract.Any>
  extends FindDeployedContractOptionsBase<C> {
  /**
   * An identifier for the private state of the contract being found.
   */
  readonly privateStateId: PrivateStateId;
}

/**
 * {@link findDeployedContract} configuration that includes an initial private
 * state to store and the private state ID at which to store it. Only used if
 * the intention is to overwrite the private state currently stored at the given
 * private state ID.
 */
export interface FindDeployedContractOptionsStorePrivateState<C extends Contract.Any>
  extends FindDeployedContractOptionsExistingPrivateState<C> {
  /**
   * For types of contract that make no use of private state and or witnesses that operate upon it, this
   * property may be `undefined`. Otherwise, the value provided via this property should be same initial
   * state that was used when calling {@link deployContract}.
   */
  readonly initialPrivateState: Contract.PrivateState<C>;
}

/**
 * Configuration for {@link findDeployedContract}.
 */
export type FindDeployedContractOptions<C extends Contract.Any> =
  | FindDeployedContractOptionsBase<C>
  | FindDeployedContractOptionsExistingPrivateState<C>
  | FindDeployedContractOptionsStorePrivateState<C>;

/**
 * Base type for a deployed contract that has been found on the blockchain.
 */
export interface FoundContract<C extends Contract.Any> {
  /**
   * The pipeline that produced this result: always the current era here.
   *
   * Read off the compiled artifact, NEVER off a transaction record — the two
   * facts disagree after the fork, and only this one says which module the
   * objects in this result came from.
   */
  readonly era: CurrentPipelineEra;
  /**
   * The compiled contract this handle executes circuits from, exactly as the
   * caller supplied it.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly compiledContract: CompiledContract.CompiledContract<C, any>;
  /**
   * The ledger address this handle is attached to.
   */
  readonly contractAddress: ContractAddress;
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
 * A READ path, so it composes and submits nothing. It still resolves the head era, dates the
 * fetched state's envelope against it, and byte-matches every local verifier key against the slot
 * the chain holds — the checks that make a later call against this contract safe, done once here
 * so a mis-dispatch is caught at attach time rather than at the first call.
 *
 * The deploy record is returned VERSION-TAGGED rather than narrowed to the current era: a
 * retained-era contract was deployed in whichever era was current at the time, and refusing the
 * pre-fork arm would refuse exactly the contracts this arm exists to keep callable.
 *
 * @see {@link OverloadTyping} for how the two eras are discriminated.
 */
export async function findDeployedContract<C extends Ledger8Contract>(
  providers: Ledger8ContractProviders<C, Ledger8CircuitId<C>>,
  options: Ledger8FindDeployedContractOptions<C>
): Promise<Ledger8FoundContract<C>>;

/**
 * Attaches to a deployed contract that declares no private state.
 */
export async function findDeployedContract<C extends Contract<undefined>>(
  providers: ContractProviders<C, Contract.ProvableCircuitId<C>, unknown>,
  options: FindDeployedContractOptionsBase<C>
): Promise<FoundContract<C>>;

/**
 * Attaches to a deployed contract, reusing the private state already stored at `privateStateId`.
 */
export async function findDeployedContract<C extends Contract.Any>(
  providers: ContractProviders<C>,
  options: FindDeployedContractOptionsExistingPrivateState<C>
): Promise<FoundContract<C>>;

/**
 * Attaches to a deployed contract, storing the given `initialPrivateState` at `privateStateId`.
 */
export async function findDeployedContract<C extends Contract.Any>(
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
 *                           state found at `contractAddress`, carry no deployed verifier key, or
 *                           have mis-matched verifier keys.
 * @throws IncompleteFindContractPrivateStateConfig If an `initialPrivateState` is given but no
 *                                                  `privateStateId` is given to store it under.
 * @throws EraArtifactMismatchError If `options.compiledContract` belongs to neither Compact era, or
 *                                  is a raw current-era contract instance passed instead of its
 *                                  `CompiledContract` container, or its artifacts declare no
 *                                  toolchain this framework can place. Raised before anything is
 *                                  read from the chain; the ZK config provider is asked for the
 *                                  artifacts' declared runtime version, and no other provider is
 *                                  consulted.
 */
export async function findDeployedContract<C extends Contract.Any>(
  providers: ContractProviders<C>,
  options: FindDeployedContractOptions<C> | AnyLedger8FindDeployedContractOptions
): Promise<FoundContract<C> | AnyLedger8FoundContract> {
  const artifactEra = await resolveArtifactEra(options.compiledContract, providers.zkConfigProvider);
  if (isLedger8Request<AnyLedger8FindDeployedContractOptions>(options, artifactEra)) {
    const found = await findLedger8Contract(providers, {
      contract: options.compiledContract,
      contractAddress: options.contractAddress,
      // EVERY circuit the artifact declares, off the ARTIFACT rather than off
      // the state -- see the attach section of `docs/keep-state-pipeline.md` for
      // what this costs and why both eras pay it.
      circuitIds: Object.keys(options.compiledContract.impureCircuits)
    });
    // Seeded HERE rather than inside `findLedger8Contract`, which takes a three-member `Pick` of the
    // providers and is a pure READ path -- widening it to write would put the one storage decision
    // this arm makes behind the era-specific chain reads. Client-side storage is era-independent,
    // so both eras reach the same rule from this file.
    //
    // AFTER the attach, for the order the current-era arm below uses: a state seeded for a contract
    // whose verifier keys turn out not to match would outlive a find that failed.
    //
    // FIRST the address, as the current-era arm and the retained CALL path both do. A provider
    // namespaces every entry by the address last named and refuses an operation before any has
    // been named, so the write below would otherwise either throw or land under whichever contract
    // the process touched last -- and a later call, which names this address itself, would read its
    // own key, find nothing, and report nothing.
    providers.privateStateProvider.setContractAddress(options.contractAddress);
    // The result is DISCARDED on purpose. This call is here to apply the five-case rule -- seed the
    // named id, or refuse a configuration that cannot be honoured -- not to report a state:
    // `Ledger8FoundContract` publishes no private-state member, and a caller that wants the state
    // reads it back from the provider under the id it just named. What the read buys is the refusal
    // arriving at ATTACH time rather than at the first call.
    //
    // At the era top type, which is what `Ledger8PrivateState<Ledger8Contract>` resolves to: the
    // implementation signature has already widened the retained options to
    // `AnyLedger8FindDeployedContractOptions`, so no narrower private state is in scope here. The
    // overloads above are what type the caller.
    await setOrGetInitialPrivateState<Ledger8PrivateState<Ledger8Contract>>(
      providers.privateStateProvider,
      options
    );
    return {
      era: RETAINED_PIPELINE_ERA,
      compiledContract: options.compiledContract,
      contractAddress: options.contractAddress,
      deployTxData: found.deployTxData,
      // Built AFTER the attach has checked every declared circuit's key, so a
      // handle a caller receives is one whose circuits the chain can serve.
      callTx: createLedger8CircuitCallTxInterface(
        providers,
        options.compiledContract,
        options.contractAddress,
        options.privateStateId
      )
    };
  }
  const { compiledContract, contractAddress } = options;
  assertIsContractAddress(contractAddress);
  providers.privateStateProvider.setContractAddress(contractAddress);

  const finalizedTxData = requireV9Record(
    await providers.publicDataProvider.watchForDeployTxData(contractAddress),
    'watchForDeployTxData'
  );

  const initialContractState = await providers.publicDataProvider.queryDeployContractState(contractAddress);
  assertDefined(initialContractState, `No contract deployed at contract address '${contractAddress}'`);

  const currentContractState = await providers.publicDataProvider.queryContractState(contractAddress);
  assertDefined(currentContractState, `No contract deployed at contract address '${contractAddress}'`);

  const verifierKeys = await providers.zkConfigProvider.getVerifierKeys(
    ContractExecutable.make(compiledContract).getProvableCircuitIds()
  );
  verifyContractState(verifierKeys, currentContractState, contractAddress);

  const signingKey = await setOrGetInitialSigningKey(providers.privateStateProvider, options);
  const initialPrivateState = await setOrGetInitialPrivateState(providers.privateStateProvider, options);

  return {
    era: CURRENT_PIPELINE_ERA,
    compiledContract,
    contractAddress,
    deployTxData: {
      era: CURRENT_PIPELINE_ERA,
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
      compiledContract,
      contractAddress,
      'privateStateId' in options ? options.privateStateId : undefined
    ),
    circuitMaintenanceTx: createCircuitMaintenanceTxInterfaces(providers, compiledContract, contractAddress),
    contractMaintenanceTx: createContractMaintenanceTxInterface(providers, compiledContract, contractAddress)
  };
}
