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
import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { describe, expectTypeOf, it } from 'vitest';

// The real current-era ("0.18") twin of the retained-era fixture. Imported TYPE-ONLY from the
// artifact's own generated `index.d.ts`, so the current-era side of every assertion below is the
// real compiler's view of real generated code rather than a restatement of it. The retained-era
// side has no `.d.ts` to import (see `../ledger8-fixture-types.ts`).
import type { Contract as Twin018Contract } from '../../../../../testkit-js/testkit-js/src/fixtures/hf/twin-contract/compiled/contract/index.js';
import type { CallResult } from '../../call';
import type { ContractProviders } from '../../contract-providers';
import {
  deployContract,
  type DeployContractOptionsWithPrivateState,
  type DeployedContract
} from '../../deploy-contract';
import {
  findDeployedContract,
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
  type Ledger8ContractProviders,
  type Ledger8DeployContractOptions,
  type Ledger8DeployedContract,
  type Ledger8FinalizedCallTxData,
  type Ledger8FindDeployedContractOptions,
  type Ledger8FoundContract,
  type Ledger8SubmittedCallTx,
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

// Current-era ("0.18") call-site material, typed off the real generated declaration file.
declare const providers018: ContractProviders<Twin018, 'increment'>;
declare const options018: CallTxOptionsWithPrivateStateId<Twin018, 'increment'>;
declare const compiledContract018: CompiledContract.CompiledContract<Twin018, Twin018PrivateState>;
declare const contract018: Twin018;

// An object matching NEITHER era: not a container, not a retained-era instance.
declare const neitherShapeContract: { readonly nonsense: true };

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
    // The tuple shape comes from `Ledger8Circuit` declaring its leading CONTEXT explicitly, NOT
    // from the width of its argument tail. The tail is `never[]` and must stay `never[]`: the
    // circuit collections are function-typed records, so widening it to `unknown[]` breaks
    // contravariance and locks every argument-taking contract out of the retained-era overload
    // entirely (see the argument-taking fixture's own describe block below). `never[]` reads less
    // obviously than `unknown[]`, and is inhabited all the same — `[]` satisfies it.
    expectTypeOf<Ledger8CircuitParameters<Ledger8Contract, Ledger8CircuitId<Ledger8Contract>>>().toEqualTypeOf<never[]>();
    expectTypeOf<AnyLedger8CallTxOptions['args']>().toEqualTypeOf<never[]>();
    expectTypeOf<AnyLedger8CallTxOptions['args']>().not.toBeNever();
  });

  it('rejects a current-era contract instance', () => {
    // The near-miss guard. The reason it is rejected is a CONTRAVARIANT PARAMETER mismatch: the
    // family's circuit takes a `Ledger8CircuitContext<never>`, which is missing the members of the
    // current runtime's much larger `CircuitContext` (`callContext`, `queryContexts`, `gasCosts`,
    // and the rest), so a current-era circuit is not assignable to `Ledger8Circuit`. It is NOT the
    // sync/async split that fires here, even though that split is what the family is designed
    // around — the next assertion anchors on that separately, so a later relaxation of
    // `Ledger8CircuitContext` cannot quietly move this test onto the other reason.
    // @ts-expect-error - a 0.18 contract's circuit context is not the retained era's
    const notRetainedEra: Ledger8Contract = contract018;
    expectTypeOf(notRetainedEra).toMatchTypeOf<Ledger8Contract>();
  });

  it('rejects the async results the current era returns, independently of any context mismatch', () => {
    // The sync/async discriminator on its own, read off the REAL current-era declaration file: a
    // `Promise` has none of the members the retained-era result types declare, in either position.
    expectTypeOf<ReturnType<Twin018['impureCircuits']['increment']>>().not.toMatchTypeOf<Ledger8CircuitResult>();
    expectTypeOf<ReturnType<Twin018['initialState']>>().not.toMatchTypeOf<Ledger8ConstructorResult>();
  });

  it('is rejected BY the current era in turn, so neither shape is a subtype of the other', () => {
    // @ts-expect-error - a 0.16 contract's circuits are synchronous
    const notCurrentEra: Contract.Any = contract016;
    expectTypeOf(notCurrentEra).toMatchTypeOf<Contract.Any>();
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

describe('the two eras options types do not structurally match each other', () => {
  it('does not accept retained-era options where the current-era overload expects its own', () => {
    // @ts-expect-error - a raw 0.16 contract instance is not a 0.18 CompiledContract container
    const notCurrentEraOptions: CallTxOptionsBase<Twin018, 'increment'> = options016;
    expectTypeOf(notCurrentEraOptions).toMatchTypeOf<CallTxOptionsBase<Twin018, 'increment'>>();
  });

  it('does not accept current-era options where the retained-era overload expects its own, and does so ON the contract', () => {
    // @ts-expect-error - a 0.18 CompiledContract container has no impureCircuits of its own
    const notRetainedEraOptions: Ledger8CallTxOptionsBase<Counter016Contract, 'increment'> = options018;
    expectTypeOf(notRetainedEraOptions).toMatchTypeOf<Ledger8CallTxOptionsBase<Counter016Contract, 'increment'>>();

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
  // No overload arm names {@link NeitherContractShape}, deliberately. An arm that is not LAST never
  // renders a diagnostic, and putting one last made every mistyped CURRENT-era call report that the
  // caller's ordinary contract belonged to neither era. The guidance moves to a thrown, typed error
  // in era resolution, which can carry full remediation text where a compiler diagnostic cannot.
  //
  // What remains here are the facts the overloads actually rely on: that a neither-era object is
  // refused by BOTH eras' options types, and that the message the future error will carry is the
  // wording that was reviewed.
  it('carries the migration-guide message verbatim, so a reword cannot pass unnoticed', () => {
    expectTypeOf<NeitherContractShape['__error']>().toEqualTypeOf<'Object is neither a retained-era (compact-runtime 0.16) nor a current-era (compact-runtime 0.18 or later) contract. See migration guide §window.'>();
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
    // arm does, so the directive stays "used" either way. The four assertions above are what
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
  // Every expected type below was DERIVED from the base commit 72b071a2 rather than hand-written:
  // each was stated as a candidate and verified there by a strict type-identity assertion before
  // being written down here. `Parameters` in particular had already regressed once, to
  // `[providers: unknown, options: NeitherEraContractOptions]`, because a trailing arm instantiated
  // `providers` to `unknown` and nothing was watching.
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
    expectTypeOf<Ledger8FinalizedCallTxData<Counter016Contract, 'increment'>['nextPrivateState']>().toEqualTypeOf<Counter016PrivateState>();
  });
});
