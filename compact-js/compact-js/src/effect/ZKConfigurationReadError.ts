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

import * as Error from '@effect/platform/Error';
import { hasProperty } from 'effect/Predicate';
import type * as Contract from './Contract.js';

const TypeId: unique symbol = Symbol.for('compact-js/effect/ZKConfigurationReadError');
type TypeId = typeof TypeId;

/**
 * Describes a type of ZK asset.
 */
export type AssetType = 'verifier-key' | 'ZKIR' | 'prover-key';

/**
 * Error indicating a failure to read a ZK asset.
 *
 * @category errors
 */
export class ZKConfigurationReadError extends Error.TypeIdError(TypeId, 'ZKConfigurationReadError')<{
  /** A displayable message. */
  readonly message: string;

  /** The underlying cause of the failed read operation. */
  readonly cause?: unknown;

  /** The tag of the compiled contract being read. */
  readonly contractTag: string;

  /** The circuit of the compiled contract being read. */
  readonly impureCircuitId: Contract.ImpureCircuitId;

  /** The type of asset that was being read. */
  readonly assetType: AssetType;
}> { }

/**
 * Determines if a value is a ZK configuration read error.
 *
 * @param u The value to check.
 * @returns `true` if `u` is a {@link ZKConfigurationReadError}; `false` otherwise.
 *
 * @category guards
 */
export const isReadError = (u: unknown): u is ZKConfigurationReadError => hasProperty(u, TypeId);

/**
 * Creates a new {@link ZKConfigurationReadError}.
 *
 * @category constructors
 */
export const  make: <C extends Contract.Contract.Any>(
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
