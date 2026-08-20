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

import { type Ledger8InstanceAxis, Ledger8InstanceMismatchError } from '../errors';

/**
 * Fails fast on a dual-instantiation of a WASM package the down-convert
 * engine depends on, along one named `axis`.
 *
 * A duplicate install resolves to two physically distinct module instances —
 * same shape, different WASM linear memory, different classes. Handing an
 * object from one copy to the other's classes does fail, and loudly:
 * wasm-bindgen's `_assertClass` throws `expected instance of <Class>`. But it
 * throws deep inside a decode, naming neither the package nor the duplicate
 * install. This guard exists to detect the condition where it can be
 * explained, not to detect a failure that would otherwise pass silently.
 *
 * Reference equality is the probe: two references to the *same* physical copy
 * are always `===`; two sourced from different physical copies never are,
 * even at the same package version.
 *
 * Both probes are compared symmetrically — there is no expected side — so the
 * two arguments are interchangeable. What matters is that they are obtained
 * from **two different acquisition paths** (two distinct import specifiers,
 * or an import versus a caller-supplied module). Passing the same binding
 * twice satisfies the check trivially and proves nothing; the caller owns
 * that, because nothing in the signature can enforce it.
 *
 * A nullish probe (`null`/`undefined`) on either side is rejected before the
 * `===` comparison runs, rather than compared directly: two nullish values
 * are always `===` to each other, so a caller that optional-chained a missing
 * export on both sides (or simply forgot to pass a probe) would otherwise
 * pass this fail-fast safety net by accident instead of failing it.
 *
 * An axis earns an assertion only when the package genuinely reaches this
 * process through two acquisition paths — see {@link Ledger8InstanceAxis} for
 * why `'onchain-runtime-v3'` is the only member today.
 */
export const assertSharedLedger8Instance = (axis: Ledger8InstanceAxis, probeA: unknown, probeB: unknown): void => {
  if (probeA == null || probeB == null || probeA !== probeB) {
    throw new Ledger8InstanceMismatchError(axis);
  }
};
