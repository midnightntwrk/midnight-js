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

import type { ImpureCircuitId, MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { CompilerBlockTime } from './contract';
import type { DeployedContract } from '@midnight-ntwrk/midnight-js-contracts';

export type BlockTimeCircuits = ImpureCircuitId<CompilerBlockTime.Contract<undefined>> & string;

export type BlockTimeProviders = MidnightProviders<BlockTimeCircuits, string, undefined>;

export type BlockTimeContract = CompilerBlockTime.Contract<undefined>;

export type DeployedBlockTimeContract = DeployedContract<BlockTimeContract>;

