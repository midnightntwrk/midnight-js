/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

const isThenable = (v: unknown): v is PromiseLike<unknown> =>
  v !== null &&
  typeof v === 'object' &&
  typeof (v as { then?: unknown }).then === 'function';

/**
 * Wraps a synchronous deserialization call. If `fn()` throws an `Error`,
 * the wrapper classifies it and re-throws a `DeserializationError` with
 * structured context. Non-`Error` throws (`string`, `number`, `null`, etc.)
 * pass through unchanged.
 *
 * **Sync-only contract (D14).** TypeScript cannot statically prevent
 * `T = Promise<U>` at the call site. If `fn()` returns a thenable, the
 * wrapper throws a `TypeError` synchronously to avoid silent
 * Promise-rejection escapes from the try/catch.
 *
 * Status: this HOF is an **escape hatch** for ad-hoc deserialization sites
 * not covered by the predefined typed wrappers in `./typed-wrappers.ts`.
 * Prefer the typed wrappers for the 7 known production call sites.
 *
 * @throws {DeserializationError} When `fn()` throws an `Error`.
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
    if (!(cause instanceof Error)) throw cause;
    throw new DeserializationError(classify(callSite, cause), cause);
  }
  if (isThenable(result)) {
    // Attach a noop catch to prevent the dangling thenable from triggering an
    // unhandled-rejection warning at the Node process level. We're throwing
    // synchronously, so any rejection from the thenable would otherwise be
    // orphaned.
    result.then(undefined, () => {
      /* suppressed — outer TypeError signals the misuse */
    });
    throw new TypeError(
      `withDeserializationContext is sync-only; received a thenable from ${callSite.caller}. ` +
        `Wrap the .deserialize call (not the awaited value) inside the thunk, ` +
        `or handle async deserialization with try/catch.`
    );
  }
  return result;
};
