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

import { type FileSystem, type Path } from '@effect/platform';
import { type PlatformError } from '@effect/platform/Error';
import { type CompiledContract, type Contract, type ContractRuntimeError } from '@midnight-ntwrk/compact-js/effect';
import { Context, type Effect,type Layer } from 'effect';

import * as internal from './internal/compiledContractReflection.js';

/**
 * Provides utilities for inspecting a compiled Compact contract.
 * 
 * @category services
 */
export class CompiledContractReflection extends Context.Tag('compact-js-command/CompiledContractReflection')<
  CompiledContractReflection,
  CompiledContractReflection.Service
>() {}

export declare namespace CompiledContractReflection {
  /**
   * Provides utilities for inspecting a compiled Compact contract.
   */
  export interface Service {
    /**
     * Creates a parser that transforms an array of string, into an array of values, typed by the reflected
     * argument types of the compiled Compact contract's initializer or circuits.
     * 
     * @param compiledContract The Compact compiled contract.
     * @returns An `Effect` that yields an {@link ArgumentParser} for `compiledContract`; or a `PlatformError` 
     * if the Compact generated TypeScript declaration file could not be found.
     */
    readonly createArgumentParser: <C extends Contract.Contract<PS>, PS>(
      compiledContract: CompiledContract.CompiledContract<C, PS, never>
    ) => Effect.Effect<ArgumentParser<C, PS>, PlatformError>
  }

  /**
   * Uses the argument types of a compiled Compact contract's initializer or circuits, to transform an array
   * of string into an array of values that can be used when executing the contract.
   */
  export interface ArgumentParser<C extends Contract.Contract<PS>, PS> {
    /**
     * Transforms an array of strings into an array of contract initialization arguments.
     * 
     * @param args The array of strings to be transformed.
     * @returns An `Effect` that yields an array of initialization arguments; or fails with a 
     * {@link ContractRuntimeError.ContractRuntimeError | ContractRuntimeError}.
     */
    parseInitializationArgs(args: string[]): Effect.Effect<Contract.Contract.InitializeParameters<C>, ContractRuntimeError.ContractRuntimeError>;

    /**
     * Transforms an array of strings into an array of circuit arguments.
     * 
     * @param impureCircuitId The identifier of the circuit that will be invoked with `args`.
     * @param args The array of strings to be transformed.
     * @returns An `Effect` that yields an array of circuit arguments; or fails with a 
     * {@link ContractRuntimeError.ContractRuntimeError | ContractRuntimeError}.
     */
    parseCircuitArgs<K extends Contract.ImpureCircuitId<C>>(
      impureCircuitId: K,
      args: string[]
    ): Effect.Effect<Contract.Contract.CircuitParameters<C, K>, ContractRuntimeError.ContractRuntimeError>;
  }

  /**
   * Represents an {@link ArgumentParser} for any contract.
   */
  export type AnyArgumentParser = ArgumentParser<any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/**
 * A {@link CompiledContractReflection} implementation that uses a TypeScript declaration file (*.d.ts) produced
 * by the Compact compiler, to reflect over an associated contract's types.
 * 
 * @param baseAssetFolderPath A base path to a folder containing the compiled contract assets.
 * 
 * @category layers
 */
export const layer: (baseAssetFolderPath?: string) => Layer.Layer<
  CompiledContractReflection,
  PlatformError,
  FileSystem.FileSystem | Path.Path
> = internal.layer;
