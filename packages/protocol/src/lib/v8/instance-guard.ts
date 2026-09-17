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

import {
  type Ledger8InstanceAxis,
  Ledger8InstanceMismatchError,
  Ledger8RuntimeInvalidError,
  UnknownLedger8AxisError
} from '../../errors';

/**
 * The closed set of axes this guard will run on, as a lookup rather than a
 * comparison chain.
 *
 * Kept here rather than exported from `errors.ts`, which is a build entry:
 * nothing outside this module needs to test an axis, and the engine's whole
 * design is to stay off the public surface.
 *
 * @see {@link SharedTableDiscipline}
 */
const KNOWN_AXES: Readonly<Record<Ledger8InstanceAxis, true>> = Object.freeze(
  Object.assign(Object.create(null) as Record<Ledger8InstanceAxis, true>, {
    'onchain-runtime-v3': true
  } satisfies Record<Ledger8InstanceAxis, true>)
);

const isKnownAxis = (axis: unknown): axis is Ledger8InstanceAxis =>
  typeof axis === 'string' && KNOWN_AXES[axis as Ledger8InstanceAxis] === true;

/**
 * Fails fast on a dual-instantiation of a WASM package the down-convert
 * engine depends on, along one named `axis`.
 *
 * Pass a **shared binding** — a class the package exports, such as
 * `ChargedState` or `StateValue` — never a module namespace object.
 *
 * The two probes are compared symmetrically, so they are interchangeable, but
 * they must be obtained from **two different acquisition paths** (two distinct
 * import specifiers, or an import versus a caller-supplied module). Passing the
 * same binding twice satisfies the check trivially and proves nothing; the
 * caller owns that, because nothing in the signature can enforce it.
 *
 * @param axis The physical-copy axis to check, validated against
 *   {@link Ledger8InstanceAxis} before either probe is looked at.
 * @param probeA A shared binding, obtained through one acquisition path.
 * @param probeB The same binding, obtained through a different acquisition
 *   path.
 * @throws UnknownLedger8AxisError If `axis` is not a member of
 *   {@link Ledger8InstanceAxis}.
 * @throws Ledger8RuntimeInvalidError If either probe is `null` or `undefined`.
 *   A missing probe is a binding the caller did not hand over, so it is not
 *   reported as a mismatch.
 * @throws Ledger8InstanceMismatchError If the two probes are not
 *   reference-equal, i.e. the package resolved to two physically distinct
 *   copies in this process.
 * @example
 * ```typescript
 * const [glue, ocrt3] = await Promise.all([
 *   import('compact-runtime-ledger8'),
 *   import('@midnight-ntwrk/onchain-runtime-v3')
 * ]);
 * // Two acquisition paths to the same binding, never a namespace object.
 * assertSharedLedger8Instance('onchain-runtime-v3', ocrt3.ChargedState, glue.ChargedState);
 * ```
 * @see {@link DualInstantiationGuard}
 */
export const assertSharedLedger8Instance = (axis: Ledger8InstanceAxis, probeA: unknown, probeB: unknown): void => {
  if (!isKnownAxis(axis)) {
    throw new UnknownLedger8AxisError(String(axis));
  }
  if (probeA == null || probeB == null) {
    throw new Ledger8RuntimeInvalidError(`${axis} instance probe`);
  }
  if (probeA !== probeB) {
    throw new Ledger8InstanceMismatchError(axis);
  }
};
