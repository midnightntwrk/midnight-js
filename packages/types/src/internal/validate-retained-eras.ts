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

import { RETAINED_LEDGER_VERSIONS } from '@midnight-ntwrk/midnight-js-protocol/version';

import type { RetainedEraHandlers } from '../era-arms';
import { type ProviderSeam, UnusableEraArmError } from '../errors';

/**
 * Asserts that each retained era arm supplied to a provider factory is usable.
 *
 * An entry present but `undefined` leaves the era unserved, which is valid.
 * Any other non-usable value (null, objects missing required methods, non-functions)
 * is refused at construction so `supportedEras` does not over-claim.
 *
 * @param seam The provider method where the retained era was registered.
 * @param retainedEras The retained arms supplied to the factory, if any.
 * @param isValid Predicate checking whether an entry is usable. Defaults to checking if it is a function.
 * @param expected Description of what is expected, used in error message if invalid.
 * @throws UnusableEraArmError if an entry is defined but not usable.
 */
export const assertValidRetainedEras = <H>(
  seam: ProviderSeam,
  retainedEras: RetainedEraHandlers<H> | undefined,
  isValid: (entry: unknown) => boolean = (entry): boolean => typeof entry === 'function',
  expected = 'expected a function'
): void => {
  if (retainedEras === undefined || retainedEras === null) {
    return;
  }
  for (const era of RETAINED_LEDGER_VERSIONS) {
    const entry = retainedEras[era];
    if (entry !== undefined && !isValid(entry)) {
      const got = entry === null ? 'null' : Array.isArray(entry) ? 'an array' : typeof entry;
      throw new UnusableEraArmError(seam, era, `${expected}, got ${got}`);
    }
  }
};
