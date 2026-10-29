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

import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';
import { describe, expect, test } from 'vitest';

import { hasErrorCode, UTILS_ERROR_CODES } from '../error-codes';
import { Ledger8ValueUnsupportedError, requireLedger9, UnrecognisedEraTagError } from '../require-ledger9';

interface Ledger8Sample {
  readonly era: 'v8';
  readonly stateBytes: Uint8Array;
}

interface Ledger9Sample {
  readonly era: 'v9';
  readonly state: number;
}

type EraTaggedSample = Ledger8Sample | Ledger9Sample;

const served = (value: EraTaggedSample): EraTaggedSample => value;

const catchError = (act: () => unknown): unknown => {
  try {
    act();
  } catch (error) {
    return error;
  }
  throw new Error('expected the call to throw');
};

describe('requireLedger9', () => {
  test('returns the whole v9 variant, narrowed to its type', () => {
    // Arrange.
    const value: EraTaggedSample = { era: 'v9', state: 7 };

    // Act.
    const narrowed: Ledger9Sample = requireLedger9(value, 'getPublicStates');

    // Assert.
    expect(narrowed).toBe(value);
    // @ts-expect-error the v8 field is gone after narrowing
    expect(narrowed.stateBytes).toBeUndefined();
  });

  test('refuses a v8 value with a coded error that names the call site', () => {
    // Arrange.
    const value = served({ era: 'v8', stateBytes: new Uint8Array([1, 2, 3]) });

    // Act.
    const thrown = catchError(() => requireLedger9(value, 'getPublicStates'));

    // Assert.
    expect(thrown).toBeInstanceOf(Ledger8ValueUnsupportedError);
    expect(hasErrorCode(thrown, UTILS_ERROR_CODES.LEDGER8_VALUE_UNSUPPORTED)).toBe(true);
    expect(thrown).toHaveProperty('context', 'getPublicStates');
    expect(thrown).toHaveProperty('category', 'USAGE');
  });

  test('refuses an era the build does not know with a coded error that names what it received', () => {
    // Arrange.
    const grown = { era: 'v10', state: 1 };

    // Act.
    const thrown = catchError(() => requireLedger9(grown as never, 'getPublicStates'));

    // Assert.
    expect(thrown).toBeInstanceOf(UnrecognisedEraTagError);
    expect(hasErrorCode(thrown, UTILS_ERROR_CODES.UNRECOGNISED_ERA_TAG)).toBe(true);
    expect(thrown).toHaveProperty('context', 'getPublicStates');
    expect(thrown).toHaveProperty('received', 'v10');
    expect(thrown).toHaveProperty('category', 'USAGE');
  });

  test('refuses a value with no era tag, the pre-5.0.0 shape, as an unrecognised tag', () => {
    // Arrange.
    const untagged = { state: 1 };

    // Act.
    const thrown = catchError(() => requireLedger9(untagged as never, 'getPublicStates'));

    // Assert.
    expect(thrown).toBeInstanceOf(UnrecognisedEraTagError);
    expect(thrown).toHaveProperty('received', 'undefined');
  });

  test('refuses null as an unrecognised tag rather than a TypeError', () => {
    // Act.
    const thrown = catchError(() => requireLedger9(null as never, 'getPublicStates'));

    // Assert.
    expect(thrown).toBeInstanceOf(UnrecognisedEraTagError);
    expect(thrown).toHaveProperty('received', 'null');
  });

  test('does not compile for a type that has no v9 variant to narrow to', () => {
    // Arrange.
    const wideTag: { readonly era: LedgerVersion; readonly raw: Uint8Array } = {
      era: 'v9',
      raw: new Uint8Array()
    };
    const ledger8Only: Ledger8Sample = { era: 'v8', stateBytes: new Uint8Array() };

    // Assert.
    // @ts-expect-error `era` is the whole era set, not a discriminant, so there is no v9 variant
    expect(() => requireLedger9(wideTag, 'readRaw')).not.toThrow();
    // @ts-expect-error a v8-only type has no v9 variant
    expect(() => requireLedger9(ledger8Only, 'readLedger8')).toThrow(Ledger8ValueUnsupportedError);
  });
});
