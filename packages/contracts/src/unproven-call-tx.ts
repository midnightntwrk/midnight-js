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
import type {
  Contract,
  ImpureCircuitId,
  PrivateState,
  PrivateStateId
} from '@midnight-ntwrk/midnight-js-types';
import { type ZswapChainState, type EncPublicKey } from '@midnight-ntwrk/ledger';
import {
  assertDefined,
  assertIsContractAddress,
  parseCoinPublicKeyToHex
} from '@midnight-ntwrk/midnight-js-utils';
import type { CoinPublicKey, ContractState } from '@midnight-ntwrk/compact-runtime';
import { getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { getPublicStates, getStates } from './get-states';
import {
  createUnprovenLedgerCallTx,
  encryptionPublicKeyForzswapState,
  zswapStateToNewCoins
} from './utils';
import type { UnsubmittedCallTxData } from './tx-model';
import type {
  CallOptions,
  CallOptionsWithArguments,
  CallOptionsWithPrivateState,
  CallOptionsWithProviderDataDependencies
} from './call';
import { call } from './call';
import { type ContractProviders } from './contract-providers';
import { IncompleteCallTxPrivateStateConfig } from './errors';

/* eslint-disable no-redeclare */

export function createUnprovenCallTxFromInitialStates<
  C extends Contract<undefined>,
  ICK extends ImpureCircuitId<C>
>(
  options: CallOptionsWithProviderDataDependencies<C, ICK>,
  walletCoinPublicKey: CoinPublicKey,
  walletEncryptionPublicKey: EncPublicKey
): UnsubmittedCallTxData<C, ICK>;

export function createUnprovenCallTxFromInitialStates<
  C extends Contract,
  ICK extends ImpureCircuitId<C>
>(
  options: CallOptionsWithPrivateState<C, ICK>,
  walletCoinPublicKey: CoinPublicKey,
  walletEncryptionPublicKey: EncPublicKey
): UnsubmittedCallTxData<C, ICK>;

/**
 * Calls a circuit using the provided initial `states` and creates an unbalanced,
 * unproven, unsubmitted, call transaction.
 *
 * @param options Configuration.
 *
 * @returns Data produced by the circuit call and an unproven transaction assembled from the call result.
 */
export function createUnprovenCallTxFromInitialStates<
  C extends Contract,
  ICK extends ImpureCircuitId<C>
>(
  options: CallOptions<C, ICK>,
  walletCoinPublicKey: CoinPublicKey,
  walletEncryptionPublicKey: EncPublicKey
): UnsubmittedCallTxData<C, ICK> {
  const {
    contract,
    circuitId,
    contractAddress,
    coinPublicKey,
    initialContractState,
    initialZswapChainState
  } = options;
  assertIsContractAddress(contractAddress);
  assertDefined(contract.impureCircuits[circuitId], `Circuit '${circuitId}' is undefined`);
  const callResult = call(options);
  return {
    public: {
      ...callResult.public
    },
    private: {
      ...callResult.private,
      unprovenTx: createUnprovenLedgerCallTx(
        circuitId,
        contractAddress,
        initialContractState,
        initialZswapChainState,
        callResult.public.partitionedTranscript,
        callResult.private.privateTranscriptOutputs,
        callResult.private.input,
        callResult.private.output,
        callResult.private.nextZswapLocalState,
        encryptionPublicKeyForzswapState(
          callResult.private.nextZswapLocalState,
          walletCoinPublicKey,
          walletEncryptionPublicKey
        )
      ),
      newCoins: zswapStateToNewCoins(
        parseCoinPublicKeyToHex(coinPublicKey, getZswapNetworkId()),
        callResult.private.nextZswapLocalState
      )
    }
  };
}

/**
 * Base type for configuration for a call transaction; identical to {@link CallOptionsWithArguments}.
 */
export type CallTxOptionsBase<
  C extends Contract,
  ICK extends ImpureCircuitId<C>
> = CallOptionsWithArguments<C, ICK>;

/**
 * Call transaction options with the private state ID to use to store the new private
 * state resulting from the circuit call. Since a private state should already be
 * stored at the given private state ID, we don't need an 'initialPrivateState' like
 * in {@link DeployTxOptionsWithPrivateState}.
 */
export type CallTxOptionsWithPrivateStateId<
  C extends Contract,
  ICK extends ImpureCircuitId<C>
> = CallTxOptionsBase<C, ICK> & {
  /**
   * The identifier for the private state of the contract.
   */
  readonly privateStateId: PrivateStateId;
};

/**
 * Call transaction configuration.
 */
export type CallTxOptions<C extends Contract, ICK extends ImpureCircuitId<C>> =
  | CallTxOptionsBase<C, ICK>
  | CallTxOptionsWithPrivateStateId<C, ICK>;

const createCallOptions = <C extends Contract, ICK extends ImpureCircuitId<C>>(
  callTxOptions: CallTxOptions<C, ICK>,
  coinPublicKey: CoinPublicKey,
  initialContractState: ContractState,
  initialZswapChainState: ZswapChainState,
  initialPrivateState?: PrivateState<C>
): CallOptions<C, ICK> => {
  const callOptionsBase = {
    contract: callTxOptions.contract,
    contractAddress: callTxOptions.contractAddress,
    circuitId: callTxOptions.circuitId
  };
  const callOptionsWithArguments =
    'args' in callTxOptions
      ? {
          ...callOptionsBase,
          args: callTxOptions.args
        }
      : callOptionsBase;
  const callOptionsBaseWithProviderDataDependencies = {
    ...callOptionsWithArguments,
    coinPublicKey: parseCoinPublicKeyToHex(coinPublicKey, getZswapNetworkId()),
    initialContractState,
    initialZswapChainState
  };
  const callOptions = initialPrivateState
    ? { ...callOptionsBaseWithProviderDataDependencies, initialPrivateState }
    : callOptionsBaseWithProviderDataDependencies;
  return callOptions as CallOptions<C, ICK>;
};

/**
 * The minimum set of providers needed to create a call transaction, the ZK
 * artifact provider and a wallet. By defining this type, users can choose to
 * omit a private state provider if they're creating a call transaction for a
 * contract with no private state.
 */
export type UnprovenCallTxProvidersBase = Pick<
  ContractProviders,
  'publicDataProvider' | 'walletProvider'
>;

/**
 * Same providers as {@link UnprovenCallTxProvidersBase} with an additional private
 * state provider to store the new private state resulting from the circuit call -
 * only used when creating a call transaction for a contract with a private state.
 */
export type UnprovenCallTxProvidersWithPrivateState<C extends Contract> =
  UnprovenCallTxProvidersBase & Pick<ContractProviders<C>, 'privateStateProvider'>;

/**
 * Providers needed to create a call transaction.
 */
export type UnprovenCallTxProviders<C extends Contract> =
  | UnprovenCallTxProvidersBase
  | UnprovenCallTxProvidersWithPrivateState<C>;

export async function createUnprovenCallTx<
  C extends Contract<undefined>,
  ICK extends ImpureCircuitId<C>
>(
  providers: UnprovenCallTxProvidersBase,
  options: CallTxOptionsBase<C, ICK>
): Promise<UnsubmittedCallTxData<C, ICK>>;

export async function createUnprovenCallTx<C extends Contract, ICK extends ImpureCircuitId<C>>(
  providers: UnprovenCallTxProvidersWithPrivateState<C>,
  options: CallTxOptionsWithPrivateStateId<C, ICK>
): Promise<UnsubmittedCallTxData<C, ICK>>;

/**
 * Calls a circuit using states fetched from the public data provider and private state
 * provider, then creates an unbalanced, unproven, unsubmitted, call transaction.
 *
 * @param providers The providers to use to create the call transaction.
 * @param options Configuration.
 *
 * @returns A promise that contains all data produced by the circuit call and an unproven
 *          transaction assembled from the call result.
 *
 * @throws IncompleteCallTxPrivateStateConfig If a `privateStateId` was given but a `privateStateProvider`
 *                                           was not. We assume that when a user gives a `privateStateId`,
 *                                           they want to update the private state store.
 */
export async function createUnprovenCallTx<C extends Contract, ICK extends ImpureCircuitId<C>>(
  providers: UnprovenCallTxProviders<C>,
  options: CallTxOptions<C, ICK>
): Promise<UnsubmittedCallTxData<C, ICK>> {
  assertIsContractAddress(options.contractAddress);
  assertDefined(
    options.contract.impureCircuits[options.circuitId],
    `Circuit '${options.circuitId}' is undefined`
  );

  const hasPrivateStateProvider = 'privateStateProvider' in providers;
  const hasPrivateStateId = 'privateStateId' in options;

  if (hasPrivateStateId && !hasPrivateStateProvider) {
    throw new IncompleteCallTxPrivateStateConfig();
  }

  if (hasPrivateStateId && hasPrivateStateProvider) {
    const { zswapChainState, contractState, privateState } = await getStates(
      providers.publicDataProvider,
      providers.privateStateProvider,
      options.contractAddress,
      options.privateStateId
    );
    return createUnprovenCallTxFromInitialStates(
      createCallOptions(
        options,
        parseCoinPublicKeyToHex(providers.walletProvider.coinPublicKey, getZswapNetworkId()),
        contractState,
        zswapChainState,
        privateState
      ),
      providers.walletProvider.coinPublicKey,
      providers.walletProvider.encryptionPublicKey
    );
  }

  const { zswapChainState, contractState } = await getPublicStates(
    providers.publicDataProvider,
    options.contractAddress
  );
  return createUnprovenCallTxFromInitialStates(
    createCallOptions(
      options,
      parseCoinPublicKeyToHex(providers.walletProvider.coinPublicKey, getZswapNetworkId()),
      contractState,
      zswapChainState
    ),
    providers.walletProvider.coinPublicKey,
    providers.walletProvider.encryptionPublicKey
  );
}
