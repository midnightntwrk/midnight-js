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

import type { FileSystem, Path } from '@effect/platform';
import { type PlatformError } from '@effect/platform/Error';
import { NodeContext } from '@effect/platform-node';
import * as Ansi from '@effect/printer-ansi/Ansi';
import * as Doc from '@effect/printer-ansi/AnsiDoc';
import { type ContractExecutable, ContractExecutableRuntime,type ZKConfiguration } from '@midnight-ntwrk/compact-js/effect';
import { ZKFileConfiguration } from '@midnight-ntwrk/compact-js-node/effect';
import * as Configuration from '@midnight-ntwrk/platform-js/effect/Configuration';
import { ConfigError as EffectConfigError, type ConfigProvider, Console, DateTime, type Duration, Effect, Layer } from 'effect';

import * as CommandConfigProvider from '../CommandConfigProvider.js';
import * as CompiledContractReflection from '../CompiledContractReflection.js';
import * as ConfigCompilationError from '../ConfigCompilationError.js';
import * as ConfigCompiler from '../ConfigCompiler.js';
import type * as ConfigError from '../ConfigError.js';
import * as InternalOptions from './options.js';

/**
 * Applies a duration to the current date/time, returning a date/time that is in the future.
 *
 * @param duration A `Duration` describing how far into the future the returned date/time should be.
 * @returns An `Effect` that yields a `Date` that will be in the future from `duration`.
 */
export const ttl: (duration: Duration.Duration) => Effect.Effect<Date> = (duration) => 
  DateTime.now.pipe(Effect.map((utcNow) => DateTime.toDate(DateTime.addDuration(utcNow, duration))));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reportCausableError: (err: any) => Effect.Effect<void, never> =
  (err) => Effect.gen(function* () {
    const buildCauseDocs = () => {
      const docs: Doc.Doc<unknown>[] = [];
      const buildCauseDoc = (errOrDoc: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (Doc.isDoc(errOrDoc)) {
          return docs.push(errOrDoc);
        }
        docs.push(Doc.text(errOrDoc.message));
        if (errOrDoc.cause) {
          buildCauseDoc(errOrDoc.cause);
        }
      }
      buildCauseDoc(err.cause);
      return docs;
    }
    let errorDoc: Doc.AnsiDoc = Doc.text(err.message);
    if (err.cause) {
      errorDoc = errorDoc.pipe(
        Doc.catWithLineBreak(Doc.annotate(Doc.text('(cause)'), Ansi.italicized)),
        Doc.catWithLineBreak(Doc.hsep([
          Doc.text('..'),
          Doc.align(Doc.vsep(buildCauseDocs()))
        ]))
      ) as Doc.AnsiDoc
    }
    yield* Console.log(Doc.render(errorDoc, {style: 'pretty'}));
    process.exit(1); // Terminate with non-zero exit code on any causable error.
  });

/**
 * Pretty prints a configuration error from {@link ConfigCompiler.ConfigCompiler | ConfigCompiler} implementations.
 *
 * @param err The {@link ConfigError.ConfigError | ConfigError} or 
 * {@link ConfigCompilationError.ConfigCompilationError | ConfigCompilationError} to report for.
 * @returns An `Effect` that writes `err` to the console.
 */
export const reportContractConfigError: (err: ConfigError.ConfigError | ConfigCompilationError.ConfigCompilationError) =>
  Effect.Effect<void, never> =
    (err) => Effect.gen(function* () {
      if (err.cause && err.cause instanceof ConfigCompilationError.ConfigCompilationError) {
        return yield* reportCausableError({
          message: err.message,
          cause: Doc.annotate(Doc.text(err.cause.message), Ansi.italicized).pipe(
            Doc.catWithLineBreak(Doc.hsep([
              Doc.text('..'),
              Doc.align(Doc.vsep(err.cause.diagnostics.map((d) => Doc.text(d.messageText))))
            ]))
          )
        });
      }
      yield* reportCausableError(err);
    });

const ConfigErrorType = {
  MissingData: 1,
  InvalidData: 2,
  UnsupportedData: 4
}
type ConfigErrorType = typeof ConfigErrorType[keyof typeof ConfigErrorType];
type ReportedConfigError = readonly [flag: ConfigErrorType, messages: string[]];

