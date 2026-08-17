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

import { describe, expect, it } from 'vitest';

import {
  CONTRACTS_ERROR_CODES,
  hasErrorCode,
  MIDNIGHT_JS_ERROR_CODES,
  PROVIDER_ERROR_CODES,
  UTILS_ERROR_CODES
} from '../error-codes';

const EXPECTED_CODES = [
  // protocol (imported)
  'MJS_P_UNKNOWN_PROTOCOL_VERSION_READ',
  'MJS_P_UNKNOWN_PROTOCOL_VERSION_CONSTRUCT',
  'MJS_P_LEDGER8_INSTANCE_MISMATCH',
  'MJS_P_LEDGER8_RUNTIME_MISSING',
  'MJS_P_DOWN_CONVERT_FAILED',
  'MJS_P_MERKLE_NOT_REHASHED',
  // contracts
  'MJS_C_ERA_ARTIFACT_MISMATCH',
  'MJS_C_LEDGER8_DEPLOY_ON_V9',
  'MJS_C_HEAD_STATE_ERA_MISMATCH',
  'MJS_C_INDEXER_INCONSISTENCY',
  'MJS_C_STALE_HEAD',
  'MJS_C_KEY_SET_CONTRADICTION',
  'MJS_C_UNSUPPORTED_KEY_SET',
  'MJS_C_PROOF_VERSION_UNRESOLVED',
  'MJS_C_ERA_INVARIANT_VIOLATION',
  'MJS_C_UNSANCTIONED_MIXING',
  'MJS_C_MIXED_ERA_SCOPE',
  // providers
  'MJS_PR_DECODE_VERSION_MISMATCH',
  'MJS_PR_MOCK_VERSION_INVARIANT',
  // utils
  'MJS_U_TAG_PARSE_FAILED'
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
});

describe('hasErrorCode', () => {
  it('returns true and narrows when the error carries the exact requested code', () => {
    const error: unknown = Object.assign(new Error('boom'), { code: UTILS_ERROR_CODES.TAG_PARSE_FAILED });

    expect(hasErrorCode(error, UTILS_ERROR_CODES.TAG_PARSE_FAILED)).toBe(true);
    if (hasErrorCode(error, UTILS_ERROR_CODES.TAG_PARSE_FAILED)) {
      expect(error.code).toBe(UTILS_ERROR_CODES.TAG_PARSE_FAILED);
    }
  });

  it('returns true for any string code when no specific code is requested', () => {
    const error: unknown = Object.assign(new Error('boom'), { code: 'SOME_OTHER_CODE' });

    expect(hasErrorCode(error)).toBe(true);
  });

  it('returns false when the code does not match the requested one', () => {
    const error: unknown = Object.assign(new Error('boom'), { code: 'SOME_OTHER_CODE' });

    expect(hasErrorCode(error, UTILS_ERROR_CODES.TAG_PARSE_FAILED)).toBe(false);
  });

  it('returns false for a plain Error without a code property', () => {
    expect(hasErrorCode(new Error('boom'))).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(hasErrorCode('not an error')).toBe(false);
    expect(hasErrorCode(undefined)).toBe(false);
    expect(hasErrorCode({ code: UTILS_ERROR_CODES.TAG_PARSE_FAILED })).toBe(false);
  });

  it('returns false when the code property is not a string', () => {
    const error: unknown = Object.assign(new Error('boom'), { code: 42 });

    expect(hasErrorCode(error)).toBe(false);
  });
});
