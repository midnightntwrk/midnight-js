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

import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

const external = [/node_modules/, /^@midnight-ntwrk\/midnight-js-(.*)$/];

const entries = [
  { input: 'src/index.ts', name: 'index' },
  { input: 'src/contracts.ts', name: 'contracts' },
  { input: 'src/network-id.ts', name: 'network-id' },
  { input: 'src/types.ts', name: 'types' },
  { input: 'src/utils.ts', name: 'utils' },
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
