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

import { type Command } from '@effect/cli';
import { type ContractExecutable, ContractRuntimeError } from '@midnight-ntwrk/compact-js/effect';
import { type ConfigError, Effect } from 'effect';

import { type ConfigCompiler } from '../ConfigCompiler.js';
import * as InternalArgs from './args.js';
import * as InternalOptions from './options.js';

/** @internal */
export type Args = Command.Command.ParseConfig<typeof Args>;
/** @internal */
export const Args = { 
  address: InternalArgs.contractAddress
};

/** @internal */
export type Options = Command.Command.ParseConfig<typeof Options>;
/** @internal */
export const Options = {
  inputFilePath: InternalOptions.inputFilePath,
  outputFilePath: InternalOptions.outputFilePath
}

/** @internal */
export const handler: (inputs: Args & Options, moduleSpec: ConfigCompiler.ModuleSpec) =>
  Effect.Effect<
    void,
    ContractExecutable.ContractExecutionError | ConfigError.ConfigError
  > =
  (_, __) => Effect.gen(function* () {
    // TODO: The root `maintain` command. Currently there is no logic attached to this command, but in the
    // future, perhaps it could produce a 'diff' of the circuits found in the currently compiled assets vs.
    // what it present in the given contract state.
    return yield* ContractRuntimeError.make('This command is not implemented.');
  });
