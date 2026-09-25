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

import { PrivateStateSerializationError } from '@midnight-ntwrk/midnight-js-types';

const ROOT_PATH = '<root>';

/**
 * Types `superjson` restores to their own class, plus the `Buffer` this package
 * registers a transformer for. Everything else carrying a prototype is stored as
 * a plain object, losing its methods.
 */
const RESTORED_CLASSES = [Date, RegExp, URL, Error] as const;

const isRestoredClass = (value: object): boolean =>
  ArrayBuffer.isView(value) ||
  value instanceof ArrayBuffer ||
  RESTORED_CLASSES.some((restored) => value instanceof restored);

const hasPlainPrototype = (value: object): boolean => {
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
};

const walk = (value: unknown, path: string, visited: WeakSet<object>): void => {
  if (typeof value === 'function') {
    throw new PrivateStateSerializationError(path, 'function');
  }
  if (typeof value === 'symbol') {
    throw new PrivateStateSerializationError(path, 'symbol');
  }
  if (value === null || typeof value !== 'object') {
    return;
  }
  if (visited.has(value)) {
    return;
  }
  visited.add(value);

  if (isRestoredClass(value)) {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((element, index) => walk(element, `${path}[${index}]`, visited));
    return;
  }
  if (value instanceof Map) {
    let index = 0;
    for (const [key, element] of value.entries()) {
      walk(key, `${path}[key ${index}]`, visited);
      walk(element, `${path}[value ${index}]`, visited);
      index += 1;
    }
    return;
  }
  if (value instanceof Set) {
    let index = 0;
    for (const element of value.values()) {
      walk(element, `${path}[value ${index}]`, visited);
      index += 1;
    }
    return;
  }
  if (!hasPlainPrototype(value)) {
    throw new PrivateStateSerializationError(path, 'class_instance');
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new PrivateStateSerializationError(path, 'symbol_keyed_property');
  }
  for (const [key, element] of Object.entries(value)) {
    walk(element, path === ROOT_PATH ? key : `${path}.${key}`, visited);
  }
};

/**
 * Asserts that a private state can be stored and read back unchanged, throwing
 * on the first member that cannot, named by its path within the state.
 *
 * Members are visited in declaration order, so a state with several offending
 * members always reports the same one.
 *
 * @param state The private state about to be serialized.
 *
 * @throws {PrivateStateSerializationError} If any member is a function, a symbol,
 *                                          a symbol-keyed property, or a class
 *                                          instance other than one storage
 *                                          restores.
 */
export const assertSerializablePrivateState = (state: unknown): void => {
  walk(state, ROOT_PATH, new WeakSet<object>());
};
