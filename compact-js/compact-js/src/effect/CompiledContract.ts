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
import { Pipeable, pipeArguments } from 'effect/Pipeable';
import { dual } from 'effect/Function';
import { Contract } from './Contract';
import type * as CompactContext from './CompactContext';
import * as CompactContextInternal from './internal/compactContext';

export const TypeId = Symbol.for('@midnight-ntwrk/compact-js/CompiledContract');
export type TypeId = typeof TypeId;

export interface CompiledContract<in out C extends Contract<PS>, in out PS, out R = never>
  extends CompiledContract.Variance<C, PS, R>,
    Pipeable {
  [CompactContextInternal.CompactContextId]: Partial<CompactContextInternal.Context<C>>;
}

export declare namespace CompiledContract {
  export type Variance<in out C, in out PS, out R> = {
    readonly [TypeId]: {
      readonly _C: Types.Invariant<C>;
      readonly _PS: Types.Invariant<PS>;
      readonly _R: Types.Covariant<R>;
    };
  };

  export type Context<C extends Contract.Any> = CompactContext.Witnesses<C> | CompactContext.ZKConfigAssetsPath;
}

const proto = {
  [TypeId]: {
    _C: (_: unknown) => _,
    _PS: (_: unknown) => _,
    _R: (_: never) => _
  },
  pipe() {
    return pipeArguments(this, arguments); // eslint-disable-line prefer-rest-params
  }
};

export const make: <C extends Contract<PS>, PS = Contract.PrivateState<C>, R = CompiledContract.Context<C>>(
  tag: string,
  ctor: Types.Ctor<C>
) => CompiledContract<C, PS, R> = <C extends Contract<PS>, PS, R = CompiledContract.Context<C>>(
  tag: string,
  ctor: Types.Ctor<C>
) => {
  const self = Object.create(proto) as CompiledContract<C, PS, R>;
  self[CompactContextInternal.CompactContextId] = { tag, ctor };
  return self;
};

/**
 * @category combinators
 */
export const withWitnesses: {
  <C extends Contract<PS>, PS, R>(
    witnesses: R extends CompactContext.Witnesses<C, infer W> ? W : never
  ): (self: CompiledContract<C, PS, R>) => CompiledContract<C, PS, Exclude<R, CompactContext.Witnesses<C>>>;
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
      [CompactContextInternal.CompactContextId]: {
        ...self[CompactContextInternal.CompactContextId],
        witnesses
      }
    };
  }
);

/**
 * @category combinators
 */
export const withZKConfigFileAssets: {
  <C extends Contract<PS>, PS, R>(
    fileAssetsPath: R extends CompactContext.ZKConfigAssetsPath ? string : never
  ): (self: CompiledContract<C, PS, R>) => CompiledContract<C, PS, Exclude<R, CompactContext.ZKConfigAssetsPath>>;
  <C extends Contract<PS>, PS, R>(
    self: CompiledContract<C, PS, R>,
    fileAssetsPath: R extends CompactContext.ZKConfigAssetsPath ? string : never
  ): CompiledContract<C, PS, Exclude<R, CompactContext.ZKConfigAssetsPath>>;
} = dual(
  2,
  <C extends Contract<PS>, PS, R>(
    self: CompiledContract<C, PS, R>,
    fileAssetsPath: R extends CompactContext.ZKConfigAssetsPath ? string : never
  ) => {
    return {
      ...self,
      [CompactContextInternal.CompactContextId]: {
        ...self[CompactContextInternal.CompactContextId],
        fileAssetsPath
      }
    };
  }
);
