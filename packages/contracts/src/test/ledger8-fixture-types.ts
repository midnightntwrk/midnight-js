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

// The retained-era fixture contracts, typed from the artifacts' OWN generated declarations.
//
// All three fixtures ship a `contract/index.d.ts` that `compactc` 0.31.1 emitted beside the
// `contract/index.js` the runtime tests load, so the two halves of the pairing now look at the
// same artifact:
//
//  - `ledger8-contract.test.ts` loads the generated JavaScript and asserts, at runtime, the
//    structural facts the retained-era family in `../ledger8-contract.ts` encodes.
//  - `typecheck/overloads.test-d.ts` asserts, at compile time, that the generated DECLARATIONS
//    satisfy that family and that the retained-era overloads resolve for them.
//
// Nothing here restates a circuit or witness signature. An earlier revision did, in terms of
// `Ledger8CircuitContext`, which made the compile assertions unable to fail on the one axis that
// mattered: a stand-in written in terms of the family agrees with the family whatever the family
// says. It drifted exactly there -- see #1312, whose CAUSE was reusing that descriptive,
// `unknown`-membered type in the circuit's contravariant parameter position; the missing
// `costModel` was how it became visible, not why it happened.

import type * as CoinReceiver016 from '../../../../testkit-js/testkit-js/src/fixtures/hf/coin-receiver-016/compiled/contract/index.js';
import type * as Counter016 from '../../../../testkit-js/testkit-js/src/fixtures/hf/counter-016/compiled/contract/index.js';
import type * as PrivateCounter016 from '../../../../testkit-js/testkit-js/src/fixtures/hf/private-counter-016/compiled/contract/index.js';

/** The private state the counter's circuits carry: it declares none. */
export type Counter016PrivateState = Record<string, never>;

/**
 * The zero-argument retained-era fixture contract.
 *
 * Its `increment` takes only the framework-built context, which is what exercises
 * `Ledger8CircuitParameters` at the empty tuple.
 */
export type Counter016Contract = Counter016.Contract<Counter016PrivateState>;

/** The shape of the counter's module, every member taken from the generated declarations. */
export interface Counter016Module {
  readonly Contract: new (witnesses: Counter016.Witnesses<Counter016PrivateState>) => Counter016Contract;
  readonly ledger: typeof Counter016.ledger;
  readonly pureCircuits: Counter016.PureCircuits;
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

/** The private state the coin receiver's circuits carry: it declares none. */
export type CoinReceiver016PrivateState = Record<string, never>;

/** The argument-taking retained-era fixture contract. */
export type CoinReceiver016Contract = CoinReceiver016.Contract<CoinReceiver016PrivateState>;

/**
 * The `ShieldedCoinInfo` the coin receiver's circuit takes, read off the circuit's own generated
 * signature rather than restated: a 32-byte nonce, a 32-byte colour, and an unsigned value.
 */
export type CoinReceiver016Coin = Parameters<
  CoinReceiver016.ImpureCircuits<CoinReceiver016PrivateState>['receive_coin']
>[1];

/** The shape of the coin receiver's module. */
export interface CoinReceiver016Module {
  readonly Contract: new (witnesses: CoinReceiver016.Witnesses<CoinReceiver016PrivateState>) => CoinReceiver016Contract;
  readonly ledger: typeof CoinReceiver016.ledger;
  readonly pureCircuits: CoinReceiver016.PureCircuits;
}

// The THIRD retained-era fixture, and the only one that declares a WITNESS.
//
// Both fixtures above emit `export type Witnesses<PS> = {}`, so every claim the family makes about
// `Ledger8Witness` -- that it threads `PS`, and that a witness declared over the wrong private
// state is refused -- was a hand-written claim about generated code that nothing checked. That is
// the shape of #1312 one member over, on the member next door. `private-counter-016` declares
// `localIncrement(context: WitnessContext<Ledger, PS>): [PS, bigint]` and carries a real private
// state, so the claim can be asserted against a real artifact instead.

/** The private state the private counter carries -- a real one, unlike the other two fixtures. */
export type PrivateCounter016PrivateState = { readonly privateCounter: bigint };

/** The witness-declaring retained-era fixture contract. */
export type PrivateCounter016Contract = PrivateCounter016.Contract<PrivateCounter016PrivateState>;

/** The fixture's single witness, read off its own generated signature. */
export type PrivateCounter016Witness =
  PrivateCounter016.Witnesses<PrivateCounter016PrivateState>['localIncrement'];
