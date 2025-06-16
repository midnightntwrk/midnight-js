// This file is part of MIDNIGHT-JS.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import type { ImpureCircuitId } from '@midnight-ntwrk/midnight-js-types';
import type { CounterClone, CounterPrivateState } from './contract';

export type CounterCloneCircuits = ImpureCircuitId<CounterClone.Contract<CounterPrivateState>>;

export const CounterClonePrivateStateId = 'counterClonePrivateState';

export type CounterCloneContract = CounterClone.Contract<CounterPrivateState>;
