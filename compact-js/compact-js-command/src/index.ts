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

import { fileURLToPath } from 'node:url';

import { CliConfig,Command } from '@effect/cli';
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect, Equal, Layer, Logger, LogLevel } from 'effect';

import { circuitCommand, ConfigCompiler, deployCommand, maintainCommand } from './effect/index.js';

// #region Entry Point
// This region of code hosts and executes the commands present in the package if this module was loaded
// as the root of the process.
const isProcessRootModule = () => {
  try {
    if (!import.meta.url.startsWith("file:")) {
      return false;
    }
    const urlPath = fileURLToPath(import.meta.url);
    return Equal.equals(urlPath, process.argv[1]) || urlPath.startsWith(process.argv[1]);
  }
  catch {
    return false;
  }
}

if (isProcessRootModule()) {
  const cli = Command.run(
    Command.make('cptexec').pipe(
      Command.withDescription('Executes Compact compiled contracts from the command line.'),
      Command.withSubcommands([ deployCommand, circuitCommand, maintainCommand ])
    ),
    {
      name: 'Compact Contract Execute',
      version: '0.0.0'
    }
  );

  cli(process.argv).pipe(
    Logger.withMinimumLogLevel(LogLevel.None),
    Effect.provide(Layer.mergeAll(
      ConfigCompiler.layer.pipe(Layer.provideMerge(NodeContext.layer)),
      CliConfig.layer({ showBuiltIns: false })
    )),
    NodeRuntime.runMain({ disableErrorReporting: true })
  );
}

// #endregion

export * from './effect/index.js';
