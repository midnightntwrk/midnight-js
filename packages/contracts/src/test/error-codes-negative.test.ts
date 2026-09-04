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
 * One registered code, and the test file that refuses with it.
 *
 * `code` is typed as {@link ContractsErrorCode} rather than as `string`, so a
 * code that is removed from or renamed in the registry makes this file fail to
 * COMPILE as well as fail at run time. That is a second, independent gate --
 * and it is the one that catches a stale entry NAMING a code that no longer
 * exists, which the set comparison below cannot see.
 */
interface NegativeTestLocation {
  readonly code: ContractsErrorCode;
  /** File name under `packages/contracts/src/test/`. */
  readonly file: string;
  /** What the negative actually provokes, for a reader arriving at a failure. */
  readonly refusal: string;
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
    refusal: 'a retained-era deploy against a post-fork head'
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

const readTestSource = (file: string): string => readFileSync(resolve(TEST_DIR, file), 'utf8');

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
    ({ code, file }) => {
      // The claim is measured against the named file's own text rather than
      // taken on trust: an entry that named a file which had been renamed, or
      // which never asserted the code, would otherwise keep this gate green
      // while the code went untested.
      const source = readTestSource(file);

      expect(source).toContain(`CONTRACTS_ERROR_CODES.${registryName(code)}`);
      // The mandatory idiom. `instanceof` alone is not coverage: swapping two
      // code assignments between two error classes type-checks and leaves an
      // instanceof-only suite green.
      expect(source).toContain('hasErrorCode(');
    }
  );
});
