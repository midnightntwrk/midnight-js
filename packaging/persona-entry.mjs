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
// Runs inside an installed persona, not in the monorepo. Everything it imports
// resolves the way a real consumer's install resolves it, which is the only
// place these assertions mean anything.
//
// Exits non-zero on the first failed expectation, and prints what it observed
// either way -- a smoke that only says "ok" is impossible to debug from CI logs.

import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { realpathSync } from 'node:fs';

const require = createRequire(import.meta.url);
const [, , personaName, expectedRuntime, frameworkRuntime] = process.argv;

const failures = [];
const observed = {};

const check = (label, actual, expected) => {
  observed[label] = actual;
  if (actual !== expected) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};

/** The version of a package as this persona resolves it, from a given resolution base. */
const versionOf = (specifier, fromSpecifier) => {
  const base =
    fromSpecifier === undefined
      ? require.resolve(`${specifier}/package.json`)
      : createRequire(require.resolve(fromSpecifier)).resolve(`${specifier}/package.json`);
  return require(base).version;
};

const realPathOf = (specifier, fromSpecifier) => {
  const resolver = fromSpecifier === undefined ? require : createRequire(require.resolve(fromSpecifier));
  return realpathSync(path.dirname(resolver.resolve(`${specifier}/package.json`)));
};

// 1. The persona's own Compact runtime is the one its era's codegen demands.
check('persona compact-runtime', versionOf('@midnight-ntwrk/compact-runtime'), expectedRuntime);

// 2. The framework brings its own, which for the retained persona is a DIFFERENT
//    major living in the same install. A hoisted linker cannot satisfy both.
check(
  'framework compact-runtime',
  versionOf('@midnight-ntwrk/compact-runtime', '@midnight-ntwrk/midnight-js-protocol'),
  frameworkRuntime
);

// 3. The contract module asserts its own runtime version at import time, so a
//    successful import is the assertion. This is the line that fails loudly if
//    the two copies above collapsed into one.
try {
  await import('./contract/index.js');
  observed['contract module import'] = 'ok';
} catch (error) {
  failures.push(`contract module import: ${error instanceof Error ? error.message : String(error)}`);
}

// 4. The retained era's runtime is reached only through the framework's loader,
//    and must resolve to exactly one physical copy -- two would make objects
//    minted by one unusable by the other (Ledger8InstanceMismatchError).
if (personaName === 'retained') {
  try {
    const protocol = await import('@midnight-ntwrk/midnight-js-protocol');
    const ledger8 = await protocol.loadLedger8();
    observed['loadLedger8'] = typeof ledger8 === 'object' && ledger8 !== null ? 'ok' : String(ledger8);
    if (observed['loadLedger8'] !== 'ok') {
      failures.push(`loadLedger8 returned ${observed['loadLedger8']}`);
    }
    const paths = new Set(
      ['@midnight-ntwrk/midnight-js-protocol', '@midnight-ntwrk/midnight-js'].map((from) => {
        try {
          return realPathOf('@midnight-ntwrk/onchain-runtime-v3', from);
        } catch {
          return 'unresolved';
        }
      })
    );
    paths.delete('unresolved');
    observed['onchain-runtime-v3 copies'] = paths.size;
    if (paths.size > 1) {
      failures.push(`onchain-runtime-v3 resolved to ${paths.size} distinct copies: ${[...paths].join(', ')}`);
    }
  } catch (error) {
    failures.push(`retained-era load: ${error instanceof Error ? error.message : String(error)}`);
  }
}

process.stdout.write(`${JSON.stringify({ persona: personaName, observed, failures }, null, 2)}\n`);
process.exit(failures.length === 0 ? 0 : 1);