const reduceConfigError = (err: EffectConfigError.ConfigError): ReportedConfigError =>
  EffectConfigError.reduceWithContext<undefined, ReportedConfigError>(err, undefined, {
    andCase: (_, left, right) => [left[0] | right[0], [...left[1], ...right[1]]],
    orCase: (_, left, right) => left || right,
    missingDataCase: (_, path) => [ConfigErrorType.MissingData, [`Missing data at path '${path.join(',')}'`]],
    invalidDataCase: (_, path) => [ConfigErrorType.InvalidData, [`Invalid data at path '${path.join(',')}'`]],
    sourceUnavailableCase: (_, path, message, cause) => [ConfigErrorType.MissingData, [`The underlying source for data at path '${path.join(',')}' could not be found`, message, cause.toString()]],
    unsupportedCase: (_, path) => [ConfigErrorType.UnsupportedData, [`Unsupported data at path '${path.join(',')}'`]],
  });

/**
 * Pretty prints a configuration or contract execution error.
 *
 * @param err The {@link ContractExecutable.ContractExecutionError | ContractExecutionError} or `ConfigError` to
 * report for.
 * @returns An `Effect` that writes `err` to the console.
 */
export const reportContractExecutionError: (
  err: ContractExecutable.ContractExecutionError | EffectConfigError.ConfigError | PlatformError
) => Effect.Effect<void, never> =
  (err) => Effect.gen(function* () {
    if (EffectConfigError.isConfigError(err)) {
      const [errorType, messages] = reduceConfigError(err);
      yield* reportCausableError({
        message: 'Invalid, missing, or unsupported configuration',
        cause: Doc.vsep(messages.map(Doc.text))
      });
      if (errorType & ConfigErrorType.InvalidData || errorType & ConfigErrorType.MissingData) {
        yield* Console.log();
        yield* Console.log(Doc.render(
          Doc.vsep([
            Doc.text('The reported error indicates that configuration may be missing, or is invalid.'),
            Doc.text('Check the values provided in the \'config\' property of the specified \'contract.config.ts\' file,'),
            Doc.text('or the supplied environment variables, or the values supplied as options on the command line.')
          ]),
          { style: 'compact' }
        ));
      }
      if (errorType & ConfigErrorType.UnsupportedData) {
        yield* Console.log();
        yield* Console.log(Doc.render(
          Doc.vsep([
            Doc.text('The reported error indicates that unsupported or incompatible configuration values was detected.'),
            Doc.text('Check the values (along with their formats and lengths), provided in the \'config\' property of'),
            Doc.text('the specified \'contract.config.ts\' file, or the supplied environment variables, or the values'),
            Doc.text('supplied as options on the command line.')
          ]),
          { style: 'compact' }
        ));
      }
      return;
    }
    yield* reportCausableError(err);
  });

/**
 * Creates a default layer that provides services for executing Compact contracts via a command line.
 *
 * @param configProvider 
 * @param zkBaseFolderPath A base path to a folder containing the ZK assets for the contract that will be in
 * scope during invocation
 *
 * @category layers
 */
export const layer: (configProvider: ConfigProvider.ConfigProvider, zkBaseFolderPath: string) =>
  Layer.Layer<
    ZKConfiguration.ZKConfiguration | Configuration.Keys | Configuration.Network | NodeContext.NodeContext,
    EffectConfigError.ConfigError
  > = (configProvider, zkBaseFolderPath) =>
    Layer.mergeAll(ZKFileConfiguration.layer(zkBaseFolderPath), Configuration.layer).pipe(
      Layer.provideMerge(NodeContext.layer),
      Layer.provide(Layer.setConfigProvider(configProvider))
    );

/**
 * Creates an appropriate runtime for a command handler.
 *
 * @param handler A handler function that executes a command based on its received command line inputs and
 * compiled configuration module.
 * @returns An `Effect` that adapts `handler` by compiling the configured configuration file, and invoking
 * `handler` within an appropriate `ContractExecutableRuntime`.
 */
export const invocationHandler: <
  I extends InternalOptions.ConfigOptionInput & Partial<InternalOptions.AllConfigurableOptionInputs>
>(
  handler: (inputs: I, module: ConfigCompiler.ConfigCompiler.ModuleSpec) =>
    Effect.Effect<
      void,
      ContractExecutable.ContractExecutionError | EffectConfigError.ConfigError,
      Path.Path | FileSystem.FileSystem | CompiledContractReflection.CompiledContractReflection
    >
) =>
  (inputs: I) =>
    Effect.Effect<
      void,
      ConfigError.ConfigError | EffectConfigError.ConfigError,
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
        Effect.provide(CompiledContractReflection.layer(moduleImportDirectoryPath).pipe(
          Layer.provideMerge(NodeContext.layer)
        )),
        contractRuntime.runFork,
        Effect.catchAll(reportContractExecutionError)
      );
    }).pipe(
      Effect.catchAll(reportContractConfigError)
    );
