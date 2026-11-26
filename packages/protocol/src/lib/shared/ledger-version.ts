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
 * The era this build links eagerly: `'v9'` today; it moves at the next hard
 * fork. Use it instead of restating "which era is now" as a literal.
 *
 * The type is the single literal, not {@link LedgerEra}, so a union of both
 * eras' results narrows on `era`.
 *
 * @see ADR 0018
 */
export const CURRENT_LEDGER_ERA = 'v9' as const satisfies LedgerEra;
export type CurrentLedgerEra = typeof CURRENT_LEDGER_ERA;

/**
 * Every era except {@link CURRENT_LEDGER_ERA}. Today that is only ledger 8 (`'v8'`).
 *
 * @deprecated Will be removed in the next major release. Use
 * `Exclude<LedgerEra, CurrentLedgerEra>` instead.
 */
export type RetainedLedgerEra = Exclude<LedgerEra, CurrentLedgerEra>;

/**
 * Every era except {@link CURRENT_LEDGER_ERA}. Today that is only ledger 8 (`'v8'`).
 *
 * @deprecated Will be removed in the next major release. Use
 * `LEDGER_ERAS.filter((era): era is Exclude<LedgerEra, CurrentLedgerEra> => era !== CURRENT_LEDGER_ERA)`
 * instead.
 */
export const RETAINED_LEDGER_ERAS = Object.freeze(['v8'] as const satisfies readonly RetainedLedgerEra[]);

// A tuple, not a bare `Exclude<...> extends never`, which would hold for any list.
const _everyOlderEraIsListed: [
  Exclude<RetainedLedgerEra, (typeof RETAINED_LEDGER_ERAS)[number]>
] extends [never]
  ? true
  : never = true;
