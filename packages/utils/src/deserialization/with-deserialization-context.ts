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

import { classify } from './classify';
import { type DeserializationCallSite, DeserializationError } from './deserialization-error';

/**
 * Wraps a synchronous deserialization call. Whatever `fn()` throws, the
 * wrapper classifies it and re-throws a `DeserializationError` carrying
 * structured context, with the original value on `cause`.
 *
 * A non-`Error` throw is classified on its string form rather than escaping
 * unwrapped: some wasm-bindgen bindings surface a `Result<_, String>` as a
 * bare string, and a caller that received one would get a value with no
 * `cause`, no call site and no `instanceof` identity to branch on.
 *
 * Sync-only by contract. The typed wrappers in `./typed-wrappers.ts` are
 * the primary API; use this HOF directly only for ad-hoc deserialization
 * sites not covered there.
 *
 * If `fn()` returns a thenable the wrapper throws a `TypeError` rather
 * than silently bypassing classification — any rejection from the
 * thenable would otherwise escape the try/catch.
 *
 * @throws {DeserializationError} When `fn()` throws anything at all.
 * @throws {TypeError} When `fn()` returns a thenable (sync-only violation).
 *
 * @example
 * ```ts
 * // Inside a typed wrapper:
 * deserializeContractState(buf, ctx) =>
 *   withDeserializationContext(callSite, () => LedgerContractState.deserialize(buf));
 * ```
 */
export const withDeserializationContext = <T>(
  callSite: DeserializationCallSite,
  fn: () => T
): T => {
  let result: T;
  try {
    result = fn();
  } catch (cause) {
    const classifiable = cause instanceof Error ? cause : new Error(String(cause));
    throw new DeserializationError(classify(callSite, classifiable), cause);
  }
  if (
    result !== null &&
    typeof result === 'object' &&
    typeof (result as { then?: unknown }).then === 'function'
  ) {
    throw new TypeError(
      `withDeserializationContext is sync-only; received a thenable from ${callSite.caller}.`
    );
  }
  return result;
};
