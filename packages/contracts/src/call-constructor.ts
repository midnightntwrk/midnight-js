/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
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

import {
  type CoinPublicKey,
  type ConstructorContext,
  type ContractState,
  decodeZswapLocalState,
  emptyZswapLocalState,
  type ZswapLocalState
} from '@midnight-ntwrk/compact-runtime';
import type { Contract, InitialStateParameters, PrivateState } from '@midnight-ntwrk/midnight-js-types';

/**
 * Describes the target of a circuit invocation.
 */
export type ContractConstructorOptionsBase<C extends Contract> = {
  /**
   * The contract defining the circuit to call.
   */
  readonly contract: C;
}

/**
 * Conditional type that optionally adds the inferred contract constructor argument types
 * to the constructor options.
 */
export type ContractConstructorOptionsWithArguments<C extends Contract> =
  InitialStateParameters<C> extends []
    ? ContractConstructorOptionsBase<C>
    : ContractConstructorOptionsBase<C> & {
        /**
         * Arguments to pass to the circuit being called.
         */
        readonly args: InitialStateParameters<C>;
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
export type ContractConstructorOptionsWithProviderDataDependencies<C extends Contract> =
  ContractConstructorOptionsWithArguments<C> & ContractConstructorOptionsProviderDataDependencies;

/**
 * Conditional type that optionally adds the inferred circuit argument types to
 * the target of a circuit invocation.
 */
export type ContractConstructorOptionsWithPrivateState<C extends Contract> =
  ContractConstructorOptionsWithProviderDataDependencies<C> & {
    /**
     * The private state to run the circuit against.
     */
    readonly initialPrivateState: PrivateState<C>;
  };

/**
 * Conditional type that optionally adds the inferred circuit argument types to
 * the target of a circuit invocation.
 */
export type ContractConstructorOptions<C extends Contract> =
  | ContractConstructorOptionsWithProviderDataDependencies<C>
  | ContractConstructorOptionsWithPrivateState<C>;

/**
 * The updated states resulting from executing a contract constructor.
 */
export type ContractConstructorResult<C extends Contract> = {
  /**
   * The public state resulting from executing the contract constructor.
   */
  readonly nextContractState: ContractState;
  /**
   * The private state resulting from executing the contract constructor.
   */
  readonly nextPrivateState: PrivateState<C>;
  /**
   * The Zswap local state resulting from executing the contract constructor.
   */
  readonly nextZswapLocalState: ZswapLocalState;
}

/**
 * Calls the constructor of the given contract according to the given configuration.
 *
 * @param options Configuration.
 */
export const callContractConstructor = <C extends Contract>(
  options: ContractConstructorOptions<C>
): ContractConstructorResult<C> => {
  const constructorResult = options.contract.initialState(
    {
      initialPrivateState: 'initialPrivateState' in options ? options.initialPrivateState : undefined,
      // TODO: IMPORTANT - consult
      initialZswapLocalState: emptyZswapLocalState(options.coinPublicKey)
    } as ConstructorContext<C>,
    ...('args' in options ? options.args : [])
  );
  return {
    nextContractState: constructorResult.currentContractState,
    nextPrivateState: constructorResult.currentPrivateState,
    nextZswapLocalState: decodeZswapLocalState(constructorResult.currentZswapLocalState)
  };
};
