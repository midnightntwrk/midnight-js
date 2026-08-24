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

import { Ledger8RuntimeMissingError } from '../errors';
import type * as V8 from '../v8.js';

export type ProtocolV8 = typeof V8;

let v8ModulePromise: Promise<ProtocolV8> | undefined;

/**
 * The only sanctioned runtime path to the v8 ledger era.
 *
 * Lives under `lib/` because every module directly under `src/` is a build
 * entry paired with an `exports` subpath (see export-surface.test.ts), and the
 * accessor is published through the root barrel instead of a subpath of its
 * own.
 *
 * The relative specifier names the `./v8` build entry, which rollup emits as
 * its own chunk and links only through this dynamic import, so the v8 WASM
 * loads on the first call and not before. Enforced by v8-surface.test.ts (no
 * other module under src/ may import the v8 module at runtime) and
 * dist-laziness.test.ts (the index bundle must never link it statically).
 *
 * A failed load is not memoised: the rejection propagates as
 * {@link Ledger8RuntimeMissingError} and the next call retries the import.
 */
export const loadLedger8 = (): Promise<ProtocolV8> =>
  (v8ModulePromise ??= import('../v8.js').catch((error: unknown) => {
    v8ModulePromise = undefined;
    throw new Ledger8RuntimeMissingError('/v8', error);
  }));
