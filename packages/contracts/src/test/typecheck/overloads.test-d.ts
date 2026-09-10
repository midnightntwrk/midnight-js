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

import type { Ledger8DeployableContractState } from '@midnight-ntwrk/midnight-js-protocol';
import type { CompiledContract, ContractExecutable } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { describe, expectTypeOf, it } from 'vitest';

// The current-era twin of the retained-era fixture. Imported TYPE-ONLY from the artifact's own
// generated `index.d.ts`, so the current-era side of every assertion below is the real compiler's
// view of real generated code rather than a restatement of it. The retained-era side has no
// `.d.ts` to import (see `../ledger8-fixture-types.ts`).
//
// The twin is a `0.18.0-rc.1` artifact while the installed runtime is `0.19.0-rc.0` -- it was not
// regenerated when the repo bumped. That does not weaken these assertions: the generated
// `Contract` class declaration is IDENTICAL across the two (same four members, same async
// `initialState`), so the shape they discriminate on is the current era's. If the twin is ever
// regenerated, the identifiers named `Twin018*` should be renamed with it.
import type { Contract as Twin018Contract } from '../../../../../testkit-js/testkit-js/src/fixtures/hf/twin-contract/compiled/contract/index.js';
import type { CallResult } from '../../call';
import type { ContractProviders } from '../../contract-providers';
import {
  deployContract,
  type DeployContractOptionsWithPrivateState,
  type DeployedContract
} from '../../deploy-contract';
import type { CurrentPipelineEra, PipelineEra, RetainedPipelineEra } from '../../era';
import {
  findDeployedContract,
  type FindDeployedContractOptionsBase,
  type FindDeployedContractOptionsStorePrivateState,
  type FoundContract
} from '../../find-deployed-contract';
import {
  type AnyLedger8CallTxOptions,
  type Ledger8CallTxOptionsBase,
  type Ledger8CallTxOptionsWithPrivateStateId,
  type Ledger8CallTxTarget,
  type Ledger8CircuitId,
  type Ledger8CircuitParameters,
  type Ledger8CircuitResult,
  type Ledger8ConstructorResult,
  type Ledger8Contract,
  type Ledger8ContractCall,
  type Ledger8ContractProviders,
  type Ledger8DeployContractOptions,
  type Ledger8DeployedContract,
  type Ledger8FinalizedCallTxData,
  type Ledger8FindDeployedContractOptions,
  type Ledger8FoundContract,
  type Ledger8SubmittedCallTx,
  type Ledger8Witness,
  type NEITHER_ERA_CONTRACT_MESSAGE,
  type NeitherContractShape,
  type NeitherEraContractOptions
} from '../../ledger8-contract';
import { submitCallTx, submitCallTxAsync, type SubmitCallTxProviders } from '../../submit-call-tx';
import type { SubmitTxProviders } from '../../submit-tx';
import type { TransactionContext } from '../../transaction';
import type { FinalizedCallTxData, SubmittedCallTx } from '../../tx-model';
import type { CallTxOptions, CallTxOptionsBase, CallTxOptionsWithPrivateStateId } from '../../unproven-call-tx';
import type {
  CoinReceiver016Coin,
  CoinReceiver016Contract,
  Counter016Contract,
  Counter016PrivateState
} from '../ledger8-fixture-types';

// These are compile-level tests: the property under test is that this file type-checks (or, for
// the `@ts-expect-error` cases, that it does NOT type-check without the suppressed error). They
// are verified by vitest's typecheck pass for this package, enabled in `vitest.config.ts`, which
// surfaces `tsc` diagnostics against this file as test failures; a plain `yarn test` runs them,
// and the root `typecheck:tests` script is a second gate over the same file. Running these bodies
// at runtime is incidental — `expectTypeOf(...)` performs no runtime assertion.
//
// The retained-era ("0.16") side of every assertion is the hand-written family in
// `../../ledger8-contract.ts`, described for this fixture in `../ledger8-fixture-types.ts`.
// `../ledger8-contract.test.ts` is what proves that description matches the REAL generated
// artifact — these assertions prove the OVERLOADS discriminate the two eras, not that either
// description is true. Both halves are needed.

type Twin018PrivateState = { readonly round: bigint };
type Twin018 = Twin018Contract<Twin018PrivateState>;

declare const contractAddress: ContractAddress;

// Retained-era ("0.16") call-site material.
declare const providers016: Ledger8ContractProviders<Counter016Contract, 'increment'>;
declare const options016: Ledger8CallTxOptionsBase<Counter016Contract, 'increment'>;
declare const options016WithPrivateStateId: Ledger8CallTxOptionsWithPrivateStateId<Counter016Contract, 'increment'>;
declare const contract016: Counter016Contract;

// The ARGUMENT-TAKING retained-era fixture, which is what makes the family's contravariance
// testable at all.
declare const providersCoin: Ledger8ContractProviders<CoinReceiver016Contract, 'receive_coin'>;
declare const optionsCoin: Ledger8CallTxOptionsBase<CoinReceiver016Contract, 'receive_coin'>;

// Current-era call-site material, typed off the real generated declaration file.
declare const providers018: ContractProviders<Twin018, 'increment'>;
declare const options018: CallTxOptionsWithPrivateStateId<Twin018, 'increment'>;
declare const compiledContract018: CompiledContract.CompiledContract<Twin018, Twin018PrivateState>;
declare const contract018: Twin018;

// An object matching NEITHER era: not a container, not a retained-era instance.
declare const neitherShapeContract: { readonly nonsense: true };

// A retained-era contract whose circuit is NOT tuple-shaped, so `Ledger8CircuitParameters`
// cannot destructure a leading context off it. Real 0.16 codegen never emits this; the type
// family must still not claim such a circuit takes no arguments.
type NotTupleShapedCircuits = { readonly odd: (...args: never[]) => Ledger8CircuitResult };
type NotTupleShaped = Ledger8Contract & { readonly impureCircuits: NotTupleShapedCircuits };

