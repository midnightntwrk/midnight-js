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

import { Effect, Equal, Layer } from 'effect';
import { Command, CliConfig } from '@effect/cli';
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { deployCommand, ConfigCompiler } from './effect/index.js';
import { fileURLToPath } from 'node:url';

//#region Entry Point
// dsd
const isProcessRootModule = () => {
  try {
    if (!import.meta.url.startsWith("file:")) return false;

    const urlPath = fileURLToPath(import.meta.url);
    return Equal.equals(urlPath, process.argv[1]) || urlPath.startsWith(process.argv[1]);
  }
  catch {
    return false;
  }
}

if (isProcessRootModule()) {
  const cli = Command.run(
    Command.make('cpt_exec').pipe(
      Command.withDescription('Executes Compact compiled contracts from the command line.'),
      Command.withSubcommands([deployCommand])
    ),
    {
      name: 'Compact Contract Execute',
      version: '0.0.0'
    }
  );

  cli(process.argv).pipe(
    Effect.provide(Layer.mergeAll(
      ConfigCompiler.layer.pipe(Layer.provideMerge(NodeContext.layer)),
      CliConfig.layer({ showBuiltIns: false })
    )),
    NodeRuntime.runMain({ disablePrettyLogger: true })
  );
}

//#endregion

export * from './effect/index.js';
