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
import { Contract, type ContractExecutable, ContractRuntimeError } from '@midnight-ntwrk/compact-js/effect';
import { decodeZswapLocalState, type EncodedZswapLocalState,
  encodeZswapLocalState } from '@midnight-ntwrk/compact-runtime';
import {
  communicationCommitmentRandomness,
  ContractCallPrototype,
  type ContractOperation as LedgerContractOption,
  Intent
} from '@midnight-ntwrk/ledger';
import { type ConfigError, Console,Duration, Effect, Option } from 'effect';

import * as CompiledContractReflection from '../CompiledContractReflection.js';
import { type ConfigCompiler } from '../ConfigCompiler.js';
import * as InternalArgs from './args.js';
import * as InternalCommand from './command.js';
import * as ContractState from './contractState.js';
import { decodeZswapLocalStateObject, encodeZswapLocalStateObject } from './encodedZswapLocalStateSchema.js'
import * as InternalOptions from './options.js';

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
  inputFilePath: InternalOptions.inputFilePath,
  inputPrivateStateFilePath: InternalOptions.inputPrivateStateFilePath,
  inputZswapLocalStateFilePath: InternalOptions.inputZswapLocalStateFilePath,
  outputFilePath: InternalOptions.outputFilePath,
  outputPrivateStateFilePath: InternalOptions.outputPrivateStateFilePath,
  outputZswapLocalStateFilePath: InternalOptions.outputZswapLocalStateFilePath,
  outputResultFilePath: InternalOptions.outputResultFilePath
}

/** @internal */
export const handler: (inputs: Args & Options, moduleSpec: ConfigCompiler.ModuleSpec) =>
  Effect.Effect<
    void,
    ContractExecutable.ContractExecutionError | ConfigError.ConfigError,
    CompiledContractReflection.CompiledContractReflection | FileSystem.FileSystem
  > =
  (
    {
      address,
      circuitId,
      args,
      inputFilePath,
      inputPrivateStateFilePath,
      inputZswapLocalStateFilePath,
      outputFilePath,
      outputPrivateStateFilePath,
      outputZswapLocalStateFilePath,
      outputResultFilePath
    },
    moduleSpec
  ) => Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const { module: { default: contractModule } } = moduleSpec;
    const contractReflector = yield* CompiledContractReflection.CompiledContractReflection;
    const argsParser = yield* contractReflector.createArgumentParser(contractModule.contractExecutable.compiledContract);
    const ledgerContractState = yield* fs.readFile(inputFilePath).pipe(
      Effect.flatMap(ContractState.asLedgerContractStateFromBytes)
    );
    const privateState = JSON.parse(yield* fs.readFileString(inputPrivateStateFilePath));
    const encodedZswapLocalState = Option.map(
      inputZswapLocalStateFilePath,
      (filePath) => fs.readFileString(filePath).pipe(
        Effect.flatMap((str) => decodeZswapLocalStateObject(JSON.parse(str))
      ))
    );

    const result = yield* contractModule.contractExecutable.circuit(
      Contract.ImpureCircuitId(circuitId),
      {
        address,
        contractState: yield* ContractState.asContractState(ledgerContractState),
        privateState: privateState ?? contractModule.createInitialPrivateState(),
        zswapLocalState: Option.isSome(encodedZswapLocalState)
          ? decodeZswapLocalState((yield* Option.getOrThrow(encodedZswapLocalState)) as EncodedZswapLocalState)
          : undefined 
      },
      ...(yield* argsParser.parseCircuitArgs(Contract.ImpureCircuitId(circuitId), args))
    );
    yield* Console.log(
      JSON.stringify(
        result.private.result,
        (_, value) => typeof value === 'bigint' ? value.toString() : value,
        2
      )
    );
    const intent = Intent.new(yield* InternalCommand.ttl(Duration.minutes(10)))
      .addCall(new ContractCallPrototype(
        address,
        circuitId,
        ledgerContractState.operation(circuitId) as LedgerContractOption,
        result.public.partitionedTranscript[0],
        result.public.partitionedTranscript[1],
        result.private.privateTranscriptOutputs,
        result.private.input,
        result.private.output,
        communicationCommitmentRandomness(),
        circuitId
      ));

    yield* fs.writeFileString(
      outputResultFilePath,
      JSON.stringify(
        result.private.result,
        (_, value) => typeof value === 'bigint' ? value.toString() : value,
        2
      )
    );
    yield* fs.writeFile(outputFilePath, intent.serialize());
    yield* fs.writeFileString(outputPrivateStateFilePath, JSON.stringify(result.private.privateState));
    yield* fs.writeFileString(
      outputZswapLocalStateFilePath,
      JSON.stringify(
        yield* encodeZswapLocalStateObject(encodeZswapLocalState(result.private.zswapLocalState))
      )
    );
  }).pipe(
    Effect.mapError(
      (err) => ContractRuntimeError.make('Failed to invoke circuit', err)
    )
  );
