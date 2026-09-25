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

import { PRIVATE_STATE_ROOT_PATH, PrivateStateSerializationError } from '@midnight-ntwrk/midnight-js-types';
import { Buffer } from 'buffer';

/**
 * Prototypes `superjson` restores to their own type, matched by identity so that a
 * subclass — which it would restore as the base type, without the subclass methods —
 * is refused instead.
 *
 * The typed arrays are the nine `superjson` names; `BigInt64Array` and
 * `BigUint64Array` are absent because it throws on them. `Buffer` is here because
 * this package registers a transformer for it in `level-private-state-provider.ts`;
 * without that registration a stored `Buffer` fails on the way back out.
 *
 * `Array`, `Map`, `Set` and plain objects are restored too, and are handled in the
 * walk rather than here because their members have to be visited.
 */
const RESTORED_PROTOTYPES: ReadonlySet<unknown> = new Set<unknown>([
  Date.prototype,
  RegExp.prototype,
  URL.prototype,
  Int8Array.prototype,
  Uint8Array.prototype,
  Uint8ClampedArray.prototype,
  Int16Array.prototype,
  Uint16Array.prototype,
  Int32Array.prototype,
  Uint32Array.prototype,
  Float32Array.prototype,
  Float64Array.prototype,
  Buffer.prototype
]);

const isArrayIndex = (key: string): boolean => String(Number.parseInt(key, 10)) === key;

const child = (path: string, segment: string): string =>
  path === PRIVATE_STATE_ROOT_PATH ? segment : `${path}${segment.startsWith('[') ? '' : '.'}${segment}`;

/**
 * Rejects own properties storage would not write back: symbol-keyed ones, and, for
 * a value stored as something other than a plain object, anything hung off it
 * beyond what that form carries.
 */
const assertNoDroppedProperties = (
  value: object,
  path: string,
  stateId: string | undefined,
  survives: (key: string, descriptor: PropertyDescriptor) => boolean
): void => {
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new PrivateStateSerializationError(path, 'symbol_keyed_property', stateId);
  }
  for (const key of Object.getOwnPropertyNames(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor !== undefined && !survives(key, descriptor)) {
      throw new PrivateStateSerializationError(child(path, key), 'dropped_property', stateId);
    }
  }
};

const walk = (value: unknown, path: string, stateId: string | undefined, visited: WeakSet<object>): void => {
  if (typeof value === 'function') {
    throw new PrivateStateSerializationError(path, 'function', stateId);
  }
  if (typeof value === 'symbol') {
    throw new PrivateStateSerializationError(path, 'symbol', stateId);
  }
  if (value === null || typeof value !== 'object') {
    return;
  }
  if (visited.has(value)) {
    return;
  }
  visited.add(value);

  if (value instanceof ArrayBuffer || value instanceof DataView) {
    throw new PrivateStateSerializationError(path, 'binary_buffer', stateId);
  }

  const prototype: unknown = Object.getPrototypeOf(value);

  if (RESTORED_PROTOTYPES.has(prototype)) {
    if (value instanceof Date && Number.isNaN(value.valueOf())) {
      throw new PrivateStateSerializationError(path, 'invalid_date', stateId);
    }
    assertNoDroppedProperties(
      value,
      path,
      stateId,
      (key, descriptor) =>
        (ArrayBuffer.isView(value) && isArrayIndex(key)) ||
        (!descriptor.enumerable && typeof descriptor.value !== 'function')
    );
    return;
  }

  if (Array.isArray(value) && prototype === Array.prototype) {
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value)) {
        throw new PrivateStateSerializationError(path, 'sparse_array', stateId);
      }
      walk(value[index], child(path, `[${index}]`), stateId, visited);
    }
    assertNoDroppedProperties(value, path, stateId, (key) => key === 'length' || isArrayIndex(key));
    return;
  }

  if (value instanceof Map && prototype === Map.prototype) {
    let index = 0;
    for (const [key, element] of value.entries()) {
      walk(key, child(path, `[key ${index}]`), stateId, visited);
      walk(element, child(path, `[value ${index}]`), stateId, visited);
      index += 1;
    }
    assertNoDroppedProperties(value, path, stateId, () => false);
    return;
  }

  if (value instanceof Set && prototype === Set.prototype) {
    let index = 0;
    for (const element of value.values()) {
      walk(element, child(path, `[value ${index}]`), stateId, visited);
      index += 1;
    }
    assertNoDroppedProperties(value, path, stateId, () => false);
    return;
  }

  if (prototype !== Object.prototype && prototype !== null) {
    throw new PrivateStateSerializationError(path, 'class_instance', stateId);
  }

  assertNoDroppedProperties(value, path, stateId, (_key, descriptor) => descriptor.enumerable === true);
  for (const [key, element] of Object.entries(value)) {
    walk(element, child(path, key), stateId, visited);
  }
};

/**
 * Asserts that a private state can be stored and read back unchanged, throwing on
 * the first member that cannot, named by its path within the state.
 *
 * This is a runtime gate only. "Survives storage" is a deep structural property of
 * a value, not something a TypeScript type can express, so there is no assertion
 * signature to narrow to.
 *
 * Reporting is deterministic: a state with several offending members always names
 * the same one.
 *
 * @param state The private state about to be serialized.
 * @param privateStateId The state being written, named in the error.
 *
 * @throws {PrivateStateSerializationError} If any part of the state would be
 *                                          dropped, emptied or restored as a
 *                                          different value.
 */
export const assertSerializablePrivateState = (state: unknown, privateStateId?: string): void => {
  walk(state, PRIVATE_STATE_ROOT_PATH, privateStateId, new WeakSet<object>());
};
