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

import { Command } from '@effect/cli';
import * as Options from './internal/options.js';
import * as Args from './internal/args.js';
import * as InternalCommand from './internal/command.js';
import * as InternalDeployCommand from './internal/deployCommand.js';
import * as InternalCircuitCommand from './internal/circuitCommand.js';

export const deployCommand = Command.make(
  'deploy',
  {
    args: Args.contractArgs,
    ...Options.allCommandOptions
  }).pipe(
  Command.withDescription('Initialize a new contract instance and returns a ContractDeploy intent for it.'),
  Command.withHandler(InternalCommand.invocationHandler(InternalDeployCommand.handler))
);

export const circuitCommand = Command.make(
  'circuit',
  { 
    address: Args.contractAddress,
    circuitId: Args.circuitId,
    args: Args.contractArgs,
    ...Options.allCommandOptions,
    stateFilePath: Options.stateFilePath,
  }).pipe(
    Command.withDescription('Invokes a circuit on a contract instance and returns a ContractCall intent for it.'),
    Command.withHandler(InternalCommand.invocationHandler(InternalCircuitCommand.handler))
  );

export * as ConfigCompiler from './ConfigCompiler.js';
