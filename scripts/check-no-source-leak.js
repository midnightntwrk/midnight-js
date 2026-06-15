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

// Pre-commit guard: refuse to stage a root package.json that still carries the
// local source-build resolution injected by `scripts/use-source-compact-runtime.js`.
// Without this guard, a developer iterating on `compact/` could accidentally
// commit `file:./.compact-runtime-home` into the repo and break CI for every
// runner without that directory.

const { execFileSync } = require('child_process');

const LEAK_MARKERS = [
  'file:./.compact-runtime-home',
  'portal:./.compact-runtime-home',
];

let staged;
try {
  staged = execFileSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
} catch (err) {
  console.error(`pre-commit guard: failed to list staged files (${err.message}).`);
  process.exit(0);
}

if (!staged.includes('package.json')) {
  process.exit(0);
}

let stagedContent;
try {
  stagedContent = execFileSync('git', ['show', ':package.json'], { encoding: 'utf8' });
} catch (err) {
  console.error(`pre-commit guard: failed to read staged package.json (${err.message}).`);
  process.exit(0);
}

const leak = LEAK_MARKERS.find((marker) => stagedContent.includes(marker));
if (leak) {
  console.error(
    `\n  Refusing to commit package.json: it contains '${leak}', which is a local\n` +
    "  source-build resolution that must not land in git history.\n\n" +
    "  Run: node scripts/use-source-compact-runtime.js --restore && yarn install\n" +
    "  then re-stage package.json.\n"
  );
  process.exit(1);
}
