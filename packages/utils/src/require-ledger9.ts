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

const describeEraTag = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }
  if (typeof value !== 'object' || !('version' in value)) {
    return 'undefined';
  }
  return String(value.version);
};

/**
 * Raised by {@link requireLedger9} when the value carries no era tag this build recognises: `null`,
 * a value with no `version`, or an era newer than this build.
 */
export class UnrecognisedEraTagError extends MidnightJsError {
  readonly code = UTILS_ERROR_CODES.UNRECOGNISED_ERA_TAG;
  readonly category = UTILS_ERROR_CATEGORIES[UTILS_ERROR_CODES.UNRECOGNISED_ERA_TAG];

  /** What the value's `version` held, or `'null'` / `'undefined'` when there was none. */
  readonly received: string;

  /**
   * @param context Names the call site that handles only v9 values.
   * @param value The offending value. Only its `version` is read.
   */
  constructor(
    readonly context: string,
    value: unknown
  ) {
    const received = describeEraTag(value);
    super(
      `${context} expects a value tagged with a ledger era (version: 'v8' | 'v9'), but received version: ${received}. ` +
        `A value with no era tag has the shape of a pre-5.0.0 provider; an unknown era means this midnight-js ` +
        `is older than the network or the provider that produced the value.`
    );
    this.name = 'UnrecognisedEraTagError';
    this.received = received;
  }
}


/** The v9 variant of a version-tagged union. */
export type Ledger9Variant<T> = Extract<T, { readonly version: 'v9' }>;

/** `T` itself when it has a v9 variant to narrow to, `never` when it does not. */
type WithLedger9Variant<T> = [Ledger9Variant<T>] extends [never] ? never : T;

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
 * @throws UnrecognisedEraTagError if the value is `null`, has no `version`, or carries an era this
 *   build does not know.
 *
 * @example
 * ```ts
 * const { state } = requireLedger9(await publicDataProvider.watchForContractState(address), 'readCounter');
 * ```
 */
export const requireLedger9 = <T extends { readonly version: LedgerVersion }>(
  value: WithLedger9Variant<T>,
  context: string
): Ledger9Variant<T> => {
  if (typeof value !== 'object' || value === null) {
    throw new UnrecognisedEraTagError(context, value);
  }
  if (isLedger9<T>(value)) {
    return value;
  }
  if (value.version === 'v8') {
    throw new Ledger8ValueUnsupportedError(context);
  }
  throw new UnrecognisedEraTagError(context, value);
};
