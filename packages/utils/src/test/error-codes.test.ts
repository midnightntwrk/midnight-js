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

import { PROTOCOL_ERROR_CODES, UnknownProtocolVersionError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { describe, expect, it } from 'vitest';

import {
  CONTRACTS_ERROR_CODES,
  hasErrorCode,
  hasForeignErrorCode,
  MIDNIGHT_JS_ERROR_CODES,
  PROVIDER_ERROR_CODES,
  UTILS_ERROR_CODES
} from '../error-codes';

// The exhaustive code list this file used to carry lived here. Its completeness
// job is done by `troubleshooting-coverage.test.ts`, which pins the same
// registry against the TROUBLESHOOTING.md table in both directions and
// additionally demands a remediation per entry.
//
// One guarantee was traded away in the move, and it is worth naming: with two
// independent spellings of every code plus the document, a rename applied to
// only one of them failed. With one spelling plus the document, a rename
// applied to BOTH in the same change now passes. What remains below are the
// invariants the doc gate does not cover at all.
describe('MIDNIGHT_JS_ERROR_CODES', () => {
  it('has no duplicate codes across groups', () => {
    expect(new Set(MIDNIGHT_JS_ERROR_CODES).size).toBe(MIDNIGHT_JS_ERROR_CODES.length);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(MIDNIGHT_JS_ERROR_CODES)).toBe(true);
  });

  // Load-bearing for `hasForeignErrorCode`, which refuses a framework code by
  // this prefix rather than by registry lookup -- a lookup cannot recognise a
  // MISSPELLED framework code, which is the case that guard exists for. A code
  // registered without the prefix would walk straight past it.
  it('gives every registered code the framework prefix the foreign guard screens on', () => {
    expect(MIDNIGHT_JS_ERROR_CODES.filter((code) => !code.startsWith('MIDNIGHT_JS_'))).toEqual([]);
  });
});

describe('every error-code group', () => {
  it('every value in each group is present in the combined registry', () => {
    const combined = new Set(MIDNIGHT_JS_ERROR_CODES);
    // The protocol group is walked too, though it is imported rather than
    // declared here. It is the one group that crosses a package boundary, via
    // the `@midnight-ntwrk/midnight-js-protocol/errors` subpath, so it is the
    // likeliest of the four to fall out of the registry unnoticed.
    for (const code of Object.values(PROTOCOL_ERROR_CODES)) {
      expect(combined.has(code)).toBe(true);
    }
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

  it('rejects a typo of a real code at compile time', () => {
    const error: unknown = Object.assign(new Error('boom'), { code: PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED });

    // The `@ts-expect-error` IS the assertion: it fails the build if the typo
    // ever starts compiling. A runtime `toBe(false)` cannot catch this, because
    // a typo'd code is false either way.
    //
    // The directive sits on the call alone rather than on the whole `expect`
    // statement, because it suppresses EVERY diagnostic on the line it precedes.
    // Covering the assertion too would let this test stay green through a change
    // that removed the with-code overload outright.
    // @ts-expect-error -- not a member of MidnightJsErrorCode
    const matched: boolean = hasErrorCode(error, 'MIDNIGHT_JS_PR_V8_PAYLOAD_UNSUPPORTD');

    expect(matched).toBe(false);
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
    it('matches a real error instance against the registered code, not against itself', () => {
      const error = new UnknownProtocolVersionError(9_000_000, 'read', 'unknown');

      // Compared against the registry constant rather than `error.code`:
      // the self-comparison holds for any string the class happens to carry,
      // so it could not catch the class and the registry drifting apart.
      expect(hasErrorCode(error, PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ)).toBe(true);
    });

    it('returns false for a real error instance matched against a different registered code', () => {
      const error = new UnknownProtocolVersionError(9_000_000, 'read', 'unknown');

      expect(hasErrorCode(error, PROVIDER_ERROR_CODES.ERA_UNSUPPORTED)).toBe(false);
    });
  });
});

describe('hasForeignErrorCode', () => {
  const econnrefused = (): unknown => Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });

  it('returns true and narrows when the error carries the exact foreign code', () => {
    const error = econnrefused();

    expect(hasForeignErrorCode(error, 'ECONNREFUSED')).toBe(true);
    if (hasForeignErrorCode(error, 'ECONNREFUSED')) {
      expect(error.code).toBe('ECONNREFUSED');
    }
  });

  it('returns false when the foreign code does not match', () => {
    expect(hasForeignErrorCode(econnrefused(), 'ENOTFOUND')).toBe(false);
  });

  // The three negatives below are not duplicates of the `hasErrorCode` ones.
  // Both guards read the code through one shared predicate today, so they agree
  // by construction -- which is exactly why a divergence would go unnoticed
  // unless each guard states its own expectations.
  it('returns false for non-Error values', () => {
    expect(hasForeignErrorCode('not an error', 'ECONNREFUSED')).toBe(false);
    expect(hasForeignErrorCode(undefined, 'ECONNREFUSED')).toBe(false);
    expect(hasForeignErrorCode({ code: 'ECONNREFUSED' }, 'ECONNREFUSED')).toBe(false);
  });

  it('returns false for a plain Error without a code property', () => {
    expect(hasForeignErrorCode(new Error('boom'), 'ECONNREFUSED')).toBe(false);
  });

  it('returns false when the code property is not a string', () => {
    const error: unknown = Object.assign(new Error('boom'), { code: 42 });

    expect(hasForeignErrorCode(error, '42')).toBe(false);
  });

  it('rejects a code this framework owns, at compile time and again at runtime', () => {
    // Both gates in one test, because this input trips both. The
    // `@ts-expect-error` is the compile-time half: without the constraint the
    // foreign guard silently accepts a framework code, which is the narrowing
    // in `hasErrorCode` undone by its own escape hatch. The directive covers
    // the call alone, and it fails the build if the call ever compiles.
    // @ts-expect-error -- a member of MidnightJsErrorCode belongs in hasErrorCode
    const call = () => hasForeignErrorCode(econnrefused(), PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED);

    // The runtime half. A JavaScript caller reaches this guard with no compiler
    // in the way at all, so the constraint alone would leave them unserved.
    expect(call).toThrow(/uses this framework's own MIDNIGHT_JS_ prefix/);
  });

  it('throws on a misspelled framework code rather than answering false forever', () => {
    // The case the compile-time gate above cannot see: a typo is not a member
    // of MidnightJsErrorCode, so it satisfies the foreign constraint and
    // compiles. Answering `false` here would be the silent guard that narrowing
    // `hasErrorCode` was meant to abolish, reached through the other door.
    expect(() => hasForeignErrorCode(econnrefused(), 'MIDNIGHT_JS_C_STALE_HAED')).toThrow(
      /uses this framework's own MIDNIGHT_JS_ prefix/
    );
  });

  it('names the offending code in the refusal, so the fix does not need a debugger', () => {
    expect(() => hasForeignErrorCode(econnrefused(), 'MIDNIGHT_JS_C_STALE_HAED')).toThrow(
      /MIDNIGHT_JS_C_STALE_HAED/
    );
  });
});
