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

// Through the BARREL, and through the namespace alone. `typecheck/overloads.test-d.ts` asserts the
// same resolutions against the source modules, which a consumer cannot import: it would keep
// passing with the retained-era types unreachable from the published surface entirely.
import { type Ledger8, submitCallTx, submitCallTxAsync } from '../../index';
import type { Counter016Contract, Counter016PrivateState } from '../ledger8-fixture-types';

declare const providers: Ledger8.ContractProviders<Counter016Contract, 'increment'>;
declare const options: Ledger8.CallTxOptionsBase<Counter016Contract, 'increment'>;

describe('a consumer can name the retained era through the namespace alone', () => {
  it('declares the result the retained arm resolves to', () => {
    expectTypeOf(submitCallTx(providers, options)).toEqualTypeOf<
      Promise<Ledger8.FinalizedCallTxData<Counter016Contract, 'increment'>>
    >();
  });

  it('declares the result the non-finalizing entry point resolves to', () => {
    expectTypeOf(submitCallTxAsync(providers, options)).toEqualTypeOf<
      Promise<Ledger8.SubmittedCallTx<Counter016Contract, 'increment'>>
    >();
  });

  it('constrains a helper of its own by the retained contract type', () => {
    // What the family is published FOR: a caller writing `<C extends Ledger8.Contract>` of its own.
    // Without the constraint being namable, a consumer holding a retained-era contract can call the
    // entry points and still not declare a function that takes one.
    expectTypeOf<Counter016Contract>().toExtend<Ledger8.Contract<Counter016PrivateState>>();
    expectTypeOf<Ledger8.CircuitId<Counter016Contract>>().toEqualTypeOf<'increment'>();
  });

  it('names the witness and circuit members a retained contract declaration needs', () => {
    // A contract type cannot be declared from the outside without these two, so they travel with
    // the family rather than being held back as internals.
    expectTypeOf<Counter016Contract['witnesses']>().toExtend<
      Readonly<Record<string, Ledger8.Witness<Counter016PrivateState>>>
    >();
    expectTypeOf<Counter016Contract['impureCircuits']>().toExtend<Readonly<Record<string, Ledger8.Circuit>>>();
  });
});
