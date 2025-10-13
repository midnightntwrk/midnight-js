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

import { Command } from '@effect/cli';

import * as InternalCircuitCommand from './internal/circuitCommand.js';
import * as InternalCommand from './internal/command.js';
import * as InternalDeployCommand from './internal/deployCommand.js';
import * as InternalMaintainCircuitCommand from './internal/maintainCircuitCommand.js';
import * as InternalMaintainContractCommand from './internal/maintainContractCommand.js';

export const deployCommand = Command.make(
  'deploy',
  {
    ...InternalCommand.GlobalOptions,
    ...InternalDeployCommand.Options,
    ...InternalDeployCommand.Args
  }).pipe(
  Command.withDescription('Initialize a new contract instance and returns a ContractDeploy intent for it.'),
  Command.withHandler(InternalCommand.invocationHandler(InternalDeployCommand.handler))
);

export const circuitCommand = Command.make(
  'circuit',
  {
    ...InternalCommand.GlobalOptions,
    ...InternalCircuitCommand.Options,
    ...InternalCircuitCommand.Args
  }).pipe(
    Command.withDescription('Invokes a circuit on a contract instance and returns a ContractCall intent for it.'),
    Command.withHandler(InternalCommand.invocationHandler(InternalCircuitCommand.handler))
  );

export const maintainCommand = Command.make('maintain').pipe(
    Command.withDescription('Performs maintenance operations on deployed contract state and returns a MaintenanceUpdate intent for it.'),
    Command.withSubcommands([
      Command.make(
        'contract',
        {
          ...InternalCommand.GlobalOptions,
          ...InternalMaintainContractCommand.Options,
          ...InternalMaintainContractCommand.Args
        }).pipe(
          Command.withDescription('Updates the Contract Maintenance Authority for deployed contract state and returns a MaintenanceUpdate intent for it.'),
          Command.withHandler(InternalCommand.invocationHandler(InternalMaintainContractCommand.handler))
        ),
      Command.make(
        'circuit',
        {
          ...InternalCommand.GlobalOptions,
          ...InternalMaintainCircuitCommand.Options,
          ...InternalMaintainCircuitCommand.Args
        }).pipe(
          Command.withDescription('Updates the circuits associated with deployed contract state and returns a MaintenanceUpdate intent for it.'),
          Command.withHandler(InternalCommand.invocationHandler(InternalMaintainCircuitCommand.handler))
        )
    ])
  );

export * as CompiledContractReflection from './CompiledContractReflection.js';
export * as ConfigCompilationError from './ConfigCompilationError.js';
export * as ConfigCompiler from './ConfigCompiler.js';
export * as ConfigError from './ConfigError.js';
