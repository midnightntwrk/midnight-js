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

import type {
  CircuitContext,
  CircuitResults,
  ConstructorContext,
  ConstructorResult,
  WitnessContext} from '@midnight-ntwrk/compact-runtime';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * A circuit which affects the public state.
 *
 * @typeParam PS - The private state modified by the contract witnesses.
 */
export type ImpureCircuit<PS> = (context: CircuitContext<PS>, ...args: any[]) => CircuitResults<PS, any>;

/**
 * A collection of impure circuits defined in a contract.
 *
 * @typeParam PS - The private state modified by the contract witnesses.
 */
export type ImpureCircuits<PS> = Record<string, ImpureCircuit<PS>>;

/**
 * A type representing a witness in a contract.
 *
 * @typeParam PS - The private state modified by the witness.
 */
export type Witness<PS> = (context: WitnessContext<any, PS>, ...rest: any[]) => [PS, any];

/**
 * A type representing all of a contract's witnesses.
 *
 * @typeParam PS - The private state modified by the contract witnesses.
 */
export type Witnesses<PS = any> = Record<string, Witness<PS>>;

/**
 * Interface for a contract. The data types defined in this file are generic shapes for the artifacts
 * produced by the `compactc` compiler. In other words, this `Contract` interface should match the shape
 * of any `Contract` class produced by `compactc`. Midnight.js uses it for generic constraints.
 *
 * @typeParam PS - The private state modified by the contract witnesses.
 * @typeParam W - The contract witnesses type.
 */
export interface Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  /**
   * The private oracle of the contract.
   */
  readonly witnesses: W;
  /**
   * The impure circuits defined in a contract. These circuits can be used to create call transactions.
   */
  readonly impureCircuits: ImpureCircuits<PS>;

  /**
   * Constructs the initial public state of the public oracle of a contract. This is used during
   * deployment transaction construction.
   */
  initialState(context: ConstructorContext<PS>, ...args: any[]): ConstructorResult<PS>;
}

/**
 * A union over the impure circuit identifiers of a contract.
 *
 * @typeParam C The contract type for which we would like impure circuit IDs.
 */
export type ImpureCircuitId<C extends Contract = Contract> = keyof C['impureCircuits'] & string;

/**
 * Extracts the private state of a contract.
 *
 * @typeParam C The contract for which we would like the private state.
 */
export type PrivateState<C extends Contract> = C extends Contract<infer PS> ? PS : never;

/**
 * Typesafe version of `Object.keys(contract.impureCircuits)`.
 *
 * @param contract The contract having impure circuits for which we want ids.
 *
 * @typeParam C The contract type for which we would like impure circuit IDs.
 */
export const getImpureCircuitIds = <C extends Contract>(contract: C): ImpureCircuitId<C>[] =>
  Object.keys(contract.impureCircuits) as ImpureCircuitId<C>[];

/**
 * The parameter types of the circuits in a contract.
 */
export type CircuitParameters<C extends Contract, K extends ImpureCircuitId<C>> =
  Parameters<C['impureCircuits'][K]> extends [CircuitContext<any>, ...infer A] ? A : never;

/**
 * The return types of the circuits in a contract.
 */
export type CircuitReturnType<C extends Contract, K extends ImpureCircuitId<C>> =
  ReturnType<C['impureCircuits'][K]> extends CircuitResults<any, infer U> ? U : never;

/**
 * The parameter type of the public state constructor.
 */
export type InitialStateParameters<C extends Contract> =
  Parameters<C['initialState']> extends [ConstructorContext<any>, ...infer A] ? A : never;
