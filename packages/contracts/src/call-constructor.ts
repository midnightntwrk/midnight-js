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

import { type CompiledContract, type Contract } from '@midnight-ntwrk/compact-js';
import {
  type CoinPublicKey,
  type ContractState,
  type ZswapLocalState
} from '@midnight-ntwrk/compact-runtime';

/**
 * Describes the target of a circuit invocation.
 */
export type ContractConstructorOptionsBase<C extends Contract.Any> = {
  /**
   * The compiled contract defining the circuit to call.
   */
  readonly compiledContract: CompiledContract.CompiledContract<C, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/**
 * Conditional type that optionally adds the inferred contract constructor argument types
 * to the constructor options.
 */
export type ContractConstructorOptionsWithArguments<C extends Contract.Any> =
  Contract.InitializeParameters<C> extends []
    ? ContractConstructorOptionsBase<C>
    : ContractConstructorOptionsBase<C> & {
        /**
         * Arguments to pass to the circuit being called.
         */
        readonly args: Contract.InitializeParameters<C>;
      };

/**
 * Data retrieved via providers that should be included in the constructor call options.
 */
export type ContractConstructorOptionsProviderDataDependencies = {
  /**
   * The current user's ZSwap public key.
   */
  readonly coinPublicKey: CoinPublicKey;
}

/**
 * Contract constructor options including arguments and provider data.
 */
export type ContractConstructorOptionsWithProviderDataDependencies<C extends Contract.Any> =
  ContractConstructorOptionsWithArguments<C> & ContractConstructorOptionsProviderDataDependencies;

/**
 * Conditional type that optionally adds the inferred circuit argument types to
 * the target of a circuit invocation.
 */
export type ContractConstructorOptionsWithPrivateState<C extends Contract.Any> =
  ContractConstructorOptionsWithProviderDataDependencies<C> & {
    /**
     * The private state to run the circuit against.
     */
    readonly initialPrivateState: Contract.PrivateState<C>;
  };

/**
 * Conditional type that optionally adds the inferred circuit argument types to
 * the target of a circuit invocation.
 */
export type ContractConstructorOptions<C extends Contract.Any> =
  | ContractConstructorOptionsWithProviderDataDependencies<C>
  | ContractConstructorOptionsWithPrivateState<C>;

/**
 * The updated states resulting from executing a contract constructor.
 */
export type ContractConstructorResult<C extends Contract.Any> = {
  /**
   * The public state resulting from executing the contract constructor.
   */
  readonly nextContractState: ContractState;
  /**
   * The private state resulting from executing the contract constructor.
   */
  readonly nextPrivateState: Contract.PrivateState<C>;
  /**
   * The Zswap local state resulting from executing the contract constructor.
   */
  readonly nextZswapLocalState: ZswapLocalState;
}
