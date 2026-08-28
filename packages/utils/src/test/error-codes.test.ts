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

import { UnknownProtocolVersionError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { describe, expect, it } from 'vitest';

import {
  CONTRACTS_ERROR_CODES,
  hasErrorCode,
  MIDNIGHT_JS_ERROR_CODES,
  PROVIDER_ERROR_CODES,
  UTILS_ERROR_CODES
} from '../error-codes';

// Spelled out by hand rather than derived from the groups: a derived list
// would agree with any regression the groups themselves contain.
const EXPECTED_CODES = [
  // protocol (imported)
  'MIDNIGHT_JS_P_UNKNOWN_PROTOCOL_VERSION_READ',
  'MIDNIGHT_JS_P_UNKNOWN_PROTOCOL_VERSION_CONSTRUCT',
  'MIDNIGHT_JS_P_LEDGER8_INSTANCE_MISMATCH',
  'MIDNIGHT_JS_P_LEDGER8_RUNTIME_MISSING',
  'MIDNIGHT_JS_P_DOWN_CONVERT_FAILED',
  'MIDNIGHT_JS_P_MERKLE_NOT_REHASHED',
  // contracts
  'MIDNIGHT_JS_C_ERA_INVARIANT_VIOLATION',
  // providers
  'MIDNIGHT_JS_PR_V8_PAYLOAD_UNSUPPORTED',
  // utils
  'MIDNIGHT_JS_U_TAG_PARSE_FAILED'
];

describe('MIDNIGHT_JS_ERROR_CODES', () => {
  it('is exactly the union of every error-code group, spelled out', () => {
    expect([...MIDNIGHT_JS_ERROR_CODES].sort()).toEqual([...EXPECTED_CODES].sort());
  });

  it('has no duplicate codes across groups', () => {
    expect(new Set(MIDNIGHT_JS_ERROR_CODES).size).toBe(MIDNIGHT_JS_ERROR_CODES.length);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(MIDNIGHT_JS_ERROR_CODES)).toBe(true);
  });
});

describe('CONTRACTS_ERROR_CODES and PROVIDER_ERROR_CODES and UTILS_ERROR_CODES', () => {
  it('every value in each group is present in the combined registry', () => {
    const combined = new Set(MIDNIGHT_JS_ERROR_CODES);
    for (const code of Object.values(CONTRACTS_ERROR_CODES)) {
      expect(combined.has(code)).toBe(true);
    }
    for (const code of Object.values(PROVIDER_ERROR_CODES)) {
      expect(combined.has(code)).toBe(true);
    }
    for (const code of Object.values(UTILS_ERROR_CODES)) {
      expect(combined.has(code)).toBe(true);
    }
  });

  it('are each frozen', () => {
    expect(Object.isFrozen(CONTRACTS_ERROR_CODES)).toBe(true);
    expect(Object.isFrozen(PROVIDER_ERROR_CODES)).toBe(true);
    expect(Object.isFrozen(UTILS_ERROR_CODES)).toBe(true);
  });
});

describe('hasErrorCode', () => {
  it('returns true and narrows when the error carries the exact requested code', () => {
    const error: unknown = Object.assign(new Error('boom'), { code: PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED });

    expect(hasErrorCode(error, PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED)).toBe(true);
    if (hasErrorCode(error, PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED)) {
      expect(error.code).toBe(PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED);
    }
  });

  it('returns false when the code does not match the requested one', () => {
    const error: unknown = Object.assign(new Error('boom'), { code: 'SOME_OTHER_CODE' });

    expect(hasErrorCode(error, PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED)).toBe(false);
  });

  it('returns false for the with-code form even for a plausible-looking typo of a real code', () => {
    const error: unknown = Object.assign(new Error('boom'), { code: PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED });

    // `hasErrorCode<C extends string>` intentionally does not require `C` to
    // be a member of MidnightJsErrorCode, so comparing against an arbitrary
    // (here, typo'd) string still compiles — and correctly returns false.
    expect(hasErrorCode(error, 'MIDNIGHT_JS_PR_V8_PAYLOAD_UNSUPPORTD')).toBe(false);
  });

  it('returns false for a plain Error without a code property', () => {
    expect(hasErrorCode(new Error('boom'))).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(hasErrorCode('not an error')).toBe(false);
    expect(hasErrorCode(undefined)).toBe(false);
    expect(hasErrorCode({ code: PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED })).toBe(false);
  });

  it('returns false when the code property is not a string', () => {
    const error: unknown = Object.assign(new Error('boom'), { code: 42 });

    expect(hasErrorCode(error)).toBe(false);
  });

  describe('no-arg form (registry membership)', () => {
    it('returns false for a foreign coded error not in the registry (e.g. a Node system error)', () => {
      const econnrefused: unknown = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });

      expect(hasErrorCode(econnrefused)).toBe(false);
    });

    it('returns true for a real UnknownProtocolVersionError instance', () => {
      const error: unknown = new UnknownProtocolVersionError(9_000_000, 'read', 'unknown');

      expect(hasErrorCode(error)).toBe(true);
    });
  });

  describe('with-code form on real error instances', () => {
    it('returns true for a real UnknownProtocolVersionError instance matching its own code', () => {
      const error = new UnknownProtocolVersionError(9_000_000, 'read', 'unknown');

      expect(hasErrorCode(error, error.code)).toBe(true);
    });
  });
});
