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
 * Build entry for the `./engine` subpath.
 *
 * The engine implementation lives under `lib/` so it is not an entry of its
 * own; this module is what rollup emits as `dist/engine.mjs`, the chunk that
 * {@link loadLedger8Engine} reaches by dynamic import. Keeping it a separate
 * entry is what holds the retained `compact-runtime@0.16` glue and the
 * `@midnight-ntwrk/onchain-runtime-v3` WASM out of the package root.
 */
export * from './lib/engine';
