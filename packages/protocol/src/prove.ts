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

/**
 * The retained-era half of the `proveTx` seam, published as a LEAF subpath.
 *
 * Deliberately not on the package root: the root barrel re-exports the
 * `ledger`, `compactRuntime`, `compactJs`, `platform` and `onchainRuntime`
 * namespaces, and a proof provider that needs only this function should not
 * link them. Same discipline as `./errors` and `./version`.
 *
 * The retained runtime itself stays behind the dynamic import inside
 * `loadLedger8`, so importing this entry does not load the v8 WASM. That is
 * gated by `src/test/dist-laziness.test.ts`.
 */

export * from './lib/v8/prove';
