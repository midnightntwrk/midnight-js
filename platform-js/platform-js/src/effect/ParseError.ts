/*
 * This file is part of platform-js.
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

import { type Inspectable } from 'effect/Inspectable';
import * as Error from '@effect/platform/Error';
import { hasProperty } from 'effect/Predicate';

const TypeId: unique symbol = Symbol.for('platform-js/effect/ParseError');
export type TypeId = typeof TypeId;

/**
 * Error indicating a failure to parse some string value.
 *
 * @category errors
 */
export class ParseError extends Error.TypeIdError(TypeId, 'ParseError')<{
  /** A displayable message. */
  readonly message: string;

  /** The source string that failed to parse. */
  readonly source: string;

  /** Inspectable data about the parse operation.  */
  readonly meta?: Inspectable;

  /** The underlying cause of the failed parse operation.  */
  readonly cause?: unknown;
}> { }

/**
 * Determines if a value is a parse error.
 *
 * @param u The value to check.
 * @returns `true` if `u` is a {@link ParseError}; `false` otherwise.
 *
 * @category guards
 */
export const isParseError = (u: unknown): u is ParseError => hasProperty(u, TypeId);

/**
 * Creates a new `ParseError`.
 *
 * @category constructors
 */
export const make: {
  (message: string, source: string): ParseError;
  (message: string, source: string, meta: Inspectable): ParseError;
  (message: string, source: string, meta: Inspectable, cause: unknown): ParseError;
} = (message: string, source: string, meta?: Inspectable, cause?: unknown): ParseError =>
  new ParseError({
    message,
    source,
    meta,
    cause
  });
