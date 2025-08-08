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

import { type ConfigError, Effect, DateTime, Duration, Console } from 'effect';
import { FileSystem, Path } from '@effect/platform';
import { ContractExecutableRuntime, ContractExecutable } from '@midnight-ntwrk/compact-js/effect';
import {
  ContractDeploy,
  Intent,
  ContractState as LedgerContractState,
  NetworkId as LedgerNetworkId
} from '@midnight-ntwrk/ledger';
import { type ContractState, NetworkId as RuntimeNetworkId } from '@midnight-ntwrk/compact-runtime';
import * as Options from './options.js';
import * as ConfigCompiler from '../ConfigCompiler.js';
import * as CommandConfigProvider from '../CommandConfigProvider.js';
import * as InternalCommand from './command.js';

const ttl: (duration: Duration.Duration) => Effect.Effect<Date> = (duration) => 
  DateTime.now.pipe(Effect.map((utcNow) => DateTime.toDate(DateTime.addDuration(utcNow, duration))));

const asLedgerContractState = (contractState: ContractState): LedgerContractState =>
  LedgerContractState.deserialize(contractState.serialize(RuntimeNetworkId.Undeployed), LedgerNetworkId.Undeployed);

/** @internal */
export const handler: (inputs: InternalCommand.DeployInputs) =>
  Effect.Effect<
    void,
    ConfigCompiler.ConfigError | ConfigError.ConfigError,
    Path.Path | FileSystem.FileSystem | ConfigCompiler.ConfigCompiler
  > =
  (inputs: InternalCommand.DeployInputs) => Effect.gen(function* () {
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;
    const configFilePath = yield* Options.getConfigFilePath(inputs);
    const configCompiler = yield* ConfigCompiler.ConfigCompiler;

    const { 
      moduleImportDirectoryPath,
      module: { default: contractModule}
    } = yield* configCompiler.compile(configFilePath);
    const contractRuntime = ContractExecutableRuntime.make(
      InternalCommand.layer(
        CommandConfigProvider.make(contractModule.config, Options.asConfigProvider(inputs)),
        moduleImportDirectoryPath
      )
    );

    const outputPath = yield* contractModule.contractExecutable.initialize(
      contractModule.createInitialPrivateState(),
      ...inputs.args
    ).pipe(
      Effect.flatMap((result) => Effect.gen(function* () {
        const intent = Intent.new(yield* ttl(Duration.minutes(10)))
          .addDeploy(new ContractDeploy(asLedgerContractState(result.public.contractState)));
        const intentFilePath = path.join(process.cwd(), '0000.intent');

        yield* fs.writeFile(intentFilePath, intent.serialize(LedgerNetworkId.Undeployed));

        return path.relative(process.cwd(), intentFilePath);
      }).pipe(
        Effect.mapError(
          (err) => ContractExecutable.ContractRuntimeError.make('Failed to create an output', err)))
      ),
      contractRuntime.runFork,
      Effect.catchAll(InternalCommand.reportContractExecutionError),
    );

    if (!outputPath) {
      return yield* Console.log('The operation failed, and errors were reported.');
    }

    yield* Console.log(`Deployment for '${contractModule.contractExecutable.compiledContract.tag}' written to '${outputPath}'.`);
  }).pipe(
    Effect.catchAll(InternalCommand.reportContractConfigError)
  );
