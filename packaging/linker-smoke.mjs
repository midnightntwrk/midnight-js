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
// The isolated-linker install smoke (spec AC6, split-topology milestone).
//
// Builds each dApp persona outside the workspace, installs it from the packed
// framework tarballs with an isolated linker, and runs its entry. Usage:
//
//   node packaging/linker-smoke.mjs [pnpm|pnp] [retained|current] ...
//
// Defaults to every linker and every persona.

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import {
  CONTRACT_PACKAGES,
  contractPackageManifest,
  CURRENT_RUNTIME,
  PACKAGING_DIR,
  PERSONAS,
  personaManifest,
  readManifest,
  RETAINED_RUNTIME,
  REPOSITORY_ROOT
} from './personas.mjs';

/**
 * Outside the repository, deliberately, and at a deliberately short path.
 *
 * Outside, because Node resolution walks *up* the directory tree: a persona built
 * inside the repo reaches the monorepo's own hoisted `node_modules` from any
 * depth, which makes the install look isolated while it is not. Under pnpm's
 * linker the persona could resolve `onchain-runtime-v3` it never declared, purely
 * because the repo root had it; Yarn PnP hid the same defect by not walking up.
 *
 * Short, because pnpm's content-addressable store encodes a tarball's path into a
 * store filename. A deep checkout plus this repo's longer package names overflows
 * `NAME_MAX` with `ENAMETOOLONG`. Staging the tarballs beside the personas keeps
 * the encoded path short regardless of where the checkout lives.
 */
const SHORT_ROOT = process.platform === 'win32' ? os.tmpdir() : '/tmp';
const WORK_DIR = path.join(SHORT_ROOT, 'mjs-packaging');
export const STAGED_TARBALL_DIR = path.join(WORK_DIR, 'tgz');
const PNPM_STORE_DIR = path.join(WORK_DIR, 'pnpm-store');

/**
 * The Yarn release this repository pins, invoked directly. `yarn` on PATH is
 * whatever the machine happens to have -- CI's is 1.22 -- and a `packageManager`
 * field would only turn that mismatch into an error rather than fixing it.
 */
const YARN_BIN = path.join(REPOSITORY_ROOT, '.yarn', 'releases', 'yarn-4.14.1.cjs');

/**
 * Resolved from this repository's own pinned devDependency, not from PATH and not
 * through Corepack. `pnpm` exports only its own `package.json`, so the bin is
 * reached by resolving that and reading the `bin` map rather than by subpath.
 */
const PNPM_BIN = (() => {
  const require = createRequire(import.meta.url);
  // `pnpm`'s only export is its own manifest, so "." resolves to package.json.
  const manifestPath = require.resolve('pnpm');
  const binRelative = require(manifestPath).bin?.pnpm;
  if (typeof binRelative !== 'string') {
    throw new Error('The pinned pnpm package declares no `pnpm` bin');
  }
  return path.join(path.dirname(manifestPath), binRelative);
})();

/**
 * The linkers under test. Both isolate: pnpm's default gives each package its own
 * `node_modules` with symlinks, and Yarn PnP gives no `node_modules` at all. A
 * hoisted linker is deliberately absent -- it cannot satisfy two Compact runtime
 * majors in one tree, which is the situation a retained-era dApp is in.
 */
export const LINKERS = {
  pnpm: {
    // No `packageManager` field: that would route the call through Corepack, which
    // resolves and verifies its own download. The version under test is the one
    // this repo pins as a devDependency, invoked directly.
    packageManager: undefined,
    install: (cwd) =>
      execFileSync(
        'node',
        [PNPM_BIN, 'install', '--no-frozen-lockfile', '--ignore-scripts', '--store-dir', PNPM_STORE_DIR],
        { cwd, stdio: 'inherit' }
      ),
    runCommand: (args) => [process.execPath, args],
    run: (cwd, args) => execFileSync(process.execPath, args, { cwd, stdio: 'inherit' })
  },
  pnp: {
    // Same reasoning as pnpm: the version under test is a pinned file in this
    // repository, not whatever a resolver decides to fetch.
    packageManager: undefined,
    install: (cwd) => {
      // The scope registry has to be declared here. Yarn finds configuration by
      // walking up from the project, and the persona deliberately sits outside
      // this repository, so it no longer inherits the root `.yarnrc.yml`.
      // `npmAuthToken` comes from YARN_NPM_AUTH_TOKEN in the environment.
      writeFileSync(
        path.join(cwd, '.yarnrc.yml'),
        [
          'nodeLinker: pnp',
          'enableGlobalCache: false',
          'npmScopes:',
          '  midnight-ntwrk:',
          '    npmAlwaysAuth: true',
          '    npmRegistryServer: "https://npm.pkg.github.com/"',
          // Upstream packaging defects, surfaced by PnP because it refuses an
          // undeclared dependency where a hoisted tree silently satisfies one.
          // These are patches for OTHER people's manifests, not for ours; each
          // should be dropped when the upstream package declares its own.
          'packageExtensions:',
          '  "@midnightntwrk/wallet-sdk-facade@*":',
          '    dependencies:',
          '      "@midnightntwrk/wallet-sdk-utilities": "*"',
          // beta.3 runs ledger-v8 below the chain's fork version and reaches for
          // it on the OLD npm scope without declaring it. Dual-published, so the
          // old name resolves. One entry per package: YAML keeps only the last
          // mapping for a repeated key, so a second block would drop the line above.
          '      "@midnight-ntwrk/ledger-v8": "8.1.2"',
          '  "@midnightntwrk/wallet-sdk-node-client@*":',
          '    dependencies:',
          '      "@polkadot/api-base": "*"',
          ''
        ].join('\n'),
        'utf8'
      );
      writeFileSync(path.join(cwd, 'yarn.lock'), '', 'utf8');
      execFileSync('node', [YARN_BIN, 'install', '--no-immutable'], { cwd, stdio: 'inherit' });
    },
    // PnP has no `node_modules`, so resolution only works through Yarn's loader.
    runCommand: (args) => [process.execPath, [YARN_BIN, 'node', ...args]],
    run: (cwd, args) => execFileSync(process.execPath, [YARN_BIN, 'node', ...args], { cwd, stdio: 'inherit' })
  }
};

