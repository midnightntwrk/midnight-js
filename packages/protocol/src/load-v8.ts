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

import { Ledger8RuntimeMissingError } from './errors';
import type * as V8 from './v8.js';

export type ProtocolV8 = typeof V8;

let v8ModulePromise: Promise<ProtocolV8> | undefined;

/**
 * The only sanctioned runtime path to the v8 ledger era.
 *
 * The package self-reference specifier resolves through this package's own
 * exports map and stays external to the rollup bundle, so the v8 WASM loads
 * only on the first call. Enforced by v8-surface.test.ts (no other module in
 * src/ may reference the /v8 subpath) and dist-laziness.test.ts (the index
 * bundle must never link the subpath statically).
 *
 * A failed load is not memoised: the rejection propagates as
 * {@link Ledger8RuntimeMissingError} and the next call retries the import.
 */
export const loadLedger8 = (): Promise<ProtocolV8> =>
  (v8ModulePromise ??= import('@midnight-ntwrk/midnight-js-protocol/v8').catch((error: unknown) => {
    v8ModulePromise = undefined;
    throw new Ledger8RuntimeMissingError(error);
  }));
