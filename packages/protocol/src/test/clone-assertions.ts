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

import { expect } from 'vitest';

// A WASM handle survives `structuredClone` without throwing: the clone is
// `{ __wbg_ptr: <number> }` and every member is gone. So "did not throw" is
// not evidence the value crossed the boundary intact, and asserting it lets a
// handle pass the very check meant to exclude it.
//
// A wasm-bindgen instance's real fields live behind prototype getters; its
// only OWN property is `__wbg_ptr`. Both `structuredClone` and
// `JSON.stringify` (which `canonical` wraps) copy only an object's own
// enumerable properties, never prototype accessors, so a handle's clone and
// the handle itself canonicalise to the same string. Content equality can
// therefore never tell a handle apart from itself -- it is not a second line
// of defence against handle leaks. It is kept below because it still catches
// something else worth catching: ordinary decode-content regressions in
// legitimate plain data. The actual rejection of a handle is done by
// `hasWasmPointer`, which walks the value's own structure looking for an
// object anywhere in the tree whose own properties include `__wbg_ptr`.
// Known limits, so the next caller reusing this helper does not have to rediscover them: it does
// not special-case `Set` (a `Set` canonicalises as `{}`, losing its contents), it throws on a
// circular reference (as `JSON.stringify` does), and it inherits `JSON.stringify`'s `-0`/`NaN`/
// `undefined` handling (`-0` canonicalises as `0`, and `NaN`/`undefined` become `null` or vanish,
// depending on position).
const WASM_POINTER = '__wbg_ptr';

const canonical = (value: unknown): string | undefined =>
  JSON.stringify(value, (_key, inner: unknown) =>
    typeof inner === 'bigint'
      ? `${inner.toString()}n`
      : inner instanceof Uint8Array
        ? Buffer.from(inner).toString('hex')
        : inner instanceof Map
          ? { __map: Array.from(inner) }
          : inner
  );

const hasWasmPointer = (value: unknown, seen: WeakSet<object> = new WeakSet()): boolean => {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  if (seen.has(value)) {
    return false;
  }
  seen.add(value);

  if (Object.prototype.hasOwnProperty.call(value, WASM_POINTER)) {
    return true;
  }
  if (value instanceof Uint8Array) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((entry) => hasWasmPointer(entry, seen));
  }
  if (value instanceof Map) {
    return Array.from(value).some(([key, entry]) => hasWasmPointer(key, seen) || hasWasmPointer(entry, seen));
  }
  return Object.values(value).some((entry) => hasWasmPointer(entry, seen));
};

/**
 * Asserts `value` is plain data that survives a structured clone with its
 * content intact, and carries no WASM handle at any depth.
 */
export const expectStructuredCloneable = (value: unknown): void => {
  const clone = structuredClone(value);

  expect(canonical(clone)).toBe(canonical(value));
  expect(hasWasmPointer(value)).toBe(false);
};
