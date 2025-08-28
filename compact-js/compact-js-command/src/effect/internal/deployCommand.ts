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

import { type ConfigError, Effect, Duration } from 'effect';
import { FileSystem, Path } from '@effect/platform';
import { type Command } from '@effect/cli';
import { type ContractExecutable, ContractRuntimeError } from '@midnight-ntwrk/compact-js/effect';
import {
  ContractDeploy,
  Intent,
  ContractState as LedgerContractState
} from '@midnight-ntwrk/ledger';
import { type ContractState } from '@midnight-ntwrk/compact-runtime';
import * as Configuration from '@midnight-ntwrk/platform-js/effect/Configuration';
import * as NetworkId from '@midnight-ntwrk/platform-js/effect/NetworkId';
import { type ConfigCompiler } from '../ConfigCompiler.js';
import * as InternalCommand from './command.js';
import * as InternalOptions from './options.js';
import * as InternalArgs from './args.js';

/** @internal */
export type Args = Command.Command.ParseConfig<typeof Args>;
/** @internal */
export const Args = { args: InternalArgs.contractArgs };

/** @internal */
export type Options = Command.Command.ParseConfig<typeof Options>;
/** @internal */
export const Options = {
  config: InternalOptions.config,
  coinPublicKey: InternalOptions.coinPublicKey,
  signingKey: InternalOptions.signingKey,
  network: InternalOptions.network,
  outputFilePath: InternalOptions.outputFilePath,
  outputPrivateStateFilePath: InternalOptions.outputPrivateStateFilePath
}

const asLedgerContractState = (contractState: ContractState, networkId: NetworkId.NetworkId): LedgerContractState =>
  LedgerContractState.deserialize(
    contractState.serialize(NetworkId.asRuntimeLegacy(networkId)),
    NetworkId.asLedgerLegacy(networkId)
  );

/** @internal */
export const handler: (inputs: Args & Options, moduleSpec: ConfigCompiler.ModuleSpec) =>
  Effect.Effect<
    void,
    ContractExecutable.ContractExecutionError | ConfigError.ConfigError,
    Path.Path | FileSystem.FileSystem | Configuration.Network
  > =
  (inputs, moduleSpec) => Effect.gen(function* () {
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;
    const networkId = yield* Configuration.Network;
    const { module: { default: contractModule } } = moduleSpec;
    const intentOutputFilePath = path.resolve(inputs.outputFilePath);
    const privateStateOutputFilePath = path.resolve(inputs.outputPrivateStateFilePath);
    const result = yield* contractModule.contractExecutable.initialize(
      contractModule.createInitialPrivateState(),
      ...inputs.args
    );
    const intent = Intent.new(yield* InternalCommand.ttl(Duration.minutes(10)))
      .addDeploy(new ContractDeploy(asLedgerContractState(result.public.contractState, networkId)));

    yield* fs.writeFile(intentOutputFilePath, intent.serialize(NetworkId.asLedgerLegacy(networkId)));
    yield* fs.writeFileString(privateStateOutputFilePath, JSON.stringify(result.private.privateState));
  }).pipe(
    Effect.mapError(
      (err) => ContractRuntimeError.make('Failed to initialize contract', err)
    )
  );
