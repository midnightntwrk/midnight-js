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

import type { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import type { ProvableCircuitId } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { describe, expectTypeOf, it } from 'vitest';

import type { CallOptionsWithArguments } from '../../call';
import { createCallTxOptions } from '../../tx-interfaces';
import type {
  CoinReceiver016Coin,
  CoinReceiver016Contract,
  Counter016Contract
} from '../ledger8-fixture-types';

// The current era's twin of `overloads.test-d.ts`'s retained-era assertions.
// compact-js's own `CircuitParameters` degrades to `unknown[]` -- not `never`
// -- under the branded circuit id that `getProvableCircuitIds()` produces and
// `circuit()` consumes (midnightntwrk/midnight-sdk#402). Because `unknown[]`
// is a real, non-empty array type, `args` is NOT dropped: without the local
// unbranding it stays present on every circuit, argument-taking or not, and
// accepts any argument list at all.
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

  // The case real call sites produce. `getProvableCircuitIds()` is the only producer of a
  // BRANDED id; `circuit()` consumes one, it does not hand one back. Indexing
  // `provableCircuits` with the brand degrades the lookup to `unknown[]`, so without
  // `CircuitKey` the options type would keep `args` on every branded circuit but type it as
  // `unknown[]`, accepting any argument list. The literal-keyed assertions above cannot catch
  // that: no brand ever enters their computation.
  it('carries the real tuple for the BRANDED id that call sites produce', () => {
    type BrandedId = ProvableCircuitId<CoinReceiver016Contract, 'receive_coin'>;
    expectTypeOf<CallOptionsWithArguments<CoinReceiver016Contract, BrandedId>['args']>()
      .toEqualTypeOf<[CoinReceiver016Coin]>();
  });
});

type ReceiveCoinBrandedId = ProvableCircuitId<CoinReceiver016Contract, 'receive_coin'>;

declare const compiledContract: CompiledContract.CompiledContract<CoinReceiver016Contract, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
declare const contractAddress: ContractAddress;
declare const brandedCircuitId: ReceiveCoinBrandedId;

// `createCallTxOptions` is the exported function `CallOptionsWithArguments` only describes the
// shape of -- see F1 in the branch review. Before this fix its `args` parameter indexed
// `CircuitParameters` with the branded `PCK` directly, so it stayed `unknown[]` even though
// `CallOptionsWithArguments` above was already fixed: the function accepted any argument list
// and handed back a value TypeScript believed carried the real tuple.
describe('createCallTxOptions', () => {
  it('exposes the real tuple and rejects a wrongly-typed argument list for a branded id', () => {
    expectTypeOf(createCallTxOptions<CoinReceiver016Contract, ReceiveCoinBrandedId>)
      .parameter(5)
      .toEqualTypeOf<[CoinReceiver016Coin]>();

    createCallTxOptions<CoinReceiver016Contract, ReceiveCoinBrandedId>(
      compiledContract,
      brandedCircuitId,
      contractAddress,
      undefined,
      undefined,
      // @ts-expect-error -- a branded id must reject a wrongly-typed argument list, not accept unknown[]
      [1, 2, 3]
    );
  });
});
