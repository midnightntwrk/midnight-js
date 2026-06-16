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

// Inject (or restore) a Yarn `file:` resolution that points the
// @midnight-ntwrk/compact-runtime dependency at the locally-built package
// under `.compact-runtime-home/`. Run `yarn install` afterwards to materialize.
//
// Uses `file:` rather than `portal:` so Yarn installs the runtime's transitive
// dependencies (e.g. @noble/hashes, object-inspect) into the root workspace.
// `portal:` would symlink the package but skip its dependency tree.

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(repoRoot, 'package.json');
const runtimeHome = path.join(repoRoot, '.compact-runtime-home');
const sourceSpec = 'file:./.compact-runtime-home';
const dependencyKey = '@midnight-ntwrk/compact-runtime';

const restore = process.argv.includes('--restore');

let raw;
try {
  raw = fs.readFileSync(packageJsonPath, 'utf8');
} catch (err) {
  console.error(`Error reading ${packageJsonPath}: ${err.message}`);
  process.exit(1);
}

let pkg;
try {
  pkg = JSON.parse(raw);
} catch (err) {
  console.error(`Error parsing ${packageJsonPath} as JSON: ${err.message}`);
  process.exit(1);
}

function write(updated) {
  const next = JSON.stringify(updated, null, 2) + '\n';
  if (next === raw) {
    console.log('No change to package.json.');
    return;
  }
  fs.writeFileSync(packageJsonPath, next);
}

if (restore) {
  if (pkg.resolutions && pkg.resolutions[dependencyKey] === sourceSpec) {
    delete pkg.resolutions[dependencyKey];
    if (Object.keys(pkg.resolutions).length === 0) {
      delete pkg.resolutions;
    }
    write(pkg);
    console.log(`Removed file: resolution for ${dependencyKey}. Run 'yarn install' to materialize.`);
  } else {
    console.log(`No source-build resolution for ${dependencyKey} present; nothing to restore.`);
  }
  process.exit(0);
}

const runtimePackageJson = path.join(runtimeHome, 'package.json');
if (!fs.existsSync(runtimePackageJson)) {
  console.error(`Error: ${runtimePackageJson} not found.`);
  console.error('Run ./scripts/build-compact-runtime.sh (or ./scripts/build-compact-runtime-docker.sh) first.');
  process.exit(1);
}

pkg.resolutions = pkg.resolutions || {};
pkg.resolutions[dependencyKey] = sourceSpec;
write(pkg);
console.log(`Injected file: resolution for ${dependencyKey} → ${sourceSpec}.`);
console.log("Run 'yarn install' (without --immutable) to materialize.");
