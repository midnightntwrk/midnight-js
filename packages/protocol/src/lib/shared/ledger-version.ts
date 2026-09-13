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
 * The two ledger runtimes midnight-js can talk to. `v8` backs the node 1.x
 * line; `v9` backs the 2.x line. This is a closed, exhaustive set — see
 * `protocolVersionToLedger` (`../version.ts`) for how a raw `protocolVersion`
 * integer maps onto it.
 *
 * @see {@link SharedTableDiscipline} for why the array is frozen.
 * @see {@link ModuleGraphAndLazyLoading} for why the constant is declared in
 * this leaf module and re-exported by `../version.ts`.
 */
export const LEDGER_VERSIONS = Object.freeze(['v8', 'v9'] as const);
export type LedgerVersion = (typeof LEDGER_VERSIONS)[number];

/**
 * The era whose objects this build hands out live, through `./ledger`.
 *
 * A protocol fact rather than a consumer's choice: it is decided by which
 * ledger the package links eagerly, and every other era is reached lazily and
 * crosses package boundaries as bytes. Declared here so that no package
 * downstream restates "which era is now" as a literal of its own.
 *
 * The type is the single literal, not {@link LedgerVersion}, so a value typed
 * by it DISCRIMINATES — the same discipline `CurrentPipelineEra` follows in
 * `midnight-js-contracts`.
 */
export const CURRENT_LEDGER_VERSION = 'v9' as const satisfies LedgerVersion;
export type CurrentLedgerVersion = typeof CURRENT_LEDGER_VERSION;

/**
 * Every era this build still speaks but does not run live — the eras that
 * cross a package boundary as serialized bytes.
 *
 * Defined as the complement of {@link CURRENT_LEDGER_VERSION}, so a further
 * era joins this set by being added to {@link LEDGER_VERSIONS} and nothing
 * else. The value list below is checked against that complement at build time.
 */
export type RetainedLedgerVersion = Exclude<LedgerVersion, CurrentLedgerVersion>;

export const RETAINED_LEDGER_VERSIONS = Object.freeze(['v8'] as const satisfies readonly RetainedLedgerVersion[]);

// Compile-time-only guard, in the same shape `version.ts` uses for its node-major
// table: a retained era missing from the list above stops this assignment
// type-checking. The tuple wrapping is load-bearing — a bare
// `Exclude<...> extends never` would distribute over the empty union and hold
// no matter what the list says.
const _everyRetainedVersionIsListed: [
  Exclude<RetainedLedgerVersion, (typeof RETAINED_LEDGER_VERSIONS)[number]>
] extends [never]
  ? true
  : never = true;
