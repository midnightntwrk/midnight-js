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

import { describe, expect, test } from 'vitest';

import { UnhandledUnionMemberError } from '../assertion-utils';
import { hasErrorCode, UTILS_ERROR_CODES } from '../error-codes';
import { Ledger8ValueUnsupportedError, requireLedger9 } from '../require-ledger9';

interface Ledger8Sample {
  readonly version: 'v8';
  readonly stateBytes: Uint8Array;
}

interface Ledger9Sample {
  readonly version: 'v9';
  readonly state: number;
}

type VersionedSample = Ledger8Sample | Ledger9Sample;

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
    const value: VersionedSample = { version: 'v9', state: 7 };

    // Act.
    const narrowed: Ledger9Sample = requireLedger9(value, 'getPublicStates');

    // Assert.
    expect(narrowed).toBe(value);
    // @ts-expect-error the v8 field is gone after narrowing
    expect(narrowed.stateBytes).toBeUndefined();
  });

  test('refuses a v8 value with a coded error that names the call site', () => {
    // Arrange.
    const value: VersionedSample = { version: 'v8', stateBytes: new Uint8Array([1, 2, 3]) };

    // Act.
    const thrown = catchError(() => requireLedger9(value, 'getPublicStates'));

    // Assert.
    expect(thrown).toBeInstanceOf(Ledger8ValueUnsupportedError);
    expect(hasErrorCode(thrown, UTILS_ERROR_CODES.LEDGER8_VALUE_UNSUPPORTED)).toBe(true);
    expect(thrown).toHaveProperty('context', 'getPublicStates');
    expect(thrown).toHaveProperty('category', 'USAGE');
  });

  test('refuses an era the build does not know as an unhandled union member', () => {
    // Arrange.
    const grown = { version: 'v10', state: 1 };

    // Act.
    const thrown = catchError(() => requireLedger9(grown as never, 'getPublicStates'));

    // Assert.
    expect(thrown).toBeInstanceOf(UnhandledUnionMemberError);
    expect(thrown).toHaveProperty('context', 'getPublicStates');
  });
});
