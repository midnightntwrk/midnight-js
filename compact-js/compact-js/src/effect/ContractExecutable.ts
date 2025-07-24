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

import { Effect, Layer } from 'effect';
import { Pipeable } from 'effect/Pipeable';
import { ContractDeploy } from '@midnight-ntwrk/ledger';
import { EncodedZswapLocalState } from '@midnight-ntwrk/compact-runtime';
import * as internal from './internal/ContractExecutable';
import type { ContractExecutionError } from './internal/ContractExecutable';
import { CompiledContract } from './CompiledContract';
import { Contract } from './Contract';
import type { ZKConfig } from './ZKConfig';

export interface ContractExecutable<in C extends Contract.Any, out E = never, out R = never> extends Pipeable {
  readonly compiledContract: CompiledContract<C>;

  initialize(
    privateState: Contract.PrivateState<C>,
    ...args: Contract.InitializeParameters<C>
  ): Effect.Effect<ContractExecutable.Result<ContractDeploy, Contract.PrivateState<C>>, E, R>;
}

export declare namespace ContractExecutable {
  /**
   * The services required as context for executing contracts.
   */
  export type Context = ZKConfig;

  export type Result<T, PS> = {
    readonly data: T;

    readonly privateState: PS;

    readonly zswapLocalState: EncodedZswapLocalState;
  };
}

export const make: <C extends Contract.Any>(
  compiledContract: CompiledContract<C, never>
) => ContractExecutable<C, ContractExecutionError, ContractExecutable.Context> = internal.make;

export const provide: {
  <LA, LE, LR>(
    layer: Layer.Layer<LA, LE, LR>
  ): <C extends Contract.Any, E, R>(
    self: ContractExecutable<C, E, R>
  ) => ContractExecutable<C, E | LE, LR | Exclude<R, LA>>;
  <C extends Contract.Any, E, R, LA, LE, LR>(
    self: ContractExecutable<C, E, R>,
    layer: Layer.Layer<LA, LE, LR>
  ): ContractExecutable<C, E | LE, LR | Exclude<R, LA>>;
} = internal.provide;