describe('the retained-era contract type family pins the real 0.16 artifact shape', () => {
  it('reads the fixture circuit ids off the family rather than off the fixture declaration', () => {
    // Deliberately not `expectTypeOf<Counter016Contract>().toMatchTypeOf<Ledger8Contract>()`: the
    // fixture is declared as `extends Ledger8Contract`, so that assertion cannot fail and proves
    // nothing. This one goes through the family's own machinery and does fail if either side moves.
    expectTypeOf<Ledger8CircuitId<Counter016Contract>>().toEqualTypeOf<'increment'>();
  });

  it('reports the circuit arguments a CALLER supplies, with the framework-built context stripped', () => {
    // The fixture's `increment` takes only the context, so the caller supplies nothing. If this
    // ever reported the context itself, callers would be obliged to construct a live value of the
    // previous runtime.
    expectTypeOf<Ledger8CircuitParameters<Counter016Contract, 'increment'>>().toEqualTypeOf<[]>();
  });

  it('keeps the era top type INHABITABLE, so its args are a real tuple and not never', () => {
    // The regression test for a whole class of mistake. `Ledger8CircuitParameters` destructures
    // `Parameters<T>` as `[Ledger8CircuitContext, ...infer A]`, and a bare `(...args: never[])`
    // circuit is not tuple-shaped, so that pattern matched nothing and `A` never bound: every
    // `args` on the era TOP type silently became `never`, making `AnyLedger8CallTxOptions`
    // impossible to satisfy or to read inside the widened implementation signatures. Concrete
    // contracts were unaffected, which is exactly why it needed asserting here.
    //
    // The tuple shape comes from the explicit leading CONTEXT, not from the width of the argument
    // tail; the tail must stay `never[]`. See {@link OverloadTyping} for why, and the
    // argument-taking fixture's describe block below for the assertion that holds it.
    expectTypeOf<Ledger8CircuitParameters<Ledger8Contract, Ledger8CircuitId<Ledger8Contract>>>().toEqualTypeOf<never[]>();
    expectTypeOf<AnyLedger8CallTxOptions['args']>().toEqualTypeOf<never[]>();
    expectTypeOf<AnyLedger8CallTxOptions['args']>().not.toBeNever();

    // And the no-match branch is `never[]`, not `never`. `never` satisfies `extends []`, so a
    // circuit whose parameters are not tuple-shaped would be reported as taking NO arguments --
    // silently wrong in the one direction a caller cannot detect. `never[]` keeps `args` required
    // and uninhabitable, so the mismatch surfaces.
    expectTypeOf<Ledger8CircuitParameters<NotTupleShaped, 'odd'>>().toEqualTypeOf<never[]>();
    expectTypeOf<Ledger8CallTxOptionsBase<NotTupleShaped, 'odd'>>().toHaveProperty('args');
  });

  it('rejects a current-era contract instance', () => {
    // The near-miss guard. The reason it is rejected is a CONTRAVARIANT PARAMETER mismatch: the
    // family's circuit takes a `Ledger8CircuitContext<never>`, which is missing the members of the
    // current runtime's much larger `CircuitContext` (`callContext`, `queryContexts`, `gasCosts`,
    // and the rest), so a current-era circuit is not assignable to `Ledger8Circuit`. It is NOT the
    // sync/async split that fires here, even though that split is what the family is designed
    // around — the next assertion anchors on that separately, so a later relaxation of
    // `Ledger8CircuitContext` cannot quietly move this test onto the other reason.
    // @ts-expect-error - a current-era contract's circuit context is not the retained era's
    const notRetainedEra: Ledger8Contract = contract018;
    // `void`, not an `expectTypeOf` against its own annotation: that would assert nothing and read
    // as coverage. The directive above is the assertion.
    void notRetainedEra;
  });

  it('rejects the async results the current era returns, independently of any context mismatch', () => {
    // The sync/async discriminator on its own, read off the REAL current-era declaration file: a
    // `Promise` has none of the members the retained-era result types declare, in either position.
    expectTypeOf<ReturnType<Twin018['impureCircuits']['increment']>>().not.toMatchTypeOf<Ledger8CircuitResult>();
    expectTypeOf<ReturnType<Twin018['initialState']>>().not.toMatchTypeOf<Ledger8ConstructorResult>();

    // ...and the mirror, so the split is pinned in BOTH directions rather than only the one the
    // near-miss guard happens to exercise: a plain retained-era result is not a `Promise` either.
    expectTypeOf<Ledger8CircuitResult>().not.toMatchTypeOf<ReturnType<Twin018['impureCircuits']['increment']>>();
    expectTypeOf<Ledger8ConstructorResult>().not.toMatchTypeOf<ReturnType<Twin018['initialState']>>();
  });

  it('is rejected BY the current era in turn, so neither shape is a subtype of the other', () => {
    // @ts-expect-error - a retained-era contract's circuit context is not the current era's
    const notCurrentEra: Contract.Any = contract016;
    void notCurrentEra;
  });
});

