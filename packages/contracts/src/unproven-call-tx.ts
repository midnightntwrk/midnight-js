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
import { exitResultOrError, makeContractExecutableRuntime, type PrivateStateId, type PublicDataProvider, type ZKConfigProvider } from '@midnight-ntwrk/midnight-js-types';
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
import { createUnprovenLedgerCallTx, encryptionPublicKeyResolverForZswapState, makeCalleeStateResolver, zswapStateToNewCoins } from './utils';

/**
 * Enables cross-contract calls during circuit execution.
 */
export type CrossContractConfig = {
  /**
   * Resolves the states of cross-contract call targets.
   */
  readonly publicDataProvider: PublicDataProvider;
  /**
   * The block at which all contract states are read; must be the block at which the initial states
   * given to the call were read.
   */
  readonly blockHash: string;
};

export function createUnprovenCallTxFromInitialStates<C extends Contract<undefined>, PCK extends Contract.ProvableCircuitId<C>>(
  zkConfigProvider: ZKConfigProvider<string>,
  options: CallOptionsWithProviderDataDependencies<C, PCK>,
  walletEncryptionPublicKey: EncPublicKey,
  crossContract?: CrossContractConfig
): Promise<UnsubmittedCallTxData<C, PCK>>;

export function createUnprovenCallTxFromInitialStates<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  zkConfigProvider: ZKConfigProvider<string>,
  options: CallOptionsWithPrivateState<C, PCK>,
  walletEncryptionPublicKey: EncPublicKey,
  crossContract?: CrossContractConfig
): Promise<UnsubmittedCallTxData<C, PCK>>;

/**
 * Calls a circuit using the provided initial `states` and creates an unbalanced,
 * unproven, unsubmitted, call transaction.
 *
 * @param zkConfigProvider
 * @param options Configuration.
 * @param walletEncryptionPublicKey
 * @param crossContract Enables cross-contract calls; required for circuits that make them.
 * @returns Data produced by the circuit call and an unproven transaction assembled from the call result.
 *
 * @remarks
 * The returned {@link UnsubmittedCallTxData} is privacy-sensitive and carries
 * the unproven transaction, ZK inputs/outputs, and next private state. See
 * that type for handling guidance before logging, serializing, or
 * transmitting the result.
 */
