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

/* eslint-disable no-undef -- Node.js script; the repo's eslint.config.mjs does not
   configure Node globals (see build-tools/rollup.config.factory.mjs for the
   established single-line precedent). This file is entirely Node globals, so a
   file-level disable is used instead of one inline comment per usage. */

// CI gate for the `.d.ts` API surface of `@midnight-ntwrk/midnight-js-types`
// and the `@midnight-ntwrk/midnight-js` barrel.
//
// 1. Regenerates each package's API report (see `api-extractor.json` in each
//    package) directly into the checked-in baseline files under
//    `build-tools/api-report/baselines/`.
// 2. Diffs those files against the committed Git baseline.
// 3. Passes if there is no diff, or if every contiguous block of changed
//    lines contains at least one line matching an entry in
//    `allowed-breaking.md`. Otherwise fails, listing the unmatched blocks.
//    Changed lines are grouped into blocks (rather than checked one by one)
//    because api-extractor emits a companion annotation line (e.g.
//    `// @public (undocumented)`) alongside most declarations, and that line
//    never contains the symbol name itself.
//
// Requires each package to already be built (`dist/index.d.ts` present).

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const BASELINES_PATH = 'build-tools/api-report/baselines';
const ALLOWLIST_PATH = 'build-tools/api-report/allowed-breaking.md';

const PACKAGES = [
  { workspaceName: '@midnight-ntwrk/midnight-js-types' },
  { workspaceName: '@midnight-ntwrk/midnight-js' },
];

function runOrThrow(command, args) {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  if (result.error) {
    throw new Error(`Failed to run "${command} ${args.join(' ')}"`, { cause: result.error });
  }
  if (result.status !== 0) {
    throw new Error(`"${command} ${args.join(' ')}" exited with status ${result.status}`);
  }
}

function captureOutput(command, args) {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  if (result.error) {
    throw new Error(`Failed to run "${command} ${args.join(' ')}"`, { cause: result.error });
  }
  return result;
}

function regenerateReports() {
  for (const { workspaceName } of PACKAGES) {
    runOrThrow('yarn', ['workspace', workspaceName, 'run', 'api-report:accept']);
  }
}

// Groups consecutive added/removed lines from a unified diff into blocks.
// A block ends at a context line, a diff header, or a hunk boundary.
function extractChangedLineGroups(diffText) {
  const groups = [];
  let currentGroup = null;
  for (const line of diffText.split('\n')) {
    const isDiffHeaderLine =
      line.startsWith('+++') ||
      line.startsWith('---') ||
      line.startsWith('@@') ||
      line.startsWith('diff --git') ||
      line.startsWith('index ');
    if (isDiffHeaderLine) {
      currentGroup = null;
      continue;
    }
    const isChangedLine = line.startsWith('+') || line.startsWith('-');
    if (!isChangedLine) {
      currentGroup = null;
      continue;
    }
    const content = line.slice(1).trim();
    if (content.length === 0) {
      continue;
    }
    if (!currentGroup) {
      currentGroup = [];
      groups.push(currentGroup);
    }
    currentGroup.push(content);
  }
  return groups;
}

const ENTRIES_HEADING_PATTERN = /^## Entries$/m;

// Only text after the "## Entries" heading is live allowlist data. Everything
// above it (including the "## Format" section, which is itself written as a
// bulleted list) is documentation and must never be parsed as entries.
// Exported (and kept pure, taking file content rather than reading it) so it
// has a focused unit test — see check-api-report.test.mjs.
export function parseAllowlistEntries(content) {
  const headingMatch = content.match(ENTRIES_HEADING_PATTERN);
  if (!headingMatch) {
    throw new Error('Missing required "## Entries" heading.');
  }
  const entriesSection = content.slice(headingMatch.index + headingMatch[0].length);
  return entriesSection
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter((entry) => entry.length > 0);
}

function loadAllowlistEntries() {
  const content = readFileSync(`${REPO_ROOT}/${ALLOWLIST_PATH}`, 'utf8');
  try {
    return parseAllowlistEntries(content);
  } catch (error) {
    throw new Error(`Failed to parse ${ALLOWLIST_PATH}`, { cause: error });
  }
}

function main() {
  regenerateReports();

  const diffCheck = captureOutput('git', ['diff', '--exit-code', '--', BASELINES_PATH]);
  if (diffCheck.status === 0) {
    console.log('API reports match the checked-in baselines. Gate passes.');
    return;
  }
  if (diffCheck.status !== 1) {
    throw new Error(
      `"git diff --exit-code -- ${BASELINES_PATH}" exited with status ${diffCheck.status}: ${diffCheck.stderr}`,
    );
  }

  const diffText = captureOutput('git', ['diff', '--', BASELINES_PATH]).stdout;
  const changeGroups = extractChangedLineGroups(diffText);
  const allowlistEntries = loadAllowlistEntries();

  const isGroupAllowed = (group) =>
    group.some((line) => allowlistEntries.some((entry) => line.includes(entry)));
  const unmatchedGroups = changeGroups.filter((group) => !isGroupAllowed(group));

  if (unmatchedGroups.length > 0) {
    console.error('API report differs from the checked-in baseline, and the following changed line(s)');
    console.error(`are not covered by any entry in ${ALLOWLIST_PATH}:\n`);
    for (const group of unmatchedGroups) {
      for (const line of group) {
        console.error(`  ${line}`);
      }
      console.error('');
    }
    console.error(`If this break is documented and expected, add an allowlist entry to ${ALLOWLIST_PATH}.`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `API report differs from the checked-in baseline, but all ${changeGroups.length} changed block(s) are covered by ${ALLOWLIST_PATH}. Gate passes.`,
  );
}

// Only run the gate when this file is executed directly (`node check-api-report.mjs`),
// not when it's imported (e.g. by check-api-report.test.mjs) to reuse `parseAllowlistEntries`.
const isMainModule = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMainModule) {
  try {
    main();
  } catch (error) {
    console.error('API-report gate failed to run.', error);
    process.exitCode = 1;
  }
}
