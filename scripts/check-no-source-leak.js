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

const LEAK_MARKER = 'file:./.compact-runtime-home';

// Files that can carry the leak: root package.json (where the resolution is
// injected), yarn.lock (which `yarn install` populates with the resolved
// spec), and any workspace package.json a developer might hand-edit.
const CHECKABLE = /(^|\/)package\.json$|^yarn\.lock$/;

// `--diff-filter=AM` excludes deletions: a `git rm package.json` cannot leak a
// source-build resolution and `git show :file` would fail on the removed index
// entry, blocking the commit spuriously.
// `stdio: inherit` for stderr surfaces git's own error message when this fails
// closed, which is otherwise lost behind a generic 'spawn git ENOENT'.
const gitStdio = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] };
let staged;
try {
  staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=AM'], gitStdio)
    .split('\n')
    .filter(Boolean);
} catch (err) {
  console.error(`pre-commit guard: failed to list staged files (${err.message}).`);
  process.exit(1);
}

const candidates = staged.filter((f) => CHECKABLE.test(f));
if (candidates.length === 0) {
  process.exit(0);
}

for (const file of candidates) {
  let content;
  try {
    content = execFileSync('git', ['show', `:${file}`], gitStdio);
  } catch (err) {
    console.error(`pre-commit guard: failed to read staged ${file} (${err.message}).`);
    process.exit(1);
  }

  if (content.includes(LEAK_MARKER)) {
    console.error(
      `\n  Refusing to commit ${file}: it contains '${LEAK_MARKER}', which is a local\n` +
      "  source-build resolution that must not land in git history.\n\n" +
      "  Run: node scripts/use-source-compact-runtime.js --restore && yarn install\n" +
      `  then re-stage ${file}.\n`
    );
    process.exit(1);
  }
}
