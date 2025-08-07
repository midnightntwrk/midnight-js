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

import { type Effect, Context, Data } from 'effect';
import type { CompiledContract } from './CompiledContract.js';
import type * as Contract from './Contract.js';

/**
 * Provides utilities for reading the ZK assets of a compiled Compact contract.
 *
 * @category services
 */
export class ZKConfiguration extends Context.Tag('@midnight-ntwrk/compact-js/ZKConfiguration')<
  ZKConfiguration,
  ZKConfiguration.Service
>() {}

/**
 * Describes a type of ZK asset.
 */
export type AssetType = 'verifier-key' | 'ZKIR' | 'prover-key';

/**
 * An error occurred while reading a ZK configuration asset for a circuit for a compiled Compact contract.
 *
 * @category errors
 */
export class ZKConfigurationReadError extends Data.TaggedError('ZKConfigurationReadError')<{
  readonly message: string;
  readonly cause?: unknown;
  readonly contractTag: string;
  readonly impureCircuitId: Contract.ImpureCircuitId;
  readonly assetType: AssetType;
}> {
  static make: <C extends Contract.Contract.Any>(
    contractTag: string,
    impureCircuitId: Contract.ImpureCircuitId<C>,
    assetType: AssetType,
    cause?: unknown
  ) => ZKConfigurationReadError = (contractTag, impureCircuitId, assetType, cause?: unknown) =>
    new ZKConfigurationReadError({
      contractTag,
      impureCircuitId,
      assetType,
      message: `Failed to read ${assetType.replaceAll('-', ' ')} for ${contractTag}#${impureCircuitId}`,
      cause
    });
}

export declare namespace ZKConfiguration {
  export interface Service {
    readonly createReader: <C extends Contract.Contract<PS>, PS>(
      compiledContract: CompiledContract<C, PS, never>
    ) => Effect.Effect<ZKConfiguration.Reader<C, PS>>;
  }

  export interface Reader<C extends Contract.Contract<PS>, PS> {
    getVerifierKey(
      impureCircuitId: Contract.ImpureCircuitId<C>
    ): Effect.Effect<Contract.VerifierKey, ZKConfigurationReadError>;

    getVerifierKeys(
      impureCircuitIds: Contract.ImpureCircuitId<C>[]
    ): Effect.Effect<[Contract.ImpureCircuitId<C>, Contract.VerifierKey][], ZKConfigurationReadError>;
  }
}
