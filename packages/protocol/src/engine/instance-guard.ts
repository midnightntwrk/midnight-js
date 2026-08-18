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

import { Ledger8InstanceMismatchError, Ledger8RuntimeMissingError } from '../errors';
import { loadV8 } from '../load-v8';

/**
 * Fails fast on a dual-instantiation of either WASM package the down-convert
 * engine bridges between: the retained pre-fork `compact-runtime@0.16` axis
 * (`@midnight-ntwrk/onchain-runtime-v3`) and the current post-fork ledger
 * axis (`@midnightntwrk/ledger-v9`).
 *
 * A duplicate npm install of either package resolves to two physically
 * distinct module instances — same shape, different WASM linear memory and
 * different classes — so objects created by one copy silently fail
 * `instanceof`/coercion checks against the other copy's classes instead of
 * raising a clear error at the point of misuse. Reference equality on
 * whatever each caller passes (a module namespace or a specific exported
 * class/constructor) is a reliable, cheap probe for this: two references to
 * the *same* physical copy are always `===`; two references sourced from
 * different physical copies never are, even at the same package version.
 *
 * Checks the 0.16 runtime axis before the ledger-v9 axis and throws on the
 * first mismatch found.
 */
export const assertSharedLedger8Instances = (
  contractRuntime: unknown,
  engineRuntime: unknown,
  ledgerV9: unknown,
  engineLedgerV9: unknown
): void => {
  if (contractRuntime !== engineRuntime) {
    throw new Ledger8InstanceMismatchError('onchain-runtime-v3');
  }
  if (ledgerV9 !== engineLedgerV9) {
    throw new Ledger8InstanceMismatchError('ledger-v9');
  }
};

/**
 * Probes that the retained v8 runtime (loaded via {@link loadV8}) is
 * resolvable, before any fetch or proving work starts — so a missing or
 * broken retained-toolchain install fails immediately and legibly instead of
 * mid-flight.
 *
 * `loadRuntime` is the acquisition seam: it defaults to {@link loadV8}, the
 * only sanctioned runtime path to the v8 ledger era, but tests can inject a
 * loader that rejects to exercise the failure path without a real broken
 * install. A rejection is always surfaced as {@link Ledger8RuntimeMissingError}
 * — never the raw module-resolution error — and an already-wrapped rejection
 * (the default `loadV8` path already wraps) is passed through unchanged
 * rather than double-wrapped.
 */
export const assertLedger8RuntimePresent = (loadRuntime: () => Promise<unknown> = loadV8): Promise<void> =>
  loadRuntime().then(
    () => undefined,
    (cause: unknown) => {
      throw cause instanceof Ledger8RuntimeMissingError ? cause : new Ledger8RuntimeMissingError(cause);
    }
  );
