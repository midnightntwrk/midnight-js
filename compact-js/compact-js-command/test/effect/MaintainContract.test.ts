/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
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

import { resolve } from 'node:path';

import { Command } from '@effect/cli';
import { NodeContext } from '@effect/platform-node';
import { describe, it } from '@effect/vitest';
import { ConfigCompiler, maintainCommand } from '@midnight-ntwrk/compact-js-command/effect';
import { sampleSigningKey } from '@midnight-ntwrk/ledger';
import { Console,Effect, Layer } from 'effect';

import { ensureRemovePath } from './cleanup.js';
import * as MockConsole from './MockConsole.js';

const COUNTER_CONFIG_FILEPATH = resolve(import.meta.dirname, '../contract/counter/contract.config.ts');
const COUNTER_STATE_FILEPATH = resolve(import.meta.dirname, '../contract/counter/state.bin');
const COUNTER_OUTPUT_FILEPATH = resolve(import.meta.dirname, '../contract/counter/output_circuit.bin');

const testLayer: Layer.Layer<ConfigCompiler.ConfigCompiler | NodeContext.NodeContext> =
  Effect.gen(function* () {
    const console = yield* MockConsole.make;
    return Layer.mergeAll(
      Console.setConsole(console),
      ConfigCompiler.layer.pipe(Layer.provideMerge(NodeContext.layer))
    );
  }).pipe(Layer.unwrapEffect);

// Skipped. The current yarn workspace setup (with the root dependent on Ledger@4), means that Ledger@6 that
// both `compact-js` and `compact-js-command` depended on are not being deduped on install. At runtime this
// means that two instances of the Ledger WASM is being loaded. `compact-js` creates an instance of 
// `MaintenanceUpdate` that is then added to an `Intent` created in `compact-js-command`, and since these two types
// are originated from different instances of the Ledger WASM, the `Intent.addMaintenanceUpdate()` function
// throws an `'expected instance of MaintenanceUpdate'` error. To fix this we need to properly segregate the
// workspace. The Contract Maintenance Operations are tested (outside of the command) in the `compact-js` package.
// @seealso ./MaintainCircuit.test.ts
describe.skip('Maintain Contract Command', () => {
  it.effect('should report success with valid setup', () =>
    Effect.gen(function* () {
      const cli = Command.run(maintainCommand, { name: 'maintain', version: '0.0.0' });

      yield* cli([
        'node', 'maintain.ts',
        'maintain', 'contract',
        '-s', sampleSigningKey(),
        '-c', COUNTER_CONFIG_FILEPATH,
        '--input', COUNTER_STATE_FILEPATH,
        '--output', COUNTER_OUTPUT_FILEPATH,
        '0a2d0e34db258f640dc2ec410fb0e4eea9cd6f9661ba6a86f0c35a708e1b811a', sampleSigningKey()
      ]);

      const lines = yield* MockConsole.getLines({ stripAnsi: true });

      expect(lines.length).toBe(0);
    }).pipe(
      Effect.ensuring(ensureRemovePath(COUNTER_CONFIG_FILEPATH.replace('.ts', '.js'))),
      Effect.ensuring(ensureRemovePath(COUNTER_OUTPUT_FILEPATH)),
      Effect.provide(testLayer)
    ),
    30_000
  );
});