export const buildPersona = (name, linkerName, manifest, entryOverride) => {
  const persona = PERSONAS[name];
  const linker = LINKERS[linkerName];
  const cwd = path.join(WORK_DIR, `${name}-${linkerName}`);

  rmSync(cwd, { recursive: true, force: true });
  mkdirSync(cwd, { recursive: true });

  writeFileSync(
    path.join(cwd, 'package.json'),
    `${JSON.stringify(personaManifest(name, persona, manifest, linker.packageManager, STAGED_TARBALL_DIR), null, 2)}\n`,
    'utf8'
  );
  cpSync(path.join(PACKAGING_DIR, `${entryOverride ?? persona.entry ?? 'persona-entry'}.mjs`), path.join(cwd, 'entry.mjs'));

  if (persona.contractSource !== undefined) {
    cpSync(path.join(REPOSITORY_ROOT, persona.contractSource, 'contract'), path.join(cwd, 'contract'), {
      recursive: true
    });
  }

  // Each contract is wrapped in its own package declaring the Compact runtime its
  // codegen demands, so the linker -- not a hoisting accident -- is what decides
  // whether both eras can be loaded at once.
  for (const key of persona.contracts ?? []) {
    const contract = CONTRACT_PACKAGES[key];
    const contractDir = path.join(cwd, 'contracts', key);
    mkdirSync(contractDir, { recursive: true });
    writeFileSync(
      path.join(contractDir, 'package.json'),
      `${JSON.stringify(contractPackageManifest(contract), null, 2)}\n`,
      'utf8'
    );
    cpSync(path.join(REPOSITORY_ROOT, contract.source), contractDir, { recursive: true });
  }

  return { cwd, persona, linker };
};

/**
 * Copies the packed tarballs beside the personas.
 *
 * Exported because the AC0 driver installs a persona too, and both have to stage
 * the same way: pnpm encodes a tarball's path into a store filename.
 */
export const stageTarballs = (manifest) => {
  rmSync(STAGED_TARBALL_DIR, { recursive: true, force: true });
  mkdirSync(STAGED_TARBALL_DIR, { recursive: true });
  for (const relative of Object.values(manifest.packages)) {
    const source = path.join(PACKAGING_DIR, relative);
    cpSync(source, path.join(STAGED_TARBALL_DIR, path.basename(source)));
  }
};

const main = () => {
  const requested = process.argv.slice(2);
  const linkerNames = requested.filter((argument) => argument in LINKERS);
  const personaNames = requested.filter((argument) => argument in PERSONAS);
  const linkers = linkerNames.length > 0 ? linkerNames : Object.keys(LINKERS);
  const personas = personaNames.length > 0 ? personaNames : Object.keys(PERSONAS);

  const manifest = readManifest();

  stageTarballs(manifest);

  const failures = [];

  for (const linkerName of linkers) {
    for (const personaName of personas) {
      const label = `${personaName} persona / ${linkerName} linker`;
      process.stdout.write(`\n=== ${label} ===\n`);
      try {
        const { cwd, persona, linker } = buildPersona(personaName, linkerName, manifest);
        linker.install(cwd);
        linker.run(cwd, ['entry.mjs', personaName, persona.runtime ?? '', RETAINED_RUNTIME, CURRENT_RUNTIME]);
        process.stdout.write(`--- ${label}: ok\n`);
      } catch (error) {
        failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
        process.stdout.write(`--- ${label}: FAILED\n`);
      }
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      process.stderr.write(`::error::${failure}\n`);
    }
    process.exit(1);
  }
  process.stdout.write(`\nAll ${linkers.length * personas.length} persona/linker combinations passed.\n`);
};

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
