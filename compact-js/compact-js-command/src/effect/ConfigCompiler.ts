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

import { Effect, Context, Data, Layer, Option } from 'effect';
import { Path, FileSystem } from '@effect/platform';
import { type PlatformError } from '@effect/platform/Error';
import type { ContractExecutable, Contract } from '@midnight-ntwrk/compact-js/effect';
import { create } from 'ts-node';

export class ConfigCompiler extends Context.Tag('@midnight-ntwrk/compact-js-command/ConfigCompiler')<
  ConfigCompiler,
  ConfigCompiler.Service
>() {}

export class ConfigError extends Data.TaggedError('ConfigError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {
  static make: (message: string, cause?: unknown) => ConfigError = (message, cause) =>
    new ConfigError({ message, cause });
}

export declare namespace ConfigCompiler {
  export type ModuleSpec<PS = any> = { // eslint-disable-line @typescript-eslint/no-explicit-any
    default: {
      config: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
      createInitialPrivateState: () => PS;
      contractExecutable: ContractExecutable.ContractExecutable<Contract.Contract<PS>,PS>;
    }
  }
  export interface Service {
    readonly compile: (filePath: string) => Effect.Effect<ModuleSpec, ConfigError>;
  }
}

export const layer = Layer.effect(
  ConfigCompiler,
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;

    const getFilePathProperties = (filePath: string) => Effect.gen(function* () {
      const parsedFilePath = path.parse(filePath);
      const fileImportPath = path.join(parsedFilePath.dir, `${parsedFilePath.name}.js`);
      const filePathModifiedTime = (yield* fs.stat(filePath)).mtime;
      const fileImportPathModifiedTime = (yield* fs.exists(fileImportPath))
        ? (yield* fs.stat(fileImportPath)).mtime
        : Option.some(Option.getOrThrow(filePathModifiedTime));

      return {
        filePath,
        workingDirectory: parsedFilePath.dir,
        fileImportPath,
        requiresCompilation: Option.getOrThrow(fileImportPathModifiedTime) <= Option.getOrThrow(filePathModifiedTime)
      };
    });

    const transpileTypeScript: (_: Effect.Effect.Success<ReturnType<typeof getFilePathProperties>>) =>
      Effect.Effect<string, PlatformError> =
        ({ filePath, fileImportPath, workingDirectory, requiresCompilation }) => Effect.gen(function* () {
            if (!requiresCompilation) {
              return fileImportPath;
            }
            const tsNodeService = create({ cwd: workingDirectory });
            const jsSrc = tsNodeService.compile(yield* fs.readFileString(filePath), filePath);
            
            yield* fs.writeFileString(fileImportPath, jsSrc);

            return fileImportPath;
        });

    return ConfigCompiler.of({
      compile: (filePath: string) => getFilePathProperties(filePath).pipe(
        Effect.flatMap(transpileTypeScript),
        Effect.flatMap((fileImportPath) => Effect.tryPromise(() => import(fileImportPath))),
        Effect.mapError((err) => ConfigError.make(`Error loading configuration ${filePath}`, err))
      )
    });
  })
)
