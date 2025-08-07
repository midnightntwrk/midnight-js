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

import { Effect, type Types } from 'effect';
import type { CompiledContract } from '../CompiledContract';
import { type Contract } from '../Contract';
import type * as CompactContext from '../CompactContext';

/** @internal */
export const TypeId = Symbol();
/** @internal */
export type TypeId = typeof TypeId;

/** @internal */
export interface Context<C extends Contract.Any>
  extends CompactContext.Witnesses<C>,
    CompactContext.ZKConfigAssetsPath {
  readonly ctor: Types.Ctor<C>;
}

/** @internal */
export const getContractContext: <C extends Contract<PS>, PS>(
  compiledContract: CompiledContract<C, PS>
) => Types.Simplify<Required<Context<C>>> = <C extends Contract<PS>, PS>(compiledContract: CompiledContract<C, PS>) =>
  compiledContract[TypeId] as Required<Context<C>>;

/** @internal */
export const createContract: <C extends Contract<PS>, PS>(
  compiledContract: CompiledContract<C, PS>
) => Effect.Effect<C> = <C extends Contract<PS>, PS>(compiledContract: CompiledContract<C, PS>) =>
  Effect.sync(() => {
    const context = getContractContext(compiledContract);

    if (!context.ctor) throw new Error('Invalid CompactContext (missing constructor)');
    return new context.ctor(context.witnesses);
  });
