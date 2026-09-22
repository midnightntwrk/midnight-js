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

import type { ProvableCircuitId } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
import { describe, expectTypeOf, it } from 'vitest';

import type { CallOptionsWithArguments } from '../../call';
import type {
  CoinReceiver016Coin,
  CoinReceiver016Contract,
  Counter016Contract
} from '../ledger8-fixture-types';

// The current era's twin of `overloads.test-d.ts`'s retained-era assertions.
// compact-js's own `CircuitParameters` degrades to `never` under the
// branded circuit id that `circuit()` and `getProvableCircuitIds()` both
// produce (midnightntwrk/midnight-sdk#402), so without the local unbranding
// `never extends []` is trivially true and every circuit -- arg-taking or
// not -- would look zero-argument.
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

  // The case real call sites produce. `getProvableCircuitIds()` and `circuit()` both hand back
  // BRANDED ids, and indexing `provableCircuits` with the brand degrades the lookup to `never`.
  // `never extends []` is trivially true, so without `CircuitKey` the options type would drop
  // `args` entirely and every branded circuit would look zero-argument. The literal-keyed
  // assertions above cannot catch that: no brand ever enters their computation.
  it('carries the real tuple for the BRANDED id that call sites produce', () => {
    type BrandedId = ProvableCircuitId<CoinReceiver016Contract, 'receive_coin'>;
    expectTypeOf<CallOptionsWithArguments<CoinReceiver016Contract, BrandedId>['args']>()
      .toEqualTypeOf<[CoinReceiver016Coin]>();
  });
});
