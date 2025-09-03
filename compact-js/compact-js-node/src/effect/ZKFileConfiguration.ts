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

import { FileSystem,Path } from '@effect/platform';
import { CompiledContract, Contract, ZKConfiguration, ZKConfigurationReadError } from '@midnight-ntwrk/compact-js/effect';
import { Effect, Layer } from 'effect';

const KEYS_FOLDER = 'keys';
const VERIFIER_EXT = '.verifier';

/**
 * Returns a function, that when invoked, will create a ZK asset reader over the file system.
 * 
 * @param path A `Path` implementation.
 * @param fs A `FileSystem` implementation.
 * @returns A function that receives a `CompiledContract` instance and returns a ZK asset reader over `fs`.
 *
 * @internal
 */
const makeFileSystemReader =
  <C extends Contract.Contract<PS>, PS>(path: Path.Path, fs: FileSystem.FileSystem, baseFolderPath: string) =>
  (compiledContract: CompiledContract.CompiledContract<C, PS>) =>
    // eslint-disable-next-line require-yield
    Effect.gen(function* () {
      const zkConfigAssetsPath = CompiledContract.getZkConfigAssetsPath(compiledContract);
      const getVerifierKey = (impureCircuitId: Contract.ImpureCircuitId<C>) =>
        Effect.gen(function* () {
          const data = yield* fs.readFile(
            path.join(path.resolve(baseFolderPath, zkConfigAssetsPath), KEYS_FOLDER, `${impureCircuitId}${VERIFIER_EXT}`)
          );
          return Contract.VerifierKey(data);
        }).pipe(
          Effect.mapError((err: unknown) =>
            ZKConfigurationReadError.make(compiledContract.tag, impureCircuitId, 'verifier-key', err)
          )
        );

      return {
        getVerifierKey,
        getVerifierKeys: (impureCircuitIds) =>
          Effect.forEach(
            impureCircuitIds,
            (impureCircuitId) =>
              getVerifierKey(impureCircuitId).pipe(
                Effect.map((verifierKey) => [impureCircuitId, verifierKey] as const)
              ),
            { concurrency: 'unbounded', discard: false }
          )
      } satisfies ZKConfiguration.ZKConfiguration.Reader<C, PS>;
    });

/**
 * A {@link ZKConfiguration.ZKConfiguration | ZKConfiguration} implementation that reads ZK assets from the
 * file system.
 *
 * @param baseFolderPath A base path to a folder containing the ZK assets.
 *
 * @category layers
 */
export const layer = (baseFolderPath = '.') => Layer.effect(
  ZKConfiguration.ZKConfiguration,
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;

    return ZKConfiguration.ZKConfiguration.of({
      createReader: makeFileSystemReader(path, fs, baseFolderPath)
    });
  })
);
