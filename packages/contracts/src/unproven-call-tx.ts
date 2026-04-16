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

import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { ContractExecutable } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { type Contract, ProvableCircuitId } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
import { type CoinPublicKey, type ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type EncPublicKey, type LedgerParameters, type ZswapChainState } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/platform-js/effect/ContractAddress';
import { exitResultOrError, makeContractExecutableRuntime, type PrivateStateId, type ZKConfigProvider } from '@midnight-ntwrk/midnight-js-types';
import { assertDefined, assertIsContractAddress, parseCoinPublicKeyToHex } from '@midnight-ntwrk/midnight-js-utils';

import type {
  CallOptions,
  CallOptionsWithArguments,
  CallOptionsWithPrivateState,
  CallOptionsWithProviderDataDependencies
} from './call';
import { type ContractProviders } from './contract-providers';
import { IncompleteCallTxPrivateStateConfig, isEffectContractError } from './errors';
import { type ContractStates, getPublicStates, getStates, type PublicContractStates } from './get-states';
import * as Transaction from './internal/transaction';
import { type TransactionContext } from './transaction';
import type { UnsubmittedCallTxData } from './tx-model';
import { createUnprovenLedgerCallTx, encryptionPublicKeyResolverForZswapState, zswapStateToNewCoins } from './utils';

export function createUnprovenCallTxFromInitialStates<C extends Contract<undefined>, PCK extends Contract.ProvableCircuitId<C>>(
  zkConfigProvider: ZKConfigProvider<string>,
  options: CallOptionsWithProviderDataDependencies<C, PCK>,
  walletEncryptionPublicKey: EncPublicKey
): Promise<UnsubmittedCallTxData<C, PCK>>;

export function createUnprovenCallTxFromInitialStates<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  zkConfigProvider: ZKConfigProvider<string>,
  options: CallOptionsWithPrivateState<C, PCK>,
  walletEncryptionPublicKey: EncPublicKey
): Promise<UnsubmittedCallTxData<C, PCK>>;

/**
 * Calls a circuit using the provided initial `states` and creates an unbalanced,
 * unproven, unsubmitted, call transaction.
 *
 * @param zkConfigProvider
 * @param options Configuration.
 *
 * @param walletEncryptionPublicKey
 * @returns Data produced by the circuit call and an unproven transaction assembled from the call result.
 */
export async function createUnprovenCallTxFromInitialStates<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  zkConfigProvider: ZKConfigProvider<string>,
  options: CallOptions<C, PCK>,
  walletEncryptionPublicKey: EncPublicKey
): Promise<UnsubmittedCallTxData<C, PCK>> {
  const { compiledContract, contractAddress, coinPublicKey, initialContractState, initialZswapChainState, ledgerParameters } = options;
  assertIsContractAddress(contractAddress);
  assertDefined(
    ContractExecutable.make(options.compiledContract)
      .getProvableCircuitIds()
      .find((circuitId) => circuitId as unknown as PCK === options.circuitId),
    `Circuit '${options.circuitId}' is undefined`
  );

  const contractExec = ContractExecutable.make(compiledContract);
  const contractRuntime = makeContractExecutableRuntime(zkConfigProvider, {
    coinPublicKey: options.coinPublicKey
  });
  const initialPrivateState = 'initialPrivateState' in options ? options.initialPrivateState : undefined;
  const args = ('args' in options ? options.args : []);

  const exitResult = await contractRuntime.runPromiseExit(contractExec.circuit(ProvableCircuitId<C>(options.circuitId as any), { // eslint-disable-line @typescript-eslint/no-explicit-any
      address: ContractAddress(contractAddress),
      contractState: initialContractState,
      privateState: initialPrivateState,
      ledgerParameters
    },
    ...args as any // eslint-disable-line @typescript-eslint/no-explicit-any
  ));

  try {
    const {
      public: {
        contractState,
        partitionedTranscript,
        publicTranscript
      },
      private: {
        input,
        output,
        privateState,
        privateTranscriptOutputs,
        result,
        zswapLocalState
      }
    } = exitResultOrError(exitResult)

    return {
      public: {
        nextContractState: contractState,
        partitionedTranscript,
        publicTranscript
      },
      private: {
        input,
        output,
        result: result as unknown as Contract.CircuitReturnType<C, PCK>,
        nextPrivateState: privateState,
        nextZswapLocalState: zswapLocalState,
        privateTranscriptOutputs,
        unprovenTx: createUnprovenLedgerCallTx(
          options.circuitId,
          contractAddress,
          initialContractState,
          initialZswapChainState,
          partitionedTranscript,
          privateTranscriptOutputs,
          input,
          output,
          zswapLocalState,
          encryptionPublicKeyResolverForZswapState(
            zswapLocalState,
            options.coinPublicKey,
            walletEncryptionPublicKey,
            options.additionalCoinEncPublicKeyMappings
          )
        ),
        newCoins: zswapStateToNewCoins(
          parseCoinPublicKeyToHex(coinPublicKey, getNetworkId()),
          zswapLocalState
        )
      }
    };
  } catch (error: unknown) {
    if (!isEffectContractError(error) || error._tag !== 'ContractRuntimeError') throw error;
    if (error.cause.name !== 'CompactError') throw error;
    throw new Error(error.cause.message, { cause: error });
  }
}

