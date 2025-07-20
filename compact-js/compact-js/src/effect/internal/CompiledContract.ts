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
import { pipeArguments } from 'effect/Pipeable';
import { dual } from 'effect/Function';
import type * as CompiledContract from '../CompiledContract';
import { Contract } from '../Contract';

/** @internal */
export const TypeId: CompiledContract.TypeId = Symbol.for(
  '@midnight-ntwrk/compact-js/CompiledContract'
) as CompiledContract.TypeId;

/** @internal  */
export const MetaTypeId = Symbol.for('@midnight-ntwrk/compact-js/CompiledContract#Meta');

const proto = {
  [TypeId]: {
    _C: (_: unknown) => _,
    _R: (_: never) => _
  },
  pipe() {
    // eslint-disable-next-line prefer-rest-params
    return pipeArguments(this, arguments);
  }
};

/** @internal */
export interface Meta<C extends Contract.Any, R> extends CompiledContract.CompiledContract<C, R> {
  [MetaTypeId]: Partial<Types.UnionToIntersection<CompiledContract.CompiledContract.Context<C>>> & {
    readonly tag: string;
    readonly ctor: Types.Ctor<C>;
  };
}

export const make: <C extends Contract.Any, R = CompiledContract.CompiledContract.Context<C>>(
  tag: string,
  ctor: Types.Ctor<C>
) => CompiledContract.CompiledContract<C, R> = <C extends Contract.Any, R>(tag: string, ctor: Types.Ctor<C>) => {
  const self = Object.create(proto) as Meta<C, R>;
  self[MetaTypeId] = {
    tag,
    ctor
  };
  return self;
};

export const withWitnesses = dual<
  <C extends Contract.Any, R>(
    witnesses: R extends CompiledContract.CompiledContract.Context.Witnesses<C, infer W> ? W : never
  ) => (
    self: CompiledContract.CompiledContract<C, R>
  ) => CompiledContract.CompiledContract<C, Exclude<R, CompiledContract.CompiledContract.Context.Witnesses<C>>>,
  <C extends Contract.Any, R>(
    self: CompiledContract.CompiledContract<C, R>,
    witnesses: R extends CompiledContract.CompiledContract.Context.Witnesses<C, infer W> ? W : never
  ) => CompiledContract.CompiledContract<C, Exclude<R, CompiledContract.CompiledContract.Context.Witnesses<C>>>
>(
  2,
  <C extends Contract.Any, R>(
    self: CompiledContract.CompiledContract<C, R>,
    witnesses: R extends CompiledContract.CompiledContract.Context.Witnesses<C, infer W> ? W : never
  ) => {
    return {
      ...self,
      [MetaTypeId]: {
        ...(self as Meta<C, R>)[MetaTypeId],
        witnesses
      }
    } as Meta<C, Exclude<R, CompiledContract.CompiledContract.Context.Witnesses<C>>>;
  }
);

export const withFileAssets = dual<
  <C extends Contract.Any, R>(
    fileAssetsPath: R extends CompiledContract.CompiledContract.Context.FileAssetsPath ? string : never
  ) => (
    self: CompiledContract.CompiledContract<C, R>
  ) => CompiledContract.CompiledContract<C, Exclude<R, CompiledContract.CompiledContract.Context.FileAssetsPath>>,
  <C extends Contract.Any, R>(
    self: CompiledContract.CompiledContract<C, R>,
    fileAssetsPath: R extends CompiledContract.CompiledContract.Context.FileAssetsPath ? string : never
  ) => CompiledContract.CompiledContract<C, Exclude<R, CompiledContract.CompiledContract.Context.FileAssetsPath>>
>(
  2,
  <C extends Contract.Any, R>(
    self: CompiledContract.CompiledContract<C, R>,
    fileAssetsPath: R extends CompiledContract.CompiledContract.Context.FileAssetsPath ? string : never
  ) => {
    return {
      ...self,
      [MetaTypeId]: {
        ...(self as Meta<C, R>)[MetaTypeId],
        fileAssetsPath
      }
    } as Meta<C, Exclude<R, CompiledContract.CompiledContract.Context.FileAssetsPath>>;
  }
);
