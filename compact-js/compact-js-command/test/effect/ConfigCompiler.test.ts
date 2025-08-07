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

import { describe, it, expect } from '@effect/vitest';
import { Effect, Layer } from 'effect';
import { NodeContext } from '@effect/platform-node';
import { ConfigCompiler } from '@midnight-ntwrk/compact-js-command/effect';
import { resolve } from 'node:path';
import { ensureRemovePath } from './cleanup';

const COUNTER_CONFIG_FILEPATH = resolve(import.meta.dirname, '../contract/counter/contract.config.ts');

describe('ConfigCompiler', () => {
  describe('layer', () => {
    describe('with valid and well formed configuration file', () => {
      it.effect('should compile and return module', () =>
        Effect.gen(function* () {
          const compiler = yield* ConfigCompiler.ConfigCompiler;
          const configModuleSpec = yield* compiler.compile(COUNTER_CONFIG_FILEPATH);

          expect(configModuleSpec).toMatchObject({
            moduleImportDirectoryPath: expect.any(String),
            module: expect.objectContaining({
              default: expect.objectContaining({
                config: expect.any(Object),
                contractExecutable: expect.objectContaining({
                  compiledContract: expect.objectContaining({
                    tag: 'CounterContract'
                  })
                })
              })
            })
          });
        }).pipe(
          Effect.ensuring(ensureRemovePath(COUNTER_CONFIG_FILEPATH.replace('.ts', '.js'))),
          Effect.provide(ConfigCompiler.layer.pipe(Layer.provideMerge(NodeContext.layer))),
          Effect.catchAll((err) => {
            console.log(err);
            return Effect.void
          })
        ),
        30_000
      );
    });
  });
});
