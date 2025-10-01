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
import { FileSystem } from '@effect/platform';
import { type ContractExecutable, ContractRuntimeError } from '@midnight-ntwrk/compact-js/effect';
import { Intent } from '@midnight-ntwrk/ledger';
import { type ConfigError, Duration, Effect, Option } from 'effect';

import { type ConfigCompiler } from '../ConfigCompiler.js';
import * as InternalArgs from './args.js';
import * as InternalCommand from './command.js';
import * as ContractState from './contractState.js';
import * as InternalMaintainCommand from './maintainCommand.js';
import * as InternalOptions from './options.js';

/** @internal */
export type Args = Command.Command.ParseConfig<typeof Args>;
/** @internal */
export const Args = {
  ...InternalMaintainCommand.Args,
  newSigningKey: InternalArgs.signingKey
};

/** @internal */
export type Options = Command.Command.ParseConfig<typeof Options>;
/** @internal */
export const Options = {
  ...InternalMaintainCommand.Options,
  signingKey: InternalOptions.signingKey,
}

/** @internal */
export const handler: (inputs: Args & Options, moduleSpec: ConfigCompiler.ModuleSpec) =>
  Effect.Effect<
    void,
    ContractExecutable.ContractExecutionError | ConfigError.ConfigError,
    FileSystem.FileSystem
  > =
  (
    { address, inputFilePath, newSigningKey, outputFilePath },
    moduleSpec
  ) => Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const { module: { default: contractModule } } = moduleSpec;
    const ledgerContractState = yield* fs.readFile(inputFilePath).pipe(
      Effect.flatMap(ContractState.asLedgerContractStateFromBytes)
    );
    const result = yield* contractModule.contractExecutable.replaceContractMaintenanceAuthority(
      Option.some(newSigningKey),
      {
        address,
        contractState: yield* ContractState.asContractState(ledgerContractState),
      }
    );
    const intent = Intent.new(yield* InternalCommand.ttl(Duration.minutes(10)))
      .addMaintenanceUpdate(result.public.maintenanceUpdate);
    yield* fs.writeFile(outputFilePath, intent.serialize());
  }).pipe(
    Effect.mapError(
      (err) => ContractRuntimeError.make('Failed to apply maintenance operation', err)
    )
  );