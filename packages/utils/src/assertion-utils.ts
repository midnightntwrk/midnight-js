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

/**
 * Asserts that the given value is non-nullable.
 *
 * @param value The value to test for nullability.
 * @param message The error message to use if an error is thrown.
 *
 * @throws Error If the value is nullable.
 */
export function assertDefined<A>(value: A | null | undefined, message?: string): asserts value is NonNullable<A> {
  if (!value) {
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
  if (value) {
    throw new Error(message ?? 'Expected value to be null or undefined');
  }
}