describe('an argument-taking retained-era contract works, not just a zero-argument one', () => {
  // `counter-016`'s circuit takes only the framework-built context, so every assertion above
  // exercises `Ledger8CircuitParameters` at the empty tuple. `coin-receiver-016` is a real
  // retained-era artifact whose `receive_coin` takes one argument after the context (its own arity
  // guard is `args_1.length !== 2`), and these four assertions are what a zero-argument fixture
  // could never have caught: with `Ledger8Circuit`'s tail widened to `unknown[]`, contravariance
  // put this contract OUTSIDE `Ledger8Contract` altogether, so `submitCallTx` silently fell through
  // to the current-era arms and the retained-era overload did not apply to it at all.
  it('satisfies the retained-era family through the family own machinery', () => {
    expectTypeOf<Ledger8CircuitId<CoinReceiver016Contract>>().toEqualTypeOf<'receive_coin'>();
  });

  it('reports a NON-EMPTY caller argument tuple, with the framework-built context stripped', () => {
    expectTypeOf<Ledger8CircuitParameters<CoinReceiver016Contract, 'receive_coin'>>().toEqualTypeOf<[coin: CoinReceiver016Coin]>();
  });

  it('carries args on its options, unlike the zero-argument fixture', () => {
    expectTypeOf<Ledger8CallTxOptionsBase<CoinReceiver016Contract, 'receive_coin'>>().toHaveProperty('args');
    expectTypeOf<Ledger8CallTxOptionsBase<CoinReceiver016Contract, 'receive_coin'>['args']>().toEqualTypeOf<
      [coin: CoinReceiver016Coin]
    >();
  });

  it('RESOLVES to the retained-era arm, which is the assertion the unknown[] tail failed', () => {
    // The load-bearing one. Compiling is not the property under test: an argument-taking contract
    // that fell out of `Ledger8Contract` would still have compiled here by matching a current-era
    // arm, or failed for a reason that says nothing about eras. Only the resolved return type shows
    // that the retained-era arm was selected.
    expectTypeOf(submitCallTx(providersCoin, optionsCoin)).toEqualTypeOf<
      Promise<Ledger8FinalizedCallTxData<CoinReceiver016Contract, 'receive_coin'>>
    >();
    expectTypeOf(submitCallTxAsync(providersCoin, optionsCoin)).toEqualTypeOf<
      Promise<Ledger8SubmittedCallTx<CoinReceiver016Contract, 'receive_coin'>>
    >();
  });
});

describe('every result names the pipeline that produced it', () => {
  // The fact a caller cannot get anywhere else. `public.version` and
  // `deployTxData.version` answer a DIFFERENT question -- which ledger recorded
  // the transaction -- and after the fork they disagree with this one: a
  // retained-era call is recorded as a keep-state transaction tagged `'v9'`
  // while every object in its result comes from `onchain-runtime-v3`. A caller
  // branching on the record reaches for the wrong module.

  type EitherEraCall =
    | FinalizedCallTxData<Twin018, 'increment'>
    | Ledger8FinalizedCallTxData<Counter016Contract, 'increment'>;

  it('tags both eras at the same path, with that era own literal', () => {
    expectTypeOf<FinalizedCallTxData<Twin018, 'increment'>['era']>().toEqualTypeOf<CurrentPipelineEra>();
    expectTypeOf<
      Ledger8FinalizedCallTxData<Counter016Contract, 'increment'>['era']
    >().toEqualTypeOf<RetainedPipelineEra>();
    // Both literals belong to the ONE vocabulary the dispatch already resolves.
    expectTypeOf<CurrentPipelineEra | RetainedPipelineEra>().toEqualTypeOf<PipelineEra>();
  });

  it('DISCRIMINATES: a union of the two eras narrows on `era` alone', () => {
    // The property under test. Declaring `era: PipelineEra` on both arms would
    // satisfy every assertion above and narrow nothing.
    const narrow = (result: EitherEraCall): Uint8Array | undefined =>
      result.era === 'ledger8' ? result.private.txBytes : undefined;

    expectTypeOf(narrow).parameter(0).toEqualTypeOf<EitherEraCall>();
    expectTypeOf(narrow).returns.toEqualTypeOf<Uint8Array | undefined>();
  });

  it('tags the asynchronous submit and the contract handles too', () => {
    expectTypeOf<SubmittedCallTx<Twin018, 'increment'>['era']>().toEqualTypeOf<CurrentPipelineEra>();
    expectTypeOf<
      Ledger8SubmittedCallTx<Counter016Contract, 'increment'>['era']
    >().toEqualTypeOf<RetainedPipelineEra>();
    expectTypeOf<FoundContract<Twin018>['era']>().toEqualTypeOf<CurrentPipelineEra>();
    expectTypeOf<Ledger8FoundContract<Counter016Contract>['era']>().toEqualTypeOf<RetainedPipelineEra>();
    expectTypeOf<DeployedContract<Twin018>['era']>().toEqualTypeOf<CurrentPipelineEra>();
    expectTypeOf<Ledger8DeployedContract<Counter016Contract>['era']>().toEqualTypeOf<RetainedPipelineEra>();
  });
});

describe('the retained-era deploy publishes what it produced, and takes what a constructor needs', () => {
  // NOT OBSERVABLE END TO END: `deployContract`'s retained arm refuses with
  // `Ledger8DeployUnmaintainableError`, so nothing constructs a value of these
  // types today. What they declare is what the arm will answer with when that
  // refusal is lifted, and the pipeline under it already computes every member.
  interface SeededPrivateState {
    readonly seed: bigint;
  }

  /** A retained-era artifact whose CONSTRUCTOR takes an argument of its own. */
  interface SeededContract extends Ledger8Contract<SeededPrivateState> {
    initialState(context: unknown, seed: bigint): Ledger8ConstructorResult<SeededPrivateState>;
  }

  it('carries constructor args on its deploy options, and omits them for a zero-argument constructor', () => {
    // `Ledger8Contract.initialState(...args: never[])` says a retained
    // constructor may take arguments, and the pipeline has passed them through
    // since it was written. The options type was the only place that denied it.
    expectTypeOf<Ledger8DeployContractOptions<SeededContract>>().toHaveProperty('args');
    expectTypeOf<Ledger8DeployContractOptions<SeededContract>['args']>().toEqualTypeOf<[seed: bigint]>();
    expectTypeOf<Ledger8DeployContractOptions<Counter016Contract>>().not.toHaveProperty('args');
  });

  it('publishes the constructor result, as a handle AND as the bytes the address came from', () => {
    expectTypeOf<keyof Ledger8DeployedContract<Counter016Contract>>().toEqualTypeOf<
      | 'era'
      | 'compiledContract'
      | 'contractAddress'
      | 'deployTxData'
      | 'callTx'
      | 'signingKey'
      | 'initialContractState'
      | 'initialState'
      | 'initialPrivateState'
      | 'initialZswapState'
    >();
    // ADR-0011: the handle and the bytes, not one instead of the other.
    expectTypeOf<Ledger8DeployedContract<Counter016Contract>['initialState']>().toEqualTypeOf<Uint8Array>();
    expectTypeOf<
      Ledger8DeployedContract<Counter016Contract>['initialContractState']
    >().toEqualTypeOf<Ledger8DeployableContractState>();
  });
});

