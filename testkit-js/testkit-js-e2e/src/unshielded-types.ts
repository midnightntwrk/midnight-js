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

<<<<<<<< HEAD:testkit-js/testkit-js-e2e/src/unshielded-types.ts
import type { ImpureCircuitId, MidnightProviders } from '@midnight-ntwrk/midnight-js-types';

import { CompiledUnshielded } from './contract';

export type UnshieldedContract = CompiledUnshielded.Contract<undefined>;

export type UnshieldedContractCircuits = ImpureCircuitId<UnshieldedContract>;

export type UnshieldedContractProviders = MidnightProviders<UnshieldedContractCircuits>;

export const createUnshieldedContract = () : UnshieldedContract => new CompiledUnshielded.Contract({});
========
import { Brand, Option } from 'effect';

const NETWORK_ID_REGEXP = /^[a-zA-Z0-9-]+$/;

/**
 * A name, handle, or tag representing a familiar identifier given to an instance of a Midnight network.
 * 
 * @category models
 */
export type NetworkIdMoniker = Brand.Branded<string, 'NetworkIdMoniker'>;

/**
 * @category constructors
 */
export const NetworkIdMoniker = Brand.refined<NetworkIdMoniker>(
  (source: string) => {
    return source.match(NETWORK_ID_REGEXP)
      ? Option.none()
      : Option.some(Brand.error(`Source string '${source}' is not a valid network identifier`));
  }
);
>>>>>>>> main:platform-js/platform-js/src/effect/NetworkIdMoniker.ts
