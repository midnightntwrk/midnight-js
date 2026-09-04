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

import type { Ledger8CircuitContext, Ledger8CircuitResult, Ledger8Contract } from '../ledger8-contract';

// Not a `*.test.ts` file, so vitest does not collect it, and it sits under `test/`, which the
// coverage config excludes.
//
// This is the ONE place the retained-era fixture contract is described, because two tests need
// the same description and they are only meaningful together:
//
//  - `ledger8-contract.test.ts` loads the REAL generated artifact and asserts, at runtime, the
//    structural facts this description claims: synchronous members throughout, and no
//    current-era brand.
//  - `typecheck/overloads.test-d.ts` uses this description as the compile-time stand-in for that
//    artifact, because the retained toolchain emits no `.d.ts` to import a type from.
//
// Written twice, the compile assertions could drift from what the runtime test verifies and
// neither test would notice.

/** The witnesses the fixture contract is constructed with: the counter declares none. */
export type Counter016Witnesses = Record<string, never>;

/** The private state the fixture's circuits carry: the counter declares none. */
export type Counter016PrivateState = Record<string, never>;

/**
 * The fixture's single circuit. It takes only the framework-built context, so a caller supplies
 * no arguments of its own, and it returns a plain object rather than a `Promise`.
 *
 * A type ALIAS rather than an interface, deliberately: TypeScript gives an implicit index
 * signature to an object type alias but not to an interface, and without one a circuit collection
 * is not assignable to the family's `Readonly<Record<string, Ledger8Circuit>>`. Generated Compact
 * declarations are written the same way — the current era's twin fixture declares its
 * `ImpureCircuits<PS>` as a type alias — so this matches real generated code rather than working
 * around the family.
 */
export type Counter016Circuits = {
  readonly increment: (context: Ledger8CircuitContext<Counter016PrivateState>) => Ledger8CircuitResult;
};

/**
 * The retained runtime's constructor context. Opaque here: it is a live value of the previous
 * runtime, which nothing outside that runtime may inspect.
 */
export type Ledger8ConstructorContextLike = { readonly initialZswapLocalState: unknown };

/** What the fixture's `initialState` returns — a plain object, not a `Promise`. */
export interface Counter016ConstructorResult {
  readonly currentContractState: unknown;
  readonly currentPrivateState: Counter016PrivateState;
  readonly currentZswapLocalState: unknown;
}

/**
 * The retained-era fixture contract, described in terms of the hand-written family in
 * `../ledger8-contract.ts`.
 *
 * Every member is SYNCHRONOUS, which is what makes this shape distinguishable from the current
 * era's; `ledger8-contract.test.ts` asserts exactly that against the real artifact.
 */
export interface Counter016Contract extends Ledger8Contract<Counter016PrivateState> {
  readonly witnesses: Counter016Witnesses;
  readonly circuits: Counter016Circuits;
  readonly impureCircuits: Counter016Circuits;
  readonly provableCircuits: Counter016Circuits;
  initialState(context: Ledger8ConstructorContextLike): Counter016ConstructorResult;
}

/** The shape of the fixture module itself. */
export interface Counter016Module {
  readonly Contract: new (witnesses: Counter016Witnesses) => Counter016Contract;
  readonly ledger: (stateOrChargedState: never) => unknown;
  readonly pureCircuits: Readonly<Record<string, unknown>>;
}
