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

import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import { describe, expectTypeOf, it } from 'vitest';

import type { ContractPrivateStates, PrivateStateProvider } from '../private-state-provider';

type CounterId = 'counter';
type CounterState = { readonly count: bigint };

declare const provider: PrivateStateProvider<CounterId, CounterState>;
declare const address: ContractAddress;

describe('PrivateStateProvider', () => {
  it('reaches private state only through a per-contract view', () => {
    expectTypeOf(provider.forContract(address)).toEqualTypeOf<ContractPrivateStates<CounterId, CounterState>>();
    expectTypeOf(provider.forContract(address).get('counter')).toEqualTypeOf<Promise<CounterState | null>>();
    expectTypeOf(provider.forContract(address).set).parameters.toEqualTypeOf<[CounterId, CounterState]>();
  });

  it('keeps no mutable contract address and no unscoped state access', () => {
    expectTypeOf(provider).not.toHaveProperty('setContractAddress');
    expectTypeOf(provider).not.toHaveProperty('get');
    expectTypeOf(provider).not.toHaveProperty('set');
    expectTypeOf(provider).not.toHaveProperty('remove');
    expectTypeOf(provider).not.toHaveProperty('clear');
    expectTypeOf(provider).not.toHaveProperty('exportPrivateStates');
    expectTypeOf(provider).not.toHaveProperty('importPrivateStates');
  });

  it('clears one contract through the view and the whole account through the provider', () => {
    expectTypeOf(provider.forContract(address).clear).toEqualTypeOf<() => Promise<void>>();
    expectTypeOf(provider.clearAll).toEqualTypeOf<() => Promise<void>>();
  });

  it('rejects a private state id outside the declared union', () => {
    // @ts-expect-error -- 'other' is not a CounterId
    void provider.forContract(address).get('other');
  });
});
