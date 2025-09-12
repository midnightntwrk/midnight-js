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

import type { DeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { ImpureCircuitId, MidnightProviders } from '@midnight-ntwrk/midnight-js-types';

import { CompiledCounter, type CounterPrivateState, createInitialPrivateState, witnesses } from './contract';

export type CounterContract = CompiledCounter.Contract<CounterPrivateState>;

export type DeployedCounterContract = DeployedContract<CounterContract>;

export type CounterCircuits = ImpureCircuitId<CounterContract> & string;

export const CounterPrivateStateId = 'counterPrivateState';

export type CounterProviders = MidnightProviders<CounterCircuits, typeof CounterPrivateStateId, CounterPrivateState>;

export const privateStateZero = createInitialPrivateState(0);

export const createCounterContractInstance = (): CounterContract => new CompiledCounter.Contract(witnesses);
