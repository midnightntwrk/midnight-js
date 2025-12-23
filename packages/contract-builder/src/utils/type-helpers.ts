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
 * Type helper utilities for the Contract Adapter
 */

/**
 * Checks if a value is a function
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function isFunction(value: any): value is Function {
  return typeof value === 'function';
}

/**
 * Checks if a value is an object (excluding null and arrays)
 */
export function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Checks if a value is a Promise
 */
export function isPromise(value: any): value is Promise<any> {
  return value instanceof Promise || (isObject(value) && isFunction(value.then));
}

/**
 * Safe JSON stringify that handles circular references
 */
export function safeStringify(obj: any): string {
  const seen = new WeakSet();

  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  });
}
