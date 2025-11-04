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

import type { ImpureCircuitId } from '@midnight-ntwrk/midnight-js-types';

import { CompiledCounterClone, type CounterPrivateState, witnesses } from './contract';

export type CounterCloneContract = CompiledCounterClone.Contract<CounterPrivateState>;

export type CounterCloneCircuits = ImpureCircuitId<CounterCloneContract>;

export const CounterClonePrivateStateId = 'counterClonePrivateState';

export const createCounterCloneContractInstance = (): CounterCloneContract => new CompiledCounterClone.Contract(witnesses);
