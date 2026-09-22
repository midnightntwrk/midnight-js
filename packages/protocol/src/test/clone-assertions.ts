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
// handle pass the very check meant to exclude it. These assertions compare the
// clone's CONTENT against the original instead.
const WASM_POINTER = '__wbg_ptr';

const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, inner: unknown) =>
    typeof inner === 'bigint'
      ? `${inner.toString()}n`
      : inner instanceof Uint8Array
        ? Buffer.from(inner).toString('hex')
        : inner instanceof Map
          ? { __map: Array.from(inner) }
          : inner
  );

/**
 * Asserts `value` is plain data that survives a structured clone with its
 * content intact, and carries no WASM handle at any depth.
 */
export const expectStructuredCloneable = (value: unknown): void => {
  const clone = structuredClone(value);

  expect(canonical(clone)).toBe(canonical(value));
  expect(canonical(value)).not.toContain(WASM_POINTER);
};
