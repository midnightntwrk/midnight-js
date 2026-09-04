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

/**
 * The gate that stops an UNTESTED error code from shipping.
 *
 * `packages/utils/src/test/error-codes.test.ts` already asserts what the
 * registry CONTAINS, against a hand-spelled list, and this file deliberately
 * does not repeat that claim. This one asserts something different: that every
 * code the registry contains has a NEGATIVE test somewhere in this package.
 *
 * The two sides of that comparison are maintained in opposite ways, on purpose:
 *
 * - The REGISTRY side is DERIVED from `CONTRACTS_ERROR_CODES` at run time. A
 *   hand-spelled expectation here would agree with any regression the registry
 *   itself contained, and has already gone stale once in this repository when a
 *   group grew from 6 codes to 12 -- which is the exact hazard this file exists
 *   to remove, so it must not be reintroduced one indirection later.
 * - The TESTED side is HAND-MAINTAINED, also on purpose: it is the set of codes
 *   a human has actually written a negative test for. Nothing can derive that.
 *
 * There is no exemption list, and adding one would restore the hand-spelled
 * expectation this file exists to kill. If a code has no negative test, the fix
 * is to write the test.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONTRACTS_ERROR_CODES, type ContractsErrorCode } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it } from 'vitest';

const TEST_DIR = fileURLToPath(new URL('./', import.meta.url));

/**
 * How the named file spells its assertion. The default is the strict form; the
 * table form is an explicit, reviewable opt-in.
 */
type NegativeForm =
  /**
   * `expect(hasErrorCode(error, CONTRACTS_ERROR_CODES.X)).toBe(true)` -- both
   * idioms on ONE line, so the assertion provably concerns this code.
   */
  | 'direct'
  /**
   * A parameterised table: the code is a ROW FIELD named `code`, and one
   * `it.each` body asserts `hasErrorCode(error, code)` over every row. The two
   * idioms cannot share a line in this form, so it is checked as two lines
   * TIED THROUGH THE FIELD NAME instead of as two free-floating substrings.
   */
  | 'table';

/**
 * One registered code, and the test file that refuses with it.
 *
 * `code` is typed as {@link ContractsErrorCode} rather than as `string`. What
 * that buys is NARROWER than it looks, and the narrower claim is the true one:
 * a code REMOVED or RENAMED in the registry already fails to compile at the
 * property access `CONTRACTS_ERROR_CODES.X`, with or without this annotation.
 * The annotation's real value is rejecting a HAND-TYPED STRING LITERAL in a
 * future entry -- someone writing `code: 'MIDNIGHT_JS_C_WHATEVER'` to satisfy
 * the set assertion below without going through the registry at all.
 */
interface NegativeTestLocation {
  readonly code: ContractsErrorCode;
  /** File name under `packages/contracts/src/test/`. */
  readonly file: string;
  /** What the negative actually provokes, for a reader arriving at a failure. */
  readonly refusal: string;
  /** Defaults to `'direct'`; only a parameterised table needs `'table'`. */
  readonly form?: NegativeForm;
}

