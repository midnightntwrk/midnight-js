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

/**
 * The wrapped-contract packages `personas.mjs` GENERATES into each persona tree.
 *
 * They do not exist in this repository and cannot: a wrapper is one compactc
 * build plus a manifest pinning the Compact runtime that build demands, written
 * at run time under a short root outside the workspace. `tsc` therefore has
 * nothing to resolve, and without these declarations every `fork-retained-*` /
 * `fork-current-*` import is a `TS2307` that drowns out the findings this
 * typecheck exists for.
 *
 * THE SUBJECT OF THE CHECK IS THE FRAMEWORK, not the codegen. `deployContract`,
 * `submitCallTx` and the records they answer with resolve against the real
 * workspace packages, and their options types are fully checked at every call
 * site here — a wrong option name or an unnarrowed result fails the lane. What
 * these declarations supply is only enough shape for those call sites to select
 * an overload at all.
 *
 * NO TOP-LEVEL `import`/`export` IN THIS FILE. It has to stay a script rather
 * than become a module, or the `declare module` blocks stop being ambient and
 * the wildcard specifiers go back to being unresolvable. Package types are
 * therefore reached through inline `import(...)` types, which do not change
 * that.
 */

/**
 * The constructor a CURRENT-era wrapper exports, over `undefined` private state.
 *
 * TRUE rather than convenient: every contract in the current-era matrix declares
 * no witness, which is why `runMatrixContract` builds each one through
 * `withVacantWitnesses`. `undefined` is how `compact-js` spells that, and it is
 * what selects the no-private-state `deployContract` arm. Left as `any`, `PS`
 * infers as `unknown`, no arm matches, and the leg's whole options object stops
 * being checked — which is how this file was first drafted, and the reason the
 * draft reported two `deployTxData.public` "defects" that were nothing of the
 * kind: the reads are correct, and they only looked wrong because the deploy
 * above them had already fallen off every overload.
 *
 * `initialState` takes the context and NOTHING else, so
 * `Contract.InitializeParameters` is the empty tuple: every matrix contract's
 * constructor is nullary. A contract with constructor arguments cannot join the
 * matrix without widening this, which is the right way round — the widening is a
 * deliberate edit here rather than a silent `any`.
 *
 * Named at top level, not only inside the `declare module` block below, because
 * `compiledContractFor` reaches its contract through a DYNAMIC import: the
 * specifier is a template literal, so the module type is `any` whatever is
 * declared for it, and the call site has to name this type itself.
 */
type ForkCurrentContractCtor = new (
  witnesses: import('@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract').Witnesses<undefined>
) => {
  witnesses: import('@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract').Witnesses<undefined>;
  circuits: import('@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract').Circuits<undefined>;
  provableCircuits: import('@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract').ProvableCircuits<undefined>;
  initialState(
    context: import('@midnight-ntwrk/midnight-js-protocol/compact-runtime').ConstructorContext<undefined>
  ): Promise<import('@midnight-ntwrk/midnight-js-protocol/compact-runtime').ConstructorResult<undefined>>;
};

declare module '@midnight-ntwrk/fork-retained-*' {
  /**
   * The compactc-generated contract class.
   *
   * Instances are `any` ON PURPOSE, and this is the one place the looseness is
   * deliberate rather than conceded. A retained wrapper's `Contract` sits in the
   * `compiledContract` position of `Ledger8DeployContractOptions` and
   * `Ledger8CallTxOptions`, whose `args` member is CONDITIONAL on the contract's
   * own parameter lists. The helpers that use it — `deployRetained`,
   * `callRetained` — are generic over every twin and every circuit, so no single
   * declaration can satisfy that conditional for all of them: pinning a nullary
   * shape makes the twins that take arguments fail, and pinning an argument-taking
   * one makes the nullary twins fail. Either way the failure would be this file
   * disagreeing with itself rather than the harness disagreeing with the
   * framework.
   *
   * What stays checked at those call sites is everything else in the options
   * object, which is where both historical defects lived — verified by mutation:
   * renaming `compiledContract` to `contract` fails the lane.
   */
  export const Contract: new (witnesses: any) => any;

  /**
   * Reads a state handle into the contract's ledger view. Answers the generated
   * `Ledger` type, whose fields are per-contract — a twin's `state.read` in
   * `fork-matrix-entry.mjs` is what names them.
   */
  export function ledger(state: any): any;
}

declare module '@midnight-ntwrk/fork-current-*' {
  /** See {@link ForkCurrentContractCtor} for why this one is narrow where its retained sibling is not. */
  export const Contract: ForkCurrentContractCtor;

  export function ledger(state: any): any;
}
