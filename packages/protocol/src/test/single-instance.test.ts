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

import { execFileSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

// `yarn info --all` emits one NDJSON record per resolved version of a package.
// A version this repo did not ask for means a second physical copy on that
// line, which is the fault `lib/v8/instance-guard.ts` detects at run time on a
// different axis.
//
// compact-js declares `@midnightntwrk/ledger-v9@^1.0.0-rc.4` and
// `@midnight-ntwrk/compact-runtime@0.19.0-rc.0`, while this repo pins rc.4 and
// 0.19.0 in root `resolutions`. These assertions are what turns "the pins
// should win" into something the build checks.
const resolvedVersionsOf = (packageName: string): string[] => {
  const raw = execFileSync('yarn', ['info', packageName, '--json', '--all'], {
    cwd: new URL('../../../../', import.meta.url).pathname,
    encoding: 'utf8'
  });
  return raw
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as { value: string; children: { Version: string } })
    .filter((record) => record.value.startsWith(`${packageName}@npm:`))
    .map((record) => record.children.Version)
    .sort();
};

describe('installed ledger and runtime instances', () => {
  it('resolves exactly one @midnightntwrk/ledger-v9, at the pinned version', () => {
    expect(resolvedVersionsOf('@midnightntwrk/ledger-v9')).toEqual(['1.0.0-rc.4']);
  });

  // TWO copies of compact-runtime are correct and load-bearing: the 0.16 line
  // is the ledger-8 era's runtime, reached through the `compact-runtime-ledger8`
  // npm alias, and 0.19 is the current era's. What must never appear is a THIRD
  // -- a second copy of either line, which is what compact-js's own
  // `0.19.0-rc.0` would become if the root `resolutions` pin stopped holding.
  it('resolves exactly one copy of each compact-runtime era line', () => {
    expect(resolvedVersionsOf('@midnight-ntwrk/compact-runtime')).toEqual(['0.16.0', '0.19.0']);
  });
});
