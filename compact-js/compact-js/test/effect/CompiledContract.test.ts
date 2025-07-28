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

import { Effect, Layer } from 'effect';
import { describe, it, expect } from '@effect/vitest';
import { CompiledContract, ContractExecutable, ZKConfiguration, Contract } from '@midnight-ntwrk/compact-js/effect';
import { Contract as MockCounterContract } from '../MockCounter';
// import { Contract as MockCounterContract } from '../../../../packages/testing/src/e2e/contract/managed/counter/contract/index.cjs';
// import { Contract as MockCounterContract } from '../../../../packages/testing/src/e2e/contract/managed/simple/contract/index.cjs';

type PrivateState = {
  runningCount: number;
};

describe('CompiledContract', () => {
  it('should work', () => {
    const compiledContract = CompiledContract.make<MockCounterContract<PrivateState>>(
      'MockCounter',
      MockCounterContract
    ).pipe(
      CompiledContract.withWitnesses({
        private_increment: (ctx) => {
          const { privateState } = ctx;

          return [{ runningCount: privateState.runningCount + 1 }, []];
        }
      }),
      CompiledContract.withZKConfigFileAssets('/Users/hosky/compiled_contracts/counter')
    );
    const contract = ContractExecutable.make(compiledContract);
    const c1 = contract.pipe(
      ContractExecutable.provide(
        Layer.effect(
          ZKConfiguration.ZKConfiguration,
          Effect.sync(() =>
            ZKConfiguration.ZKConfiguration.of({
              createReader: (c) =>
                Effect.sync(() => ({
                  getVerifierKey: (id) => Effect.sync(() => Contract.VerifierKey(new Uint8Array())),
                  getVerifierKeys: (ids) => Effect.sync(() => [[ids[0], Contract.VerifierKey(new Uint8Array())]])
                }))
            })
          )
        )
      )
    );

    const result = c1.initialize({ runningCount: 0 }).pipe(Effect.runSync);

    expect(result).toBeDefined();
  });
});
