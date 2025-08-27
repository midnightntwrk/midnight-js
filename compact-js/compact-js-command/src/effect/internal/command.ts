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

import { Effect, Layer, type ConfigProvider, ConfigError, Console, DateTime, type Duration } from 'effect';
import type { FileSystem, Path } from '@effect/platform';
import { NodeContext } from '@effect/platform-node';
import { type ZKConfiguration, type ContractExecutable, ContractExecutableRuntime } from '@midnight-ntwrk/compact-js/effect';
import * as Configuration from '@midnight-ntwrk/platform-js/effect/Configuration';
import { ZKFileConfiguration } from '@midnight-ntwrk/compact-js-node/effect';
import * as ConfigCompiler from '../ConfigCompiler.js';
import * as CommandConfigProvider from '../CommandConfigProvider.js';
import * as InternalOptions from './options.js';

export const ttl: (duration: Duration.Duration) => Effect.Effect<Date> = (duration) => 
  DateTime.now.pipe(Effect.map((utcNow) => DateTime.toDate(DateTime.addDuration(utcNow, duration))));

export const reportCausableError: (err: unknown) => Effect.Effect<void, never> =
  (err) => Effect.gen(function* () {
    let _err: any = err; // eslint-disable-line @typescript-eslint/no-explicit-any
    while (_err) {
      yield* Console.log(_err.toString());
      _err = _err.cause;
    }
  });

export const reportContractConfigError: (err: ConfigCompiler.ConfigError) =>
  Effect.Effect<void, never> =
    (err) => Effect.gen(function* () {
      yield* Console.log(err.toString());
      if (err.cause) {
        if (err.cause instanceof ConfigCompiler.ConfigCompilationError) {
          yield* Console.log(String(err.cause));
          for (const diagnostic of err.cause.diagnostics) {
            yield* Console.log(diagnostic.messageText);
          }
          return;
        }
        yield* reportCausableError(err.cause);
      }
    });

export const reportContractExecutionError: (err: ContractExecutable.ContractExecutionError | ConfigError.ConfigError) =>
  Effect.Effect<void, never> =
    (err) => Effect.gen(function* () {
      if (ConfigError.isConfigError(err)) {
        // TODO: Look at ConfigError.reduceWithContext to reduce the error is a meaningful message.
        return yield* Console.log('ConfigurationError: Configuration is missing or invalid');
      }
      yield* reportCausableError(err);
    });

export const layer: (configProvider: ConfigProvider.ConfigProvider, zkBaseFolderPath: string) =>
  Layer.Layer<
    ZKConfiguration.ZKConfiguration | Configuration.Keys | Configuration.Network | NodeContext.NodeContext,
    ConfigError.ConfigError
  > = (configProvider, zkBaseFolderPath) =>
    Layer.mergeAll(ZKFileConfiguration.layer(zkBaseFolderPath), Configuration.layer).pipe(
      Layer.provideMerge(NodeContext.layer),
      Layer.provide(Layer.setConfigProvider(configProvider))
    );

export const invocationHandler: <
  I extends InternalOptions.ConfigOptionInput & Partial<InternalOptions.AllConfigurableOptionInputs>
>(
  handler: (inputs: I, module: ConfigCompiler.ConfigCompiler.ModuleSpec) =>
    Effect.Effect<
      void,
      ContractExecutable.ContractExecutionError | ConfigError.ConfigError,
      Path.Path | FileSystem.FileSystem | Configuration.Network
    >
) =>
  (inputs: I) =>
    Effect.Effect<
      void,
      ConfigCompiler.ConfigError | ConfigError.ConfigError,
      Path.Path | FileSystem.FileSystem | ConfigCompiler.ConfigCompiler
    > =
    (handler) => (inputs) => Effect.gen(function* () {
      const configFilePath = yield* InternalOptions.getConfigFilePath(inputs);
      const configCompiler = yield* ConfigCompiler.ConfigCompiler;

      const moduleSpec = yield* configCompiler.compile(configFilePath);
      const { moduleImportDirectoryPath, module: { default: contractModule } } = moduleSpec;
      const contractRuntime = ContractExecutableRuntime.make(
        layer(
          CommandConfigProvider.make(contractModule.config, InternalOptions.asConfigProvider(inputs)),
          moduleImportDirectoryPath
        )
      );

      yield* handler(inputs, moduleSpec).pipe(
        Effect.provide(NodeContext.layer),
        contractRuntime.runFork,
        Effect.catchAll(reportContractExecutionError)
      );
    }).pipe(
      Effect.catchAll(reportContractConfigError)
    );
