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

import { FileSystem,Path } from '@effect/platform';
import { type PlatformError } from '@effect/platform/Error';
import type { Contract,ContractExecutable } from '@midnight-ntwrk/compact-js/effect';
import { Context, Effect, Layer, Option } from 'effect';
import { create } from 'ts-node';

import * as ConfigCompilationError from './ConfigCompilationError.js';
import * as ConfigError from './ConfigError.js';

/**
 * Compiles a contract configuration file into a JavaScript module.
 * 
 * @category services
 */
export class ConfigCompiler extends Context.Tag('compact-js-command/ConfigCompiler')<
  ConfigCompiler,
  ConfigCompiler.Service
>() {}

export declare namespace ConfigCompiler {
  /**
   * Represents the _shape_ of an exported configuration module.
   */
  export type ModuleExport<PS = any> = { // eslint-disable-line @typescript-eslint/no-explicit-any
    default: {
      config: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
      createInitialPrivateState: () => PS;
      contractExecutable: ContractExecutable.ContractExecutable<Contract.Contract<PS>, PS>;
    }
  }

  /**
   * Describes a configuration module, the JavaScript module compiled from a contract configuration file.
   */
  export type ModuleSpec<PS = any> = { // eslint-disable-line @typescript-eslint/no-explicit-any
    moduleImportDirectoryPath: string;
    module: ModuleExport<PS>;
  }

  export interface Service {
    /**
     * Compiles a contract configuration file.
     *
     * @param filePath A file path to the contract configuration file.
     * @returns An `Effect` that yields a {@link ModuleSpec}; or fails with a
     * {@link ConfigError.ConfigError | ConfigError} or a 
     * {@link ConfigCompilationError.ConfigCompilationError | ConfigCompilationError}.
     */
    readonly compile: (filePath: string) => Effect.Effect<
      ModuleSpec,
      ConfigError.ConfigError | ConfigCompilationError.ConfigCompilationError
    >;
  }
}

/**
 * A {@link ConfigCompiler} implementation that uses TypeScript to compile the given file path and then load
 * it as a JavaScript module.
 * 
 * @category layers
 */
export const layer = Layer.effect(
  ConfigCompiler,
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;

    const getFilePathProperties = (filePath: string) => Effect.gen(function* () {
      const absoluteFilePath = path.resolve(filePath);
      const parsedAbsoluteFilePath = path.parse(absoluteFilePath);
      const absoluteFileImportPath = path.join(parsedAbsoluteFilePath.dir, `${parsedAbsoluteFilePath.name}.js`);
      const filePathModifiedTime = (yield* fs.stat(absoluteFilePath)).mtime;
      const fileImportPathModifiedTime = (yield* fs.exists(absoluteFileImportPath))
        ? (yield* fs.stat(absoluteFileImportPath)).mtime
        : Option.some(Option.getOrThrow(filePathModifiedTime));

      return {
        absoluteFilePath,
        absoluteWorkingDirectory: parsedAbsoluteFilePath.dir,
        absoluteFileImportPath,
        requiresCompilation: Option.getOrThrow(fileImportPathModifiedTime) <= Option.getOrThrow(filePathModifiedTime)
      };
    });

    const transpileTypeScript: (_: Effect.Effect.Success<ReturnType<typeof getFilePathProperties>>) =>
      Effect.Effect<string, PlatformError | ConfigCompilationError.ConfigCompilationError | ConfigError.ConfigError> =
        ({ absoluteFilePath, absoluteFileImportPath, absoluteWorkingDirectory, requiresCompilation }) => Effect.gen(function* () {
            if (!requiresCompilation) {
              return absoluteFileImportPath;
            }

            try {
              const tsNodeService = create({ cwd: absoluteWorkingDirectory });

              yield* fs.writeFileString(
                absoluteFileImportPath,
                tsNodeService.compile(yield* fs.readFileString(absoluteFilePath), absoluteFilePath)
              );
            }
            catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
              return yield* err?.name === 'TSError'
                ? ConfigCompilationError.make('Failed to compile TypeScript configuration', err.diagnostics)
                : ConfigError.make('Unexpected error while compiling TypeScript configuration', err);
            }

            return absoluteFileImportPath;
        });

    return ConfigCompiler.of({
      compile: (filePath: string) => getFilePathProperties(filePath).pipe(
        Effect.flatMap(transpileTypeScript),
        Effect.flatMap((fileImportPath) => Effect.tryPromise<ConfigCompiler.ModuleSpec>(
          async () => ({
            moduleImportDirectoryPath: path.dirname(fileImportPath),
            module: await import(fileImportPath)
          })
        )),
        Effect.mapError((err) => ConfigError.make(`Error loading configuration '${filePath}'`, err))
      )
    });
  })
)
