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

import { describe, it, expect } from '@effect/vitest';
import { ConfigProvider, Effect, Layer } from 'effect';
import { NodeContext } from '@effect/platform-node';

import {
  CompiledContract,
  ContractExecutable,
  ContractExecutableRuntime
} from '@midnight-ntwrk/compact-js/effect';
import * as Configuration from '@midnight-ntwrk/platform-js/effect/Configuration';
import { ZKFileConfiguration } from '@midnight-ntwrk/compact-js-node/effect';
import { resolve } from 'node:path';
import { CounterContract } from '../contract';

const COUNTER_ASSETS_PATH = resolve(import.meta.dirname, '../contract/managed/counter');

const VALID_COIN_PUBLIC_KEY = 'd2dc8d175c0ef7d1f7e5b7f32bd9da5fcd4c60fa1b651f1d312986269c2d3c79';

const testLayer = (configMap: Map<string, string>) =>
  Layer.mergeAll(ZKFileConfiguration.layer(COUNTER_ASSETS_PATH), Configuration.layer).pipe(
    Layer.provideMerge(NodeContext.layer),
    Layer.provide(
      Layer.setConfigProvider(ConfigProvider.fromMap(configMap, { pathDelim: '_' }).pipe(ConfigProvider.constantCase))
    )
  );

describe('ContractExecutableRuntime', () => {
  const initialPS = { count: 0 };
  const counterContract = CompiledContract.make<CounterContract>('Counter', CounterContract).pipe(
    CompiledContract.withWitnesses({
      private_increment: ({ privateState }) => [{ count: privateState.count + 1 }, []]
    }),
    CompiledContract.withZKConfigFileAssets(COUNTER_ASSETS_PATH),
    ContractExecutable.make
  );

  it.effect('should use given context', () => Effect.gen(function* () {
    const runtime = ContractExecutableRuntime.make(testLayer(new Map([['KEYS_COIN_PUBLIC', VALID_COIN_PUBLIC_KEY]])));

    const result = yield* runtime.runFork(counterContract.initialize(initialPS));

    expect(result.public.contractState).toBeDefined();
    expect(result.public.contractState.data).toBeDefined();
    expect(result.private.signingKey).toBeDefined();
    expect(result.private.privateState).toMatchObject(initialPS);
  }));
});