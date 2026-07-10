/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

// Regression suite for #711: "replace shell string interpolation with safe
// argument arrays in compact CLI tools". The fix prevents shell-injection
// when a version string, path, or CLI argument contains shell
// metacharacters (`;`, `&&`, backticks, `$(...)`, etc.). These tests catch
// any re-introduction of the vulnerable pattern at the source level.

const SRC_DIR = path.resolve(__dirname, '..');
const FETCH_COMPACT_SRC = fs.readFileSync(path.join(SRC_DIR, 'fetch-compact.mts'), 'utf8');
const RUN_COMPACTC_SRC = fs.readFileSync(path.join(SRC_DIR, 'run-compactc.cjs'), 'utf8');

// A template literal containing `${` inside `exec(\`...\`)` or
// `execSync(\`...\`)` is the exact vulnerable pattern the PR replaced.
// Using `[\s\S]` (rather than `.`) makes the match multi-line-safe in case
// the template spans lines.
const EXEC_TEMPLATE_LITERAL = /\b(?:exec|execSync)\s*\(\s*`[\s\S]*?\$\{/;

describe('shell-injection regression (#711)', () => {
  describe('no vulnerable patterns present', () => {
    it('fetch-compact.mts does not use exec/execSync with an interpolated template literal', () => {
      expect(FETCH_COMPACT_SRC).not.toMatch(EXEC_TEMPLATE_LITERAL);
    });

    it('run-compactc.cjs does not use exec/execSync with an interpolated template literal', () => {
      expect(RUN_COMPACTC_SRC).not.toMatch(EXEC_TEMPLATE_LITERAL);
    });

    it('run-compactc.cjs does not require `exec` from node:child_process', () => {
      // The fix explicitly removed the `const { exec } = require('node:child_process');`
      // line. Guard against it sneaking back in.
      expect(RUN_COMPACTC_SRC).not.toMatch(/require\(\s*['"]node:child_process['"]\s*\)\s*\.exec\b/);
      expect(RUN_COMPACTC_SRC).not.toMatch(/\{\s*exec\s*\}\s*=\s*require\(\s*['"]node:child_process['"]\s*\)/);
    });

    it('neither source file constructs a spawn target from an interpolated template literal', () => {
      // A template-literal *first* argument to spawn/spawnSync would recreate
      // the same injection risk the PR eliminated, just behind a different API.
      const unsafeSpawn = /\b(?:spawn|spawnSync)\s*\(\s*`[\s\S]*?\$\{/;
      expect(FETCH_COMPACT_SRC).not.toMatch(unsafeSpawn);
      expect(RUN_COMPACTC_SRC).not.toMatch(unsafeSpawn);
    });
  });
});
