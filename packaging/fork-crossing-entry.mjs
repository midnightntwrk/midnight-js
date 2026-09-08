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
// The dApp AC0 describes: one build, holding a contract from each ledger era at
// once, installed the way a consumer installs it.
//
// This entry asserts the property everything else in AC0 rests on -- that both
// contract modules can be *executed* in one process. Each was emitted by a
// different Compact toolchain and opens by asserting its own runtime version, so
// a single hoisted copy makes one of them throw on import. Nothing about the
// fork can be tested in one session until this holds.

import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);

// Expectations come from the harness, never restated here: a literal copy agrees
// with a stale generated manifest instead of catching it, which is exactly how a
// drifted runtime pin went unnoticed once.
//
// Layout, as `linker-smoke.mjs` builds it:
//   argv[2] persona name
//   argv[3] the persona's own runtime, empty for this one -- it declares none
//   argv[4] expected retained runtime
//   argv[5] expected current runtime
const [expectedRetainedRuntime, expectedCurrentRuntime] = process.argv.slice(4);

const failures = [];
const observed = {};

const check = (label, actual, expected) => {
  observed[label] = actual;
  if (actual !== expected) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};

/** The Compact runtime version a given package resolves, from that package's own position. */
const runtimeSeenBy = (packageName) => {
  const resolver = createRequire(require.resolve(`${packageName}/package.json`));
  return require(resolver.resolve('@midnight-ntwrk/compact-runtime/package.json')).version;
};

// 1. Each wrapped contract resolves the runtime its own codegen demands. These are
//    two different physical copies in one install; a hoisted tree has only one.
if (!expectedRetainedRuntime || !expectedCurrentRuntime) {
  throw new Error('the harness did not pass both expected runtime versions');
}
check('retained contract sees runtime', runtimeSeenBy('@midnight-ntwrk/ac0-contract-retained'), expectedRetainedRuntime);
check('current contract sees runtime', runtimeSeenBy('@midnight-ntwrk/ac0-contract-current'), expectedCurrentRuntime);

// 2. Both modules import. `checkRuntimeVersion` runs at import time and throws on a
//    mismatch, so a successful import of BOTH is the assertion -- and it is the one
//    that fails the moment the two copies above collapse into one.
for (const [label, specifier] of [
  ['retained contract module', '@midnight-ntwrk/ac0-contract-retained'],
  ['current contract module', '@midnight-ntwrk/ac0-contract-current']
]) {
  try {
    const module = await import(specifier);
    const contract = module.Contract ?? module.default?.Contract;
    observed[label] = typeof contract === 'function' ? 'ok' : `imported, but exports no Contract (${typeof contract})`;
    if (observed[label] !== 'ok') {
      failures.push(`${label}: ${observed[label]}`);
    }
  } catch (error) {
    failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 3. The framework loads alongside both of them, and reaches the retained era on
//    demand -- the dApp holds two eras' contracts and one framework.
try {
  const protocol = await import('@midnight-ntwrk/midnight-js-protocol');
  observed['framework sees runtime'] = runtimeSeenBy('@midnight-ntwrk/midnight-js-protocol');
  const ledger8 = await protocol.loadLedger8();
  observed['loadLedger8'] = typeof ledger8 === 'object' && ledger8 !== null ? 'ok' : String(ledger8);
  if (observed['loadLedger8'] !== 'ok') {
    failures.push(`loadLedger8 returned ${observed['loadLedger8']}`);
  }
} catch (error) {
  failures.push(`framework load: ${error instanceof Error ? error.message : String(error)}`);
}

process.stdout.write(`${JSON.stringify({ persona: 'fork-crossing', observed, failures }, null, 2)}\n`);
process.exit(failures.length === 0 ? 0 : 1);
