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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// `yarn info` emits one NDJSON record per resolved version of a package. A
// version this repo did not ask for means a second physical copy on that line,
// which is the fault `lib/v8/instance-guard.ts` detects at run time on a
// different axis.
//
// BOTH flags are load-bearing, do not drop either. Per `yarn info --help`:
//   --all  "all versions of the package that are DIRECT dependencies of any of
//          your workspaces" -- so it widens across workspaces, and nothing more.
//   -R     "will also report TRANSITIVE dependencies". Without it the duplicate
//          this test exists to catch cannot appear at all: it is by construction
//          a transitive resolution of compact-js, never a workspace's own
//          descriptor, so the assertion would stay green whatever the tree held.
//          Measured in this repo: `@commitlint/config-conventional` reports
//          ['20.5.0'] with `--all` alone and ['20.5.0', '21.2.2'] with `-R`.
//
// As of compact-js 3.0.0-rc.0 it declares `@midnightntwrk/ledger-v9@^1.0.0-rc.4`,
// `@midnight-ntwrk/compact-runtime@0.19.0-rc.0` AND its own
// `compact-runtime-ledger8` alias at 0.16.0 -- so the 0.16 line is no longer
// reached solely through this repo's alias, and a drifting compact-js could
// introduce a second copy of either line on its own. The expected versions are
// read from the manifests that pin them rather than restated here, so a
// legitimate bump reads as "one copy per line, still" instead of a fault.
const repoRoot = new URL('../../../../', import.meta.url);

const fieldOf = (value: unknown, key: string): unknown =>
  typeof value === 'object' && value !== null ? new Map<string, unknown>(Object.entries(value)).get(key) : undefined;

/** Reads `<section>.<key>` out of a manifest, failing by name rather than by `undefined` downstream. */
const manifestEntry = (manifestPath: string, section: string, key: string): string => {
  const absolutePath = fileURLToPath(new URL(manifestPath, repoRoot));
  const parsed: unknown = JSON.parse(readFileSync(absolutePath, 'utf8'));
  const entry = fieldOf(fieldOf(parsed, section), key);
  if (typeof entry !== 'string') {
    throw new Error(`${absolutePath} declares no string \`${section}.${key}\``);
  }
  return entry;
};

/** `1.0.0-rc.4` and `npm:@midnight-ntwrk/compact-runtime@0.16.0` both yield the bare version. */
const versionOf = (descriptor: string): string => {
  const version = descriptor.slice(descriptor.lastIndexOf('@') + 1);
  if (!/^\d/.test(version)) {
    throw new Error(`\`${descriptor}\` is not a descriptor this test can read a version out of`);
  }
  return version;
};

interface YarnInfoRecord {
  readonly value: string;
  readonly children: { readonly Version: string };
}

const isYarnInfoRecord = (parsed: unknown): parsed is YarnInfoRecord =>
  typeof parsed === 'object' &&
  parsed !== null &&
  'value' in parsed &&
  typeof parsed.value === 'string' &&
  'children' in parsed &&
  typeof parsed.children === 'object' &&
  parsed.children !== null &&
  'Version' in parsed.children &&
  typeof parsed.children.Version === 'string';

const streamOf = (error: unknown, key: 'stdout' | 'stderr'): string => {
  if (typeof error !== 'object' || error === null) {
    return '';
  }
  const stream: unknown =
    key === 'stdout'
      ? 'stdout' in error
        ? error.stdout
        : undefined
      : 'stderr' in error
        ? error.stderr
        : undefined;
  if (typeof stream === 'string') {
    return stream;
  }
  return Buffer.isBuffer(stream) ? stream.toString('utf8') : '';
};

// A `yarn info` no-match writes "No package matched your request" to STDOUT and
// exits non-zero. `execFileSync` throws with that text on the error object,
// where vitest never shows it, so it is folded into the message here.
const runYarnInfo = (packageName: string): string => {
  const argv = ['info', packageName, '--json', '--all', '-R'];
  try {
    return execFileSync('yarn', argv, {
      // `URL#pathname` does not percent-decode, so a checkout under a path
      // containing a space (or other percent-encoded character) would resolve
      // to the wrong `cwd`. `fileURLToPath` decodes it correctly.
      cwd: fileURLToPath(repoRoot),
      encoding: 'utf8'
    });
  } catch (error) {
    throw new Error(
      `\`yarn ${argv.join(' ')}\` failed.\nstdout:\n${streamOf(error, 'stdout')}\nstderr:\n${streamOf(error, 'stderr')}`,
      { cause: error }
    );
  }
};

// Lexicographic order would put a future `0.9.0` after `0.16.0` and fail as a
// false alarm; numeric collation compares each digit run as a number.
const byVersion = new Intl.Collator('en', { numeric: true }).compare;

const resolvedVersionsOf = (packageName: string): string[] =>
  runYarnInfo(packageName)
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      const parsed: unknown = JSON.parse(line);
      if (!isYarnInfoRecord(parsed)) {
        throw new Error(`\`yarn info ${packageName}\` emitted an unreadable record on line ${index + 1}: ${line}`);
      }
      return parsed;
    })
    .filter((record) => record.value.startsWith(`${packageName}@npm:`))
    .map((record) => record.children.Version)
    .sort(byVersion);

describe('installed ledger and runtime instances', () => {
  it('resolves exactly one @midnightntwrk/ledger-v9, at the pinned version', () => {
    const pinned = versionOf(manifestEntry('package.json', 'resolutions', '@midnightntwrk/ledger-v9'));

    expect(resolvedVersionsOf('@midnightntwrk/ledger-v9')).toEqual([pinned]);
  });

  // TWO copies of compact-runtime are correct and load-bearing: the 0.16 line
  // is the ledger-8 era's runtime, reached through the `compact-runtime-ledger8`
  // npm alias, and 0.19 is the current era's. What must never appear is a THIRD
  // -- a second copy of either line, which is what compact-js's own
  // `0.19.0-rc.0` would become if the root `resolutions` pin stopped holding.
  it('resolves exactly one copy of each compact-runtime era line', () => {
    const currentEra = versionOf(manifestEntry('package.json', 'resolutions', '@midnight-ntwrk/compact-runtime'));
    const retainedEra = versionOf(
      manifestEntry('packages/protocol/package.json', 'dependencies', 'compact-runtime-ledger8')
    );

    expect(resolvedVersionsOf('@midnight-ntwrk/compact-runtime')).toEqual([retainedEra, currentEra].sort(byVersion));
  });
});
