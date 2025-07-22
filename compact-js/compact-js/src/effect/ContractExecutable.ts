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

import { Effect } from 'effect';
import { ContractDeploy } from '@midnight-ntwrk/ledger';
import { EncodedZswapLocalState } from '@midnight-ntwrk/compact-runtime';
import * as internal from './internal/ContractExecutable';
import { CompiledContract } from './CompiledContract';
import { Contract } from './Contract';

export interface ContractExecutable<in C extends Contract<PS>, PS = Contract.PrivateState<C>> {
  initialize(
    privateState: PS,
    ...args: Contract.InitializeParameters<C>
  ): Effect.Effect<ContractExecutable.Result<ContractDeploy, PS>, Error>;
}

export declare namespace ContractExecutable {
  export type Result<T, PS> = {
    readonly result: T;

    readonly privateState: PS;

    readonly zswapLocalState: EncodedZswapLocalState;
  };
}

export const make: <C extends Contract.Any>(compiledContract: CompiledContract<C, never>) => ContractExecutable<C> =
  internal.make;
