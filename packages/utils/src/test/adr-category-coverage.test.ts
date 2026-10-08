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

import { MIDNIGHT_JS_ERROR_CATEGORY_BY_CODE } from '../error-codes';

const REPOSITORY_ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..', '..');
const ADR_PATH = path.join(REPOSITORY_ROOT, 'docs', 'adr', '0017-error-codes-are-the-contract.md');

const GROUP_PREFIXES: Readonly<Record<string, string>> = {
  G: 'MIDNIGHT_JS_G_',
  P: 'MIDNIGHT_JS_P_',
  PR: 'MIDNIGHT_JS_PR_',
  C: 'MIDNIGHT_JS_C_',
  U: 'MIDNIGHT_JS_U_'
};

// Two table shapes: `| G | `CODE` | CATEGORY | Class |`, and
// `| P | `A`, `B` → CATEGORY · `C` → CATEGORY |`.
const documentedCategories = (): [string, string][] => {
  const adr = readFileSync(ADR_PATH, 'utf8');
  const single = [...adr.matchAll(/^\|\s*(G|P|PR|C|U)\s*\|\s*`([A-Z0-9_]+)`\s*\|\s*([A-Z]+)\s*\|/gm)].map(
    ([, group, suffix, category]): [string, string] => [`${GROUP_PREFIXES[group]}${suffix}`, category]
  );
  const grouped = [...adr.matchAll(/^\|\s*(G|P|PR|C|U)\s*\|([^|]*→[^|]*)\|/gm)].flatMap(([, group, cell]) =>
    cell.split('·').flatMap((clause) => {
      const [codes, category] = clause.split('→').map((part) => part.trim());
      return [...codes.matchAll(/`([A-Z0-9_]+)`/g)].map(([, suffix]): [string, string] => [
        `${GROUP_PREFIXES[group]}${suffix}`,
        category
      ]);
    })
  );
  return [...single, ...grouped];
};

describe('ADR 0017 category assignments', () => {
  test('give every registered code exactly the category the code tables give it, and nothing else', () => {
    // Arrange
    const registered = Object.entries(MIDNIGHT_JS_ERROR_CATEGORY_BY_CODE).sort(([a], [b]) => a.localeCompare(b));

    // Act
    const documented = documentedCategories().sort(([a], [b]) => a.localeCompare(b));

    // Assert
    expect(documented.length).toBeGreaterThan(0);
    expect(documented).toEqual(registered);
  });
});
