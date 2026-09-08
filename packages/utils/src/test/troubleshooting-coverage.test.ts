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

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { MIDNIGHT_JS_ERROR_CODES } from '../error-codes';

const REPOSITORY_ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..', '..');
const TROUBLESHOOTING_PATH = path.join(REPOSITORY_ROOT, 'TROUBLESHOOTING.md');

/** The section this test governs. Codes named anywhere else in the file do not count. */
const SECTION_HEADING = '## Midnight.js error codes';

/**
 * The governed section, located once and bounded at the next top-level heading.
 * Every test below reads through this, so none of them can drift into rows that
 * belong to a later section or silently slice from the end of the file when the
 * heading is renamed.
 */
const errorCodeSection = (): string => {
  const document = readFileSync(TROUBLESHOOTING_PATH, 'utf8');
  const start = document.indexOf(SECTION_HEADING);
  if (start < 0) {
    throw new Error(`TROUBLESHOOTING.md has no '${SECTION_HEADING}' section`);
  }
  const rest = document.slice(start + SECTION_HEADING.length);
  const end = rest.indexOf('\n## ');
  return end < 0 ? rest : rest.slice(0, end);
};

// Only the leading cell of a table row documents a code; a code merely mentioned
// in a remediation sentence is a cross-reference, not an entry. Cell padding is
// tolerated so that realigning the table is not read as 31 codes going missing.
const documentedCodes = (): string[] =>
  [...errorCodeSection().matchAll(/^\|\s*`(MIDNIGHT_JS_[A-Z0-9_]+)`\s*\|/gm)].map((match) => match[1]);

describe('TROUBLESHOOTING.md error-code coverage', () => {
  test('documents every registered code and no code that is not registered', () => {
    // Arrange.
    const documented = documentedCodes();
    const registered = [...MIDNIGHT_JS_ERROR_CODES];

    // Act / Assert: strict equality in both directions. A one-directional
    // containment check would let a new coded error ship undocumented, which is
    // the failure this exists to prevent.
    expect([...documented].sort()).toEqual([...registered].sort());
  });

  test('gives each code exactly one entry', () => {
    // Arrange / Act: two rows for one code means two remediations, and a reader
    // finds whichever comes first.
    const documented = documentedCodes();

    // Assert: non-emptiness first, or this passes as 0 === 0 on a failed scrape.
    expect(documented.length).toBeGreaterThan(0);
    expect(documented.length).toBe(new Set(documented).size);
  });

  test('gives every entry a remediation, not only a description', () => {
    // Arrange.
    const section = errorCodeSection();

    // Act: the table shape is `| code | what happened | what to do |`, so a row
    // with an empty final cell documents a code without telling anyone what to do.
    const rows = [...section.matchAll(/^\|\s*`(MIDNIGHT_JS_[A-Z0-9_]+)`\s*\|([^|]*)\|([^|]*)\|/gm)];

    // Assert.
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.filter((row) => row[2].trim().length === 0 || row[3].trim().length === 0).map((row) => row[1])).toEqual(
      []
    );
  });
});
