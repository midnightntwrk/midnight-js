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
import { NodeContext } from '@effect/platform-node';
import {
  CompiledContract,
  ContractExecutable,
  KeyConfiguration,
  ZKFileConfiguration
} from '@midnight-ntwrk/compact-js/effect';
import { resolve } from 'node:path';
import { CounterContract } from '../contract';

const COUNTER_ASSETS_PATH = resolve(import.meta.dirname, '../contract/managed/counter');

describe('ContractExecutable', () => {
  const configProvider = ConfigProvider.fromMap(
    new Map([['KEYS_COIN_PUBLIC', 'd2dc8d175c0ef7d1f7e5b7f32bd9da5fcd4c60fa1b651f1d312986269c2d3c79']]),
    { pathDelim: '_' }
  ).pipe(ConfigProvider.constantCase);
  const layer = Layer.mergeAll(ZKFileConfiguration.layer, KeyConfiguration.layer).pipe(
    Layer.provideMerge(NodeContext.layer),
    Layer.provide(Layer.setConfigProvider(configProvider))
  );

  const counterContract = CompiledContract.make<CounterContract>('Counter', CounterContract)
    .pipe(
      CompiledContract.withWitnesses({
        private_increment: ({ privateState }) => [{ count: privateState.count + 1 }, []]
      }),
      CompiledContract.withZKConfigFileAssets(COUNTER_ASSETS_PATH),
      ContractExecutable.make
    )
    .pipe(ContractExecutable.provide(layer));

  describe('initialize', () => {
    it.effect('should initialize a new instance', () =>
      Effect.gen(function* () {
        const result = yield* counterContract.initialize({ count: 0 });

        expect(result.data).toBeDefined();
        expect(result.data.contractState).toBeDefined();
      })
    );
  });
});
