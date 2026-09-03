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
 * design is to stay off the public surface. The duplication of the one literal
 * is checked, not trusted — `satisfies` fails to compile if
 * {@link Ledger8InstanceAxis} gains a member this table does not name.
 *
 * Null-prototype and frozen for the reason `ENVELOPE_DECODERS` is: the value
 * indexing it is only type-checked for TypeScript callers, and a plain object
 * literal answers `true` for every `Object.prototype` member.
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
 * A duplicate install resolves to two physically distinct module instances —
 * same shape, different WASM linear memory, different classes. What happens
 * when they mix depends on which position the foreign object is in, and only
 * one of the two is checked:
 *
 * - As an **argument** to a wasm-bound function, wasm-bindgen emits
 *   `_assertClass`, which throws `expected instance of <Class>`. Loud, though
 *   deep inside a decode and naming neither the package nor the duplicate
 *   install.
 * - As the **receiver** of a wasm-bound method, nothing is checked. The glue
 *   reads `this.__wbg_ptr` and calls into its own linear memory with a pointer
 *   that belongs to the other copy's heap. Measured on the pinned version, that
 *   returns a plausible, wrong value: a cell built in one copy read back
 *   through the other's `encode()` yields different bytes with no error, and
 *   `type()` still reports the correct variant. Whether it happens to come back
 *   right depends on how the two heaps line up, so it is not reliably
 *   reproducible — and a test that passes proves nothing about production.
 *
 * So this guard is not only a diagnosis-improver. For the receiver direction it
 * is the only thing standing between a duplicate install and silently wrong
 * contract state, which is why it must run before any state crosses the bridge
 * rather than being treated as optional belt-and-braces.
 *
 * Reference equality is the probe: two references to the *same* physical copy
 * are always `===`; two sourced from different physical copies never are,
 * even at the same package version.
 *
 * Pass a **shared binding** — a class the package exports, such as
 * `ChargedState` or `StateValue` — never a module namespace object. A
 * namespace is per-module, so a re-export produces a different one even when
 * there is exactly one physical copy behind it; comparing namespaces would
 * report a mismatch on a healthy install and send the user hunting a duplicate
 * that does not exist. A re-export preserves the identity of the binding
 * itself, which is why the binding is the sound probe and the namespace is not.
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
 * pass this fail-fast safety net by accident instead of failing it. It is
 * reported as {@link Ledger8RuntimeInvalidError}, not as a mismatch: a missing
 * probe is a binding the caller did not hand over, which is the same fault the
 * envelope seam reports under that code. Calling it a dual-instantiation would
 * assert two physical copies exist and send the reader to `npm why` after a
 * duplicate that is not there.
 *
 * `axis` is validated against the closed union before either probe is looked
 * at, for the same reason `extractEncodedStateValue` validates `version`: it is
 * only type-checked for TypeScript callers, and it selects the package names
 * the remediation hint tells the reader to trace.
 *
 * An axis earns an assertion only when the package genuinely reaches this
 * process through two acquisition paths — see {@link Ledger8InstanceAxis} for
 * why `'onchain-runtime-v3'` is the only member today.
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
