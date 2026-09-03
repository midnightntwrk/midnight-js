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
import type * as V8 from '../../v8.js';

export type ProtocolV8 = typeof V8;

let v8ModulePromise: Promise<ProtocolV8> | undefined;

/**
 * The only sanctioned runtime path to the v8 ledger era.
 *
 * The v8 WASM loads on the first call and not before.
 *
 * A failed load is not memoised: the rejection propagates as
 * {@link Ledger8RuntimeMissingError} and the next call retries the import.
 *
 * @returns The v8 ledger module, memoised after the first successful load.
 * @throws Ledger8RuntimeMissingError If the `./v8` chunk cannot be imported.
 *   The returned promise rejects with it, carrying the underlying failure on
 *   `cause`.
 * @see {@link ModuleGraphAndLazyLoading}
 * @see {@link EraSeam}
 */
export const loadLedger8 = (): Promise<ProtocolV8> =>
  (v8ModulePromise ??= import('../../v8.js').catch((error: unknown) => {
    v8ModulePromise = undefined;
    throw new Ledger8RuntimeMissingError('/v8', error);
  }));
