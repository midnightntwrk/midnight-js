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

import { MidnightJsError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';

import { UnhandledUnionMemberError } from './assertion-utils';
import { UTILS_ERROR_CATEGORIES, UTILS_ERROR_CODES } from './error-codes';

/**
 * Raised by {@link requireLedger9} when the value was written by the v8 ledger.
 */
export class Ledger8ValueUnsupportedError extends MidnightJsError {
  readonly code = UTILS_ERROR_CODES.LEDGER8_VALUE_UNSUPPORTED;
  readonly category = UTILS_ERROR_CATEGORIES[UTILS_ERROR_CODES.LEDGER8_VALUE_UNSUPPORTED];

  /**
   * @param context Names the call site that handles only v9 values.
   */
  constructor(readonly context: string) {
    super(
      `${context} handles only values written by the v9 ledger, but received one written by the v8 ledger ` +
        `(version: 'v8'). This happens for a state read before the hard fork, or on a network that has not forked yet. ` +
        `To handle both eras, switch on 'version' and close the switch with assertNever.`
    );
    this.name = 'Ledger8ValueUnsupportedError';
  }
}

/** The v9 variant of a version-tagged union. */
export type Ledger9Variant<T> = Extract<T, { readonly version: 'v9' }>;

const isLedger9 = <T extends { readonly version: LedgerVersion }>(value: T): value is Ledger9Variant<T> =>
  value.version === 'v9';

/**
 * Narrows any version-tagged union (`VersionedContractState`, `VersionedFinalizedTxData`, …)
 * to its v9 variant, for code that handles only the v9 era.
 *
 * Code that handles both eras should `switch (value.version)` and close the switch with
 * {@link assertNever} instead.
 *
 * @param value The version-tagged value.
 * @param context Names the call site, so the error says where it came from.
 * @returns The whole v9 variant.
 * @throws Ledger8ValueUnsupportedError if the value was written by the v8 ledger.
 * @throws UnhandledUnionMemberError if the value carries an era this build does not know.
 *
 * @example
 * ```ts
 * const { state } = requireLedger9(await publicDataProvider.watchForContractState(address), 'readCounter');
 * ```
 */
export const requireLedger9 = <T extends { readonly version: LedgerVersion }>(
  value: T,
  context: string
): Ledger9Variant<T> => {
  if (isLedger9(value)) {
    return value;
  }
  if (value.version === 'v8') {
    throw new Ledger8ValueUnsupportedError(context);
  }
  throw new UnhandledUnionMemberError(context);
};
