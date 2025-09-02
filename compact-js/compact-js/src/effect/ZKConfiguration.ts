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

import { type Effect, Context } from 'effect';
import type { CompiledContract } from './CompiledContract.js';
import type * as Contract from './Contract.js';
import type * as ZKConfigurationError from './ZKConfigurationReadError.js';

/**
 * Provides utilities for working with the ZK assets of a compiled Compact contract.
 *
 * @category services
 */
export class ZKConfiguration extends Context.Tag('compact-js/ZKConfiguration')<
  ZKConfiguration,
  ZKConfiguration.Service
>() {}

export declare namespace ZKConfiguration {
  /**
   * Provides utilities for working with the ZK assets of a compiled Compact contract.
   */
  export interface Service {
    /**
     * Creates a ZK asset reader for a given compiled Compact contract.
     *
     * @param compiledContract The Compact compiled contract.
     * @returns An `Effect` that yields a {@link Reader}.
     */
    readonly createReader: <C extends Contract.Contract<PS>, PS>(
      compiledContract: CompiledContract<C, PS, never>
    ) => Effect.Effect<ZKConfiguration.Reader<C, PS>>;
  }

  /**
   * Reads ZK assets.
   */
  export interface Reader<C extends Contract.Contract<PS>, PS> {
    /**
     * Reads a verifier key for a given circuit identifier.
     *
     * @param impureCircuitId The identifier of the circuit to be read.
     * @returns An `Effect` that yields a {@link Contract.VerifierKey | VerifierKey} for `impureCircuitId`; or
     * fails with a {@link ZKConfigurationError.ZKConfigurationReadError | ZKConfigurationReadError}.
     */
    getVerifierKey(
      impureCircuitId: Contract.ImpureCircuitId<C>
    ): Effect.Effect<Contract.VerifierKey, ZKConfigurationError.ZKConfigurationReadError>;

    /**
     * Batch reads the verifier keys for an array of circuit identifiers.
     *
     * @param impureCircuitIds The identifiers of the circuits to be read.
     * @returns An `Effect` that yields an array of tuples describing a {@link Contract.VerifierKey | VerifierKey}
     * and its associated circuit identifier; or fails with a 
     * {@link ZKConfigurationError.ZKConfigurationReadError | ZKConfigurationReadError}.
     */
    getVerifierKeys(
      impureCircuitIds: Contract.ImpureCircuitId<C>[]
    ): Effect.Effect<
      readonly [Contract.ImpureCircuitId<C>, Contract.VerifierKey][],
      ZKConfigurationError.ZKConfigurationReadError
      >;
  }
}
