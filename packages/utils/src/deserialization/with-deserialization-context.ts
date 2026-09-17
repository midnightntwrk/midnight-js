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
 * unwrapped.
 *
 * SYNC-ONLY BY CONTRACT: if `fn()` returns a thenable the wrapper throws a
 * `TypeError`. The typed wrappers in `./typed-wrappers.ts` are the primary API;
 * use this HOF directly only for ad-hoc deserialization sites not covered there.
 *
 * @throws {DeserializationError} When `fn()` throws anything at all.
 * @throws {TypeError} When `fn()` returns a thenable (sync-only violation).
 *
 * @see {@link ErrorVocabulary} for why a bare string throw is classified rather
 * than re-thrown, and what the thenable check prevents.
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
