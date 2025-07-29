/*
 * This file is part of compact-js.
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

import { ConfigProvider, Effect, Layer } from 'effect';
import { describe, it, expect } from '@effect/vitest';
import { CompiledContract, ContractExecutable, KeyConfiguration } from '@midnight-ntwrk/compact-js/effect';
import { Contract as Contract_ } from '../MockCounter';
import * as MockZKConfiguration from './MockZKConfiguration';

type CounterPrivateState = {
  count: number;
};
type Counter = Contract_<CounterPrivateState>;
const Counter = Contract_;

describe('ContractExecutable', () => {
  const configProvider = ConfigProvider.fromMap(
    new Map([['KEYS_COIN_PUBLIC', 'd2dc8d175c0ef7d1f7e5b7f32bd9da5fcd4c60fa1b651f1d312986269c2d3c79']]),
    { pathDelim: '_' }
  ).pipe(ConfigProvider.constantCase);
  const layer = Layer.mergeAll(
    MockZKConfiguration.layer,
    KeyConfiguration.layer.pipe(Layer.provide(Layer.setConfigProvider(configProvider)))
  );

  const counterContract = CompiledContract.make<Counter>('Counter', Counter)
    .pipe(
      CompiledContract.withWitnesses({
        private_increment: ({ privateState }) => [{ count: privateState.count + 1 }, []]
      }),
      CompiledContract.withZKConfigFileAssets('/Users/hosky/compiled_contracts/counter'),
      ContractExecutable.make
    )
    .pipe(ContractExecutable.provide(layer));

  describe('initialize', () => {
    it('should work', () => {
      const result = counterContract.initialize({ count: 0 }).pipe(Effect.runSync);

      expect(result.data).toBeDefined();
      expect(result.data.contractState).toBeDefined();
    });
  });
});
