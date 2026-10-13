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

const describeValue = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }
  return Array.isArray(value) ? 'an array' : typeof value;
};

const isEraKeyedMap = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isRetainedEra = (key: string): boolean => RETAINED_LEDGER_VERSIONS.some((era) => era === key);

const assertUsable = (seam: ProviderSeam, era: LedgerVersion, arm: unknown, shape: EraArmShape): void => {
  if (!IS_USABLE[shape](arm)) {
    throw new UnusableEraArmError(seam, era, shape, describeValue(arm));
  }
};

/** The era arms a provider factory serves from, read once at construction. */
export interface EraArms<C, H> {
  readonly currentEra: C;
  readonly retainedEras: RetainedEraHandlers<H>;
}

/**
 * Reads and checks the arms handed to a provider factory, once.
 *
 * The provider serves from the returned copy, never from the caller's object,
 * so `supportedEras` and the routing are derived from the same arms and a
 * later change to the caller's map cannot make them disagree.
 *
 * @param seam The provider method the arms serve, used in errors.
 * @param arms The current-era arm and the optional retained-era map.
 * @param shape What every arm must be.
 * @returns The current-era arm and a frozen copy of the retained arms supplied.
 * @throws UnusableEraArmError if the current-era arm, or a retained-era entry
 *         other than `undefined`, is not `shape`.
 * @throws InvalidArgumentError if `retainedEras` is given but is not an object
 *         keyed only by retained eras.
 */
export const readEraArms = <C, H>(
  seam: ProviderSeam,
  arms: { readonly currentEra: C; readonly retainedEras?: RetainedEraHandlers<H> },
  shape: EraArmShape
): EraArms<C, H> => {
  const { currentEra, retainedEras } = arms;
  assertUsable(seam, CURRENT_LEDGER_VERSION, currentEra, shape);
  if (retainedEras === undefined) {
    return { currentEra, retainedEras: Object.freeze({}) };
  }
  if (!isEraKeyedMap(retainedEras)) {
    throw new InvalidArgumentError(
      `${seam}: retainedEras must be an object keyed by retained era (${RETAINED_LEDGER_VERSIONS.join(', ')}), got ${describeValue(retainedEras)}.`
    );
  }
  const unknownKeys = Object.keys(retainedEras).filter((key) => !isRetainedEra(key));
  if (unknownKeys.length > 0) {
    throw new InvalidArgumentError(
      `${seam}: retainedEras has keys that are not retained eras: ${unknownKeys.join(', ')}. ` +
        `Expected only ${RETAINED_LEDGER_VERSIONS.join(', ')}.`
    );
  }
  const copy: Partial<Record<RetainedLedgerVersion, H>> = {};
  for (const era of RETAINED_LEDGER_VERSIONS) {
    const arm = retainedEras[era];
    if (arm !== undefined) {
      assertUsable(seam, era, arm, shape);
      copy[era] = arm;
    }
  }
  return { currentEra, retainedEras: Object.freeze(copy) };
};