describe('both eras resolve a call to the SAME result structure', () => {
  // The caller-facing property. The retained arm used to answer a thin
  // `{ circuitId, nextPrivateState, txData }` while the current era answered
  // `{ public, private }`, so the two eras' results were different objects and
  // the circuit's own return value was reachable in one era only -- even though
  // the retained pipeline computes it (`TranscriptPojo.result`) and then dropped
  // it. Every assertion here is about SHAPE, not about identical types: the two
  // eras' state and transaction members are handles from two different runtimes,
  // so they can never be the same TYPE even where both eras carry them.

  // KEY-SET EQUALITY, in both directions. `toHaveProperty` can only confirm that
  // a named member is PRESENT, so a member that fell off one era's surface is
  // invisible to it -- which is how four of them did. Everything one era carries
  // and the other does not has to be named in an allow-list below, with the
  // reason it is excused, or the assertion fails.

  /**
   * Public members the current era carries and the retained era does NOT, each
   * excused on its own grounds rather than as a group.
   */
  type CurrentEraOnlyPublicMembers =
    // The retained toolchain has no log-event concept at any layer -- neither
    // `compact-runtime-ledger8` nor `onchain-runtime-v3` declares one -- so
    // there is no value to carry rather than a value being dropped. The one
    // absence left on this half, and the only one about the toolchain rather
    // than about transport.
    'logEvents';

  /**
   * Private members the current era carries and the retained era does NOT.
   */
  type CurrentEraOnlyPrivateMembers =
    // The retained composer answers with bytes; `txBytes` below is the member
    // that carries them. See ADR-0011 for why no live transaction is built.
    'unprovenTx';

  /** Private members the retained era adds. An era may add; it may not drop. */
  type RetainedEraOnlyPrivateMembers = 'txBytes';

  /*
   * NO retained-era-only public members. `nextContractStateEncoded` was excused
   * here on the grounds that the current era "publishes its post-state as a
   * handle only, so there is nothing on that side for this to pair with". That
   * was not true: `StateValue.encode()` exists on the current era's handle, so
   * the pair was available and simply was not built. Both eras publish the
   * encoded form now, which is what makes it the member era-agnostic code can
   * read -- the point ADR-0011 argued for and applied to one era.
   */

  /** Top-level members the retained era adds. */
  type RetainedEraOnlyMembers = 'circuitId';

  type CurrentEraResult = FinalizedCallTxData<Twin018, 'increment'>;
  type RetainedEraResult = Ledger8FinalizedCallTxData<Counter016Contract, 'increment'>;

  it('still CARRIES every member the allow-lists above excuse from parity', () => {
    // `Exclude<keyof T, 'x'>` is a NO-OP when `x` is absent from `T`, so every
    // name written into an allow-list stops being checked in either direction:
    // dropping `nextContractStateEncoded` outright leaves all the parity
    // assertions below fully green. An allow-list may excuse a member from
    // PARITY; it may not excuse it from EXISTING.
    expectTypeOf<CurrentEraResult['public']>().toHaveProperty('logEvents');
    expectTypeOf<CurrentEraResult['private']>().toHaveProperty('unprovenTx');
    expectTypeOf<RetainedEraResult['private']>().toHaveProperty('txBytes');
    expectTypeOf<RetainedEraResult>().toHaveProperty('circuitId');
    expectTypeOf<Ledger8ContractCall['public']>().toHaveProperty('contractStateEncoded');
    expectTypeOf<Ledger8ContractCall['public']>().toHaveProperty('preContractState');
    expectTypeOf<Ledger8ContractCall['public']>().toHaveProperty('preContractStateEncoded');
    expectTypeOf<Ledger8SubmittedCallTx<Counter016Contract, 'increment'>>().toHaveProperty('circuitId');
    expectTypeOf<Ledger8SubmittedCallTx<Counter016Contract, 'increment'>>().toHaveProperty('nextPrivateState');
  });

  it('carries the same top-level members in BOTH eras', () => {
    expectTypeOf<keyof CurrentEraResult>().toEqualTypeOf<Exclude<keyof RetainedEraResult, RetainedEraOnlyMembers>>();
  });

  it('carries the same public members in BOTH eras, apart from the ONE excused above', () => {
    expectTypeOf<Exclude<keyof CurrentEraResult['public'], CurrentEraOnlyPublicMembers>>().toEqualTypeOf<
      keyof RetainedEraResult['public']
    >();
  });

  it('carries the same private members in BOTH eras, apart from the one excused above', () => {
    expectTypeOf<Exclude<keyof CurrentEraResult['private'], CurrentEraOnlyPrivateMembers>>().toEqualTypeOf<
      Exclude<keyof RetainedEraResult['private'], RetainedEraOnlyPrivateMembers>
    >();
  });

  it('describes ONE call the same way in BOTH eras', () => {
    // The element type of `calls`. The current era's comes from `compact-js`,
    // so there is no shared base to inherit from and this equality is the only
    // thing holding the two in step. Nothing is excused: the retained entry
    // carries `communicationCommitment` too, always `Option.none()`, so that a
    // caller reading a call entry never has to branch on the era.
    type CurrentEraCall = ContractExecutable.ContractExecutable.ContractCall;

    expectTypeOf<keyof CurrentEraCall>().toEqualTypeOf<keyof Ledger8ContractCall>();
    // Three additions, nothing dropped. `contractState` means the POST-call
    // state in both eras -- `compact-js` fills it from the final query context
    // -- so the state the call BOUND to is published beside it under its own
    // name rather than under a name that already means something else.
    type RetainedEraOnlyCallPublicMembers =
      'contractStateEncoded' | 'preContractState' | 'preContractStateEncoded';

    expectTypeOf<keyof CurrentEraCall['public']>().toEqualTypeOf<
      Exclude<keyof Ledger8ContractCall['public'], RetainedEraOnlyCallPublicMembers>
    >();
    expectTypeOf<keyof CurrentEraCall['private']>().toEqualTypeOf<keyof Ledger8ContractCall['private']>();
  });

  it('lifts every declared circuit onto `callTx` in BOTH eras', () => {
    // Key-set equality against the artifact's OWN circuit ids, so an interface
    // that lifted a subset -- or nothing at all -- fails here rather than
    // leaving a caller to discover it at the call site.
    expectTypeOf<keyof Ledger8FoundContract<Counter016Contract>['callTx']>().toEqualTypeOf<
      Ledger8CircuitId<Counter016Contract>
    >();
    expectTypeOf<keyof FoundContract<Twin018>['callTx']>().toEqualTypeOf<Contract.ProvableCircuitId<Twin018>>();
    expectTypeOf<
      ReturnType<Ledger8FoundContract<Counter016Contract>['callTx']['increment']>
    >().toEqualTypeOf<Promise<Ledger8FinalizedCallTxData<Counter016Contract, 'increment'>>>();
  });

  it('hands back the execution data on `callTxData` in BOTH eras, before finalization', () => {
    // The async surface answers before there is a record to pair execution data
    // with -- which is a reason it cannot carry a FINALIZED record, and not a
    // reason to drop the execution data itself. The retained era adds the two
    // members it can answer straight away; it may not drop `callTxData`.
    type RetainedEraOnlySubmittedMembers = 'circuitId' | 'nextPrivateState';

    expectTypeOf<keyof SubmittedCallTx<Twin018, 'increment'>>().toEqualTypeOf<
      Exclude<keyof Ledger8SubmittedCallTx<Counter016Contract, 'increment'>, RetainedEraOnlySubmittedMembers>
    >();

    // Descends into `callTxData` itself. The assertion above compares only the
    // TOP-LEVEL members of the two submitted results, so a member dropped from
    // the nested execution data is invisible to it -- which is how `era` fell
    // off this arm while every top-level key set still matched.
    expectTypeOf<keyof SubmittedCallTx<Twin018, 'increment'>['callTxData']>().toEqualTypeOf<
      keyof Ledger8SubmittedCallTx<Counter016Contract, 'increment'>['callTxData']
    >();
  });

  it('puts the circuit return value on `private.result` in BOTH eras', () => {
    expectTypeOf<Ledger8FinalizedCallTxData<Counter016Contract, 'increment'>>().toHaveProperty('private');
    expectTypeOf<Ledger8FinalizedCallTxData<Counter016Contract, 'increment'>['private']>().toHaveProperty('result');
    expectTypeOf<FinalizedCallTxData<Twin018, 'increment'>['private']>().toHaveProperty('result');
  });

  it('puts the finalized record on `public` in BOTH eras, keeping the retained era tag', () => {
    expectTypeOf<Ledger8FinalizedCallTxData<Counter016Contract, 'increment'>>().toHaveProperty('public');
    expectTypeOf<Ledger8FinalizedCallTxData<Counter016Contract, 'increment'>['public']>().toHaveProperty('txId');
    expectTypeOf<Ledger8FinalizedCallTxData<Counter016Contract, 'increment'>['public']>().toHaveProperty('status');
    // The one member that must NOT be narrowed to the current era's: a retained
    // call is recorded by whichever era the head is on, so the tag stays a union.
    expectTypeOf<Ledger8FinalizedCallTxData<Counter016Contract, 'increment'>['public']['version']>().toEqualTypeOf<
      'v8' | 'v9'
    >();
  });

  it('carries the post-state as a HANDLE, and the composed transaction as bytes', () => {
    // ADR-0011: the retained post-state is published as the runtime's own
    // handle rather than withheld. The composed transaction stays bytes --
    // `txBytes` is what the retained composer answers with, and deserializing
    // one eagerly would pay for an object most callers never read.
    expectTypeOf<Ledger8FinalizedCallTxData<Counter016Contract, 'increment'>['public']>().toHaveProperty(
      'nextContractState'
    );
    expectTypeOf<Ledger8FinalizedCallTxData<Counter016Contract, 'increment'>['private']>().toHaveProperty('txBytes');
    expectTypeOf<
      Ledger8FinalizedCallTxData<Counter016Contract, 'increment'>['private']
    >().not.toHaveProperty('unprovenTx');
  });

  it('keeps `nextPrivateState` reachable, on the private side as the current era does', () => {
    expectTypeOf<Ledger8FinalizedCallTxData<Counter016Contract, 'increment'>['private']>().toHaveProperty(
      'nextPrivateState'
    );
    expectTypeOf<FinalizedCallTxData<Twin018, 'increment'>['private']>().toHaveProperty('nextPrivateState');
  });
});

