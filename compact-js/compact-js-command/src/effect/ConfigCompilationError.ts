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

const TypeId: unique symbol = Symbol.for('compact-js-command/effect/ConfigCompilationError');
type TypeId = typeof TypeId;

/**
 * An error occurred while compiling the contract configuration file.
 *
 * @category errors
 */
export class ConfigCompilationError extends Error.TypeIdError(TypeId, 'ConfigCompilationError')<{
  /** A displayable message. */
  readonly message: string;
  /** An array of diagnostic messages from the TypeScript compiler. */
  readonly diagnostics: { messageText: string }[];
}> { }

/**
 * Determines if a value is a config compilation error.
 *
 * @param u The value to check.
 * @returns `true` if `u` is a {@link ConfigCompilationError}; `false` otherwise.
 *
 * @category guards
 */
export const isConfigCompilationError = (u: unknown): u is ConfigCompilationError => hasProperty(u, TypeId);

/**
 * Creates a new {@link ConfigCompilationError}.
 * 
 * @category constructors
 */
export const make: (message: string, diagnostics: { messageText: string }[]) => ConfigCompilationError =
  (message, diagnostics) => new ConfigCompilationError({ message, diagnostics });
