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

/**
 * Provides types and utilities for working directly with Compact generated contract executables.
 *
 * @module
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Brand } from 'effect';
import type {
  WitnessContext,
  ConstructorContext,
  ConstructorResult,
  CircuitContext,
  CircuitResults
} from '@midnight-ntwrk/compact-runtime';

export type Witness<PS, U = any> = (context: WitnessContext<U, PS>, ...args: any[]) => [PS, U];
export type Witnesses<PS> = Record<string, Witness<PS>>;

export type Circuit<PS, U = any> = (context: CircuitContext<PS>, ...args: any[]) => CircuitResults<PS, U>;
export type Circuits<PS> = Record<string, Circuit<PS>>;

export type ImpureCircuit<PS, U = any> = (context: CircuitContext<PS>, ...args: any[]) => CircuitResults<PS, U>;
export type ImpureCircuits<PS> = Record<string, ImpureCircuit<PS>>;

export type VerifierKey = Uint8Array & Brand.Brand<'VerifierKey'>;
export const VerifierKey = Brand.nominal<VerifierKey>();

export type ZKIR = Uint8Array & Brand.Brand<'ZKIR'>;
export const ZKIR = Brand.nominal<ZKIR>();

export type ImpureCircuitId<C extends Contract.Any = Contract.Any, K = Contract.ImpureCircuitId<C>> = K &
  Brand.Brand<'ImpureCircuitId'>;
const ImpureCircuitId_ = Brand.nominal<ImpureCircuitId>();
export const ImpureCircuitId = <C extends Contract.Any>(
  id: Brand.Brand.Unbranded<ImpureCircuitId<C>>
): ImpureCircuitId<C> => ImpureCircuitId_(id);

export interface Contract<PS, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;

  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;

  initialState(context: ConstructorContext<PS>, ...args: any[]): ConstructorResult<PS>;
}

export declare namespace Contract {
  export type Any = Contract<any>;

  export type PrivateState<C> = C extends Contract<infer PS>
    ? PS
    : never;

  // eslint-disable-next-line @typescript-eslint/no-shadow
  export type Witnesses<C> = C extends Contract<any, infer W>
    ? keyof W extends never
        ? never 
        : W
    : never;

  export type InitializeParameters<C extends Contract<any>> =
    Parameters<C['initialState']> extends [ConstructorContext<any>, ...infer A] ? A : never;

  export type ImpureCircuitId<C extends Contract<any>> = keyof C['impureCircuits'] & string;

  export type CircuitParameters<C extends Contract<any>, K extends ImpureCircuitId<C>> =
    Parameters<C['impureCircuits'][K]> extends [CircuitContext<any>, ...infer A] ? A : never;

  export type CircuitReturnType<C extends Contract<any>, K extends ImpureCircuitId<C>> =
    ReturnType<C['impureCircuits'][K]> extends CircuitResults<any, infer U> ? U : never;
}

export const getImpureCircuitIds: <C extends Contract.Any>(contract: C) => ImpureCircuitId<C>[] = (contract) =>
  Object.keys(contract.impureCircuits).map(ImpureCircuitId);
