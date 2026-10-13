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

import type { RetainedEraHandlers } from '../era-arms';
import { type EraArmShape, type ProviderSeam, UnusableEraArmError } from '../errors';

const IS_USABLE: Readonly<Record<EraArmShape, (arm: unknown) => boolean>> = {
  handler: (arm) => typeof arm === 'function',
  'proving-provider': (arm) =>
    typeof arm === 'object' &&
    arm !== null &&
    'check' in arm &&
    typeof arm.check === 'function' &&
    'prove' in arm &&
    typeof arm.prove === 'function'
};

const withArticle = (noun: string): string => `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`;

const isPlainObject = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

/**
 * Names what a value is for an error message: `null`, `undefined`, `an array`,
 * `an object` for a plain object, `a Map` for a class instance, otherwise its
 * `typeof` with an article.
 */
export const describeValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return 'an array';
  }
  if (typeof value !== 'object' || isPlainObject(value)) {
    return withArticle(typeof value);
  }
  const constructor: unknown = Reflect.get(value, 'constructor');
  return typeof constructor === 'function' && constructor.name !== '' ? withArticle(constructor.name) : 'an object';
};

/** Whether `value` is an object, so its properties can be read. */
export const isObject = (value: unknown): boolean => typeof value === 'object' && value !== null;

const isRetainedEra = (key: string): boolean => RETAINED_LEDGER_VERSIONS.some((era) => era === key);

const assertUsable = (seam: ProviderSeam, era: LedgerVersion, arm: unknown, shape: EraArmShape): void => {
  if (!IS_USABLE[shape](arm)) {
    throw new UnusableEraArmError(seam, era, shape, describeValue(arm));
  }
};

/**
 * @throws InvalidArgumentError if `value` is not a function.
 */
export const assertFunction = (seam: ProviderSeam, name: string, value: unknown): void => {
  if (typeof value !== 'function') {
    throw new InvalidArgumentError(`${seam}: ${name} must be a function, got ${describeValue(value)}.`);
  }
};

const emptyRetainedEras = <H>(): RetainedEraHandlers<H> =>
  Object.freeze(Object.create(null) as RetainedEraHandlers<H>);

/** The era arms a provider factory serves from, read once at construction. */
export interface EraArms<C, H> {
  readonly currentEra: C;
  readonly retainedEras: RetainedEraHandlers<H>;
}

/**
 * Reads and checks the arms handed to a provider factory, once.
 *
 * The provider serves from the returned copy, never from the caller's object,
 * so `supportedEras` and routing always see the same arms. Only own properties
 * of `retainedEras` are read, and the copy has no prototype, so an era
 * inherited from `Object.prototype` is never served.
 *
 * @param seam The provider method the arms serve, used in errors.
 * @param arms The current-era arm and the optional retained-era map.
 * @param shape What every arm must be.
 * @returns The current-era arm and a frozen copy of the retained arms supplied.
 * @throws InvalidArgumentError if `arms` is not an object, or `retainedEras` is
 *         given but is not a plain object keyed only by retained eras.
 * @throws UnusableEraArmError if the current-era arm, or a retained-era entry
 *         other than `undefined`, is not `shape`.
 */
export const readEraArms = <C, H>(
  seam: ProviderSeam,
  arms: { readonly currentEra: C; readonly retainedEras?: RetainedEraHandlers<H> },
  shape: EraArmShape
): EraArms<C, H> => {
  if (!isObject(arms)) {
    throw new InvalidArgumentError(`${seam}: the era arms must be an object, got ${describeValue(arms)}.`);
  }
  const { currentEra, retainedEras } = arms;
  assertUsable(seam, CURRENT_LEDGER_VERSION, currentEra, shape);
  if (retainedEras === undefined) {
    return { currentEra, retainedEras: emptyRetainedEras() };
  }
  if (!isPlainObject(retainedEras)) {
    throw new InvalidArgumentError(
      `${seam}: retainedEras must be a plain object keyed by retained era (${RETAINED_LEDGER_VERSIONS.join(', ')}), got ${describeValue(retainedEras)}.`
    );
  }
  const unknownKeys = Object.keys(retainedEras).filter((key) => !isRetainedEra(key));
  if (unknownKeys.length > 0) {
    throw new InvalidArgumentError(
      `${seam}: retainedEras has keys that are not retained eras: ${unknownKeys.join(', ')}. ` +
        `Expected only ${RETAINED_LEDGER_VERSIONS.join(', ')}.`
    );
  }
  const copy = Object.create(null) as Partial<Record<RetainedLedgerVersion, H>>;
  for (const era of RETAINED_LEDGER_VERSIONS) {
    const arm = Object.hasOwn(retainedEras, era) ? retainedEras[era] : undefined;
    if (arm !== undefined) {
      assertUsable(seam, era, arm, shape);
      copy[era] = arm;
    }
  }
  return { currentEra, retainedEras: Object.freeze(copy) };
};
