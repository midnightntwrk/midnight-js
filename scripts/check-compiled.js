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

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const flags = new Set(args.filter((a) => a.startsWith('--')));
const compiledDirPath = positional[0];
const forceOnCompactHome = flags.has('--force-on-compact-home');

if (!compiledDirPath) {
  console.error('Error: Please provide the path to the compiled directory as an argument.');
  console.error('Usage: node check-compiled.js <path-to-compiled-dir> [--force-on-compact-home]');
  process.exit(1);
}

const compiledDir = path.join(process.cwd(), compiledDirPath);
const compactHome = process.env.COMPACT_HOME;

// Fail fast: if COMPACT_HOME is set but its compactc wrapper is missing, the
// downstream `yarn compact` would still fail (run-compactc spawns the missing
// binary and emits a cryptic ENOENT) — surface a pointed error here instead.
if (compactHome) {
  const compactcBin = path.join(compactHome, 'compactc');
  if (!fs.existsSync(compactcBin)) {
    console.error(`Error: COMPACT_HOME=${compactHome} but '${compactcBin}' not found.`);
    console.error('Run ./scripts/build-compactc.sh (or ./scripts/build-compactc-docker.sh) first.');
    process.exit(1);
  }
}

function newestMtimeMs(filePaths) {
  let newest = 0;
  for (const p of filePaths) {
    try {
      const t = fs.statSync(p).mtime.getTime();
      if (t > newest) newest = t;
    } catch {
      // missing entry: ignore
    }
  }
  return newest;
}

function oldestMtimeMs(dir) {
  let oldest = Infinity;
  for (const entry of fs.readdirSync(dir, { recursive: true })) {
    const full = path.join(dir, entry);
    try {
      const stat = fs.statSync(full);
      if (stat.isFile()) {
        const t = stat.mtime.getTime();
        if (t < oldest) oldest = t;
      }
    } catch {
      // unreadable entry: ignore
    }
  }
  return oldest === Infinity ? 0 : oldest;
}

function listSourceCompactFiles(dir) {
  const sourceDir = path.resolve(dir, '..');
  try {
    return fs.readdirSync(sourceDir)
      .filter((f) => f.endsWith('.compact'))
      .map((f) => path.join(sourceDir, f));
  } catch {
    return [];
  }
}

function runCompact(reason) {
  console.log(reason);
  execSync('yarn compact', { stdio: 'inherit' });
}

if (!fs.existsSync(compiledDir)) {
  runCompact(`Compiled directory not found at ${compiledDirPath}. Running yarn compact...`);
} else if (forceOnCompactHome && compactHome) {
  const sources = listSourceCompactFiles(compiledDir);
  const compactcBin = path.join(compactHome, 'compactc');
  const newestInput = newestMtimeMs([...sources, compactcBin]);
  const oldestCompiled = oldestMtimeMs(compiledDir);
  if (newestInput > oldestCompiled) {
    runCompact(
      `COMPACT_HOME=${compactHome}: compiled artifacts are stale relative to sources/compactc. Recompiling.`
    );
  } else {
    console.log(`COMPACT_HOME=${compactHome}: compiled artifacts are up-to-date. Skipping.`);
  }
} else {
  console.log(`Compiled directory exists at ${compiledDirPath}. Skipping compilation.`);
}
