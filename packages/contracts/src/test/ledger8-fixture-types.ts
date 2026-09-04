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

// The SECOND retained-era fixture, and it exists for one reason: its circuit takes an ARGUMENT.
//
// `counter-016`'s `increment` takes only the framework-built context, so every assertion written
// against it exercises `Ledger8CircuitParameters` at the empty tuple and says nothing about what
// happens when a circuit has real arguments. That gap hid a defect that made the retained-era
// overload unselectable for any such contract: widening `Ledger8Circuit`'s argument tail to
// `unknown[]` broke contravariance, so `(context, coin: ShieldedCoinInfo)` failed the
// `Ledger8Contract` constraint and the call fell through to the current-era arms. Nothing caught it,
// because nothing tested it.
//
// `coin-receiver-016` is a real `compact-runtime@0.16` artifact whose own arity guard is
// `args_1.length !== 2` -- the context plus one argument -- against `counter-016`'s `!== 1`.

/** The witnesses the coin receiver is constructed with: it declares none. */
export type CoinReceiver016Witnesses = Record<string, never>;

/** The private state the coin receiver's circuits carry: it declares none. */
export type CoinReceiver016PrivateState = Record<string, never>;

/**
 * The `ShieldedCoinInfo` the fixture's circuit takes, read off the artifact's own argument check:
 * a 32-byte nonce, a 32-byte colour, and an unsigned value.
 */
export type CoinReceiver016Coin = {
  readonly nonce: Uint8Array;
  readonly color: Uint8Array;
  readonly value: bigint;
};

/**
 * The coin receiver's single circuit, which takes ONE real argument after the context.
 *
 * A type alias rather than an interface, for the implicit index signature — see
 * {@link Counter016Circuits}.
 */
export type CoinReceiver016Circuits = {
  readonly receive_coin: (
    context: Ledger8CircuitContext<CoinReceiver016PrivateState>,
    coin: CoinReceiver016Coin
  ) => Ledger8CircuitResult;
};

/** What the coin receiver's `initialState` returns — a plain object, not a `Promise`. */
export interface CoinReceiver016ConstructorResult {
  readonly currentContractState: unknown;
  readonly currentPrivateState: CoinReceiver016PrivateState;
  readonly currentZswapLocalState: unknown;
}

/**
 * The argument-taking retained-era fixture contract, described in terms of the same hand-written
 * family. `ledger8-contract.test.ts` asserts the structural facts against the real artifact, the
 * same way it does for the counter.
 */
export interface CoinReceiver016Contract extends Ledger8Contract<CoinReceiver016PrivateState> {
  readonly witnesses: CoinReceiver016Witnesses;
  readonly circuits: CoinReceiver016Circuits;
  readonly impureCircuits: CoinReceiver016Circuits;
  readonly provableCircuits: CoinReceiver016Circuits;
  initialState(context: Ledger8ConstructorContextLike): CoinReceiver016ConstructorResult;
}

/** The shape of the coin receiver's module. */
export interface CoinReceiver016Module {
  readonly Contract: new (witnesses: CoinReceiver016Witnesses) => CoinReceiver016Contract;
  readonly ledger: (stateOrChargedState: never) => unknown;
  readonly pureCircuits: Readonly<Record<string, unknown>>;
}