describe('both eras answer with the SAME contract-handle structure', () => {
  // The handle types escaped the discipline ADR-0010 wrote for the RESULT
  // types, and drifted in BOTH directions while every result-shape assertion
  // above stayed green. A base cannot hold these in step: `era`, `callTx` and
  // `deployTxData` are era-specific types on every arm, so a base over them
  // would declare a key set and nothing else -- the shape ADR-0010 already
  // rejected for `FinalizedCallTxData`. The key-set gate is the whole
  // mechanism here.

  /**
   * Members the current era's found contract carries and the retained era does
   * NOT. The retained era has no governance arm for a maintenance interface to
   * reach, so there is no value to carry rather than a value being dropped.
   */
  type CurrentEraOnlyFoundMembers = 'circuitMaintenanceTx' | 'contractMaintenanceTx';

  /**
   * Members the retained era's DEPLOYED contract carries at the top level and
   * the current era carries under `deployTxData` instead.
   *
   * Not a missing member on either side: both eras hold all five facts. They
   * disagree about the PATH, which no key-set assertion at one level can state
   * -- the current era nests the first four under `deployTxData.private` and
   * `initialContractState` under `deployTxData.public`. Excused here so the
   * rest of the surface is gated, and tracked in #1298 as its own decision
   * about which shape wins, because moving either side is a breaking change to
   * a published surface.
   */
  type RetainedEraOnlyDeployedMembers =
    | 'signingKey'
    | 'initialContractState'
    | 'initialState'
    | 'initialPrivateState'
    | 'initialZswapState';

  type CurrentFound = FoundContract<Twin018>;
  type RetainedFound = Ledger8FoundContract<Counter016Contract>;
  type CurrentDeployed = DeployedContract<Twin018>;
  type RetainedDeployed = Ledger8DeployedContract<Counter016Contract>;

  it('still CARRIES every member the allow-lists above excuse from parity', () => {
    // `Exclude<keyof T, 'x'>` is a NO-OP when `x` is absent from `T`, so a name
    // written into an allow-list stops being checked in either direction.
    // An allow-list may excuse a member from PARITY; it may not excuse it from
    // EXISTING.
    expectTypeOf<CurrentFound>().toHaveProperty('circuitMaintenanceTx');
    expectTypeOf<CurrentFound>().toHaveProperty('contractMaintenanceTx');
    expectTypeOf<RetainedDeployed>().toHaveProperty('signingKey');
    expectTypeOf<RetainedDeployed>().toHaveProperty('initialContractState');
    expectTypeOf<RetainedDeployed>().toHaveProperty('initialState');
    expectTypeOf<RetainedDeployed>().toHaveProperty('initialPrivateState');
    expectTypeOf<RetainedDeployed>().toHaveProperty('initialZswapState');
  });

  it('carries the same members on a FOUND contract in BOTH eras, apart from the maintenance pair', () => {
    expectTypeOf<Exclude<keyof CurrentFound, CurrentEraOnlyFoundMembers>>().toEqualTypeOf<keyof RetainedFound>();
  });

  it('carries the same members on a DEPLOYED contract in BOTH eras, apart from the two lists above', () => {
    expectTypeOf<Exclude<keyof CurrentDeployed, CurrentEraOnlyFoundMembers>>().toEqualTypeOf<
      Exclude<keyof RetainedDeployed, RetainedEraOnlyDeployedMembers>
    >();
  });

  it('names the contract and its address on the handle in BOTH eras', () => {
    // The two members that drifted onto the retained arm alone. A caller that
    // has a handle can reach the artifact and the address it was attached with,
    // without carrying either alongside it -- in either era.
    //
    // Stated against each era's OWN options type rather than against a spelled-out
    // type: the handle republishes exactly the value the caller supplied, and the
    // current era's container carries an unconstrained second parameter that a
    // restatement here would have to either widen or misreport.
    expectTypeOf<CurrentFound['compiledContract']>().toEqualTypeOf<
      FindDeployedContractOptionsBase<Twin018>['compiledContract']
    >();
    expectTypeOf<RetainedFound['compiledContract']>().toEqualTypeOf<
      Ledger8FindDeployedContractOptions<Counter016Contract>['compiledContract']
    >();
    expectTypeOf<CurrentFound['contractAddress']>().toEqualTypeOf<ContractAddress>();
    expectTypeOf<RetainedFound['contractAddress']>().toEqualTypeOf<ContractAddress>();
  });

  it('discriminates a handle on `era` alone, in both directions', () => {
    expectTypeOf<CurrentFound['era']>().toEqualTypeOf<CurrentPipelineEra>();
    expectTypeOf<RetainedFound['era']>().toEqualTypeOf<RetainedPipelineEra>();
    expectTypeOf<CurrentDeployed['era']>().toEqualTypeOf<CurrentPipelineEra>();
    expectTypeOf<RetainedDeployed['era']>().toEqualTypeOf<RetainedPipelineEra>();
  });
});

