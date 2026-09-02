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
 * Held in a leaf module that imports nothing, and re-exported unchanged by
 * `../version.ts`, so the public surface is the one it always was. Two modules
 * need this set, and the dependency between them runs one way: `../version.ts`
 * imports `../errors.ts` for the error it throws, while `../errors.ts` imports
 * nothing but this file. Declaring the constant in `../version.ts` would
 * therefore close a cycle. Declaring it in `../errors.ts` would not, but it
 * would put the era vocabulary in the error module and make every reader of it
 * an importer of errors. A leaf both can reach keeps the direction and the
 * ownership straight.
 *
 * Frozen, not merely `as const`: it is a public exported constant, and an
 * unfrozen array is one a downstream package can mutate for every other
 * consumer in the process. The same discipline `PROTOCOL_ERROR_CODES` applies
 * to its own registry. Nothing reads the value at runtime to dispatch on — the
 * era tables are typed by `LedgerVersion` and built independently — so this
 * guards the export, not the dispatch.
 */
export const LEDGER_VERSIONS = Object.freeze(['v8', 'v9'] as const);
export type LedgerVersion = (typeof LEDGER_VERSIONS)[number];