/**
 * Base type for configuration for a call transaction; identical to {@link CallOptionsWithArguments}.
 */
export type CallTxOptionsBase<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>> = CallOptionsWithArguments<C, PCK>;

/**
 * Call transaction options with the private state ID to use to store the new private
 * state resulting from the circuit call. Since a private state should already be
 * stored at the given private state ID, we don't need an 'initialPrivateState' like
 * in {@link DeployTxOptionsWithPrivateState}.
 */
export type CallTxOptionsWithPrivateStateId<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>> = CallTxOptionsBase<
  C,
  PCK
> & {
  /**
   * The identifier for the private state of the contract.
   */
  readonly privateStateId: PrivateStateId;
};

/**
 * Call transaction configuration.
 */
export type CallTxOptions<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>> =
  | CallTxOptionsBase<C, PCK>
  | CallTxOptionsWithPrivateStateId<C, PCK>;

const createCallOptions = <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  callTxOptions: CallTxOptions<C, PCK>,
  coinPublicKey: CoinPublicKey,
  ledgerParameters: LedgerParameters,
  initialContractState: ContractState,
  initialZswapChainState: ZswapChainState,
  initialPrivateState?: Contract.PrivateState<C>
): CallOptions<C, PCK> => {
  const callOptionsBase = {
    additionalCoinEncPublicKeyMappings: callTxOptions.additionalCoinEncPublicKeyMappings,
    compiledContract: callTxOptions.compiledContract,
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
    coinPublicKey: parseCoinPublicKeyToHex(coinPublicKey, getNetworkId()),
    initialContractState,
    initialZswapChainState,
    ledgerParameters
  };
  const callOptions = initialPrivateState
    ? { ...callOptionsBaseWithProviderDataDependencies, initialPrivateState }
    : callOptionsBaseWithProviderDataDependencies;
  return callOptions as CallOptions<C, PCK>;
};

const getContractStates = async <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: UnprovenCallTxProvidersWithPrivateState<C>,
  options: CallTxOptionsWithPrivateStateId<C, PCK>,
  transactionContext?: TransactionContext<C, PCK>
): Promise<ContractStates<Contract.PrivateState<C>>> => {
  const identity = { contractAddress: options.contractAddress, privateStateId: options.privateStateId };
  const txCtxStates = transactionContext?.[Transaction.GetCurrentStatesForIdentity](identity);
  if (txCtxStates) {
    return txCtxStates as ContractStates<Contract.PrivateState<C>>;
  }
  const states = await getStates(
    providers.publicDataProvider,
    providers.privateStateProvider,
    options.contractAddress,
    options.privateStateId
  );
  if (transactionContext) {
    transactionContext[Transaction.CacheStates](states, identity);
  }
  return states;
};

const getContractPublicStates = async <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: UnprovenCallTxProvidersBase,
  options: CallTxOptionsBase<C, PCK>,
  transactionContext?: TransactionContext<C, PCK>
): Promise<PublicContractStates> => {
  const identity = { contractAddress: options.contractAddress };
  const txCtxStates = transactionContext?.[Transaction.GetCurrentStatesForIdentity](identity);
  if (txCtxStates) {
    return txCtxStates;
  }
  const states = await getPublicStates(
    providers.publicDataProvider,
    options.contractAddress
  );
  if (transactionContext) {
    transactionContext[Transaction.CacheStates]({ ...states, privateState: undefined }, identity);
  }
  return states;
};

