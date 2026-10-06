/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
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

import { UTILS_ERROR_CODES } from './error-codes';

/**
 * Asserts that the given value is non-nullable.
 *
 * @param value The value to test for nullability.
 * @param message The error message to use if an error is thrown.
 *
 * @throws Error If the value is nullable.
 */
export function assertDefined<A>(value: A | null | undefined, message?: string): asserts value is NonNullable<A> {
  if (value === null || value === undefined) {
    throw new Error(message ?? 'Expected value to be defined');
  }
}

/**
 * Asserts that the given value is null or undefined.
 *
 * @param value The value to test for nullability.
 * @param message The error message to use if an error is thrown.
 *
 * @throws Error If the value is not undefined or null
 */
export function assertUndefined<A>(value: A | null | undefined, message?: string): asserts value is undefined | null {
  if (value !== null && value !== undefined) {
    throw new Error(message ?? 'Expected value to be null or undefined');
  }
}

/**
 * Raised by {@link assertNever} when a value the compiler ruled out arrives
 * anyway, which happens when a payload is decoded from outside the build.
 */
export class UnhandledUnionMemberError extends Error {
  readonly code = UTILS_ERROR_CODES.UNHANDLED_UNION_MEMBER;

  constructor(readonly context: string) {
    super(`Unhandled union member in ${context}: the union grew and this switch was not updated`);
    this.name = 'UnhandledUnionMemberError';
  }
}

/**
 * Asserts that every member of a union has already been handled.
 *
 * Put it in the `default` arm of a `switch` over a discriminated union. While
 * the switch is exhaustive the compiler narrows `value` to `never` and the call
 * type-checks; add an arm to the union and the same call stops compiling,
 * pointing at every switch that has to change.
 *
 * The thrown message never includes `value`; `context` is what locates the throw.
 *
 * @param value The narrowed value, which must be `never` for the call to compile.
 * @param context Names the switch, so the runtime throw says where it came from.
 *
 * @throws UnhandledUnionMemberError Always.
 *
 * @example
 * ```ts
 * switch (record.version) {
 *   case 'v8': return readRetained(record);
 *   case 'v9': return readNative(record);
 *   default: return assertNever(record, 'readContractRecord');
 * }
 * ```
 */
export function assertNever(value: never, context: string): never {
  throw new UnhandledUnionMemberError(context);
}