describe('the two eras options types do not structurally match each other', () => {
  it('does not accept retained-era options where the current-era overload expects its own', () => {
    // @ts-expect-error - a raw retained-era contract instance is not a CompiledContract container
    const notCurrentEraOptions: CallTxOptionsBase<Twin018, 'increment'> = options016;
    void notCurrentEraOptions;
  });

  it('does not accept current-era options where the retained-era overload expects its own, and does so ON the contract', () => {
    // @ts-expect-error - a CompiledContract container has no impureCircuits of its own
    const notRetainedEraOptions: Ledger8CallTxOptionsBase<Counter016Contract, 'increment'> = options018;
    void notRetainedEraOptions;

    // `compiledContract` is the ONLY thing that does not line up, which is what makes the directive
    // above a test of era discrimination rather than of a missing field. It was not: while
    // `Ledger8CallTxOptionsBase.args` was unconditional and the current era's was conditional, this
    // sat on `TS2741: Property 'args' is missing` and said nothing about either contract shape.
    // Asserting the remainder matches pins the reason, not just the failure — and it is asserted on
    // `Ledger8CallTxOptionsBase`, not on `Ledger8CallTxTarget`, precisely so that making `args`
    // unconditional again would fail here rather than quietly move the directive above.
    expectTypeOf<Omit<CallTxOptionsWithPrivateStateId<Twin018, 'increment'>, 'compiledContract'>>().toMatchTypeOf<
      Omit<Ledger8CallTxOptionsBase<Counter016Contract, 'increment'>, 'compiledContract'>
    >();
  });

  it('omits args in BOTH eras for a circuit that takes no arguments of its own', () => {
    // The caller-facing symmetry, stated directly. The retained-era options type used to require
    // `args: []` for the fixture's zero-argument circuit while the current era required no `args` at
    // all — the same circuit, two different call shapes, for no reason a caller could see.
    expectTypeOf<Ledger8CircuitParameters<Counter016Contract, 'increment'>>().toEqualTypeOf<[]>();
    expectTypeOf<Ledger8CallTxOptionsBase<Counter016Contract, 'increment'>>().not.toHaveProperty('args');
    expectTypeOf<CallTxOptionsBase<Twin018, 'increment'>>().not.toHaveProperty('args');
    expectTypeOf<Ledger8CallTxOptionsBase<Counter016Contract, 'increment'>>().toEqualTypeOf<
      Ledger8CallTxTarget<Counter016Contract, 'increment'>
    >();
  });

  it('does not accept the current-era container as a retained-era contract', () => {
    expectTypeOf<CompiledContract.CompiledContract<Twin018, Twin018PrivateState>>().not.toMatchTypeOf<Ledger8Contract>();
  });
});

