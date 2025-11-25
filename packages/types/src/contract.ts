/*
 * This file is part of midnight-js.
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

import type { Contract as CompactContract } from '@midnight-ntwrk/compact-js/effect/Contract';
import type {
  CircuitContext,
  CircuitResults,
  ConstructorContext
} from '@midnight-ntwrk/compact-runtime';

export type {
  Circuit,
  Circuits,
  ImpureCircuit,
  ImpureCircuits,
  Witness,
  Witnesses
} from '@midnight-ntwrk/compact-js/effect/Contract';

export type Contract<PS = any, W extends Record<string, any> = Record<string, any>> = CompactContract<PS, W>;

export type PrivateState<C extends Contract> = C extends Contract<infer PS> ? PS : never;

export type ImpureCircuitId<C extends Contract = Contract> = keyof C['impureCircuits'] & string;

export const getImpureCircuitIds = <C extends Contract>(contract: C): ImpureCircuitId<C>[] =>
  Object.keys(contract.impureCircuits) as ImpureCircuitId<C>[];

export type CircuitParameters<C extends Contract, K extends ImpureCircuitId<C>> =
  Parameters<C['impureCircuits'][K]> extends [CircuitContext<any>, ...infer A] ? A : never;

export type CircuitReturnType<C extends Contract, K extends ImpureCircuitId<C>> =
  ReturnType<C['impureCircuits'][K]> extends CircuitResults<any, infer U> ? U : never;

export type InitialStateParameters<C extends Contract> =
  Parameters<C['initialState']> extends [ConstructorContext<any>, ...infer A] ? A : never;
