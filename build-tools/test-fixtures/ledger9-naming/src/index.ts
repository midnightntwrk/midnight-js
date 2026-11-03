/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
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

import type * as Contract from './contract.js';

export type { ReExportedFlagged, ViaLedger9Contract } from './bound.js';
export type { PicksTheEra } from './era-aliases.js';

export type FlaggedAlias<C extends Contract.Any> = readonly C[];

export interface FlaggedInterface<C extends Contract.Any> {
  readonly contract: C;
}

export type Ledger9Named<C extends Contract.Any> = readonly C[];

export type Unconstrained<C> = readonly C[];

export const routesOnTheEra = <C extends Contract.Any>(contract: C): C => contract;
