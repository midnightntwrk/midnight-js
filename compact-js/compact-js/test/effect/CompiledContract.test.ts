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

import { describe, it, expect } from '@effect/vitest';
import { CompiledContract } from '@midnight-ntwrk/compact-js/effect';
// import { Contract as MockCounterContract } from './MockCounter';
import { Contract as MockCounterContract } from '/Users/timjroberts/midnight/github/midnight-js/packages/testing/src/e2e/contract/managed/counter/contract/index.cjs';
// import { Contract as MockCounterContract } from '/Users/timjroberts/midnight/github/midnight-js/packages/testing/src/e2e/contract/managed/simple/contract/index.cjs';

type PrivateState = {
  runningCount: number;
};

describe('CompiledContract', () => {
  it('should work', () => {
    const contract = CompiledContract.make<MockCounterContract<PrivateState>>('MockCounter', MockCounterContract).pipe(
      CompiledContract.withWitnesses({
        private_increment: (ctx) => {
          const { privateState } = ctx;

          return [{ runningCount: privateState.runningCount + 1 }, []];
        }
      })
    );

    expect(contract).toBeDefined();
  });
});
