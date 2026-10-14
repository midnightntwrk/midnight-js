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
import {
  CURRENT_LEDGER_VERSION,
  type LedgerVersion,
  RETAINED_LEDGER_VERSIONS,
  type RetainedLedgerVersion
} from '@midnight-ntwrk/midnight-js-protocol/version';

import type { RetainedEraEntries } from '../era-entries';
import { type EraEntryShape, type ProviderSeam, UnusableEraEntryError } from '../errors';

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

const isRetainedEra = (key: string | symbol): boolean => RETAINED_LEDGER_VERSIONS.some((era) => era === key);

const assertUsable = (seam: ProviderSeam, era: LedgerVersion, entry: unknown, shape: EraEntryShape): void => {
  if (!IS_USABLE[shape](entry)) {
    throw new UnusableEraEntryError(seam, era, shape, describeEntry(entry, shape));
  }
};

/**
 * @throws InvalidArgumentError if `value` is not a callable function.
 */
export const assertFunction = (seam: ProviderSeam, name: string, value: unknown): void => {
  if (!isCallable(value)) {
    throw new InvalidArgumentError(`${seam}: ${name} must be a function, got ${describeArgument(value)}.`);
  }
};

/** The era entries a provider factory serves from, read once at construction. */
export interface EraEntries<C, H> {
  readonly currentEra: C;
  readonly retainedEras: RetainedEraEntries<H>;
}

/**
 * Reads and checks the entries handed to a provider factory, once.
 *
 * The provider serves from the returned copy, never from the caller's object,
 * so `supportedEras` and routing always see the same entries. Only own properties
 * of `retainedEras` are read, and the copy has no prototype, so an era
 * inherited from `Object.prototype` is never served.
 *
 * @param seam The provider method the entries serve, used in errors.
 * @param entries The current-era entry and the optional retained-era map.
 * @param shape What every entry must be.
 * @returns The current-era entry and a frozen copy of the retained entries supplied.
 * @throws InvalidArgumentError if `entries` is not an object, or `retainedEras` is
 *         given but is not a plain object whose own keys are all retained eras.
 * @throws UnusableEraEntryError if the current-era entry, or a retained-era entry
 *         other than `undefined`, is not `shape`.
 */
export const readEraEntries = <C, H>(
  seam: ProviderSeam,
  entries: { readonly currentEra: C; readonly retainedEras?: RetainedEraEntries<H> },
  shape: EraEntryShape
): EraEntries<C, H> => {
  if (!isObject(entries)) {
    throw new InvalidArgumentError(`${seam}: expected an object with currentEra and an optional retainedEras, got ${describeArgument(entries)}.`);
  }
  const { currentEra, retainedEras } = entries;
  assertUsable(seam, CURRENT_LEDGER_VERSION, currentEra, shape);
  if (retainedEras !== undefined && !isPlainObject(retainedEras)) {
    throw new InvalidArgumentError(
      `${seam}: retainedEras must be a plain object keyed by retained era (${RETAINED_LEDGER_VERSIONS.join(', ')}), got ${describeArgument(retainedEras)}.`
    );
  }
  const unknownKeys = retainedEras === undefined ? [] : Reflect.ownKeys(retainedEras).filter((key) => !isRetainedEra(key));
  if (unknownKeys.length > 0) {
    throw new InvalidArgumentError(
      `${seam}: retainedEras has keys that are not retained eras: ${unknownKeys.map(String).join(', ')}. ` +
        `Expected only ${RETAINED_LEDGER_VERSIONS.join(', ')}.`
    );
  }
  const copy = Object.create(null) as Partial<Record<RetainedLedgerVersion, H>>;
  for (const era of RETAINED_LEDGER_VERSIONS) {
    const entry = retainedEras !== undefined && Object.hasOwn(retainedEras, era) ? retainedEras[era] : undefined;
    if (entry !== undefined) {
      assertUsable(seam, era, entry, shape);
      copy[era] = entry;
    }
  }
  return { currentEra, retainedEras: Object.freeze(copy) };
};
