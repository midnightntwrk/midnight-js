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
import { type ContractState } from '@midnight-ntwrk/compact-runtime';
import { hasProperty } from 'effect/Predicate';

const TypeId: unique symbol = Symbol.for('compact-js/effect/ContractConfigurationError');
type TypeId = typeof TypeId;

/**
 * An error occurred while executing a constructor, or a circuit, of an executable contract with regards to
 * its configuration.
 *
 * @category errors
 */
export class ContractConfigurationError extends Error.TypeIdError(TypeId, 'ContractConfigurationError')<{
  /** A displayable message. */
  readonly message: string;
  /** Indicates a more specific cause of the error. */
  readonly cause?: unknown;
  /** The current state of the contract. */
  readonly contractState?: ContractState | undefined;
}> { }

/**
 * Determines if a value is a contract configuration error.
 *
 * @param u The value to check.
 * @returns `true` if `u` is a {@link ContractConfigurationError}; `false` otherwise.
 *
 * @category guards
 */
export const isConfigurationError = (u: unknown): u is ContractConfigurationError => hasProperty(u, TypeId);

/**
 * Creates a new {@link ContractConfigurationError}.
 *
 * @category constructors
 */
export const make: {
  (message: string): ContractConfigurationError;
  (message: string, contractState: ContractState | undefined): ContractConfigurationError;
  (message: string, contractState: ContractState | undefined, cause: unknown): ContractConfigurationError;
} = (message: string, contractState?: ContractState, cause?: unknown) =>
  new ContractConfigurationError({ message, contractState, cause });
