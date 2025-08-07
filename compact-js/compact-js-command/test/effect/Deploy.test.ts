/*
 * This file is part of compact-js.
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

import { describe, it } from '@effect/vitest';
import { Effect, Layer, Console } from 'effect';
import { NodeContext } from '@effect/platform-node';
import { Command } from '@effect/cli';
import { deployCommand } from '@midnight-ntwrk/compact-js-command/effect';
import { ConfigCompiler } from '@midnight-ntwrk/compact-js-command/effect';
import { resolve } from 'node:path';
import { ensureRemovePath } from './cleanup';
import * as MockConsole from './MockConsole';

const COUNTER_CONFIG_FILEPATH = resolve(import.meta.dirname, '../contract/counter/contract.config.ts');

const testLayer: Layer.Layer<ConfigCompiler.ConfigCompiler | NodeContext.NodeContext> =
  Effect.gen(function* () {
    const console = yield* MockConsole.make;
    return Layer.mergeAll(
      Console.setConsole(console),
      ConfigCompiler.layer.pipe(Layer.provideMerge(NodeContext.layer)),
    );
  }).pipe(Layer.unwrapEffect);

describe('Deploy Command', () => {
  it.effect('should report success with valid setup', () =>
    Effect.gen(function* () {
      const cli = Command.run(deployCommand, { name: 'deploy', version: '0.0.0' });

      yield* cli(['node', 'deploy.ts', '-c', COUNTER_CONFIG_FILEPATH]);

      // const lines = yield* MockConsole.getLines({ stripAnsi: true });
    }).pipe(
      Effect.ensuring(ensureRemovePath(COUNTER_CONFIG_FILEPATH.replace('.ts', '.js'))),
      Effect.provide(testLayer)
    ), 30_000);
});
