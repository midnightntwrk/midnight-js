/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
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

import { Ledger8RuntimeMissingError } from '../../errors';
import type * as Engine from './engine.js';

// Type-only: a value re-export here would link the engine chunk into the root
// barrel -- see ModuleGraphAndLazyLoading.
export type {
  ConstructorResultPojo,
  EncodedStateValue,
  Ledger8CircuitOptions,
  Ledger8ConstructorOptions,
  Ledger8Engine,
  Ledger8EngineContract,
  Ledger8SigningKey,
  TranscriptPojo,
  VerifierKeyReader,
  WrapKeepStateCallOptions
} from './engine.js';

let enginePromise: Promise<Engine.Ledger8Engine> | undefined;

/**
 * The only sanctioned runtime path to the engine's public surface.
 *
 * The retained `compact-runtime@0.16` glue and
 * `@midnight-ntwrk/onchain-runtime-v3` WASM load only on the first call — never
 * as a side effect of importing the package root.
 *
 * A failed load is not memoised: the next call retries the import. A
 * {@link Ledger8RuntimeMissingError} from the retained-runtime acquisition
 * propagates unchanged. Every other failure is wrapped in
 * {@link Ledger8RuntimeMissingError}, including the coded
 * `Ledger8RuntimeInvalidError` the envelope decoder raises for an incomplete
 * runtime, and a raw module-resolution error on the engine chunk itself.
 *
 * @returns The engine's public surface, memoised after the first successful
 *   load.
 * @throws Ledger8RuntimeMissingError If the retained runtime, or the `./v8/engine`
 *   chunk itself, cannot be acquired.
 * @see {@link ModuleGraphAndLazyLoading}
 * @see {@link EraBoundary}
 */
export const loadLedger8Engine = (): Promise<Engine.Ledger8Engine> =>
  (enginePromise ??= import('../../engine.js')
    .then((engineModule) => engineModule.createLedger8Engine())
    .catch((error: unknown) => {
      enginePromise = undefined;
      throw error instanceof Ledger8RuntimeMissingError ? error : new Ledger8RuntimeMissingError('/v8/engine', error);
    }));
