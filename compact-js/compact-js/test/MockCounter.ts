/*
 * This file is part of compact-js.
 * Copyright (C) 2025 Midnight Foundation
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

/* eslint-disable @typescript-eslint/unbound-method */

import { vi } from '@effect/vitest';
import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<T> = {
  private_increment(context: __compactRuntime.WitnessContext<Ledger, T>): [T, []];
};

export type Ledger = {
  readonly round: bigint;
};

export type Circuits<T> = {
  increment(context: __compactRuntime.CircuitContext<T>): __compactRuntime.CircuitResults<T, []>;
  decrement(context: __compactRuntime.CircuitContext<T>, amount_0: bigint): __compactRuntime.CircuitResults<T, []>;
  reset(context: __compactRuntime.CircuitContext<T>): __compactRuntime.CircuitResults<T, []>;
};

export type ImpureCircuits<T> = {
  increment(context: __compactRuntime.CircuitContext<T>): __compactRuntime.CircuitResults<T, []>;
  decrement(context: __compactRuntime.CircuitContext<T>, amount_0: bigint): __compactRuntime.CircuitResults<T, []>;
  reset(context: __compactRuntime.CircuitContext<T>): __compactRuntime.CircuitResults<T, []>;
};

export class Contract<T, W extends Witnesses<T> = Witnesses<T>> {
  constructor(witnesses: W) {
    this.witnesses = witnesses;
    this.circuits = {
      increment: vi.fn(),
      decrement: vi.fn(),
      reset: vi.fn()
    };
    this.impureCircuits = {
      increment: this.circuits.increment,
      decrement: this.circuits.decrement,
      reset: this.circuits.reset
    };
  }

  witnesses: W;
  circuits: Circuits<T>;
  impureCircuits: ImpureCircuits<T>;

  initialState(ctx: __compactRuntime.ConstructorContext<T>): __compactRuntime.ConstructorResult<T> {
    const state = new __compactRuntime.ContractState();
    let stateValue = __compactRuntime.StateValue.newArray();

    stateValue = stateValue.arrayPush(__compactRuntime.StateValue.newNull());
    state.data = stateValue;
    state.setOperation('increment', new __compactRuntime.ContractOperation());
    state.setOperation('decrement', new __compactRuntime.ContractOperation());
    state.setOperation('reset', new __compactRuntime.ContractOperation());

    return {
      currentContractState: state,
      currentPrivateState: ctx.initialPrivateState,
      currentZswapLocalState: ctx.initialZswapLocalState
    };
  }
}
