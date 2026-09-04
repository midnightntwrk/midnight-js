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

import { Ledger8InstanceMismatchError, Ledger8RuntimeMissingError } from '../../errors';
import type * as Engine from './engine.js';

// Type-only: a value re-export here would link the engine chunk into the root
// barrel -- see ModuleGraphAndLazyLoading.
export type {
  DownConvertedState,
  EncodedStateValue,
  ExecuteCircuitOptions,
  Ledger8Engine,
  TranscriptPojo,
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
 * A failed load is not memoised: the next call retries the import. Exactly two
 * rejections propagate unchanged — {@link Ledger8RuntimeMissingError} from the
 * retained-runtime acquisition, and {@link Ledger8InstanceMismatchError} from
 * the construction-time instance guard — keeping their class, code and
 * discriminants intact for callers. Every other failure is wrapped in
 * {@link Ledger8RuntimeMissingError}, including the coded
 * `Ledger8RuntimeInvalidError` that same guard raises for an incomplete
 * runtime, and a raw module-resolution error on the engine chunk itself.
 *
 * @returns The engine's public surface, memoised after the first successful
 *   load.
 * @throws Ledger8RuntimeMissingError If the retained runtime, or the `./engine`
 *   chunk itself, cannot be acquired.
 * @throws Ledger8InstanceMismatchError If the construction-time instance guard
 *   found `onchain-runtime-v3` resolved to two physically distinct copies.
 * @see {@link ModuleGraphAndLazyLoading}
 * @see {@link EraSeam}
 */
export const loadLedger8Engine = (): Promise<Engine.Ledger8Engine> =>
  (enginePromise ??= import('../../engine.js')
    .then((engineModule) => engineModule.createLedger8Engine())
    .catch((error: unknown) => {
      enginePromise = undefined;
      throw error instanceof Ledger8RuntimeMissingError || error instanceof Ledger8InstanceMismatchError
        ? error
        : new Ledger8RuntimeMissingError('/engine', error);
    }));
