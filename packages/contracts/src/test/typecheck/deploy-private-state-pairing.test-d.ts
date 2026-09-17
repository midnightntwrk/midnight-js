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
import type { PrivateStateId } from '@midnight-ntwrk/midnight-js-types';
import { describe, expectTypeOf, it } from 'vitest';

// The same real generated current-era declaration `./overloads.test-d.ts` types its current-era
// call-site material off, imported the same way: type-only, from the artifact's own `index.d.ts`,
// so the shape under test is the compiler's view of real generated code rather than a restatement
// of it.
import type { Contract as Twin018Contract } from '../../../../../testkit-js/testkit-js/src/fixtures/hf/twin-contract/compiled/contract/index.js';
import type { ContractProviders } from '../../contract-providers';
import {
  deployContract,
  type DeployContractOptions,
  type DeployContractOptionsBase,
  type DeployContractOptionsWithPrivateState
} from '../../deploy-contract';

// Compile-level tests, run by the typecheck pass this package enables in `vitest.config.ts` -- see
// the note at the top of `./overloads.test-d.ts` for how they are gated.
//
// `./overloads.test-d.ts` pins this same table for the RETAINED era, on
// `Ledger8DeployContractOptions*`. This file is the current-era twin of it: #1316 closed the hole
// on the retained arm and left the current era alone, and #1321 is that hole here.

type Twin018PrivateState = { readonly round: bigint };
type Twin018 = Twin018Contract<Twin018PrivateState>;

declare const compiledContract018: CompiledContract.CompiledContract<Twin018, Twin018PrivateState>;
declare const twinPrivateState: Twin018PrivateState;
declare const providers018: ContractProviders<Twin018>;

describe('the current-era deploy options pair a private state id with a private state', () => {
  it('names where the constructor private state is stored, on the private-state arm alone', () => {
    expectTypeOf<DeployContractOptionsWithPrivateState<Twin018>['privateStateId']>().toEqualTypeOf<PrivateStateId>();
    expectTypeOf<
      DeployContractOptionsWithPrivateState<Twin018>['initialPrivateState']
    >().toEqualTypeOf<Twin018PrivateState>();
    // DECLARED on the no-private-state arm as `never`, not absent from it -- see the member's own
    // TSDoc in `deploy-contract.ts` for why absence was the bug.
    expectTypeOf<DeployContractOptionsBase<Twin018>['privateStateId']>().toEqualTypeOf<undefined>();
    expectTypeOf<DeployContractOptionsBase<Twin018>['initialPrivateState']>().toEqualTypeOf<undefined>();
  });

  it('keeps both arms in the published union', () => {
    expectTypeOf<DeployContractOptionsBase<Twin018>>().toMatchTypeOf<DeployContractOptions<Twin018>>();
    expectTypeOf<DeployContractOptionsWithPrivateState<Twin018>>().toMatchTypeOf<DeployContractOptions<Twin018>>();
  });

  // THE FOUR SHAPES, as a table. The two arms are SIBLINGS rather than base-and-derived: adding
  // `privateStateId?: never` to a base the other arm INTERSECTS collapses that member to `never`
  // and makes the private-state arm uninhabitable, which is why the shared members moved to a
  // separate unpublished type instead.
  it('admits the private-state PAIR, and refuses either half on its own', () => {
    expectTypeOf<{
      readonly compiledContract: CompiledContract.CompiledContract<Twin018, Twin018PrivateState>;
    }>().toMatchTypeOf<DeployContractOptions<Twin018>>();
    expectTypeOf<{
      readonly compiledContract: CompiledContract.CompiledContract<Twin018, Twin018PrivateState>;
      readonly privateStateId: PrivateStateId;
      readonly initialPrivateState: Twin018PrivateState;
    }>().toMatchTypeOf<DeployContractOptions<Twin018>>();
    // An id with nothing to store under it: the deploy would store `undefined` there and hand back
    // a handle whose `initialPrivateState` is typed non-optional while actually undefined.
    expectTypeOf<{
      readonly compiledContract: CompiledContract.CompiledContract<Twin018, Twin018PrivateState>;
      readonly privateStateId: PrivateStateId;
    }>().not.toMatchTypeOf<DeployContractOptions<Twin018>>();
    // A state with nowhere to go: the constructor runs against it and nothing is ever stored, so
    // every later call reads a state the contract never had.
    expectTypeOf<{
      readonly compiledContract: CompiledContract.CompiledContract<Twin018, Twin018PrivateState>;
      readonly initialPrivateState: Twin018PrivateState;
    }>().not.toMatchTypeOf<DeployContractOptions<Twin018>>();
  });

  // The same table again as DECLARATIONS, which is how a consumer writes them. `toMatchTypeOf`
  // above is plain assignability; these are what tsc reports at a call site, excess-property
  // checking included.
  it('refuses either half on its own where a consumer actually writes it', () => {
    const neither: DeployContractOptions<Twin018> = { compiledContract: compiledContract018 };
    const both: DeployContractOptions<Twin018> = {
      compiledContract: compiledContract018,
      privateStateId: 'twin',
      initialPrivateState: twinPrivateState
    };
    // @ts-expect-error - a private state id with no state to store under it
    const idAlone: DeployContractOptions<Twin018> = {
      compiledContract: compiledContract018,
      privateStateId: 'twin'
    };
    // @ts-expect-error - a private state with no id naming where it goes
    const stateAlone: DeployContractOptions<Twin018> = {
      compiledContract: compiledContract018,
      initialPrivateState: twinPrivateState
    };

    void neither;
    void both;
    void idAlone;
    void stateAlone;
  });

  // NOT a regression guard for the pairing rule, and it should not be read as one: both half-shapes
  // were already refused here before the arms became siblings. An inline literal is FRESH, so
  // ordinary excess-property checking bites against a single-arm overload parameter; the hole
  // #1321 describes needs the UNION as the target, which is the `it` above. On top of that,
  // `Twin018` declares a private state, so it cannot select the no-private-state overload at all,
  // and the id-alone shape cannot satisfy the private-state one, which requires
  // `initialPrivateState`. This block locks in current behaviour, nothing more.
  it('refuses either half at the deployContract call site', () => {
    void deployContract(providers018, {
      compiledContract: compiledContract018,
      privateStateId: 'twin',
      initialPrivateState: twinPrivateState
    });
    // The directive sits on the CALL rather than inside the literal: an overload-resolution
    // failure is reported at the call expression, so a directive on the offending property line
    // reads as unused and the test passes for the wrong reason.
    // @ts-expect-error - a private state id with no state to store under it
    void deployContract(providers018, {
      compiledContract: compiledContract018,
      privateStateId: 'twin'
    });
    // @ts-expect-error - a private state with no id naming where it goes
    void deployContract(providers018, {
      compiledContract: compiledContract018,
      initialPrivateState: twinPrivateState
    });
  });
});
