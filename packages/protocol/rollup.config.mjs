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

import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

// `compact-runtime-ledger8` is an npm-aliased ident (the retained pre-fork
// `@midnight-ntwrk/compact-runtime@0.16.0`, installed under a different name
// so it can coexist with the root's `0.18.0-rc.1` pin) — it doesn't match
// either scoped-package pattern below, so it needs its own entry to stay
// external rather than be (unsuccessfully, absent a resolve plugin) bundled.
const external = [/node_modules/, /^@midnight-ntwrk\//, /^@midnightntwrk\//, /^compact-runtime-ledger8$/];

const entries = [
  { input: 'src/index.ts', name: 'index' },
  { input: 'src/errors.ts', name: 'errors' },
  { input: 'src/ledger.ts', name: 'ledger' },
  { input: 'src/v8.ts', name: 'v8' },
  { input: 'src/engine/index.ts', name: 'engine' },
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
    plugins: [dts()],
    external,
  },
]);
