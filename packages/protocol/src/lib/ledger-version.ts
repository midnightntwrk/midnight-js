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
 * need this set and neither can import the other: `../errors.ts` types the era
 * every composition failure names, and `../version.ts` throws an error declared
 * in `../errors.ts`. A constant declared in either one would close that cycle.
 *
 * Frozen, not merely `as const`: it is read by the era-dispatch tables, which
 * are indexed by a value that is only type-checked for TypeScript callers, so a
 * downstream package must not be able to mutate the shared set at runtime. The
 * same discipline `PROTOCOL_ERROR_CODES` applies to its own registry.
 */
export const LEDGER_VERSIONS = Object.freeze(['v8', 'v9'] as const);
export type LedgerVersion = (typeof LEDGER_VERSIONS)[number];
