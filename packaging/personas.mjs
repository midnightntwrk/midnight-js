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
// The two dApp personas the split-topology milestone is about, and the
// declarations that make them different from each other.
//
// A retained-era dApp pins `@midnight-ntwrk/compact-runtime@0.16.0`, because the
// contract module its pre-fork toolchain emitted calls
// `checkRuntimeVersion('0.16.0')` and throws otherwise. The framework it installs
// pins 0.19 for itself. Both majors therefore have to be resolvable in one
// install -- which a hoisted linker cannot do and an isolated one can. That is
// the whole point of the smoke, and it is why the monorepo cannot show it: there
// is only ever one copy in the workspace tree.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACKAGING_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = path.resolve(PACKAGING_DIR, '..');
export const TARBALL_DIR = path.join(PACKAGING_DIR, '.tarballs');

/** Where each persona's contract module comes from, relative to the repository root. */
const RETAINED_CONTRACT = 'testkit-js/testkit-js/src/fixtures/hf/counter-016/compiled';
const CURRENT_CONTRACT = 'testkit-js/testkit-js-e2e/src/contract/compiled/counter';

/** Where the e2e suite's compiled contracts live, relative to the repository root. */
const E2E_COMPILED = 'testkit-js/testkit-js-e2e/src/contract/compiled';

/**
 * The current-era contracts the AC0 matrix drives after the boundary.
 *
 * The retained toolchain (`compactc` 0.31.1) left exactly one COMMITTED fixture
 * in this repository, `counter-016`; retained-era twins of these are built on
 * demand instead -- see {@link RETAINED_TWINS}, which covers six of the seven.
 * `events` is the one for which the retained half of AC0 cannot be posed at all.
 *
 * What this current-era set covers is the other half of the same question:
 * whether the framework's full contract surface works on a chain that carries
 * pre-fork history, which is where every consumer is on day one after the fork.
 */
export const MATRIX_CONTRACTS = [
  'simple',
  'unshielded',
  'shielded',
  'shielded-fallible',
  'fee-mint',
  'events',
  'block-time'
];

/**
 * The last compiler of the previous era, and the one `counter-016` was built
 * with. A constant in the same sense {@link RETAINED_RUNTIME} is: 0.31.1 is what
 * the pre-fork toolchain was, and it does not move.
 */
export const RETAINED_COMPILER = '0.31.1';

/** Where `build-retained-twins.mjs` puts what it compiles. Gitignored -- the set is about 262 MB. */
export const RETAINED_TWIN_DIR = path.join(PACKAGING_DIR, '.retained');

/** One twin's artifact directory, which is also the ZK artifact root a provider is pointed at. */
export const retainedTwinPath = (key) => path.join(RETAINED_TWIN_DIR, key);

/**
 * The e2e contracts a RETAINED-era twin can be built for, so that AC0's actual
 * question -- deployed below the boundary, called above it -- can be asked of
 * something other than a counter.
 *
 * `events` is absent and cannot be added: contract events are a MIP-0002 feature
 * and `emit` is not a language-0.23 form, so `events.compact` fails to compile
 * against this toolchain with `unbound identifier emit`. Everything else builds
 * from the same unmodified source the current-era suite compiles.
 */
export const RETAINED_TWINS = ['simple', 'unshielded', 'shielded', 'shielded-fallible', 'fee-mint', 'block-time'];

/**
 * The Compact runtime each persona declares. These two numbers are the experiment:
 * the retained one is what the pre-fork toolchain's codegen asserts, the current
 * one is what this repo's own toolchain asserts.
 */
export const RETAINED_RUNTIME = '0.16.0';

/**
 * Read from the repository's own pin rather than restated here.
 *
 * The current contract module is recompiled whenever the toolchain moves, and it
 * asserts its runtime version at import time -- so a hardcoded copy of this
 * number silently goes stale on every `compactc` bump and the persona then fails
 * for a reason that has nothing to do with what it is testing. The retained one
 * above is a genuine constant: 0.16.0 is fixed by the pre-fork toolchain.
 */
export const CURRENT_RUNTIME = (() => {
  const root = JSON.parse(readFileSync(path.join(REPOSITORY_ROOT, 'package.json'), 'utf8'));
  // `resolutions` is where this repo pins it, which is also what every workspace
  // actually resolves; `devDependencies` is checked as a fallback rather than
  // assumed absent.
  const pinned =
    root.resolutions?.['@midnight-ntwrk/compact-runtime'] ??
    root.devDependencies?.['@midnight-ntwrk/compact-runtime'];
  if (typeof pinned !== 'string') {
    throw new Error('The repository root does not pin @midnight-ntwrk/compact-runtime');
  }
  return pinned;
})();

/**
 * A dApp that holds contracts from BOTH eras at once -- the shape FR0 describes.
 *
 * It declares no Compact runtime of its own. Each contract instead arrives as its
 * own little package that declares the runtime its codegen demands, which is what
 * a real consumer's tree looks like once a retained contract is packaged rather
 * than pasted in. Under an isolated linker the two runtimes coexist; that is the
 * only arrangement in which one process can execute a pre-fork contract and a
 * current one, and therefore the only arrangement in which AC0 can be written.
 */
