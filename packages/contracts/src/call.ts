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

import type { CompiledContract  } from '@midnight-ntwrk/compact-js';
import type { Contract } from '@midnight-ntwrk/compact-js/effect/Contract';
import {
  type AlignedValue,
  type CoinPublicKey,
  type ContractAddress,
  type ContractState,
  type Op,
  type StateValue,
  type ZswapLocalState
} from '@midnight-ntwrk/compact-runtime';
import {
  type PartitionedTranscript,
  type ZswapChainState
} from '@midnight-ntwrk/ledger-v7';

/**
 * Describes the target of a circuit invocation.
 */
export type CallOptionsBase<C extends Contract.Any, ICK extends Contract.ImpureCircuitId<C>> = {
  /**
   * The contract defining the circuit to call.
   */
  readonly compiledContract: CompiledContract.CompiledContract<C, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  
  /**
   * The identifier of the circuit to call.
   */
  readonly circuitId: ICK;
  /**
   * The address of the contract being executed.
   */
  readonly contractAddress: ContractAddress;
};

/**
 * Conditional type that optionally adds the inferred circuit argument types to
 * the options for a circuit call.
 */
export type CallOptionsWithArguments<C extends Contract.Any, ICK extends Contract.ImpureCircuitId<C>> =
  Contract.CircuitParameters<C, ICK> extends []
    ? CallOptionsBase<C, ICK>
    : CallOptionsBase<C, ICK> & {
    /**
     * Arguments to pass to the circuit being called.
     */
    readonly args: Contract.CircuitParameters<C, ICK>;
  };

/**
 * Data retrieved via providers that should be included in the call options.
 */
export type CallOptionsProviderDataDependencies = {
  /**
   * The Zswap public key of the current user.
   */
  readonly coinPublicKey: CoinPublicKey;
  /**
   * The initial public state of the contract to run the circuit against.
   */
  readonly initialContractState: ContractState;
  /**
   * The initial public Zswap state of the contract to run the circuit against.
   */
  readonly initialZswapChainState: ZswapChainState;
};

/**
 * Call options with circuit arguments and data
 */
export type CallOptionsWithProviderDataDependencies<
  C extends Contract.Any,
  ICK extends Contract.ImpureCircuitId<C>
> = CallOptionsWithArguments<C, ICK> & CallOptionsProviderDataDependencies;

/**
 * Call options for contracts with private state.
 */
export type CallOptionsWithPrivateState<
  C extends Contract.Any,
  ICK extends Contract.ImpureCircuitId<C>
> = CallOptionsWithProviderDataDependencies<C, ICK> & {
  /**
   * The private state to run the circuit against.
   */
  readonly initialPrivateState: Contract.PrivateState<C>;
};

/**
 * Call options for a given contract and circuit.
 */
export type CallOptions<C extends Contract.Any, ICK extends Contract.ImpureCircuitId<C>> =
  | CallOptionsWithProviderDataDependencies<C, ICK>
  | CallOptionsWithPrivateState<C, ICK>;

/**
 * The private (sensitive) portions of the call result.
 */
export type CallResultPrivate<C extends Contract.Any, ICK extends Contract.ImpureCircuitId<C>> = {
  /**
   * ZK representation of the circuit arguments.
   */
  readonly input: AlignedValue;
  /**
   * ZK representation of the circuit result.
   */
  readonly output: AlignedValue;
  /**
   * ZK representation of the circuit witness call results.
   */
  readonly privateTranscriptOutputs: AlignedValue[];
  /**
   * The JS representation of the input to the circuit.
   */
  readonly result: Contract.CircuitReturnType<C, ICK>;
  /**
   * The private state resulting from executing the circuit.
   */
  readonly nextPrivateState: Contract.PrivateState<C>;
  /**
   * The Zswap local state resulting from executing the circuit.
   */
  readonly nextZswapLocalState: ZswapLocalState;
};

/**
 * The public portions of the call result.
 */
export type CallResultPublic = {
  /**
   * The public state resulting from executing the circuit.
   */
  readonly nextContractState: StateValue;
  /**
   * The public transcript resulting from executing the circuit.
   */
  readonly publicTranscript: Op<AlignedValue>[];
  /**
   * A {@link publicTranscript} partitioned into guaranteed and fallible sections.
   * The guaranteed section of a public transcript must succeed for the corresponding
   * transaction to be considered valid. The fallible section of a public transcript
   * can fail without invalidating the transaction, as long as the guaranteed section succeeds.
   */
  readonly partitionedTranscript: PartitionedTranscript;
};

/**
 * Contains all information resulting from circuit execution.
 */
export type CallResult<C extends Contract.Any, ICK extends Contract.ImpureCircuitId<C>> = {
  /**
   * The public/non-sensitive data produced by the circuit execution.
   */
  readonly public: CallResultPublic;
  /**
   * The private/sensitive data produced by the circuit execution.
   */
  readonly private: CallResultPrivate<C, ICK>;
};
