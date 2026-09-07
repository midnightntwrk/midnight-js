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

/**
 * The Compact runtime each persona declares. These two numbers are the experiment:
 * the retained one is what the pre-fork toolchain's codegen asserts, the current
 * one is what this repo's own toolchain asserts.
 */
export const RETAINED_RUNTIME = '0.16.0';
export const CURRENT_RUNTIME = '0.19.0-rc.0';

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
export const personaManifest = (name, persona, manifest, packageManager) => {
  // Absolute, because the persona is installed outside the repository and a
  // relative `file:` would resolve against the temp directory.
  const tarballSpecifier = (packageName) => `file:${path.join(PACKAGING_DIR, manifest.packages[packageName])}`;
  const everyFrameworkPackage = Object.keys(manifest.packages);

  const dependencies = {
    '@midnight-ntwrk/compact-runtime': persona.runtime,
    ...Object.fromEntries(persona.framework.map((packageName) => [packageName, tarballSpecifier(packageName)]))
  };

  const overrides = Object.fromEntries(
    everyFrameworkPackage.map((packageName) => [packageName, tarballSpecifier(packageName)])
  );

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
