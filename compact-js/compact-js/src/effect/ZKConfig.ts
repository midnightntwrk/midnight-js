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

import { Effect, Context, Data } from 'effect';
import type { CompiledContract } from './CompiledContract';
import * as Contract from './Contract';

/**
 * Provides read and write utilities for the ZK assets of a compiled Compact contract.
 *
 * @category services
 */
export class ZKConfig extends Context.Tag('@midnight-ntwrk/compact-js/ZKConfig')<ZKConfig, ZKConfig.Service>() {}

export type ZKConfigAssetType = 'verifier-key' | 'ZKIR' | 'prover-key';

/**
 * An error occurred while reading a ZK configuration asset for a circuit for a compiled Compact contract.
 *
 * @category errors
 */
export class ZKConfigReadError extends Data.TaggedError('ZKConfigReadError')<{
  readonly message: string;
  readonly cause?: unknown;
  readonly contractTag: string;
  readonly impureCircuitId: Contract.ImpureCircuitId;
  readonly assetType: ZKConfigAssetType;
}> {
  static make: <C extends Contract.Contract.Any>(
    contractTag: string,
    impureCircuitId: Contract.ImpureCircuitId<C>,
    assetType: ZKConfigAssetType,
    cause?: unknown
  ) => ZKConfigReadError = (contractTag, impureCircuitId, assetType, cause?: unknown) =>
    new ZKConfigReadError({
      contractTag,
      impureCircuitId,
      assetType,
      message: `Failed to read ${assetType.replaceAll('-', ' ')} for ${contractTag}#${impureCircuitId}`,
      cause
    });
}

export declare namespace ZKConfig {
  export interface Service {
    readonly createReader: <C extends Contract.Contract.Any>(
      compiledContract: CompiledContract<C, never>
    ) => Effect.Effect<ZKConfig.Reader<C>>;
  }

  export interface Reader<C extends Contract.Contract.Any> {
    getVerifierKey(
      impureCircuitId: Contract.ImpureCircuitId<C>
    ): Effect.Effect<Contract.VerifierKey, ZKConfigReadError>;

    getVerifierKeys(
      impureCircuitIds: Contract.ImpureCircuitId<C>[]
    ): Effect.Effect<[Contract.ImpureCircuitId<C>, Contract.VerifierKey][], ZKConfigReadError>;
  }
}
