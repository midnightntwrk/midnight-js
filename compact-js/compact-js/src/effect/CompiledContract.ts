/*
 * This file is part of compact-js.
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

import { Types } from 'effect';
import { Pipeable } from 'effect/Pipeable';
import * as internal from './internal/CompiledContract';
import { Contract } from './Contract';

export const TypeId: unique symbol = internal.TypeId;
export type TypeId = typeof TypeId;

export interface CompiledContract<in C extends Contract.Any, out R = CompiledContract.Context<C>>
  extends CompiledContract.Variance<C, R>,
    Pipeable {}

export declare namespace CompiledContract {
  export type Variance<in C, out R> = {
    readonly [TypeId]: {
      readonly _C: Types.Contravariant<C>;
      readonly _R: Types.Covariant<R>;
    };
  };

  export type Context<C extends Contract.Any> = Context.Witnesses<C> | Context.FileAssetsPath;

  export namespace Context {
    export type Witnesses<C extends Contract.Any, W = Contract.Witnesses<C>> = {
      readonly witnesses: W;
    };

    export type FileAssetsPath<FP extends string = ''> = {
      readonly fileAssetsPath: FP;
    };
  }
}

export const make: <C extends Contract.Any, R = CompiledContract.Context<C>>(
  tag: string,
  ctor: Types.Ctor<C>
) => CompiledContract<C, R> = internal.make;

export const withWitnesses: {
  <C extends Contract.Any, R>(
    witnesses: R extends CompiledContract.Context.Witnesses<C, infer W> ? W : never
  ): (self: CompiledContract<C, R>) => CompiledContract<C, Exclude<R, CompiledContract.Context.Witnesses<C>>>;
  <C extends Contract.Any, R>(
    self: CompiledContract<C, R>,
    witnesses: R extends CompiledContract.Context.Witnesses<C, infer W> ? W : never
  ): CompiledContract<C, Exclude<R, CompiledContract.Context.Witnesses<C>>>;
} = internal.withWitnesses;

export const withFileAssets: {
  <C extends Contract.Any, R>(
    fileAssetsPath: R extends CompiledContract.Context.FileAssetsPath ? string : never
  ): (self: CompiledContract<C, R>) => CompiledContract<C, Exclude<R, CompiledContract.Context.FileAssetsPath>>;
  <C extends Contract.Any, R>(
    self: CompiledContract<C, R>,
    fileAssetsPath: R extends CompiledContract.Context.FileAssetsPath ? string : never
  ): CompiledContract<C, Exclude<R, CompiledContract.Context.FileAssetsPath>>;
} = internal.withFileAssets;