// HAND-MAINTAINED. Every entry names a test that provokes the refusal and
// asserts `hasErrorCode(error, CONTRACTS_ERROR_CODES.X)` on it -- the idiom the
// checks below measure coverage by.
const NEGATIVE_TEST_LOCATIONS: readonly NegativeTestLocation[] = [
  {
    code: CONTRACTS_ERROR_CODES.ERA_INVARIANT_VIOLATION,
    file: 'submit-tx.test.ts',
    refusal: 'a provider answered a current-era submit on the retained-era arm, at each of the three seams'
  },
  {
    code: CONTRACTS_ERROR_CODES.ERA_ARTIFACT_MISMATCH,
    file: 'era-dispatch.test.ts',
    refusal: 'a current-era artifact on a pre-fork head, and an object belonging to neither era'
  },
  {
    code: CONTRACTS_ERROR_CODES.LEDGER8_DEPLOY_ON_V9,
    file: 'era-dispatch.test.ts',
    refusal: 'a retained-era deploy against a post-fork head',
    // The dispatch table's refused cells are asserted by one `it.each` body,
    // so this code appears as a row field rather than on the assertion line.
    form: 'table'
  },
  {
    code: CONTRACTS_ERROR_CODES.HEAD_STATE_ERA_MISMATCH,
    file: 'era-dispatch.test.ts',
    refusal: 'a stale head reading, confirmed stale by a fresh re-read'
  },
  {
    code: CONTRACTS_ERROR_CODES.INDEXER_INCONSISTENCY,
    file: 'era-dispatch.test.ts',
    refusal: 'a head and a state envelope that still disagree after a fresh re-read'
  },
  {
    code: CONTRACTS_ERROR_CODES.BLANK_VERIFIER_KEY_SLOT,
    file: 'verifier-key.test.ts',
    refusal: 'an entry point the fetched state declares no verifier key for'
  },
  {
    code: CONTRACTS_ERROR_CODES.VERIFIER_KEY_MISMATCH,
    file: 'verifier-key.test.ts',
    refusal: 'a chain slot holding different key bytes from the local artifact'
  },
  {
    code: CONTRACTS_ERROR_CODES.LEDGER8_SEAM_FAILED,
    file: 'v8-native.test.ts',
    refusal: 'a provider rejecting a retained-era payload at a seam'
  },
  {
    code: CONTRACTS_ERROR_CODES.LEDGER8_SHIELDED_SPEND_UNSUPPORTED,
    file: 'v8-native.test.ts',
    refusal: 'a retained-era circuit spending a shielded coin the contract already held'
  },
  {
    code: CONTRACTS_ERROR_CODES.STALE_HEAD,
    file: 'stale-head.test.ts',
    refusal: 'a submission rejected because the head moved across the fork mid-operation'
  },
  {
    code: CONTRACTS_ERROR_CODES.SUBMIT_REJECTION_UNDIAGNOSED,
    file: 'stale-head.test.ts',
    refusal: 'a submission rejection whose cause the two-step remediation could not name'
  },
  {
    code: CONTRACTS_ERROR_CODES.SCOPED_TX_ERA_UNSUPPORTED,
    file: 'scoped-era.test.ts',
    refusal: 'a scoped transaction opened against a pre-fork head, which composes one call per transaction'
  },
  {
    code: CONTRACTS_ERROR_CODES.MIXED_ERA_SCOPE,
    file: 'scoped-era.test.ts',
    refusal: 'a retained-era call handed a scope built for the current era'
  }
];

const NEGATIVE_TESTED_CONTRACT_CODES: readonly string[] = NEGATIVE_TEST_LOCATIONS.map((location) => location.code);

// The registry constant's own NAME, recovered from its value. Needed because
// the assertion below measures coverage by the source idiom
// `CONTRACTS_ERROR_CODES.<NAME>`, which spells the name and not the value.
const registryName = (code: ContractsErrorCode): string => {
  const entry = Object.entries(CONTRACTS_ERROR_CODES).find(([, value]) => value === code);

  // Unreachable while `code` is typed as a registry member; asserted rather
  // than assumed so this helper cannot return `undefined` into an
  // `includes()` check that would then pass on the string 'undefined'.
  expect(entry, `'${code}' is not a value in CONTRACTS_ERROR_CODES`).toBeDefined();

  return entry === undefined ? '' : entry[0];
};

const readTestSource = (file: string): readonly string[] =>
  readFileSync(resolve(TEST_DIR, file), 'utf8').split('\n');

/**
 * The field name a parameterised refusal table carries its code under.
 *
 * ONE name, checked on both sides of the {@link NegativeForm} `'table'` branch,
 * which is what TIES the row to the assertion that consumes it. A table using
 * a different field name is not recognised, deliberately: the alternative is
 * matching `hasErrorCode(` against any identifier at all, which is the
 * free-floating check this replaced.
 */
const TABLE_CODE_FIELD = 'code';

/**
 * Whether `source` really asserts a negative for `name`.
 *
 * The predicate this file's whole value rests on, so it is written to be hard
 * to satisfy by accident. The earlier version asserted two INDEPENDENT
 * substrings anywhere in the file -- `hasErrorCode(` and
 * `CONTRACTS_ERROR_CODES.<NAME>` -- and never checked they were related. That
 * went GREEN with zero coverage for a code whose only mention in the named
 * file was a `// TODO:` comment, because `hasErrorCode(` was already satisfied
 * by eleven unrelated assertions there. A gate that can pass with no coverage
 * is the one thing this file exists to prevent.
 */
