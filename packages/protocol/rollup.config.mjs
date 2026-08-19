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

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

const external = [/node_modules/, /^@midnight-ntwrk\//, /^@midnightntwrk\//];

const PACKAGE_DIR = path.dirname(fileURLToPath(import.meta.url));
const ERROR_MODULE = path.join(PACKAGE_DIR, 'src', 'errors');
const ERROR_SUBPATH = '@midnight-ntwrk/midnight-js-protocol/errors';

// Every entry below is bundled independently, so a relatively-imported
// src/errors.ts would be INLINED into each one — index, engine and any future
// entry would each declare their own `class …Error`. Error classes are part of
// this package's public contract (`error instanceof Ledger8RuntimeMissingError`
// in src/engine/load-engine.ts, and the same check in consumer catch blocks),
// and a class is only ever equal to itself: an error thrown inside one bundle
// would answer `false` against another bundle's class, silently.
//
// This plugin resolves src/errors.ts to the package's own ./errors subpath for
// every entry except that subpath itself, keeping it external. All bundles
// then import the one shared error module at runtime, and the package root
// re-exports those very classes rather than copies of them. `errors.ts` has no
// internal imports of its own, so nothing here can become circular.
const shareErrorModule = (entryName) => ({
  name: 'share-error-module',
  resolveId(source, importer) {
    if (entryName === 'errors' || importer === undefined || !source.startsWith('.')) {
      return null;
    }
    const resolved = path.resolve(path.dirname(importer), source).replace(/\.(?:m?[jt]s)$/, '');
    return resolved === ERROR_MODULE ? { id: ERROR_SUBPATH, external: true } : null;
  }
});

const entries = [
  { input: 'src/index.ts', name: 'index' },
  { input: 'src/errors.ts', name: 'errors' },
  { input: 'src/ledger.ts', name: 'ledger' },
  { input: 'src/compact-runtime.ts', name: 'compact-runtime' },
  { input: 'src/compact-js.ts', name: 'compact-js' },
  { input: 'src/compact-js-effect.ts', name: 'compact-js-effect' },
  { input: 'src/compact-js-effect-contract.ts', name: 'compact-js-effect-contract' },
  { input: 'src/onchain-runtime.ts', name: 'onchain-runtime' },
  { input: 'src/platform.ts', name: 'platform' },
  { input: 'src/platform-effect-configuration.ts', name: 'platform-effect-configuration' },
  { input: 'src/platform-effect-contract-address.ts', name: 'platform-effect-contract-address' },
];

export default entries.flatMap(({ input, name }) => [
  {
    input,
    output: [
      { file: `dist/${name}.mjs`, format: 'esm', sourcemap: true },
      { file: `dist/${name}.cjs`, format: 'cjs', sourcemap: true },
    ],
    plugins: [
      shareErrorModule(name),
      typescript({ tsconfig: './tsconfig.build.json', composite: false }),
    ],
    external,
  },
  {
    input,
    output: [
      { file: `dist/${name}.d.mts`, format: 'esm' },
      { file: `dist/${name}.d.cts`, format: 'cjs' },
      { file: `dist/${name}.d.ts`, format: 'esm' },
    ],
    plugins: [shareErrorModule(name), dts()],
    external,
  },
]);