/**
 * The minimum set of providers needed to create a call transaction, the ZK
 * artifact provider and a wallet. By defining this type, users can choose to
 * omit a private state provider if they're creating a call transaction for a
 * contract with no private state.
 */
export type UnprovenCallTxProvidersBase = Pick<ContractProviders, 'zkConfigProvider' | 'publicDataProvider' | 'walletProvider'>;

/**
 * Same providers as {@link UnprovenCallTxProvidersBase} with an additional private
 * state provider to store the new private state resulting from the circuit call -
 * only used when creating a call transaction for a contract with a private state.
 */
export type UnprovenCallTxProvidersWithPrivateState<C extends Contract.Any> = UnprovenCallTxProvidersBase &
  Pick<ContractProviders<C>, 'privateStateProvider'>;

/**
 * Providers needed to create a call transaction.
 */
export type UnprovenCallTxProviders<C extends Contract.Any> =
  | UnprovenCallTxProvidersBase
  | UnprovenCallTxProvidersWithPrivateState<C>;

export async function createUnprovenCallTx<C extends Contract<undefined>, PCK extends Contract.ProvableCircuitId<C>>(
  providers: UnprovenCallTxProvidersBase,
  options: CallTxOptionsBase<C, PCK>,
  transactionContext?: TransactionContext<C, PCK>
): Promise<UnsubmittedCallTxData<C, PCK>>;

export async function createUnprovenCallTx<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: UnprovenCallTxProvidersWithPrivateState<C>,
  options: CallTxOptionsWithPrivateStateId<C, PCK>,
  transactionContext?: TransactionContext<C, PCK>
): Promise<UnsubmittedCallTxData<C, PCK>>;

/**
 * Calls a circuit using states fetched from the public data provider and private state
 * provider, then creates an unbalanced, unproven, unsubmitted, call transaction.
 *
 * @param providers The providers to use to create the call transaction.
 * @param options Configuration.
 * @param transactionContext Optional scoped transaction context to participate in an
 *        existing transaction scope.
 *
 * @returns A promise that contains all data produced by the circuit call and an unproven
 *          transaction assembled from the call result.
 *
 * @throws IncompleteCallTxPrivateStateConfig If a `privateStateId` was given but a `privateStateProvider`
 *                                           was not. We assume that when a user gives a `privateStateId`,
 *                                           they want to update the private state store.
 */
export async function createUnprovenCallTx<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: UnprovenCallTxProviders<C>,
  options: CallTxOptions<C, PCK>,
  transactionContext?: TransactionContext<C, PCK>
): Promise<UnsubmittedCallTxData<C, PCK>> {
  assertIsContractAddress(options.contractAddress);
  assertDefined(
    ContractExecutable.make(options.compiledContract)
      .getProvableCircuitIds()
      .find((a) => a as unknown as PCK === options.circuitId),
    `Circuit '${options.circuitId}' is undefined`
  );

  const hasPrivateStateProvider = 'privateStateProvider' in providers;
  const hasPrivateStateId = 'privateStateId' in options;

  if (hasPrivateStateId && !hasPrivateStateProvider) {
    throw new IncompleteCallTxPrivateStateConfig();
  }

  if (hasPrivateStateId && hasPrivateStateProvider) {
    const { zswapChainState, contractState, privateState, ledgerParameters } = await getContractStates(providers, options, transactionContext);
    return createUnprovenCallTxFromInitialStates(
      providers.zkConfigProvider,
      createCallOptions(
        options,
        parseCoinPublicKeyToHex(providers.walletProvider.getCoinPublicKey(), getNetworkId()),
        ledgerParameters,
        contractState,
        zswapChainState,
        privateState
      ),
      providers.walletProvider.getEncryptionPublicKey()
    );
  }

  const { zswapChainState, contractState, ledgerParameters } = await getContractPublicStates(providers, options, transactionContext);
  return createUnprovenCallTxFromInitialStates(
    providers.zkConfigProvider,
    createCallOptions(
      options,
      parseCoinPublicKeyToHex(providers.walletProvider.getCoinPublicKey(), getNetworkId()),
      ledgerParameters,
      contractState,
      zswapChainState
    ),
    providers.walletProvider.getEncryptionPublicKey()
  );
}
