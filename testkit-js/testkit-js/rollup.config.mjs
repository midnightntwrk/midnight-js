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

import { cpSync } from 'node:fs';
import { relative, sep } from 'node:path';

import { createRollupConfig } from '../../build-tools/rollup.config.factory.mjs';
import packageJson from './package.json' with { type: 'json' };

const FIXTURE_SOURCE = 'src/fixtures/hf';
const FIXTURE_TARGET = 'dist/fixtures/hf';
const ACCESSOR_BUNDLE = 'dist/fixtures-hf.js';

// Dev-only: they import the ledger devDependencies, which a consumer of the
// published package does not get. Everything else -- the state bytes, both
// compiled contracts, the golden transcript, the manifest and the README --
// ships, because `src/fixtures-hf.ts` resolves them relative to its own module
// URL and that URL is inside `dist` once published.
const GENERATORS = 'generators';

const isGeneratorAsset = (source) => relative(FIXTURE_SOURCE, source).split(sep)[0] === GENERATORS;

const copyFixtureAssets = {
  name: 'copy-hf-fixture-assets',
  writeBundle() {
    cpSync(FIXTURE_SOURCE, FIXTURE_TARGET, { recursive: true, filter: (source) => !isGeneratorAsset(source) });
  }
};

const config = createRollupConfig(packageJson);

// The assets belong to the entry that reads them, so they are copied by the
// pass that emits it. Throwing beats silently shipping an accessor with no
// bytes next to it, should the entry ever be renamed.
const accessorBundle = config.find(({ output }) => output.some(({ file }) => file === ACCESSOR_BUNDLE));
if (!accessorBundle) {
  throw new Error(`no rollup entry emits ${ACCESSOR_BUNDLE}; the "./fixtures-hf" exports subpath is missing`);
}
accessorBundle.plugins = [...accessorBundle.plugins, copyFixtureAssets];

export default config;
