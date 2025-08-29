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
import { type ContractExecutable, Contract, ContractRuntimeError } from '@midnight-ntwrk/compact-js/effect';
import {
  Intent,
  ContractCallPrototype,
  ContractState as LedgerContractState,
  communicationCommitmentRandomness
} from '@midnight-ntwrk/ledger';
import { type ContractOperation, ContractState} from '@midnight-ntwrk/compact-runtime';
import * as Configuration from '@midnight-ntwrk/platform-js/effect/Configuration';
import * as NetworkId from '@midnight-ntwrk/platform-js/effect/NetworkId';
import { type ConfigCompiler } from '../ConfigCompiler.js';
import * as InternalCommand from './command.js';
import * as InternalOptions from './options.js';
import * as InternalArgs from './args.js';

/** @internal */
export type Args = Command.Command.ParseConfig<typeof Args>;
/** @internal */
export const Args = { 
  address: InternalArgs.contractAddress,
  circuitId: InternalArgs.circuitId,
  args: InternalArgs.contractArgs
};

/** @internal */
export type Options = Command.Command.ParseConfig<typeof Options>;
/** @internal */
export const Options = {
  config: InternalOptions.config,
  coinPublicKey: InternalOptions.coinPublicKey,
  stateFilePath: InternalOptions.stateFilePath,
  privateStateFilePath: InternalOptions.privateStateFilePath,
  network: InternalOptions.network,
  outputFilePath: InternalOptions.outputFilePath,
  outputPrivateStateFilePath: InternalOptions.outputPrivateStateFilePath
}

const asContractState = (contractState: LedgerContractState, networkId: NetworkId.NetworkId): ContractState =>
  ContractState.deserialize(
    contractState.serialize(NetworkId.asLedgerLegacy(networkId)),
    NetworkId.asRuntimeLegacy(networkId)
  );

/** @internal */
export const handler: (inputs: Args & Options, moduleSpec: ConfigCompiler.ModuleSpec) =>
  Effect.Effect<
    void,
    ContractExecutable.ContractExecutionError | ConfigError.ConfigError,
    Path.Path | FileSystem.FileSystem | Configuration.Network
  > =
  (
    { address, circuitId, args, stateFilePath, privateStateFilePath, outputFilePath, outputPrivateStateFilePath },
    moduleSpec
  ) => Effect.gen(function* () {
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;
    const networkId = yield* Configuration.Network;
    const { module: { default: contractModule } } = moduleSpec;
    const intentOutputFilePath = path.resolve(outputFilePath);
    const privateStateOutputFilePath = path.resolve(outputPrivateStateFilePath);
    const ledgerContractState = LedgerContractState.deserialize(yield* fs.readFile(path.resolve(stateFilePath)), NetworkId.asLedgerLegacy(networkId));
    const privateState = JSON.parse(yield* fs.readFileString(privateStateFilePath));
    const result = yield* contractModule.contractExecutable.circuit(
      Contract.ImpureCircuitId(circuitId),
      {
        address,
        contractState: asContractState(ledgerContractState, networkId),
        privateState: privateState ?? contractModule.createInitialPrivateState()
      },
      ...args
    );
    const intent = Intent.new(yield* InternalCommand.ttl(Duration.minutes(10)))
      .addCall(new ContractCallPrototype(
        address,
        circuitId,
        ledgerContractState.operation(circuitId) as ContractOperation,
        result.public.partitionedTranscript[0],
        result.public.partitionedTranscript[1],
        result.private.privateTranscriptOutputs,
        result.private.input,
        result.private.output,
        communicationCommitmentRandomness(),
        circuitId
      ));

    yield* fs.writeFile(intentOutputFilePath, intent.serialize(NetworkId.asLedgerLegacy(networkId)));
    yield* fs.writeFileString(privateStateOutputFilePath, JSON.stringify(result.private.privateState));
  }).pipe(
    Effect.mapError(
      (err) => ContractRuntimeError.make('Failed to invoke circuit', err)
    )
  );
