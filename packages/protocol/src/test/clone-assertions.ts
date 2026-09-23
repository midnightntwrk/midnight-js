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

// A WASM handle survives `structuredClone` without throwing: the clone is
// `{ __wbg_ptr: <number> }` and every member is gone. So "did not throw" is
// not evidence the value crossed the boundary intact, and asserting it lets a
// handle pass the very check meant to exclude it.
//
// Comparing the clone's content against the original's cannot tell a handle
// apart either, and that is not a shortcoming of any particular comparison: a
// wasm-bindgen instance's real fields live behind PROTOTYPE getters, its only
// own property is `__wbg_ptr`, and a content comparison necessarily reads the
// same properties from both sides. It compares a value with its own clone, so
// any regression that changes one changes the other identically. The rejection
// of a handle is therefore done entirely by `findWasmPointer` below, which
// walks the value's own structure for an object whose own properties include
// `__wbg_ptr`.
const WASM_POINTER = '__wbg_ptr';

type PathedEntry = readonly [path: string, entry: unknown];

const childEntries = (value: object, path: string): readonly PathedEntry[] => {
  if (Array.isArray(value)) {
    return value.map((entry, index): PathedEntry => [`${path}[${index}]`, entry]);
  }
  if (value instanceof Map) {
    return Array.from(value).flatMap(([key, entry], index): PathedEntry[] => [
      [`${path}<map key ${index}>`, key],
      [`${path}<map value ${index}>`, entry]
    ]);
  }
  // `Object.entries(new Set([handle]))` is `[]`, so a `Set` left to the catch-all below would hide
  // every member it holds. Enumerated explicitly, exactly as `Map` is.
  if (value instanceof Set) {
    return Array.from(value).map((entry, index): PathedEntry => [`${path}<set entry ${index}>`, entry]);
  }
  // Own ENUMERABLE properties only -- see the limits listed on `expectStructuredCloneable`.
  return Object.entries(value).map(([key, entry]): PathedEntry => [`${path}.${key}`, entry]);
};

const findWasmPointer = (value: unknown, path: string, seen: WeakSet<object>): string | undefined => {
  if (value === null || typeof value !== 'object' || seen.has(value)) {
    return undefined;
  }
  seen.add(value);

  if (Object.prototype.hasOwnProperty.call(value, WASM_POINTER)) {
    return path;
  }
  if (value instanceof Uint8Array) {
    return undefined;
  }

  for (const [entryPath, entry] of childEntries(value, path)) {
    const found = findWasmPointer(entry, entryPath, seen);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
};

/**
 * Asserts that `value` is an object which carries no WASM handle at any depth and which
 * `structuredClone` accepts.
 *
 * Precisely what is checked, and what is NOT:
 *
 * - The handle walk is the real line of defence, and it reads only OWN ENUMERABLE properties
 *   (plus `Map`/`Set` members and array elements). A handle hidden behind a non-enumerable own
 *   property, or behind a prototype getter -- which is the shape a wasm-bindgen instance's own
 *   fields take -- is NOT seen. Closing that fully is not practical; the values guarded here are
 *   decoded plain objects, whose members are ordinary own enumerable properties.
 * - `structuredClone` is called for its own throw, which is genuine detection of a value that
 *   truly cannot cross a boundary (a function, a live proxy). It is NOT evidence that content
 *   survived: a handle clones without complaint.
 * - Content is not compared at all. See the note at the top of this file for why such a
 *   comparison cannot catch anything here.
 * - A non-object is rejected up front, so `expectStructuredCloneable(undefined)` fails instead of
 *   passing vacuously.
 *
 * @throws Error naming the path it found a handle at, or the non-object it was handed.
 * @throws DOMException raised by `structuredClone` itself, for a value that truly cannot be cloned.
 */
export const expectStructuredCloneable = (value: unknown): void => {
  if (value === null || typeof value !== 'object') {
    throw new Error(
      `expectStructuredCloneable: expected an object to inspect, got ${value === null ? 'null' : typeof value}`
    );
  }

  // Before the clone, so a value that is both leaky and awkward to clone is reported as the leak
  // it is rather than as an opaque clone failure.
  const leaked = findWasmPointer(value, 'value', new WeakSet());
  if (leaked !== undefined) {
    throw new Error(`expectStructuredCloneable: value carries a WASM handle (own \`${WASM_POINTER}\`) at ${leaked}`);
  }

  structuredClone(value);
};