describe('submitCallTx resolves a retained-era call to the retained-era return type', () => {
  // The overload-order hazard, asserted POSITIVELY. `submitCallTx` carries the retained-era arm
  // alongside four pre-existing current-era arms, and TypeScript picks the FIRST arm that matches.
  // "It compiles" would not prove the retained-era arm was the one chosen — only the resolved
  // return type does.
  it('picks the retained-era arm for retained-era options without a private state id', () => {
    expectTypeOf(submitCallTx(providers016, options016)).toEqualTypeOf<
      Promise<Ledger8FinalizedCallTxData<Counter016Contract, 'increment'>>
    >();
  });

  it('picks the retained-era arm for retained-era options WITH a private state id', () => {
    expectTypeOf(submitCallTx(providers016, options016WithPrivateStateId)).toEqualTypeOf<
      Promise<Ledger8FinalizedCallTxData<Counter016Contract, 'increment'>>
    >();
  });

  it('still picks the current-era arm for current-era options', () => {
    expectTypeOf(submitCallTx(providers018, options018)).toEqualTypeOf<
      Promise<FinalizedCallTxData<Twin018, 'increment'>>
    >();
  });
});

describe('submitCallTxAsync, deployContract and findDeployedContract resolve both eras the same way', () => {
  it('resolves a retained-era submitCallTxAsync to the retained-era submitted-tx type', () => {
    expectTypeOf(submitCallTxAsync(providers016, options016)).toEqualTypeOf<
      Promise<Ledger8SubmittedCallTx<Counter016Contract, 'increment'>>
    >();
  });

  it('resolves a current-era submitCallTxAsync to the current-era submitted-tx type', () => {
    expectTypeOf(submitCallTxAsync(providers018, options018)).toEqualTypeOf<Promise<SubmittedCallTx<Twin018, 'increment'>>>();
  });

  it('resolves a retained-era deployContract to the retained-era deployed-contract type', () => {
    const deployOptions: Ledger8DeployContractOptions<Counter016Contract> = { compiledContract: contract016 };

    expectTypeOf(deployContract(providers016, deployOptions)).toEqualTypeOf<
      Promise<Ledger8DeployedContract<Counter016Contract>>
    >();
  });

  it('resolves a current-era deployContract to the current-era deployed-contract type', () => {
    expectTypeOf(
      deployContract(providers018, { compiledContract: compiledContract018, privateStateId: 'counter', initialPrivateState: { round: 0n } })
    ).toEqualTypeOf<Promise<DeployedContract<Twin018>>>();
  });

  it('resolves a retained-era findDeployedContract to the retained-era found-contract type', () => {
    const findOptions: Ledger8FindDeployedContractOptions<Counter016Contract> = {
      compiledContract: contract016,
      contractAddress
    };

    expectTypeOf(findDeployedContract(providers016, findOptions)).toEqualTypeOf<
      Promise<Ledger8FoundContract<Counter016Contract>>
    >();
  });

  it('resolves a current-era findDeployedContract to the current-era found-contract type', () => {
    expectTypeOf(
      findDeployedContract(providers018, {
        compiledContract: compiledContract018,
        contractAddress,
        privateStateId: 'counter',
        initialPrivateState: { round: 0n }
      })
    ).toEqualTypeOf<Promise<FoundContract<Twin018>>>();
  });
});

describe('an object belonging to neither era is refused by both eras', () => {
  // No overload arm names a "neither era" type, deliberately. An arm that is not LAST never
  // renders a diagnostic, and putting one last made every mistyped CURRENT-era call report that
  // the caller's ordinary contract belonged to neither era. The guidance belongs in the thrown,
  // typed error era resolution raises, which can carry full remediation text where a compiler
  // diagnostic cannot.
  //
  // What remains here are the facts the overloads actually rely on: that a neither-era object is
  // refused by BOTH eras' options types, and that the message the future error will carry is the
  // wording that was reviewed.
  it('carries the migration-guide message verbatim, so a reword cannot pass unnoticed', () => {
    expectTypeOf<NeitherContractShape['__error']>().toEqualTypeOf<'Object is neither a retained-era nor a current-era generated contract.'>();
  });

  it('keeps the message and the named shape in step', () => {
    expectTypeOf<NeitherEraContractOptions['compiledContract']>().toEqualTypeOf<NeitherContractShape>();
    expectTypeOf<NeitherContractShape['__error']>().toEqualTypeOf<typeof NEITHER_ERA_CONTRACT_MESSAGE>();
  });

  it('does not match the named neither-era shape', () => {
    // @ts-expect-error - neither a retained-era nor a current-era contract
    const neither: NeitherEraContractOptions = { compiledContract: neitherShapeContract };
    expectTypeOf(neither).toMatchTypeOf<NeitherEraContractOptions>();
  });

  it('is refused by the retained era and by the current era alike', () => {
    expectTypeOf<{ readonly nonsense: true }>().not.toMatchTypeOf<Ledger8Contract>();
    expectTypeOf<{ readonly nonsense: true }>().not.toMatchTypeOf<CompiledContract.CompiledContract<Twin018, Twin018PrivateState>>();
  });

  it('refuses a neither-era call outright', () => {
    // A GUARD, not a driver: this call fails against the current-era arms whatever the retained-era
    // arm does, so the directive stays "used" either way. The two assertions above are what
    // actually discriminate.
    // @ts-expect-error - neither a retained-era nor a current-era contract
    submitCallTx(providers016, { compiledContract: neitherShapeContract, contractAddress, circuitId: 'increment' });
  });
});