export const CONTRACT_PACKAGES = {
  retained: { name: '@midnight-ntwrk/ac0-contract-retained', runtime: RETAINED_RUNTIME, source: RETAINED_CONTRACT },
  current: { name: '@midnight-ntwrk/ac0-contract-current', runtime: CURRENT_RUNTIME, source: CURRENT_CONTRACT },
  // Wrapped the same way as the two above rather than reached for through the
  // e2e workspace: the point of this tier is what an installed consumer can
  // resolve, and a package that came from the monorepo's own tree would answer a
  // different question.
  ...Object.fromEntries(
    MATRIX_CONTRACTS.map((key) => [
      key,
      { name: `@midnight-ntwrk/ac0-contract-${key}`, runtime: CURRENT_RUNTIME, source: `${E2E_COMPILED}/${key}` }
    ])
  ),
  // The retained twins, keyed apart from their current-era namesakes because a
  // persona holds BOTH: `unshielded` and `retained-unshielded` are the same
  // source through two toolchains, and the whole point is that they resolve
  // different Compact runtimes in one install.
  ...Object.fromEntries(
    RETAINED_TWINS.map((key) => [
      `retained-${key}`,
      {
        name: `@midnight-ntwrk/ac0-retained-${key}`,
        runtime: RETAINED_RUNTIME,
        source: path.relative(REPOSITORY_ROOT, retainedTwinPath(key))
      }
    ])
  )
};

/**
 * Narrows the AC0 matrices to a requested subset of contracts.
 *
 * The scenario is sharded one contract per CI job, and a shard that silently ran
 * the wrong set -- or nothing -- would report green for work it never did. So an
 * unknown key is refused by name rather than filtered away, and an empty
 * selection is refused too.
 *
 * `retained` is the intersection with {@link RETAINED_TWINS}, not the whole
 * request: `events` is a legitimate current-era key with no retained twin that
 * can exist, so asking for it must narrow the retained half to nothing without
 * failing.
 *
 * @param requested Contract keys, or `undefined` for the whole matrix.
 * @returns The current-era and retained-era keys this run covers.
 */
export const resolveContractSelection = (requested) => {
  if (requested === undefined) {
    return { current: [...MATRIX_CONTRACTS], retained: [...RETAINED_TWINS] };
  }
  const keys = requested.filter((key) => key !== '');
  const unknown = keys.filter((key) => !MATRIX_CONTRACTS.includes(key));
  if (unknown.length > 0) {
    throw new Error(
      `Not an AC0 matrix contract: ${unknown.join(', ')}. Known: ${MATRIX_CONTRACTS.join(', ')}`
    );
  }
  if (keys.length === 0) {
    throw new Error('An AC0 contract selection cannot be empty; omit it to run the whole matrix');
  }
  return { current: keys, retained: keys.filter((key) => RETAINED_TWINS.includes(key)) };
};

/** The retained twins as persona contract keys. */
export const RETAINED_MATRIX_CONTRACTS = RETAINED_TWINS.map((key) => `retained-${key}`);

/** The `package.json` of one wrapped contract. */
export const contractPackageManifest = (contract) => ({
  name: contract.name,
  version: '0.0.0',
  private: true,
  type: 'module',
  // `./package.json` is exported deliberately: the smoke reads it to report which
  // Compact runtime this wrapper resolved, and a package that hides its manifest
  // cannot be interrogated that way.
  //
  // `./runtime` re-exports the very `@midnight-ntwrk/compact-runtime` instance
  // this wrapper's codegen imports. A caller that has to hand the contract a
  // state value must mint it in THAT instance: `ledger()` checks its argument
  // with `instanceof`, and a handle from any other copy is refused. Resolving
  // the runtime from outside cannot answer which copy the wrapper got, so the
  // wrapper hands it over instead -- the same injection `protocol` does with
  // `Ledger8CompactRuntime`.
  exports: {
    '.': './contract/index.js',
    './contract/*': './contract/*',
    './runtime': './runtime.js',
    './package.json': './package.json'
  },
  dependencies: { '@midnight-ntwrk/compact-runtime': contract.runtime }
});

/**
 * Retained-era packages this repository pins in its root `resolutions`, carried
 * into every persona. Read rather than restated, so a bump moves both together.
 */
