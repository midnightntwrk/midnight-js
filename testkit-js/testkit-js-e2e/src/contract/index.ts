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

import { CompiledContract } from '@midnight-ntwrk/compact-js';

import * as CompiledBlockTime from './managed/block-time/contract/index.js';
import * as CompiledCounter from './managed/counter/contract/index.js';
import * as CompiledCounterClone from './managed/counter-clone/contract/index.js';
import * as CompiledSimple from './managed/simple/contract/index.js';
import * as CompiledUnshielded from './managed/unshielded/contract/index.js';
import * as Witnesses from './witnesses.js';

export const CompiledBlockTimeContract =
  CompiledContract.make<CompiledBlockTime.Contract>('BlockTime', CompiledBlockTime.Contract).pipe(
    CompiledContract.withVacantWitnesses,
    CompiledContract.withCompiledFileAssets('./managed/block-time')
  );

export const CompiledCounterContract =
  CompiledContract.make<CompiledCounter.Contract<Witnesses.CounterPrivateState>>(
    'Counter',
    CompiledCounter.Contract<Witnesses.CounterPrivateState>
  ).pipe(
    CompiledContract.withWitnesses(Witnesses.witnesses),
    CompiledContract.withCompiledFileAssets('./managed/counter')
  );

export const CompiledCounterCloneContract =
  CompiledContract.make<CompiledCounterClone.Contract<Witnesses.CounterPrivateState>>(
    'Counter',
    CompiledCounterClone.Contract<Witnesses.CounterPrivateState>
  ).pipe(
    CompiledContract.withWitnesses(Witnesses.witnesses),
    CompiledContract.withCompiledFileAssets('./managed/counter-clone')
  );

export const CompiledSimpleContract =
  CompiledContract.make<CompiledSimple.Contract>('BlockTime', CompiledSimple.Contract).pipe(
    CompiledContract.withVacantWitnesses,
    CompiledContract.withCompiledFileAssets('./managed/simple')
  );

export const CompiledUnshieldedContract =
  CompiledContract.make<CompiledUnshielded.Contract>('BlockTime', CompiledUnshielded.Contract).pipe(
    CompiledContract.withVacantWitnesses,
    CompiledContract.withCompiledFileAssets('./managed/unshielded')
  );

export * as CompiledBlockTime from './managed/block-time/contract/index.js';
export * as CompiledCounter from './managed/counter/contract/index.js';
export * as CompiledCounterClone from './managed/counter-clone/contract/index.js';
export * as CompiledSimple from './managed/simple/contract/index.js';
export * as CompiledUnshielded from './managed/unshielded/contract/index.js';
export * from './witnesses.js';
