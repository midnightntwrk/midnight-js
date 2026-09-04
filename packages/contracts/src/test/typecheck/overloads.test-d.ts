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
import { deployContract, type DeployedContract } from '../../deploy-contract';
import { findDeployedContract, type FoundContract } from '../../find-deployed-contract';
import type {
  Ledger8CallTxOptionsBase,
  Ledger8CallTxOptionsWithPrivateStateId,
  Ledger8CircuitParameters,
  Ledger8Contract,
  Ledger8ContractProviders,
  Ledger8DeployContractOptions,
  Ledger8DeployedContract,
  Ledger8FinalizedCallTxData,
  Ledger8FindDeployedContractOptions,
  Ledger8FoundContract,
  Ledger8SubmittedCallTx,
  NeitherContractShape,
  NeitherEraContractOptions
} from '../../ledger8-contract';
import { submitCallTx, submitCallTxAsync } from '../../submit-call-tx';
import type { FinalizedCallTxData, SubmittedCallTx } from '../../tx-model';
import type { CallTxOptionsBase, CallTxOptionsWithPrivateStateId } from '../../unproven-call-tx';
import type { Counter016Contract, Counter016PrivateState } from '../ledger8-fixture-types';

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

// Current-era ("0.18") call-site material, typed off the real generated declaration file.
declare const providers018: ContractProviders<Twin018, 'increment'>;
declare const options018: CallTxOptionsWithPrivateStateId<Twin018, 'increment'>;
declare const compiledContract018: CompiledContract.CompiledContract<Twin018, Twin018PrivateState>;
declare const contract018: Twin018;

// An object matching NEITHER era: not a container, not a retained-era instance.
declare const neitherShapeContract: { readonly nonsense: true };

describe('the retained-era contract type family pins the real 0.16 artifact shape', () => {
  it('accepts the fixture contract as a retained-era contract', () => {
    expectTypeOf<Counter016Contract>().toMatchTypeOf<Ledger8Contract>();
  });

  it('reports the circuit arguments a CALLER supplies, with the framework-built context stripped', () => {
    // The fixture's `increment` takes only the context, so the caller supplies nothing. If this
    // ever reported the context itself, callers would be obliged to construct a live value of the
    // previous runtime.
    expectTypeOf<Ledger8CircuitParameters<Counter016Contract, 'increment'>>().toEqualTypeOf<[]>();
  });

  it('rejects a current-era contract instance, whose members are async', () => {
    // The near-miss guard. Current-era codegen is fully async: `initialState` returns a
    // `Promise<ConstructorResult>` and every circuit a `Promise<CircuitResults>`, and a `Promise`
    // has none of the members the retained-era result types declare.
    // @ts-expect-error - a 0.18 contract's initialState and circuits return Promises
    const notRetainedEra: Ledger8Contract = contract018;
    expectTypeOf(notRetainedEra).toMatchTypeOf<Ledger8Contract>();
  });

  it('is rejected BY the current era in turn, so neither shape is a subtype of the other', () => {
    // @ts-expect-error - a 0.16 contract's circuits are synchronous
    const notCurrentEra: Contract.Any = contract016;
    expectTypeOf(notCurrentEra).toMatchTypeOf<Contract.Any>();
  });
});

