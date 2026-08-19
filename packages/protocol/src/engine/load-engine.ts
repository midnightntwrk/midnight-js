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

import { Ledger8InstanceMismatchError, Ledger8RuntimeMissingError } from '../errors';
import type * as Engine from './index.js';

export type { Ledger8Engine } from './index.js';

let enginePromise: Promise<Engine.Ledger8Engine> | undefined;

/**
 * The only sanctioned runtime path to the engine's public surface.
 *
 * Like {@link loadLedger8}, the package self-reference specifier
 * (`@midnight-ntwrk/midnight-js-protocol/engine`) resolves through this
 * package's own exports map and stays external to the rollup bundle, so the
 * retained `compact-runtime@0.16` glue and `@midnight-ntwrk/onchain-runtime-v3`
 * WASM load only on the first call — never as a side effect of importing the
 * package root. Enforced by dist-laziness.test.ts (the index bundle must
 * never link the `./engine` subpath, `@midnight-ntwrk/onchain-runtime-v3`, or
 * the `compact-runtime-ledger8` glue alias statically).
 *
 * A failed load is not memoised: the next call retries the import. A
 * rejection that already carries a protocol error code —
 * {@link Ledger8RuntimeMissingError} from the retained-runtime acquisition, or
 * {@link Ledger8InstanceMismatchError} from the construction-time instance
 * guard — propagates unchanged, keeping its class, code and discriminants
 * intact for callers; any other failure (e.g. a raw module-resolution error
 * on the engine chunk itself) is wrapped in {@link Ledger8RuntimeMissingError}.
 */
export const loadLedger8Engine = (): Promise<Engine.Ledger8Engine> =>
  (enginePromise ??= import('@midnight-ntwrk/midnight-js-protocol/engine')
    .then((engineModule) => engineModule.createLedger8Engine())
    .catch((error: unknown) => {
      enginePromise = undefined;
      throw error instanceof Ledger8RuntimeMissingError || error instanceof Ledger8InstanceMismatchError
        ? error
        : new Ledger8RuntimeMissingError(error);
    }));
