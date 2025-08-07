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

import { type ConfigError, Effect } from 'effect';
import { type Path } from '@effect/platform';
import * as Options from './options';
import * as ConfigCompiler from '../ConfigCompiler';
import * as CommandConfigProvider from '../CommandConfigProvider';
import { ContractExecutableRuntime } from '@midnight-ntwrk/compact-js/effect';
import * as InternalCommand from './command';

/** @internal */
export const deploy: (inputs: InternalCommand.DeployInputs) =>
  Effect.Effect<void, ConfigCompiler.ConfigError | ConfigError.ConfigError, Path.Path | ConfigCompiler.ConfigCompiler> =
  (inputs: InternalCommand.DeployInputs) => Effect.gen(function* () {
    const configFilePath = yield* Options.getConfigFilePath(inputs);
    const configCompiler = yield* ConfigCompiler.ConfigCompiler;

    const { default: contractModule } = yield* configCompiler.compile(configFilePath);
    const contractRuntime = ContractExecutableRuntime.make(
      InternalCommand.layer(CommandConfigProvider.make(contractModule.config, Options.asConfigProvider(inputs)))
    );

    const _ = yield* contractModule.contractExecutable.initialize(contractModule.createInitialPrivateState()).pipe(
      Effect.map((result) => {
        return result;
      }),
      contractRuntime.runFork,
      Effect.catchAll(InternalCommand.reportContractExecutionError),
    );
  });
