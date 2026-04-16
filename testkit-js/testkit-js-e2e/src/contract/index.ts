/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

import * as CompiledBlockTime from './compiled/block-time/contract/index.js';
import * as CompiledCounter from './compiled/counter/contract/index.js';
import * as CompiledCounterClone from './compiled/counter-clone/contract/index.js';
import * as CompiledDoubleCounter from './compiled/double-counter/contract/index.js';
import * as CompiledShielded from './compiled/shielded/contract/index.js';
import * as CompiledSimple from './compiled/simple/contract/index.js';
import * as CompiledUnshielded from './compiled/unshielded/contract/index.js';
import * as DoubleCounterWitnesses from './double-counter-witnesses.js';
import * as Witnesses from './witnesses.js';

export const CompiledBlockTimeContract = CompiledContract.make<CompiledBlockTime.Contract>(
  'BlockTime',
  CompiledBlockTime.Contract
).pipe(CompiledContract.withVacantWitnesses, CompiledContract.withCompiledFileAssets('./compiled/block-time'));

export const CompiledCounterContract = CompiledContract.make<CompiledCounter.Contract<Witnesses.CounterPrivateState>>(
  'Counter',
  CompiledCounter.Contract<Witnesses.CounterPrivateState>
).pipe(
  CompiledContract.withWitnesses(Witnesses.witnesses),
  CompiledContract.withCompiledFileAssets('./compiled/counter')
);

export const CompiledCounterCloneContract = CompiledContract.make<
  CompiledCounterClone.Contract<Witnesses.CounterPrivateState>
>('CounterClone', CompiledCounterClone.Contract<Witnesses.CounterPrivateState>).pipe(
  CompiledContract.withWitnesses(Witnesses.witnesses),
  CompiledContract.withCompiledFileAssets('./compiled/counter-clone')
);

export const CompiledDoubleCounterContract = CompiledContract.make<
  CompiledDoubleCounter.Contract<Witnesses.CounterPrivateState>
>('DoubleCounter', CompiledDoubleCounter.Contract<Witnesses.CounterPrivateState>).pipe(
  CompiledContract.withWitnesses(DoubleCounterWitnesses.witnesses),
  CompiledContract.withCompiledFileAssets('./compiled/counter-clone')
);

export const CompiledSimpleContract = CompiledContract.make<CompiledSimple.Contract>(
  'Simple',
  CompiledSimple.Contract
).pipe(CompiledContract.withVacantWitnesses, CompiledContract.withCompiledFileAssets('./compiled/simple'));

export const CompiledUnshieldedContract = CompiledContract.make<CompiledUnshielded.Contract>(
  'Unshielded',
  CompiledUnshielded.Contract
).pipe(CompiledContract.withVacantWitnesses, CompiledContract.withCompiledFileAssets('./compiled/unshielded'));

export const CompiledShieldedContract = CompiledContract.make<CompiledShielded.Contract>(
  'Shielded',
  CompiledShielded.Contract
).pipe(CompiledContract.withVacantWitnesses, CompiledContract.withCompiledFileAssets('./compiled/shielded'));

export * as CompiledBlockTime from './compiled/block-time/contract/index.js';
export * as CompiledCounter from './compiled/counter/contract/index.js';
export * as CompiledCounterClone from './compiled/counter-clone/contract/index.js';
export * as CompiledDoubleCounter from './compiled/double-counter/contract/index.js';
export * as CompiledShielded from './compiled/shielded/contract/index.js';
export * as CompiledSimple from './compiled/simple/contract/index.js';
export * as CompiledUnshielded from './compiled/unshielded/contract/index.js';
export * as DoubleCounterWitnesses from './double-counter-witnesses.js';
export * as CounterWitnesses from './witnesses.js';