export async function createUnprovenCallTxFromInitialStates<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  zkConfigProvider: ZKConfigProvider<string>,
  options: CallOptions<C, PCK>,
  walletEncryptionPublicKey: EncPublicKey,
  crossContract?: CrossContractConfig
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

  // When cross-contract calls are enabled, callee states are resolved lazily, on demand, from the
  // provider (and memoized for tx assembly), pinned — along with the circuit's `parentBlockHash` —
  // to the block at which the initial states were read, so the whole call tree (root and callees)
  // is read from one coherent chain snapshot.
  const calleeResolver =
    crossContract === undefined
      ? undefined
      : makeCalleeStateResolver(crossContract.publicDataProvider, crossContract.blockHash);
  const baseCircuitContext = {
    address: ContractAddress(contractAddress),
    contractState: initialContractState,
    privateState: initialPrivateState,
    ledgerParameters
  };
  // `calleeResolver` is defined exactly when cross-contract calls are enabled, and it carries the
  // block its callee states are resolved as of, so a single check drives both the resolver wiring
  // and `parentBlockHash`.
  const circuitContext =
    calleeResolver === undefined
      ? baseCircuitContext
      : { ...baseCircuitContext, stateProvider: calleeResolver.stateProvider, parentBlockHash: calleeResolver.blockHash };

  const exitResult = await contractRuntime.runPromiseExit(contractExec.circuit(
    ProvableCircuitId<C>(options.circuitId as any), // eslint-disable-line @typescript-eslint/no-explicit-any
    circuitContext,
    ...args as any // eslint-disable-line @typescript-eslint/no-explicit-any
  ));

  try {
    const { result, privateState, zswapLocalState, calls, events } = exitResultOrError(exitResult);
    // The root contract call is the last entry; cross-contract callees precede it.
    const rootCall = calls[calls.length - 1];
    assertDefined(rootCall, 'Circuit execution produced no contract calls');

    // Resolves the on-chain state for any contract in the call tree: the root contract from the
    // input state, and each cross-contract callee from the state the provider resolved during
    // execution.
    const contractStateFor = (
      address: ContractExecutable.ContractExecutable.ContractCall['contractAddress']
    ): ContractState | undefined =>
      address === rootCall.contractAddress
        ? initialContractState
        : calleeResolver?.resolvedStates.get(String(address));

    return {
      public: {
        nextContractState: rootCall.public.contractState,
        partitionedTranscript: rootCall.public.partitionedTranscript,
        publicTranscript: rootCall.public.publicTranscript,
        logEvents: events
      },
      private: {
        input: rootCall.private.input,
        output: rootCall.private.output,
        result: result as unknown as Contract.CircuitReturnType<C, PCK>,
        nextPrivateState: privateState,
        nextZswapLocalState: zswapLocalState,
        privateTranscriptOutputs: rootCall.private.privateTranscriptOutputs,
        unprovenTx: createUnprovenLedgerCallTx(
          calls,
          contractStateFor,
          initialZswapChainState,
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
      },
      calls
    };
  } catch (error: unknown) {
    if (!isEffectContractError(error) || error._tag !== 'ContractRuntimeError') throw error;
    // Lift the root Compact error's message to the top, so the thrown error reports the real reason
    // (e.g. a re-entrancy or implementation-binding rejection) rather than the generic
    // "Error executing circuit '<id>'". Tested via the inherited `isCompactError` brand so every
    // CompactError subclass qualifies, not just the base class (whose `name` differs per subclass).
    if (!error.cause.isCompactError) throw error;
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

/**
 * Reads the current latest block and returns its hash, which pins the chain snapshot a call
 * transaction is built against.
 */
const pinLatestBlockHash = async (publicDataProvider: PublicDataProvider): Promise<string> => {
  const latestBlock = await publicDataProvider.queryBlock();
  assertDefined(latestBlock, 'Failed to fetch the latest block from the public data provider');
  return latestBlock.hash;
};

// The state read owns the block pin. On a cache miss it pins the scope to the current latest block
// and reads the states as of it; on a scoped-transaction cache hit it returns the cached states and
// the block the scope was first read at. Either way the returned `blockHash` is the block the
// returned states correspond to, so callers pin `parentBlockHash` and cross-contract callee reads
// to a block coherent with the root states — including across cache hits, which previously paired
// cached states with a freshly-queried latest block.
const getContractStates = async <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: UnprovenCallTxProvidersWithPrivateState<C>,
  options: CallTxOptionsWithPrivateStateId<C, PCK>,
  transactionContext?: TransactionContext<C, PCK>
): Promise<{ readonly states: ContractStates<Contract.PrivateState<C>>; readonly blockHash: string }> => {
  const identity = { contractAddress: options.contractAddress, privateStateId: options.privateStateId };
  const cached = transactionContext?.[Transaction.GetCurrentStatesForIdentity](identity);
  if (cached) {
    return { states: cached.states as ContractStates<Contract.PrivateState<C>>, blockHash: cached.blockHash };
  }
  const blockHash = await pinLatestBlockHash(providers.publicDataProvider);
  const states = await getStates(
    providers.publicDataProvider,
    providers.privateStateProvider,
    options.contractAddress,
    options.privateStateId,
    blockHash
  );
  if (transactionContext) {
    transactionContext[Transaction.CacheStates](states, identity, blockHash);
  }
  return { states, blockHash };
};

const getContractPublicStates = async <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: UnprovenCallTxProvidersBase,
  options: CallTxOptionsBase<C, PCK>,
  transactionContext?: TransactionContext<C, PCK>
): Promise<{ readonly states: PublicContractStates; readonly blockHash: string }> => {
  const identity = { contractAddress: options.contractAddress };
  const cached = transactionContext?.[Transaction.GetCurrentStatesForIdentity](identity);
  if (cached) {
    return { states: cached.states, blockHash: cached.blockHash };
  }
  const blockHash = await pinLatestBlockHash(providers.publicDataProvider);
  const states = await getPublicStates(
    providers.publicDataProvider,
    options.contractAddress,
    blockHash
  );
  if (transactionContext) {
    transactionContext[Transaction.CacheStates]({ ...states, privateState: undefined }, identity, blockHash);
  }
  return { states, blockHash };
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
 *
 * @remarks
 * The returned {@link UnsubmittedCallTxData} is privacy-sensitive and carries
 * the unproven transaction, ZK inputs/outputs, and next private state. See
 * that type for handling guidance before logging, serializing, or
 * transmitting the result.
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

  // The whole transaction is read from one coherent chain snapshot: the state read pins the block
  // (the current latest block on a fresh read, or the scope's original block on a cache hit) and
  // returns it, and that same block is used for `parentBlockHash` and cross-contract callee reads.
  if (hasPrivateStateId && hasPrivateStateProvider) {
    const {
      states: { zswapChainState, contractState, privateState, ledgerParameters },
      blockHash
    } = await getContractStates(providers, options, transactionContext);
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
      providers.walletProvider.getEncryptionPublicKey(),
      { publicDataProvider: providers.publicDataProvider, blockHash }
    );
  }

  const {
    states: { zswapChainState, contractState, ledgerParameters },
    blockHash
  } = await getContractPublicStates(providers, options, transactionContext);
  return createUnprovenCallTxFromInitialStates(
    providers.zkConfigProvider,
    createCallOptions(
      options,
      parseCoinPublicKeyToHex(providers.walletProvider.getCoinPublicKey(), getNetworkId()),
      ledgerParameters,
      contractState,
      zswapChainState
    ),
    providers.walletProvider.getEncryptionPublicKey(),
    { publicDataProvider: providers.publicDataProvider, blockHash }
  );
}
