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

import type { Types } from 'effect';
import { dual } from 'effect/Function';
import { type Pipeable, pipeArguments } from 'effect/Pipeable';

import type * as CompactContext from './CompactContext.js';
import type { Contract } from './Contract.js';
import * as CompactContextInternal from './internal/compactContext.js';

export const TypeId = Symbol.for('compact-js/CompiledContract');
export type TypeId = typeof TypeId;

/**
 * A binding to a Compact compiled contract.
 *
 * @remarks
 * Alongside the imported type and contract instance, we also need to provide an implementation of the
 * witnesses that the contract expects, along with a mechanism to retrieve the compiled ZK assets associated
 * with the compiled contract. A {@link CompiledContract} represents such a container within a hosting
 * TypeScript program. In order to make a contract executable, you should use the `ContractExecutable` module.
 *
 * @see {@link getContext} to retrieve the publicly visible properties associated with the compiled contract.
 */
export interface CompiledContract<in out C extends Contract<PS>, in out PS, out R = never>
  extends CompiledContract.Variance<C, PS, R>, Pipeable {
  /**
   * Gets the tag assigned to this compiled contract.
   */
  readonly tag: string;
  readonly [CompactContextInternal.TypeId]: Partial<CompactContextInternal.Context<C>>;
}

export declare namespace CompiledContract {
  /** @internal */
  export type Variance<in out C, in out PS, out R> = {
    readonly [TypeId]: {
      readonly _C: Types.Invariant<C>;
      readonly _PS: Types.Invariant<PS>;
      readonly _R: Types.Covariant<R>;
    };
  };

  /**
   * The context required to fully build a {@link CompiledContract}.
   *
   * @remarks
   * When looking to use a Compact compiled contract in a TypeScript program, we need to provide path
   * information to where the generated ZK assets can be found, along with an implementation of the witnesses
   * expected by the contract.
   */
  export type Context<C extends Contract.Any> = CompactContext.Witnesses<C> | CompactContext.ZKConfigAssetsPath;
}

const CompiledContractProto = {
  [TypeId]: {
    _C: (_: unknown) => _,
    _PS: (_: unknown) => _,
    _R: (_: never) => _
  },
  pipe() {
    return pipeArguments(this, arguments); // eslint-disable-line prefer-rest-params
  }
};

/**
 * Initializes an object that represents a binding to a Compact compiled contract.
 *
 * @param tag A unique identifier that represents this type of contract.
 * @param ctor The contract constructor, as imported from the compiled Compact output.
 * @returns A {@link CompiledContract}.
 *
 * @category constructors
 */
export const make: <C extends Contract<PS>, PS = Contract.PrivateState<C>, R = CompiledContract.Context<C>>(
  tag: string,
  ctor: Types.Ctor<C>
) => CompiledContract<C, PS, R> = <C extends Contract<PS>, PS, R = CompiledContract.Context<C>>(
  tag: string,
  ctor: Types.Ctor<C>
) => {
  const self = Object.create(CompiledContractProto) as Types.Mutable<CompiledContract<C, PS, R>>;
  self.tag = tag;
  self[CompactContextInternal.TypeId] = { ctor };
  return self;
};

/**
 * Associates an object that implements the contract witnesses for the Compact compiled contract.
 * 
 * @category combinators
 */
export const withWitnesses: {
  /**
   * @param witnesses An object implementing the witness functions required by the Compact compiled contract.
   * @returns A function that receives the {@link CompiledContract} that `witnesses` will be attached to.
   */
  <C extends Contract<PS>, PS, R>(
    witnesses: R extends CompactContext.Witnesses<C, infer W> ? W : never
  ): (self: CompiledContract<C, PS, R>) => CompiledContract<C, PS, Exclude<R, CompactContext.Witnesses<C>>>;
  /**
   * @param self The {@link CompiledContract} that `witnesses` will be attached to.
   * @param witnesses An object implementing the witness functions required by the Compact compiled contract.
   */
  <C extends Contract<PS>, PS, R>(
    self: CompiledContract<C, PS, R>,
    witnesses: R extends CompactContext.Witnesses<C, infer W> ? W : never
  ): CompiledContract<C, PS, Exclude<R, CompactContext.Witnesses<C>>>;
} = dual(
  2,
  <C extends Contract<PS>, PS, R>(
    self: CompiledContract<C, PS, R>,
    witnesses: R extends CompactContext.Witnesses<C, infer W> ? W : never
  ) => {
    return {
      ...self,
      [CompactContextInternal.TypeId]: {
        ...self[CompactContextInternal.TypeId],
        witnesses
      }
    };
  }
);

/**
 * Associates a file path where the ZK assets can be found for the Compact compiled contract.
 *
 * @category combinators
 */
export const withZKConfigFileAssets: {
  /**
   * @param zkConfigAssetsPath The file path.
   * @returns A function that receives the {@link CompiledContract} that `zkConfigAssetsPath` will be attached to.
   */
  <C extends Contract<PS>, PS, R>(
    zkConfigAssetsPath: R extends CompactContext.ZKConfigAssetsPath ? string : never
  ): (self: CompiledContract<C, PS, R>) => CompiledContract<C, PS, Exclude<R, CompactContext.ZKConfigAssetsPath>>;
  /**
   * @param self The {@link CompiledContract} that `zkConfigAssetsPath` will be attached to.
   * @param zkConfigAssetsPath The file path.
   */
  <C extends Contract<PS>, PS, R>(
    self: CompiledContract<C, PS, R>,
    zkConfigAssetsPath: R extends CompactContext.ZKConfigAssetsPath ? string : never
  ): CompiledContract<C, PS, Exclude<R, CompactContext.ZKConfigAssetsPath>>;
} = dual(
  2,
  <C extends Contract<PS>, PS, R>(
    self: CompiledContract<C, PS, R>,
    zkConfigAssetsPath: R extends CompactContext.ZKConfigAssetsPath ? string : never
  ) => {
    return {
      ...self,
      [CompactContextInternal.TypeId]: {
        ...self[CompactContextInternal.TypeId],
        zkConfigAssetsPath
      }
    };
  }
);

/**
 * Retrieves a path to the ZK assets associated with a compiled contract.
 *
 * @param self The {@link CompiledContract} from which the assets path should be retrieved.
 * @returns A string representing a path to the ZK assets configured for `self`.
 */
export const getZkConfigAssetsPath: <C extends Contract<PS>, PS>(self: CompiledContract<C, PS>) => string =
  <C extends Contract<PS>, PS>(self: CompiledContract<C, PS>) => {
    const context = CompactContextInternal.getContractContext(self);
    return context.zkConfigAssetsPath;
  };
