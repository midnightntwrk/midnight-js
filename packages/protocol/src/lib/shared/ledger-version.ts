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
 * compact-js names the same era by number: its `Ledger.Era['ledger']` (for
 * example `executable.era.ledger`) is `8` for `'v8'` and `9` for `'v9'`.
 *
 * @see {@link SharedTableDiscipline} for why the array is frozen.
 * @see {@link ModuleGraphAndLazyLoading} for why the constant is declared in
 * this leaf module and re-exported by `../version.ts`.
 */
export const LEDGER_ERAS = Object.freeze(['v8', 'v9'] as const);
export type LedgerEra = (typeof LEDGER_ERAS)[number];

/**
 * The era whose objects this build links eagerly, today through `./v9`.
 *
 * "Current" is relative: today it is ledger 9 (`'v9'`). At the next hard fork it
 * moves to the new ledger and ledger 9 joins {@link RetainedLedgerEra}. Code
 * bound to one ledger is named after that ledger (`Ledger9*`) instead.
 *
 * A protocol fact rather than a consumer's choice: it is decided by which
 * ledger the package links eagerly, and every other era is reached lazily and
 * crosses package boundaries as bytes. Declared here so that no package
 * downstream restates "which era is now" as a literal of its own.
 *
 * The type is the single literal, not {@link LedgerEra}, so a value typed
 * by it DISCRIMINATES: `midnight-js-contracts` types a current-era result's
 * `era` with it, so a union of both eras' results narrows on `era`.
 */
export const CURRENT_LEDGER_ERA = 'v9' as const satisfies LedgerEra;
export type CurrentLedgerEra = typeof CURRENT_LEDGER_ERA;

/**
 * Every era this build still speaks but does not run live: its runtime is
 * loaded only on demand, through `loadLedger8Protocol`.
 *
 * "Retained" is relative: today the set is ledger 8 (`'v8'`). At the next hard
 * fork the then-current ledger joins it. Code bound to one ledger is named
 * after that ledger (`Ledger8*`) instead.
 *
 * Defined as the complement of {@link CURRENT_LEDGER_ERA}, so a further
 * era joins this set by being added to {@link LEDGER_ERAS} and nothing
 * else. The value list below is checked against that complement at build time.
 */
export type RetainedLedgerEra = Exclude<LedgerEra, CurrentLedgerEra>;

export const RETAINED_LEDGER_ERAS = Object.freeze(['v8'] as const satisfies readonly RetainedLedgerEra[]);

// Compile-time-only guard, in the same shape `version.ts` uses for its node-major
// table: a retained era missing from the list above stops this assignment
// type-checking. The tuple wrapping is load-bearing — a bare
// `Exclude<...> extends never` would distribute over the empty union and hold
// no matter what the list says.
const _everyRetainedVersionIsListed: [
  Exclude<RetainedLedgerEra, (typeof RETAINED_LEDGER_ERAS)[number]>
] extends [never]
  ? true
  : never = true;
