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

import { InvalidArgumentError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { LEDGER_VERSIONS, type LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';

import { type EraEntryShape, type TransactionMethod, UnusableEraEntryError } from '../errors';

const PROVING_PROVIDER_METHODS = ['check', 'prove'] as const;

// A class constructor and a revoked function proxy both pass `typeof` but
// throw when called. Reading the prototype is what throws on a revoked proxy.
const functionKind = (value: CallableFunction): 'function' | 'class' | 'revoked' => {
  try {
    Reflect.getPrototypeOf(value);
  } catch {
    return 'revoked';
  }
  return /^class\b/.test(Function.prototype.toString.call(value)) ? 'class' : 'function';
};

const isCallable = (value: unknown): boolean => typeof value === 'function' && functionKind(value) === 'function';

const missingProvingProviderMethods = (entry: object): readonly string[] =>
  PROVING_PROVIDER_METHODS.filter((method) => !isCallable(Reflect.get(entry, method)));

const IS_USABLE: Readonly<Record<EraEntryShape, (entry: unknown) => boolean>> = {
  handler: isCallable,
  'proving-provider': (entry) => {
    if (typeof entry !== 'object' || entry === null) {
      return false;
    }
    try {
      return missingProvingProviderMethods(entry).length === 0;
    } catch {
      return false;
    }
  }
};

// A prototype whose own prototype is null is `Object.prototype`, of this realm
// or another one.
const isPlainObject = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  try {
    const prototype: unknown = Object.getPrototypeOf(value);
    return prototype === null || Object.getPrototypeOf(prototype) === null;
  } catch {
    return false;
  }
};

const describeObject = (value: object): string => {
  if (Array.isArray(value)) {
    return 'an array';
  }
  if (isPlainObject(value)) {
    return 'an object';
  }
  const constructor: unknown = Reflect.get(value, 'constructor');
  const name: unknown = typeof constructor === 'function' ? Reflect.get(constructor, 'name') : undefined;
  return typeof name === 'string' && name !== '' ? `an instance of ${name}` : 'an object';
};

/**
 * Names what a value is for an error message. Never throws: a value whose
 * getters or proxy traps throw is described as `an object`.
 *
 * @returns `null`, `undefined`, `a class`, `a function`, `a function that
 *          cannot be called`, `an array`, `an object`, `an instance of <Class>`,
 *          or the `typeof` with an article (`a string`).
 */
export const describeArgument = (value: unknown): string => {
  switch (typeof value) {
    case 'undefined':
      return 'undefined';
    case 'function':
      return { function: 'a function', class: 'a class', revoked: 'a function that cannot be called' }[
        functionKind(value)
      ];
    case 'object':
      if (value === null) {
        return 'null';
      }
      try {
        return describeObject(value);
      } catch {
        return 'an object';
      }
    case 'string':
      return 'a string';
    case 'number':
      return 'a number';
    case 'bigint':
      return 'a bigint';
    case 'boolean':
      return 'a boolean';
    case 'symbol':
      return 'a symbol';
  }
};

const describeEntry = (entry: unknown, shape: EraEntryShape): string => {
  const described = describeArgument(entry);
  if (shape !== 'proving-provider' || typeof entry !== 'object' || entry === null || described === 'an array') {
    return described;
  }
  try {
    const missing = missingProvingProviderMethods(entry);
    return `${described} without callable ${missing.map((method) => `'${method}'`).join(' and ')}`;
  } catch {
    return described;
  }
};

/** Whether `value` is a non-null object; a function does not count. */
export const isObject = (value: unknown): boolean => typeof value === 'object' && value !== null;

const assertUsable = (method: TransactionMethod, era: LedgerVersion, entry: unknown, shape: EraEntryShape): void => {
  if (!IS_USABLE[shape](entry)) {
    throw new UnusableEraEntryError(method, era, shape, describeEntry(entry, shape));
  }
};

/**
 * @throws InvalidArgumentError if `value` is not a callable function.
 */
export const assertFunction = (method: TransactionMethod, name: string, value: unknown): void => {
  if (!isCallable(value)) {
    throw new InvalidArgumentError(`${method}: ${name} must be a function, got ${describeArgument(value)}.`);
  }
};

/** One entry per ledger era, `undefined` for an era that is not served. */
export type EraEntries<T extends Readonly<Record<LedgerVersion, unknown>>> = { readonly [E in LedgerVersion]: T[E] };

// An era counts as given when it is found on the object or on a prototype of
// its own, such as a class. An era reached only through `Object.prototype` is
// not given: it was not written by the caller.
const isGiven = (entries: object, era: LedgerVersion): boolean => {
  for (let owner: object | null = entries; owner !== null; owner = Reflect.getPrototypeOf(owner)) {
    if (Object.hasOwn(owner, era)) {
      return owner === entries || Reflect.getPrototypeOf(owner) !== null;
    }
  }
  return false;
};

const missingEras = (method: TransactionMethod, entries: object): readonly LedgerVersion[] => {
  try {
    return LEDGER_VERSIONS.filter((era) => !isGiven(entries, era));
  } catch (error: unknown) {
    throw new InvalidArgumentError(`${method}: the era entries could not be read.`, { cause: error });
  }
};

/**
 * Reads and checks the per-era entries handed to a provider factory, once.
 *
 * The provider serves from the returned copy, never from the caller's object,
 * so `supportedEras` and routing always see the same entries.
 *
 * @param method The provider method the entries serve, used in errors.
 * @param entries One entry per ledger era.
 * @param shape What every entry other than `undefined` must be.
 * @returns A frozen copy of the entries.
 * @throws InvalidArgumentError if `entries` is not an object, cannot be read,
 *         or has no key for a ledger era.
 * @throws UnusableEraEntryError if an entry is neither `undefined` nor `shape`.
 */
export const readEraEntries = <T extends Readonly<Record<LedgerVersion, unknown>>>(
  method: TransactionMethod,
  entries: T,
  shape: EraEntryShape
): EraEntries<T> => {
  if (!isObject(entries)) {
    throw new InvalidArgumentError(
      `${method}: expected an object with an entry for every ledger era (${LEDGER_VERSIONS.join(', ')}), got ${describeArgument(entries)}.`
    );
  }
  const missing = missingEras(method, entries);
  if (missing.length > 0) {
    throw new InvalidArgumentError(
      `${method}: the era entries are missing ${missing.join(', ')}. ` +
        `Give every ledger era (${LEDGER_VERSIONS.join(', ')}) an entry, and set an era this provider does not serve to undefined.`
    );
  }
  const copy: EraEntries<T> = Object.freeze({ v8: entries.v8, v9: entries.v9 });
  for (const era of LEDGER_VERSIONS) {
    const entry = copy[era];
    if (entry !== undefined) {
      assertUsable(method, era, entry, shape);
    }
  }
  return copy;
};
