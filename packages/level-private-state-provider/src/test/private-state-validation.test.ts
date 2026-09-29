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

// Imported for its module-load side effect: it registers the Buffer transformer
// that makes a stored Buffer readable again, which the round-trip probe relies on.
import '../level-private-state-provider';

import {
  PRIVATE_STATE_ROOT_PATH,
  PrivateStateSerializationError,
  type PrivateStateSerializationFailure
} from '@midnight-ntwrk/midnight-js-types';
import { Buffer } from 'buffer';
import * as superjson from 'superjson';

import { assertSerializablePrivateState } from '../private-state-validation';

const asSerializationError = (caught: unknown): PrivateStateSerializationError => {
  if (caught instanceof PrivateStateSerializationError) {
    return caught;
  }
  throw new Error(`expected a PrivateStateSerializationError, got ${String(caught)}`);
};

const captureRejection = (state: unknown, stateId?: string): PrivateStateSerializationError => {
  let caught: unknown;
  try {
    assertSerializablePrivateState(state, stateId);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(PrivateStateSerializationError);
  return asSerializationError(caught);
};

const expectRejection = (state: unknown, path: string, reason: PrivateStateSerializationFailure): void => {
  const error = captureRejection(state);
  expect(error.path).toBe(path);
  expect(error.reason).toBe(reason);
  expect(error.message).toContain(path);
};

/** What a value looks like after the exact storage encoding this package uses. */
const roundTrip = (value: unknown): unknown => superjson.parse(superjson.stringify(value));

class Registry {
  constructor(public readonly depth: number) {}

  findPathForLeaf(): number {
    return this.depth;
  }
}

describe('private state serialization validation', () => {
  describe('rejects what storage would not preserve', () => {
    test('a function-valued own property, naming its path', () => {
      expectRejection({ facts: [1, 2], findPathForLeaf: () => 42 }, 'findPathForLeaf', 'function');
    });

    test('a function nested in an object, naming the full path', () => {
      expectRejection({ registry: { depth: 8, findPathForLeaf: () => 42 } }, 'registry.findPathForLeaf', 'function');
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

    test('a function hung off an array beyond its elements', () => {
      const witnesses: unknown[] & { findPathForLeaf?: () => number } = [1, 2];
      witnesses.findPathForLeaf = () => 42;
      expectRejection({ witnesses }, 'witnesses.findPathForLeaf', 'dropped_property');
    });

    test('a property hung off a Map, which storage writes as entries only', () => {
      expectRejection({ byId: Object.assign(new Map([['leaf', 1]]), { note: 'x' }) }, 'byId.note', 'dropped_property');
    });

    test('a property hung off a Set, which storage writes as members only', () => {
      expectRejection({ hooks: Object.assign(new Set([1]), { note: 'x' }) }, 'hooks.note', 'dropped_property');
    });

    test('a non-enumerable own property, which storage never writes', () => {
      const registry = {};
      Object.defineProperty(registry, 'depth', { value: 8, enumerable: false });
      expectRejection({ registry }, 'registry.depth', 'dropped_property');
    });

    test('the private state itself being a function', () => {
      expectRejection(() => 42, PRIVATE_STATE_ROOT_PATH, 'function');
    });

    test('a symbol value', () => {
      expectRejection({ tag: Symbol('leaf') }, 'tag', 'symbol');
    });

    test('a symbol-keyed property on an object', () => {
      expectRejection({ registry: { [Symbol('hidden')]: 1 } }, 'registry', 'symbol_keyed_property');
    });

    test('a symbol-keyed property on an array', () => {
      expectRejection({ witnesses: Object.assign([1, 2], { [Symbol('hidden')]: 1 }) }, 'witnesses', 'symbol_keyed_property');
    });

    test('a class instance, whose prototype methods do not survive', () => {
      expectRejection({ registry: new Registry(8) }, 'registry', 'class_instance');
    });

    test('a subclass of a restored built-in, which is read back as its base type', () => {
      class Leaves extends Map<string, number> {
        deepest(): number {
          return 8;
        }
      }
      expectRejection({ leaves: new Leaves() }, 'leaves', 'class_instance');
    });

    test('an Error, which is read back without its stack or its own properties', () => {
      expectRejection({ lastFailure: new Error('boom') }, 'lastFailure', 'class_instance');
    });

    test('a BigInt64Array, which storage cannot encode at all', () => {
      expectRejection({ leaves: new BigInt64Array([1n]) }, 'leaves', 'class_instance');
    });

    test('an ArrayBuffer, which storage writes as an empty object', () => {
      expectRejection({ secretKey: new ArrayBuffer(8) }, 'secretKey', 'binary_buffer');
    });

    test('a DataView, which storage writes as an empty object', () => {
      expectRejection({ view: new DataView(new ArrayBuffer(8)) }, 'view', 'binary_buffer');
    });

    test('an invalid Date, which storage writes as null', () => {
      expectRejection({ mintedAt: new Date(Number.NaN) }, 'mintedAt', 'invalid_date');
    });

    test('a sparse array, whose holes storage writes as null', () => {
      // eslint-disable-next-line no-sparse-arrays
      expectRejection({ witnesses: [1, , 3] }, 'witnesses', 'sparse_array');
    });

    test('naming the private state being written, when the caller supplies it', () => {
      const error = captureRejection({ findPathForLeaf: () => 42 }, 'merkleRegistry');
      expect(error.privateStateId).toBe('merkleRegistry');
      expect(error.message).toContain('merkleRegistry');
    });
  });

  describe('accepts exactly what storage reads back unchanged', () => {
    const accepted: Record<string, unknown> = {
      string: 'value',
      number: 1,
      boolean: true,
      null: null,
      undefined,
      bigint: 7n,
      nan: Number.NaN,
      infinity: Number.POSITIVE_INFINITY,
      date: new Date('2026-09-25T00:00:00.000Z'),
      regExp: /leaf/g,
      url: new URL('https://midnight.network/'),
      map: new Map<string, bigint>([['leaf', 7n]]),
      set: new Set([1, 2]),
      buffer: Buffer.from([1, 2, 3]),
      uint8Array: new Uint8Array([4, 5, 6]),
      float64Array: new Float64Array([1.5]),
      nested: { deep: [{ leaf: 'value' }] },
      emptyObject: {},
      emptyArray: []
    };

    test.each(Object.keys(accepted))('%s passes validation and survives a round trip', (key) => {
      const value = accepted[key];

      expect(() => assertSerializablePrivateState({ [key]: value })).not.toThrow();
      expect(roundTrip({ [key]: value })).toStrictEqual({ [key]: value });
    });

    test('every accepted member together', () => {
      expect(() => assertSerializablePrivateState(accepted)).not.toThrow();
      expect(roundTrip(accepted)).toStrictEqual(accepted);
    });
  });

  describe('every rejected shape really would have been corrupted', () => {
    const rejected: Record<string, unknown> = {
      arrayBuffer: new ArrayBuffer(8),
      dataView: new DataView(new ArrayBuffer(8)),
      error: Object.assign(new Error('boom'), { code: 'E_LEAF' }),
      classInstance: new Registry(8),
      invalidDate: new Date(Number.NaN),
      // eslint-disable-next-line no-sparse-arrays
      sparseArray: [1, , 3]
    };

    test.each(Object.keys(rejected))('%s is refused, and storage would not have preserved it', (key) => {
      const value = rejected[key];

      expect(() => assertSerializablePrivateState({ [key]: value })).toThrow(PrivateStateSerializationError);
      expect(roundTrip({ [key]: value })).not.toStrictEqual({ [key]: value });
    });

    test('a BigInt64Array is refused, and storage cannot even encode it', () => {
      expect(() => assertSerializablePrivateState({ leaves: new BigInt64Array([1n]) })).toThrow(
        PrivateStateSerializationError
      );
      expect(() => superjson.stringify({ leaves: new BigInt64Array([1n]) })).toThrow();
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
