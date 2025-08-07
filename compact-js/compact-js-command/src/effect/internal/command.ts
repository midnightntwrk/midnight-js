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

import { Effect, Layer, type ConfigProvider, type ConfigError, Console } from 'effect';
import { NodeContext } from '@effect/platform-node';
import { KeyConfiguration, type ZKConfiguration, type ContractExecutable } from '@midnight-ntwrk/compact-js/effect';
import { ZKFileConfiguration } from '@midnight-ntwrk/compact-js-node/effect';
import type * as ConfigCompiler from '../ConfigCompiler.js';
import type * as Options from './options.js';

export type DeployInputs = Options.AllCommandOptionInputs;

export const reportContractConfigError: (err: ConfigCompiler.ConfigError) =>
  Effect.Effect<void, never> =
    (err) => Effect.gen(function* () {
      yield* Console.log(err.toString());
      if (err.cause) {
        yield* Console.log(String(err.cause));
      }
    });

export const reportContractExecutionError: (err: ContractExecutable.ContractExecutionError | ConfigError.ConfigError) =>
  Effect.Effect<void, never> =
    (err) => Effect.gen(function* () {
      yield* Console.log(err.toString());
    });

export const layer: (configProvider: ConfigProvider.ConfigProvider, zkBaseFolderPath: string) =>
  Layer.Layer<
    ZKConfiguration.ZKConfiguration | KeyConfiguration.KeyConfiguration | NodeContext.NodeContext,
    ConfigError.ConfigError
  > = (configProvider, zkBaseFolderPath) =>
    Layer.mergeAll(ZKFileConfiguration.layer(zkBaseFolderPath), KeyConfiguration.layer).pipe(
      Layer.provideMerge(NodeContext.layer),
      Layer.provide(
        Layer.setConfigProvider(configProvider)
      )
    );
