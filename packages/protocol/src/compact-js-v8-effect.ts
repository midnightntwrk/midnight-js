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
 * compact-js's ledger 8 entry, re-exported: outside this package, compact-js
 * is reached only through these subpaths (an ESLint import restriction in
 * `eslint.config.mjs` enforces it).
 *
 * `executeCircuit` does not take these containers; it takes a
 * {@link Ledger8EngineContract}. See ADR 0015.
 */

export * from '@midnightntwrk/compact-js/v8/effect';
