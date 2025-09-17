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
import { FileSystem, Path } from '@effect/platform';
import { type ContractExecutable, ContractRuntimeError } from '@midnight-ntwrk/compact-js/effect';
import { type ContractState, encodeZswapLocalState } from '@midnight-ntwrk/compact-runtime';
import {
  ContractDeploy,
  ContractState as LedgerContractState,
  Intent} from '@midnight-ntwrk/ledger';
import { type ConfigError, Duration, Effect, Schema } from 'effect';

import { type ConfigCompiler } from '../ConfigCompiler.js';
import * as InternalArgs from './args.js';
import * as InternalCommand from './command.js';
import { EncodedZswapLocalStateSchema } from './encodedZswapLocalStateSchema.js'
import * as InternalOptions from './options.js';

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
  outputPrivateStateFilePath: InternalOptions.outputPrivateStateFilePath,
  outputZswapLocalStateFilePath: InternalOptions.outputZswapLocalStateFilePath
}

const encodeZswapLocalStateObject = Schema.encodeUnknown(EncodedZswapLocalStateSchema);

const asLedgerContractState = (contractState: ContractState): LedgerContractState =>
  LedgerContractState.deserialize(contractState.serialize());

/** @internal */
export const handler: (inputs: Args & Options, moduleSpec: ConfigCompiler.ModuleSpec) =>
  Effect.Effect<
    void,
    ContractExecutable.ContractExecutionError | ConfigError.ConfigError,
    Path.Path | FileSystem.FileSystem
  > =
  (inputs, moduleSpec) => Effect.gen(function* () {
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;
    const { module: { default: contractModule } } = moduleSpec;
    const intentOutputFilePath = path.resolve(inputs.outputFilePath);
    const privateStateOutputFilePath = path.resolve(inputs.outputPrivateStateFilePath);
    const outputZswapLocalStateFilePath = path.resolve(inputs.outputZswapLocalStateFilePath);
    const result = yield* contractModule.contractExecutable.initialize(
      contractModule.createInitialPrivateState(),
      ...inputs.args
    );
    const intent = Intent.new(yield* InternalCommand.ttl(Duration.minutes(10)))
      .addDeploy(new ContractDeploy(asLedgerContractState(result.public.contractState)));

    yield* fs.writeFile(intentOutputFilePath, intent.serialize());
    yield* fs.writeFileString(privateStateOutputFilePath, JSON.stringify(result.private.privateState));
    yield* fs.writeFileString(
      outputZswapLocalStateFilePath,
      JSON.stringify(
        yield* encodeZswapLocalStateObject(encodeZswapLocalState(result.private.zswapLocalState))
      )
    );
  }).pipe(
    Effect.mapError(
      (err) => ContractRuntimeError.make('Failed to initialize contract', err)
    )
  );
