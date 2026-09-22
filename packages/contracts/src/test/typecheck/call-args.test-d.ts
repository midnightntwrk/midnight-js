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

import { describe, expectTypeOf, it } from 'vitest';

import type { CallOptionsWithArguments } from '../../call';
import type {
  CoinReceiver016Coin,
  CoinReceiver016Contract,
  Counter016Contract
} from '../ledger8-fixture-types';

// The current era's twin of `overloads.test-d.ts`'s retained-era assertions.
// compact-js's own `CircuitParameters` degrades to `unknown[]` under the
// branded circuit id that `circuit()` and `getProvableCircuitIds()` both
// produce (midnightntwrk/midnight-sdk#402), so without the local unbranding
// these options accept any argument at all.
describe('CallOptionsWithArguments', () => {
  it('carries the circuit\'s real parameter tuple', () => {
    // `CoinReceiver016Coin` is read off the generated circuit signature rather than restated,
    // so this cannot drift from the artifact.
    expectTypeOf<
      CallOptionsWithArguments<CoinReceiver016Contract, 'receive_coin'>['args']
    >().toEqualTypeOf<[CoinReceiver016Coin]>();
  });

  it('omits args entirely for a zero-argument circuit', () => {
    expectTypeOf<CallOptionsWithArguments<Counter016Contract, 'increment'>>().not.toHaveProperty(
      'args'
    );
  });

  it('does not accept an arbitrary argument list', () => {
    expectTypeOf<
      CallOptionsWithArguments<CoinReceiver016Contract, 'receive_coin'>['args']
    >().not.toEqualTypeOf<unknown[]>();
  });
});
