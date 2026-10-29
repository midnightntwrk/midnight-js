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

// Through the BARREL. `typecheck/overloads.test-d.ts` asserts the same resolutions against the
// source modules, which a consumer cannot import: it would keep passing with the retained-era types
// unreachable from the published surface entirely.
import {
  type Ledger8CallTxOptionsBase,
  type Ledger8CircuitId,
  type Ledger8CircuitParameters,
  type Ledger8ContractProviders,
  type Ledger8FinalizedCallTxData,
  type Ledger8SubmittedCallTx,
  submitCallTx,
  submitCallTxAsync
} from '../../index';
import type { Counter016Contract } from '../ledger8-fixture-types';

type C = Counter016Contract;
type K = 'increment';

declare const providers: Ledger8ContractProviders<C, K>;
declare const options: Ledger8CallTxOptionsBase<C, K>;

describe('a consumer can name the retained era from the barrel', () => {
  it('declares the result the retained-era overload resolves to', () => {
    expectTypeOf(submitCallTx(providers, options)).toEqualTypeOf<Promise<Ledger8FinalizedCallTxData<C, K>>>();
  });

  it('declares the result the non-finalizing entry point resolves to', () => {
    expectTypeOf(submitCallTxAsync(providers, options)).toEqualTypeOf<Promise<Ledger8SubmittedCallTx<C, K>>>();
  });

  it('constrains a helper of its own by the retained contract type', () => {
    // What the family is published FOR: a caller writing `<C extends Ledger8Contract>` of its own.
    // Asserted through the family's own machinery rather than `Counter016Contract extends
    // Ledger8Contract`, which is true by the fixture's DECLARATION and so cannot fail -- the rule
    // `typecheck/overloads.test-d.ts` states for the same fixture.
    expectTypeOf<Ledger8CircuitId<C>>().toEqualTypeOf<K>();
    expectTypeOf<Ledger8CircuitParameters<C, K>>().toEqualTypeOf<[]>();
  });
});