const assertsNegativeFor = (source: readonly string[], name: string, form: NegativeForm): boolean => {
  const codeExpression = `CONTRACTS_ERROR_CODES.${name}`;

  if (form === 'direct') {
    // Both idioms on ONE line. A comment mentioning the code cannot satisfy
    // this without also spelling the call on the same line.
    return source.some((line) => line.includes('hasErrorCode(') && line.includes(codeExpression));
  }

  // The table form, as two lines tied through TABLE_CODE_FIELD:
  //   1. a row assigns this code to that field, and
  //   2. a body asserts `hasErrorCode(error, <that field>)`.
  // Matched on the TRIMMED line for (1), so a `// TODO: code: CONTRACTS_...`
  // comment does not qualify -- a comment line does not start with the field.
  const rowAssignsCode = source.some((line) => {
    const trimmed = line.trim();
    return trimmed === `${TABLE_CODE_FIELD}: ${codeExpression}` || trimmed === `${TABLE_CODE_FIELD}: ${codeExpression},`;
  });
  const bodyAssertsField = source.some((line) => line.includes(`hasErrorCode(error, ${TABLE_CODE_FIELD})`));

  return rowAssignsCode && bodyAssertsField;
};

describe('every code in CONTRACTS_ERROR_CODES has a negative test', () => {
  it('the negatively tested set is EXACTLY the registry, so a new code cannot ship untested', () => {
    // The registry side is derived, never spelled. When this fails after a code
    // is added, the fix is a negative test plus an entry above -- not an
    // exemption, and not an edit to the expectation.
    expect([...NEGATIVE_TESTED_CONTRACT_CODES].sort()).toEqual(Object.values(CONTRACTS_ERROR_CODES).sort());
  });

  it('names no code twice, so one duplicate entry cannot stand in for a missing one', () => {
    expect(new Set(NEGATIVE_TESTED_CONTRACT_CODES).size).toBe(NEGATIVE_TESTED_CONTRACT_CODES.length);
  });

  it.each(NEGATIVE_TEST_LOCATIONS)(
    'covers $code in $file, refusing $refusal',
    ({ code, file, form }) => {
      // The claim is measured against the named file's own text rather than
      // taken on trust: an entry naming a file that had been renamed, or that
      // never asserted the code, would otherwise keep this gate green while
      // the code went untested.
      //
      // The idiom measured is `hasErrorCode(error, CONTRACTS_ERROR_CODES.X)`,
      // and it is mandatory rather than `instanceof`: swapping two code
      // assignments between two error classes type-checks, and an
      // instanceof-only suite would stay green while a consumer branching on
      // `code` took the wrong path.
      const source = readTestSource(file);

      expect(assertsNegativeFor(source, registryName(code), form ?? 'direct')).toBe(true);
    }
  );

  it('recognises NO negative when the code is only named in a comment', () => {
    // The gate on the gate. This is the exact evasion the earlier
    // two-independent-substrings check let through, asserted here against a
    // synthetic source so it cannot come back unnoticed.
    const commentOnly = [
      '// TODO: refuse with CONTRACTS_ERROR_CODES.MIXED_ERA_SCOPE',
      "expect(hasErrorCode(error, CONTRACTS_ERROR_CODES.SOMETHING_ELSE)).toBe(true);"
    ];

    expect(assertsNegativeFor(commentOnly, 'MIXED_ERA_SCOPE', 'direct')).toBe(false);
    // And the same source cannot sneak through the table branch either.
    expect(assertsNegativeFor(commentOnly, 'MIXED_ERA_SCOPE', 'table')).toBe(false);
  });

  it('recognises the direct form only when both idioms share a line', () => {
    const split = [
      'const expected = CONTRACTS_ERROR_CODES.STALE_HEAD;',
      'expect(hasErrorCode(error, expected)).toBe(true);'
    ];
    const together = ['expect(hasErrorCode(error, CONTRACTS_ERROR_CODES.STALE_HEAD)).toBe(true);'];

    expect(assertsNegativeFor(split, 'STALE_HEAD', 'direct')).toBe(false);
    expect(assertsNegativeFor(together, 'STALE_HEAD', 'direct')).toBe(true);
  });

  it('recognises the table form only when a row field and an assertion on that field both exist', () => {
    const rowOnly = [`    ${TABLE_CODE_FIELD}: CONTRACTS_ERROR_CODES.LEDGER8_DEPLOY_ON_V9`];
    const assertionOnly = [`expect(hasErrorCode(error, ${TABLE_CODE_FIELD})).toBe(true);`];

    expect(assertsNegativeFor(rowOnly, 'LEDGER8_DEPLOY_ON_V9', 'table')).toBe(false);
    expect(assertsNegativeFor(assertionOnly, 'LEDGER8_DEPLOY_ON_V9', 'table')).toBe(false);
    expect(assertsNegativeFor([...rowOnly, ...assertionOnly], 'LEDGER8_DEPLOY_ON_V9', 'table')).toBe(true);
  });
});