export const PINNED_RETAINED_RUNTIME = (() => {
  const root = JSON.parse(readFileSync(path.join(REPOSITORY_ROOT, 'package.json'), 'utf8'));
  const pinned = root.resolutions?.['@midnight-ntwrk/onchain-runtime-v3'];
  if (typeof pinned !== 'string') {
    throw new Error('The repository root does not pin @midnight-ntwrk/onchain-runtime-v3');
  }

  // ledger-v8 is dual-published, and the two names are two physical packages:
  // `protocol` pins the new scope, while wallet-sdk 2.0.0-beta.3 reaches for the
  // old one. Installing both means two WASM instances, and an object minted by
  // either is refused by the other's classes ("expected instance of
  // LedgerParameters"). Aliasing the old name onto the new package collapses them
  // into one -- the same device `protocol` uses for `compact-runtime-ledger8`.
  const ledger8 = JSON.parse(
    readFileSync(path.join(REPOSITORY_ROOT, 'packages', 'protocol', 'package.json'), 'utf8')
  ).dependencies?.['@midnightntwrk/ledger-v8'];
  if (typeof ledger8 !== 'string') {
    throw new Error('packages/protocol does not pin @midnightntwrk/ledger-v8');
  }

  return {
    '@midnight-ntwrk/onchain-runtime-v3': pinned,
    '@midnight-ntwrk/ledger-v8': `npm:@midnightntwrk/ledger-v8@${ledger8}`
  };
})();

export const PERSONAS = {
  retained: {
    runtime: RETAINED_RUNTIME,
    contractSource: RETAINED_CONTRACT,
    // Only what a retained-era dApp actually reaches for. Keeping this narrow is
    // deliberate: a persona that installed every package would not show which
    // ones a real consumer's resolution has to satisfy.
    framework: ['@midnight-ntwrk/midnight-js', '@midnight-ntwrk/midnight-js-protocol']
  },
  current: {
    runtime: CURRENT_RUNTIME,
    contractSource: CURRENT_CONTRACT,
    framework: ['@midnight-ntwrk/midnight-js', '@midnight-ntwrk/midnight-js-protocol']
  },
  'fork-crossing': {
    // No runtime of its own: each wrapped contract brings the one its era needs.
    runtime: undefined,
    entry: 'fork-crossing-entry',
    contracts: ['retained', 'current'],
    framework: [
      '@midnight-ntwrk/midnight-js',
      '@midnight-ntwrk/midnight-js-protocol',
      '@midnight-ntwrk/midnight-js-contracts',
      '@midnight-ntwrk/midnight-js-indexer-public-data-provider',
      '@midnight-ntwrk/midnight-js-http-client-proof-provider',
      '@midnight-ntwrk/midnight-js-node-zk-config-provider',
      '@midnight-ntwrk/midnight-js-level-private-state-provider',
      // The dApp persona uses the testkit's wallet and provider wiring rather than
      // reimplementing them; a real dApp would bring its own wallet integration.
      '@midnight-ntwrk/testkit-js'
    ]
  }
};

export const readManifest = () => {
  const manifestPath = path.join(TARBALL_DIR, 'manifest.json');
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`No tarball manifest at ${manifestPath}; run \`node packaging/pack-framework.mjs\` first`, {
      cause: error
    });
  }
};

/**
 * Builds a persona's `package.json`.
 *
 * Every framework package is pinned to its tarball, including the transitive ones
 * the persona does not name: a tarball's own dependency ranges point at registry
 * versions that are not published yet, so without pinning the whole set the
 * install reaches for versions that do not exist.
 */
export const personaManifest = (name, persona, manifest, packageManager, tarballDir, extraContracts = []) => {
  // Absolute, and pointing at the staged copy: the persona is installed outside
  // the repository, and pnpm encodes a tarball's path into a store filename, so
  // the path has to be both absolute and short.
  const tarballSpecifier = (packageName) => `file:${path.join(tarballDir, path.basename(manifest.packages[packageName]))}`;
  const everyFrameworkPackage = Object.keys(manifest.packages);

  const dependencies = {
    ...(persona.runtime === undefined ? {} : { '@midnight-ntwrk/compact-runtime': persona.runtime }),
    ...Object.fromEntries(
      [...(persona.contracts ?? []), ...extraContracts].map((key) => [
        CONTRACT_PACKAGES[key].name,
        `file:./contracts/${key}`
      ])
    ),
    ...Object.fromEntries(persona.framework.map((packageName) => [packageName, tarballSpecifier(packageName)]))
  };

  const overrides = Object.fromEntries(
    everyFrameworkPackage.map((packageName) => [packageName, tarballSpecifier(packageName)])
  );

  // The retained runtime has to be pinned, not just installed. `compact-runtime@0.16`
  // asks for `onchain-runtime-v3@^3.0.0` while `protocol` pins one exact version, so
  // without this a resolver satisfies both with two different copies -- and objects
  // minted by one are rejected by the other's classes (Ledger8InstanceMismatchError).
  // This repository pins it in `resolutions` for exactly that reason; a consumer
  // installing the framework alongside a retained contract has to do the same.
  for (const [name, version] of Object.entries(PINNED_RETAINED_RUNTIME)) {
    overrides[name] = version;
  }

  return {
    name: `@midnight-ntwrk/packaging-persona-${name}`,
    version: '0.0.0',
    private: true,
    type: 'module',
    ...(packageManager === undefined ? {} : { packageManager }),
    dependencies,
    // Both spellings, so the same generated manifest serves either linker.
    pnpm: { overrides },
    resolutions: overrides
  };
};