describe('adding era arms leaves the pre-existing entry points public surface untouched', () => {
  // THE LOAD-BEARING GUARD ON THE ARM ORDER — not belt-and-braces. Read this before touching an
  // overload list in `../../submit-call-tx.ts`, `../../deploy-contract.ts` or
  // `../../find-deployed-contract.ts`.
  //
  // THREE things resolve from an overloaded function's LAST signature: `ReturnType<typeof f>`,
  // `Parameters<typeof f>`, and the error TypeScript prints when no arm matches. So the era arms
  // are declared FIRST and the arm that was already last is left exactly where it was. Both
  // families of pin below exist because both `ReturnType` and `Parameters` read that last
  // signature, so neither can be moved silently -- and because they do, the third moves only when
  // they do. Its exact wording is TypeScript's to choose, and is not pinned anywhere.
  //
  // Every expected type below was DERIVED from the state of these entry points BEFORE the era
  // arms were added (the tip of the parent PR in this stack) rather than hand-written: each was
  // stated as a candidate and verified there by a strict type-identity assertion before being
  // written down here. No commit SHA is cited, because the parent branch is squash-merged and the
  // SHA would not survive it.
  //
  // `Parameters` in particular had already regressed once, reporting
  // `[providers: unknown, options: ...]` off a trailing catch-all arm that instantiated
  // `providers` to `unknown`, with nothing watching. That arm is gone; these pins are why its
  // return could not come back unnoticed.
  it('leaves ReturnType<typeof submitCallTx> reporting the current-era CallResult', () => {
    expectTypeOf<ReturnType<typeof submitCallTx>>().toEqualTypeOf<Promise<CallResult<Contract<undefined>, string>>>();
  });

  it('leaves Parameters<typeof submitCallTx> reporting the scoped current-era call', () => {
    expectTypeOf<Parameters<typeof submitCallTx>>().toEqualTypeOf<
      [
        providers: SubmitTxProviders<Contract<undefined>, string>,
        options: CallTxOptionsBase<Contract<undefined>, string>,
        transactionContext: TransactionContext<Contract<undefined>, string>
      ]
    >();
  });

  it('leaves ReturnType<typeof submitCallTxAsync> reporting the current-era SubmittedCallTx', () => {
    expectTypeOf<ReturnType<typeof submitCallTxAsync>>().toEqualTypeOf<Promise<SubmittedCallTx<Contract.Any, string>>>();
  });

  it('leaves Parameters<typeof submitCallTxAsync> reporting the current-era call', () => {
    expectTypeOf<Parameters<typeof submitCallTxAsync>>().toEqualTypeOf<
      [providers: SubmitCallTxProviders<Contract.Any, string>, options: CallTxOptions<Contract.Any, string>]
    >();
  });

  it('leaves ReturnType<typeof deployContract> reporting the current-era DeployedContract', () => {
    expectTypeOf<ReturnType<typeof deployContract>>().toEqualTypeOf<Promise<DeployedContract<Contract.Any>>>();
  });

  it('leaves Parameters<typeof deployContract> reporting the current-era private-state deploy', () => {
    expectTypeOf<Parameters<typeof deployContract>>().toEqualTypeOf<
      [providers: ContractProviders<Contract.Any>, options: DeployContractOptionsWithPrivateState<Contract.Any>]
    >();
  });

  it('leaves ReturnType<typeof findDeployedContract> reporting the current-era FoundContract', () => {
    expectTypeOf<ReturnType<typeof findDeployedContract>>().toEqualTypeOf<Promise<FoundContract<Contract.Any>>>();
  });

  it('leaves Parameters<typeof findDeployedContract> reporting the current-era store-private-state find', () => {
    expectTypeOf<Parameters<typeof findDeployedContract>>().toEqualTypeOf<
      [providers: ContractProviders<Contract.Any>, options: FindDeployedContractOptionsStorePrivateState<Contract.Any>]
    >();
  });
});

describe('the retained-era private state flows through the family', () => {
  it('reports the fixture private state on the retained-era result', () => {
    expectTypeOf<
      Ledger8FinalizedCallTxData<Counter016Contract, 'increment'>['private']['nextPrivateState']
    >().toEqualTypeOf<Counter016PrivateState>();
  });

  it('refuses a witness declared over the WRONG private state', () => {
    // `Ledger8Witness` threads `PS` through its first tuple member, so a witness that returns some
    // other private state is not assignable. Before that, the member was `unknown` and this type
    // refused nothing at all.
    expectTypeOf<Ledger8Witness<Counter016PrivateState>>().not.toEqualTypeOf<Ledger8Witness<{ readonly other: bigint }>>();
    expectTypeOf<() => readonly [{ readonly other: bigint }, unknown]>().not.toMatchTypeOf<
      Ledger8Witness<Counter016PrivateState>
    >();
  });

  it('still lets a concrete witness satisfy the era TOP type, because PS sits in a result position', () => {
    // The variance check that makes the threading safe: `PS` is covariant here, so narrowing it on
    // a concrete contract does not push that contract out of `Ledger8Contract`.
    expectTypeOf<Ledger8Witness<Counter016PrivateState>>().toMatchTypeOf<Ledger8Witness>();
    expectTypeOf<Counter016Contract>().toMatchTypeOf<Ledger8Contract<Counter016PrivateState>>();
  });
});
