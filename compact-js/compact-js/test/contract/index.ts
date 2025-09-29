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

import { Contract as _CounterContract } from './managed/counter/contract/index.cjs';
import { Contract as _UnshieldedContract } from './managed/unshielded/contract/index.cjs';

type CounterPrivateState = {
  count: number;
};

export type CounterContract = _CounterContract<CounterPrivateState>;
export const CounterContract = _CounterContract;

export type UnshieldedContract = _UnshieldedContract<undefined>;
export const UnshieldedContract = _UnshieldedContract;
