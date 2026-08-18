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

const isObjectLike = (value: unknown): value is object =>
  (typeof value === 'object' && value !== null) || typeof value === 'function';

const constructorName = (value: object): string | undefined => {
  if (!('constructor' in value)) {
    return undefined;
  }
  const ctor = value.constructor;
  return typeof ctor === 'function' ? ctor.name : undefined;
};

// Deliberately never JSON.stringify()s the value: that throws on BigInt and
// on circular references (losing the unreachable-branch context entirely),
// and would otherwise happily serialize an arbitrary object's contents
// (including sensitive fields) straight into an error message/log. Objects
// render only as their constructor name; primitives render via String().
const describeUnreachableValue = (value: unknown): string => {
  try {
    if (isObjectLike(value)) {
      return `[object ${constructorName(value) ?? 'Object'}]`;
    }
    return String(value);
  } catch {
    return '<unstringifiable>';
  }
};

/**
 * Runtime backstop for exhaustiveness checks: call this in the `default`/
 * `else` branch of a switch or if-chain over a closed union so that adding a
 * new union member without handling it becomes a compile error (the branch
 * would no longer receive `never`) — and, if it's ever reached anyway (e.g.
 * via an unchecked external input at a type boundary), throws immediately
 * with a message identifying where and what.
 */
export const assertNever = (value: never, context: string): never => {
  throw new Error(`assertNever: unreachable branch reached in ${context} (value: ${describeUnreachableValue(value)})`);
};