describe('the two eras options types do not structurally match each other', () => {
  it('does not accept retained-era options where the current-era overload expects its own', () => {
    // @ts-expect-error - a raw 0.16 contract instance is not a 0.18 CompiledContract container
    const notCurrentEraOptions: CallTxOptionsBase<Twin018, 'increment'> = options016;
    expectTypeOf(notCurrentEraOptions).toMatchTypeOf<CallTxOptionsBase<Twin018, 'increment'>>();
  });

  it('does not accept current-era options where the retained-era overload expects its own', () => {
    // @ts-expect-error - a 0.18 CompiledContract container has no impureCircuits of its own
    const notRetainedEraOptions: Ledger8CallTxOptionsBase<Counter016Contract, 'increment'> = options018;
    expectTypeOf(notRetainedEraOptions).toMatchTypeOf<Ledger8CallTxOptionsBase<Counter016Contract, 'increment'>>();
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

describe('an object belonging to neither era is refused against a named error type', () => {
  // The catch-all arm is the LAST overload of each entry point, which is the only position from
  // which TypeScript renders it when nothing matches. What it renders is a name for the named half
  // of `NeitherEraContractOptions['compiledContract']` and an expansion for the anonymous half, so
  // the diagnostic carries the type's name AND the message it exists to deliver:
  //
  //   Type '{ readonly nonsense: true; }' is not assignable to type 'NeitherContractShape & {
  //     readonly __error: "Object is neither a 0.16- nor a 0.18-generated contract. See migration
  //     guide §window."; }'.
  //
  // The diagnostic TEXT itself is not reachable from here — vitest's typecheck pass exposes
  // `@ts-expect-error` and `expectTypeOf`, not compiler output — so the two assertions below pin
  // what is reachable: the message literal exactly, and that the intersection's two halves are the
  // same type (so the anonymous half can never drift from the named one it restates).
  it('carries the migration-guide message verbatim, so a reword cannot pass unnoticed', () => {
    expectTypeOf<NeitherContractShape['__error']>().toEqualTypeOf<'Object is neither a 0.16- nor a 0.18-generated contract. See migration guide §window.'>();
  });

  it('restates NeitherContractShape without drifting from it, so both halves of the diagnostic agree', () => {
    expectTypeOf<NeitherEraContractOptions['compiledContract']>().toEqualTypeOf<NeitherContractShape>();
  });

  it('does not accept a neither-era object where the catch-all arm expects its error type', () => {
    // @ts-expect-error - neither a 0.16- nor a 0.18-generated contract
    const neither: NeitherEraContractOptions = { compiledContract: neitherShapeContract };
    expectTypeOf(neither).toMatchTypeOf<NeitherEraContractOptions>();
  });

  // A GUARD, not a driver, and worth saying so: this call fails against the current-era arms with
  // or without the catch-all arm present, so the directive stays "used" either way. The two
  // assertions above are what actually discriminate.
  it('refuses a neither-era call outright', () => {
    // @ts-expect-error - neither a 0.16- nor a 0.18-generated contract
    submitCallTx(providers016, { compiledContract: neitherShapeContract, contractAddress, circuitId: 'increment', args: [] });
  });
});

describe('adding era arms leaves the pre-existing entry points overload resolution untouched', () => {
  // THE LOAD-BEARING GUARD ON THE WHOLE ARRANGEMENT — not belt-and-braces. Read this before
  // touching an overload list in `../../submit-call-tx.ts`, `../../deploy-contract.ts` or
  // `../../find-deployed-contract.ts`.
  //
  // `ReturnType<typeof f>` on an overloaded function resolves from its LAST overload, so whatever
  // sits last defines `ReturnType` for every existing consumer — and `../submit-call-tx.test.ts`
  // already reads `Awaited<ReturnType<typeof submitCallTx>>`. What sits last in each entry point is
  // the catch-all arm, which is unreachable and whose declared return type therefore deliberately
  // RESTATES the arm above it instead of being the honest `never`.
  //
  // Nothing but these four assertions holds that in place. They fail if a catch-all's restatement
  // drifts from the arm above it, if a catch-all is "corrected" to `Promise<never>`, or if a
  // retained-era arm is moved to the end. Each of those three regressions was reproduced against
  // them before this file was committed.
  //
  // The values below are the ones these four entry points reported BEFORE any era arm existed,
  // measured rather than derived.
  it('leaves ReturnType<typeof submitCallTx> reporting the current-era CallResult', () => {
    expectTypeOf<ReturnType<typeof submitCallTx>>().toEqualTypeOf<Promise<CallResult<Contract<undefined>, string>>>();
  });

  it('leaves ReturnType<typeof submitCallTxAsync> reporting the current-era SubmittedCallTx', () => {
    expectTypeOf<ReturnType<typeof submitCallTxAsync>>().toEqualTypeOf<Promise<SubmittedCallTx<Contract.Any, string>>>();
  });

  it('leaves ReturnType<typeof deployContract> reporting the current-era DeployedContract', () => {
    expectTypeOf<ReturnType<typeof deployContract>>().toEqualTypeOf<Promise<DeployedContract<Contract.Any>>>();
  });

  it('leaves ReturnType<typeof findDeployedContract> reporting the current-era FoundContract', () => {
    expectTypeOf<ReturnType<typeof findDeployedContract>>().toEqualTypeOf<Promise<FoundContract<Contract.Any>>>();
  });
});

describe('the retained-era private state flows through the family', () => {
  it('reports the fixture private state on the retained-era result', () => {
    expectTypeOf<Ledger8FinalizedCallTxData<Counter016Contract, 'increment'>['nextPrivateState']>().toEqualTypeOf<Counter016PrivateState>();
  });
});
