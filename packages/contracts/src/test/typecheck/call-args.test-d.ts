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
import type { Contract, ProvableCircuitId } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { PrivateStateId } from '@midnight-ntwrk/midnight-js-types';
import { describe, expectTypeOf, it } from 'vitest';

import type { CallOptionsWithArguments, CallResult } from '../../call';
import type { ContractProviders } from '../../contract-providers';
import { submitCallTx } from '../../submit-call-tx';
import type { TransactionContext } from '../../transaction';
import { type CircuitCallTxInterface, createCallTxOptions, createCircuitCallTxInterface } from '../../tx-interfaces';
import type { FinalizedCallTxData } from '../../tx-model';
import type { CallTxOptions, CallTxOptionsWithPrivateStateId } from '../../unproven-call-tx';
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

  it('omits args entirely for a LITERAL-keyed zero-argument circuit', () => {
    expectTypeOf<CallOptionsWithArguments<Counter016Contract, 'increment'>>().not.toHaveProperty(
      'args'
    );
  });

  it('does not degrade a LITERAL-keyed parameter tuple to unknown[]', () => {
    expectTypeOf<
      CallOptionsWithArguments<CoinReceiver016Contract, 'receive_coin'>['args']
    >().not.toEqualTypeOf<unknown[]>();
  });

  // The case real call sites produce. `getProvableCircuitIds()` is the producer real call sites
  // in this package go through -- compact-js also exports a `ProvableCircuitId(id)` smart
  // constructor that brands an id directly, so it is not the only one. `circuit()` consumes a
  // branded id, it does not hand one back. Indexing
  // `provableCircuits` with the brand degrades the lookup to `unknown[]`, so without
  // `CircuitKey` the options type would keep `args` on every branded circuit but type it as
  // `unknown[]`, accepting any argument list. The literal-keyed assertions above cannot catch
  // that: no brand ever enters their computation.
  it('carries the real tuple for the BRANDED id that call sites produce', () => {
    type BrandedId = ProvableCircuitId<CoinReceiver016Contract, 'receive_coin'>;
    expectTypeOf<CallOptionsWithArguments<CoinReceiver016Contract, BrandedId>['args']>()
      .toEqualTypeOf<[CoinReceiver016Coin]>();
  });

  // The zero-argument arm of the same case, and the only assertion in this file that covers the
  // half of the failure mode the header states: `args` staying present on a circuit that takes
  // NONE. The literal-keyed omission assertion above cannot reach it -- no brand enters its
  // computation, so it passes identically with and without `CircuitKey`. Drop the unbranding and
  // the branded key resolves to `unknown[]`, which does NOT extend `[]`, so the conditional takes
  // the wrong arm and this type gains a spurious REQUIRED `args`.
  it('omits args for a zero-argument circuit at the BRANDED id too', () => {
    type BrandedIncrementId = ProvableCircuitId<Counter016Contract, 'increment'>;
    expectTypeOf<CallOptionsWithArguments<Counter016Contract, BrandedIncrementId>>().not.toHaveProperty('args');
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

// A DEFECT PIN: it deliberately asserts behaviour nobody wants.
//
// `CircuitKey` exists only because compact-js's `Contract.CircuitParameters` degrades to
// `unknown[]` under a branded key (midnightntwrk/midnight-sdk#402). The workaround is idempotent,
// so every other assertion in this file keeps passing once upstream fixes the defect and nothing
// would ever say the workaround had become dead weight. This is the one assertion that goes RED on
// that fix, and a red run here is the INSTRUCTION to delete `CircuitKey`, its use in
// `tx-interfaces.ts` and this test -- NOT a regression to repair. `overloads.test-d.ts` pins the
// era-agnostic `Contract.Any` widening the same way.
describe('the upstream defect CircuitKey works around', () => {
  it('still resolves a BRANDED key to unknown[] -- delete CircuitKey when this goes red', () => {
    expectTypeOf<Contract.CircuitParameters<CoinReceiver016Contract, ReceiveCoinBrandedId>>().toEqualTypeOf<
      unknown[]
    >();
  });
});

declare const providers: ContractProviders<CoinReceiver016Contract>;
declare const privateStateId: PrivateStateId;
declare const coin: CoinReceiver016Coin;
declare const transactionContext: TransactionContext<CoinReceiver016Contract, ReceiveCoinBrandedId>;

// `createCircuitCallTxInterface` is the one changed production path with no test of its own. Its
// explicit type arguments and both `as` casts are ASSERTIONS -- a wrong one compiles -- and the
// runtime tests mock `submitCallTx` and check only that arguments are passed through, so nothing
// else pins the types the options reach it at. These assertions replicate both arms of the call it
// makes, at the branded id a real call site carries.
describe('createCircuitCallTxInterface', () => {
  it('hands submitCallTx options carrying the circuit\'s real argument tuple', () => {
    const callOptions = createCallTxOptions<CoinReceiver016Contract, ReceiveCoinBrandedId>(
      compiledContract,
      brandedCircuitId,
      contractAddress,
      privateStateId,
      undefined,
      [coin]
    );

    expectTypeOf(callOptions).toEqualTypeOf<CallTxOptions<CoinReceiver016Contract, ReceiveCoinBrandedId>>();
    expectTypeOf<CallTxOptions<CoinReceiver016Contract, ReceiveCoinBrandedId>['args']>().toEqualTypeOf<
      [CoinReceiver016Coin]
    >();
  });

  it('resolves both submitCallTx arms to the results the interface promises', () => {
    const callOptions = createCallTxOptions<CoinReceiver016Contract, ReceiveCoinBrandedId>(
      compiledContract,
      brandedCircuitId,
      contractAddress,
      privateStateId,
      undefined,
      [coin]
    );
    const scopedOptions = callOptions as CallTxOptionsWithPrivateStateId<
      CoinReceiver016Contract,
      ReceiveCoinBrandedId
    >;

    expectTypeOf(submitCallTx(providers, scopedOptions)).toEqualTypeOf<
      Promise<FinalizedCallTxData<CoinReceiver016Contract, ReceiveCoinBrandedId>>
    >();
    expectTypeOf(submitCallTx(providers, scopedOptions, transactionContext)).toEqualTypeOf<
      Promise<CallResult<CoinReceiver016Contract, ReceiveCoinBrandedId>>
    >();
  });

  it('exposes the interface type it claims, not a widened one', () => {
    expectTypeOf(
      createCircuitCallTxInterface(providers, compiledContract, contractAddress, privateStateId)
    ).toEqualTypeOf<CircuitCallTxInterface<CoinReceiver016Contract>>();
  });
});
