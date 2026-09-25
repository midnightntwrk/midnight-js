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

import {
  PrivateStateSerializationError,
  type PrivateStateSerializationFailure
} from '@midnight-ntwrk/midnight-js-types';
import { Buffer } from 'buffer';

import { assertSerializablePrivateState } from '../private-state-validation';

const captureRejection = (state: unknown): PrivateStateSerializationError => {
  let caught: unknown;
  try {
    assertSerializablePrivateState(state);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(PrivateStateSerializationError);
  return caught as PrivateStateSerializationError;
};

const expectRejection = (
  state: unknown,
  path: string,
  reason: PrivateStateSerializationFailure
): void => {
  const error = captureRejection(state);
  expect(error.path).toBe(path);
  expect(error.reason).toBe(reason);
  expect(error.message).toContain(path);
};

class Registry {
  constructor(public readonly depth: number) {}

  findPathForLeaf(): number {
    return this.depth;
  }
}

describe('private state serialization validation', () => {
  describe('rejects values superjson drops', () => {
    test('a function-valued own property, naming its path', () => {
      expectRejection({ facts: [1, 2], findPathForLeaf: () => 42 }, 'findPathForLeaf', 'function');
    });

    test('a function nested in an object, naming the full path', () => {
      expectRejection(
        { registry: { depth: 8, findPathForLeaf: () => 42 } },
        'registry.findPathForLeaf',
        'function'
      );
    });

    test('a function nested in an array, naming the index', () => {
      expectRejection({ witnesses: [null, () => 42] }, 'witnesses[1]', 'function');
    });

    test('a function held as a Map value, naming the entry', () => {
      expectRejection({ byId: new Map([['leaf', () => 42]]) }, 'byId[value 0]', 'function');
    });

    test('a function held as a Set member, naming the entry', () => {
      expectRejection({ hooks: new Set([() => 42]) }, 'hooks[value 0]', 'function');
    });

    test('the private state itself being a function', () => {
      expectRejection(() => 42, '<root>', 'function');
    });

    test('a symbol value', () => {
      expectRejection({ tag: Symbol('leaf') }, 'tag', 'symbol');
    });

    test('a symbol-keyed property', () => {
      expectRejection({ registry: { [Symbol('hidden')]: 1 } }, 'registry', 'symbol_keyed_property');
    });

    test('a class instance, whose prototype methods do not survive', () => {
      expectRejection({ registry: new Registry(8) }, 'registry', 'class_instance');
    });
  });

  describe('accepts what superjson round-trips', () => {
    const roundTrips = {
      date: new Date('2026-09-25T00:00:00.000Z'),
      map: new Map<string, unknown>([['a', 1n]]),
      set: new Set([1, 2]),
      bigint: 7n,
      undefinedValue: undefined,
      buffer: Buffer.from([1, 2, 3]),
      typedArray: new Uint8Array([4, 5, 6]),
      nested: { deep: [{ leaf: 'value' }] },
      nullValue: null,
      objectWithNullPrototype: Object.assign(Object.create(null), { a: 1 })
    };

    test('every supported member passes validation', () => {
      expect(() => assertSerializablePrivateState(roundTrips)).not.toThrow();
    });
  });

  describe('walk mechanics', () => {
    test('a cycle in otherwise valid data terminates', () => {
      const cyclic: Record<string, unknown> = { depth: 8 };
      cyclic.self = cyclic;
      expect(() => assertSerializablePrivateState(cyclic)).not.toThrow();
    });

    test('a function reached through a cycle is still rejected', () => {
      const cyclic: Record<string, unknown> = { findPathForLeaf: () => 42 };
      cyclic.self = cyclic;
      expect(captureRejection(cyclic).reason).toBe('function');
    });

    test('the reported path is the same across repeated runs', () => {
      const state = {
        alpha: { findPathForLeaf: () => 1 },
        beta: { alsoAFunction: () => 2 }
      };
      const paths = [captureRejection(state).path, captureRejection(state).path];
      expect(paths).toEqual(['alpha.findPathForLeaf', 'alpha.findPathForLeaf']);
    });
  });
});
