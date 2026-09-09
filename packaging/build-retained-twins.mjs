#!/usr/bin/env node
// This file is part of midnight-js.
// Copyright (C) 2025-2026 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Retained-era twins of the e2e suite's contracts.
//
// AC0's question -- deployed below the boundary, called above it -- can only be
// asked of a contract the PRE-fork toolchain emitted. This repository ships one
// such fixture, `counter-016`, so until now the question was asked of a counter
// and of nothing else. These are the same `.compact` sources the e2e suite uses,
// recompiled with `compactc` 0.31.1 (language 0.23, Compact runtime 0.16.0).
//
// Generated rather than committed. The prover keys run to about 285 MB across
// the set -- `fee-mint` alone is 160 MB -- which is why `counter-016`, at 128 KB,
// could be a checked-in fixture and these cannot be.
//
//   node packaging/build-retained-twins.mjs            # build what is missing
//   node packaging/build-retained-twins.mjs --force    # rebuild everything
//   node packaging/build-retained-twins.mjs unshielded # one contract

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { REPOSITORY_ROOT, RETAINED_COMPILER, RETAINED_TWIN_DIR, RETAINED_TWINS, retainedTwinPath } from './personas.mjs';

const SOURCE_DIR = path.join(REPOSITORY_ROOT, 'testkit-js', 'testkit-js-e2e', 'src', 'contract');
const RUN_COMPACTC = path.join(REPOSITORY_ROOT, 'packages', 'compact', 'src', 'run-compactc.cjs');
const FETCH_COMPACTC = path.join(REPOSITORY_ROOT, 'packages', 'compact', 'dist', 'fetch-compact.mjs');
const MANAGED_COMPACTC = path.join(REPOSITORY_ROOT, 'packages', 'compact', 'managed', RETAINED_COMPILER, 'compactc');

/**
 * Downloads `compactc` 0.31.1 if this checkout does not already have it.
 *
 * Through the repository's own fetcher rather than a bespoke download, so the
 * release coordinates -- repo, tag prefix, asset prefix -- stay in one place. The
 * fetcher reads them from the environment, and `.envrc` sets them for the version
 * this repo builds with; they are the same for 0.31.1.
 */
const ensureCompiler = () => {
  if (existsSync(MANAGED_COMPACTC)) {
    return;
  }
  if (!existsSync(FETCH_COMPACTC)) {
    throw new Error(`${FETCH_COMPACTC} is missing; run \`yarn build\` before building the retained twins`);
  }
  process.stdout.write(`Fetching compactc ${RETAINED_COMPILER}...\n`);
  execFileSync(process.execPath, [FETCH_COMPACTC, `--version=${RETAINED_COMPILER}`], {
    cwd: REPOSITORY_ROOT,
    stdio: 'inherit'
  });
  if (!existsSync(MANAGED_COMPACTC)) {
    throw new Error(`compactc ${RETAINED_COMPILER} is still absent after fetching it`);
  }
};

/**
 * Builds one twin, and answers whether it had to.
 *
 * The presence check is on the emitted module rather than on the directory: a
 * compile that died partway leaves the directory behind, and treating that as
 * done would hand the persona a package with no `Contract` in it.
 */
const buildTwin = (key, force) => {
  const target = retainedTwinPath(key);
  if (!force && existsSync(path.join(target, 'contract', 'index.js'))) {
    return false;
  }
  rmSync(target, { recursive: true, force: true });
  execFileSync(process.execPath, [RUN_COMPACTC, path.join(SOURCE_DIR, `${key}.compact`), target], {
    cwd: REPOSITORY_ROOT,
    // The wrapper picks the newest managed version unless told otherwise, and
    // this checkout also has the current one -- so naming the version is what
    // makes these twins retained rather than a second copy of the current era.
    env: { ...process.env, COMPACTC_VERSION: RETAINED_COMPILER },
    stdio: 'inherit'
  });
  return true;
};

/**
 * Builds every requested twin.
 *
 * @param keys Twins to build; defaults to all of them.
 * @param force Rebuild even where artifacts are already present.
 * @returns The keys that were compiled, which is empty on a warm run.
 */
export const buildRetainedTwins = (keys = RETAINED_TWINS, force = false) => {
  ensureCompiler();
  mkdirSync(RETAINED_TWIN_DIR, { recursive: true });
  const built = [];
  for (const key of keys) {
    if (buildTwin(key, force)) {
      built.push(key);
    }
  }
  return built;
};

const main = () => {
  const argv = process.argv.slice(2);
  const force = argv.includes('--force');
  const requested = argv.filter((argument) => !argument.startsWith('--'));
  const unknown = requested.filter((key) => !RETAINED_TWINS.includes(key));
  if (unknown.length > 0) {
    process.stderr.write(`Not a retained-buildable contract: ${unknown.join(', ')}\n`);
    process.exit(1);
  }
  const keys = requested.length > 0 ? requested : RETAINED_TWINS;
  const built = buildRetainedTwins(keys, force);
  process.stdout.write(
    built.length === 0
      ? `All ${keys.length} retained twins were already built in ${RETAINED_TWIN_DIR}\n`
      : `Built ${built.length} retained twin(s) in ${RETAINED_TWIN_DIR}: ${built.join(', ')}\n`
  );
};

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
