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
 * The retained-era contract type family: the shape of a contract produced by
 * the PREVIOUS Compact toolchain (`compact-runtime@0.16`), which the current
 * entry points accept through an additive overload alongside the current
 * (`compact-runtime@0.19`) `CompiledContract` container.
 *
 * ## Why these types are hand-written
 *
 * The retained toolchain emits `contract/index.js` with **no `index.d.ts`**
 * beside it, so there is no declaration file to import a type from — unlike the
 * current toolchain, whose output ships one. Every declaration below is
 * therefore written from the real generated JavaScript, and is only as true as
 * that reading.
 *
 * That is why this file is paired with a RUNTIME test
 * (`src/test/ledger8-contract.test.ts`) that loads the real generated artifact
 * and asserts the structural facts these declarations encode. The two halves
 * are one unit: the compile assertions
 * (`src/test/typecheck/overloads.test-d.ts`) prove the overloads discriminate
 * the two eras, and the runtime test proves the type they discriminate on is
 * the shape the real artifact actually has. Without the runtime half the family
 * is an unverified guess and the compile assertions prove nothing about a real
 * contract.
 *
 * ## What separates the two eras
 *
 * Only two things do, at the type level:
 *
 * 1. The current era's contract arrives inside a `CompiledContract` container
 *    carrying a `tag` and a `unique symbol` property that a plain object cannot
 *    forge. A retained-era contract is passed as the raw contract instance, with
 *    no container.
 * 2. **Sync versus async.** Retained-era circuit members return a plain object
 *    and `initialState` returns a plain object; the current era's return
 *    `Promise`s. This is the discriminator the declarations below are built on.
 *
 * `provableCircuits` deliberately does NOT discriminate: the real retained-era
 * artifact sets BOTH `impureCircuits` and `provableCircuits`, so its presence
 * says nothing about which toolchain produced the contract.
 *
 * The RUNTIME counterpart of this type-level discrimination is `pipelineEraOf` in
 * `./internal/era`, which is the single era predicate; there is deliberately no second one here.
 * It does not use the vendor's registered `CompiledContract` brand — that symbol lives on a
 * prototype the container's own combinators drop — see its own documentation for the measurement.
 *
 * ## No `any`
 *
 * The vendor family reaches for `any` to get a "top" contract type that every
 * concrete contract satisfies. That is not available here, so the openness is
 * expressed by variance instead: parameter positions widen to `never`
 * (assignable to anything, so contravariance always holds) and every result
 * position the private state does not flow through widens to `unknown`
 * (everything is assignable to it, so covariance always holds). The result is a
 * genuine top type for the era that still excludes the current era's shape,
 * because a `Promise` has none of the members the retained results declare.
 *
 * There is no exception to that: {@link Ledger8Circuit} and {@link Ledger8Witness} both widen their
 * arguments to `never`. What {@link Ledger8Circuit} does differently is declare its leading context
 * EXPLICITLY instead of folding it into the rest parameter, which is what keeps `Parameters<T>`
 * tuple-shaped so {@link Ledger8CircuitParameters} can destructure it. Widening the tail would
 * break contravariance for every argument-taking circuit; see that type for the full reasoning.
 *
 * ## Overload order is load-bearing, and the LAST arm is left alone
 *
 * Three separate things resolve from an overloaded function's LAST signature, and all three were
 * measured against this code rather than assumed:
 *
 * 1. `ReturnType<typeof f>`;
 * 2. `Parameters<typeof f>`;
 * 3. the error TypeScript prints when NO arm matches a call.
 *
 * So every entry point here declares its retained-era arm FIRST — where it cannot be shadowed by a
 * current-era arm — and leaves the arm that was already last exactly where it was. Nothing is
 * appended. `ReturnType` and `Parameters` therefore report what they reported before this file
 * existed, and a call that matches nothing is still reported against a real current-era arm, which
 * names a real cause: a typo'd circuit id, a private state of the wrong type. That last point is
 * the one worth protecting, because a mistyped CURRENT-era call is the common case and a
 * retained-era call is the rare one.
 *
 * There is deliberately no catch-all arm carrying {@link NEITHER_ERA_CONTRACT_MESSAGE}. Adding one
 * last would have made every mistyped current-era call report that the caller's perfectly ordinary
 * contract "is neither a 0.16- nor a 0.18-generated contract" — a false statement on the common
 * path — and an arm that is NOT last never renders at all, so it would only distort `ReturnType`
 * and `Parameters`. The guidance belongs in a thrown, typed error instead, which can carry full
 * remediation text where a compiler diagnostic cannot.
 *
 * `src/test/typecheck/overloads.test-d.ts` pins all of it: that each retained-era arm is REACHABLE
 * (a retained-era call resolves to the retained-era result type, not merely compiles), and that
 * `ReturnType` AND `Parameters` on all four entry points still report exactly what they reported at
 * the base commit. `src/test/current-era-diagnostic.test.ts` runs the compiler itself and pins the
 * third one: that a mistyped current-era call still names its real cause.
 *
 * @see docs/adr/0006-version-tagged-payloads-at-provider-seams.md for why a
 *      retained-era result is version-tagged rather than single-era.
 * @see docs/adr/0007-cross-the-era-boundary-with-plain-data-only.md for why the
 *      era-internal values below are `unknown` rather than the previous
 *      runtime's own types.
 */

import type { ContractAddress, SigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { MidnightProviders, PrivateStateId, VersionedFinalizedTxData } from '@midnight-ntwrk/midnight-js-types';

/**
 * The context a retained-era circuit receives as its first argument.
 *
 * Read off the real artifact, which rejects its first argument unless it is an
 * object carrying `currentQueryContext`, and reads `currentPrivateState` and
 * `currentZswapLocalState` off it.
 *
 * The two era-internal members are `unknown`: they are live values of the
 * previous runtime, and nothing outside that runtime may inspect them.
 */
export interface Ledger8CircuitContext<PS = unknown> {
  readonly currentQueryContext: unknown;
  readonly currentPrivateState: PS;
  readonly currentZswapLocalState: unknown;
}

/**
 * What a retained-era circuit member returns: a plain object, NOT a `Promise`.
 *
 * The absence of `Promise` here is the load-bearing half of the era
 * discriminator — a current-era circuit's `Promise<CircuitResults<...>>` has
 * none of these four members, so it is not assignable to this type.
 */
export interface Ledger8CircuitResult {
  readonly result: unknown;
  readonly context: unknown;
  readonly proofData: unknown;
  readonly gasCost: unknown;
}

/**
 * A retained-era circuit member.
 *
 * Two decisions here, and BOTH are load-bearing. Read this before touching the signature.
 *
 * 1. The leading context is declared EXPLICITLY rather than folded into the rest parameter. That is
 *    what keeps `Parameters<T>` tuple-shaped, which is what lets
 *    {@link Ledger8CircuitParameters} destructure it as `[Head, ...infer Tail]`. A bare
 *    `(...args: never[])` makes `Parameters<T>` just `never[]`, which matches no such pattern, so
 *    the era top type's `args` collapsed to `never` and `AnyLedger8CallTxOptions` became
 *    uninhabitable.
 * 2. The argument TAIL is `never[]`, not `unknown[]`. The circuit collections are function-typed
 *    `Record`s, so under `strictFunctionTypes` their parameters are checked CONTRAVARIANTLY: an
 *    `unknown[]` tail would require `unknown` to be assignable to the concrete argument type, so a
 *    real circuit such as `(context, coin: ShieldedCoinInfo)` would fail the
 *    {@link Ledger8Contract} constraint outright and its contract could not select the retained-era
 *    overload at all. `never` is assignable to every type, so every real circuit satisfies it.
 *
 * The two are independent: the tuple shape comes from (1), NOT from widening the tail. Do not
 * widen the tail to `unknown[]` for readability — it costs the feature its argument-taking
 * contracts. `src/test/typecheck/overloads.test-d.ts` pins both directions against a real
 * zero-argument fixture and a real argument-taking one.
 *
 * The context is `Ledger8CircuitContext<never>` for the same contravariance reason: `never` is
 * assignable to every private state, so a concrete circuit declared over a real one satisfies this,
 * and the context gives the family a second, independent reason to reject a current-era contract.
 */
export type Ledger8Circuit = (context: Ledger8CircuitContext<never>, ...args: never[]) => Ledger8CircuitResult;

/**
 * A retained-era witness implementation, which returns the next private state
 * paired with the value the circuit reads.
 */
export type Ledger8Witness = (...args: never[]) => readonly [unknown, unknown];

/**
 * What a retained-era `initialState` returns: a plain object, NOT a `Promise`.
 */
export interface Ledger8ConstructorResult<PS = unknown> {
  readonly currentContractState: unknown;
  readonly currentPrivateState: PS;
  readonly currentZswapLocalState: unknown;
}

/**
 * A contract instance produced by the retained (`compact-runtime@0.16`)
 * toolchain, as the real generated artifact declares it: `witnesses`, the three
 * circuit collections, and a synchronous `initialState`.
 *
 * Structurally excludes a current-era contract, whose `initialState` and
 * circuit members return `Promise`s.
 */
export interface Ledger8Contract<PS = unknown> {
  readonly witnesses: Readonly<Record<string, Ledger8Witness>>;
  readonly circuits: Readonly<Record<string, Ledger8Circuit>>;
  readonly impureCircuits: Readonly<Record<string, Ledger8Circuit>>;
  readonly provableCircuits: Readonly<Record<string, Ledger8Circuit>>;
  initialState(...args: never[]): Ledger8ConstructorResult<PS>;
}

/**
 * The private state type a retained-era contract carries.
 */
export type Ledger8PrivateState<C extends Ledger8Contract> =
  C extends Ledger8Contract<infer PS> ? PS : never;

/**
 * The name of a callable circuit on a retained-era contract.
 */
export type Ledger8CircuitId<C extends Ledger8Contract> = keyof C['impureCircuits'] & string;

/**
 * The arguments a caller supplies for circuit `K` on a retained-era contract.
 *
 * The leading {@link Ledger8CircuitContext} is stripped, exactly as the current
 * era's `Contract.CircuitParameters` strips its own leading `CircuitContext`:
 * the context is built by the framework from provider data, never passed in by
 * the caller. Handing the caller the raw `Parameters<...>` would oblige it to
 * construct a live value of the previous runtime, which is precisely what
 * `docs/adr/0007-cross-the-era-boundary-with-plain-data-only.md` rules out.
 */
export type Ledger8CircuitParameters<C extends Ledger8Contract, K extends Ledger8CircuitId<C>> =
  Parameters<C['impureCircuits'][K]> extends [Ledger8CircuitContext, ...infer A] ? A : never;

/**
 * The providers a retained-era call transaction needs.
 *
 * The same provider set the current era uses, keyed by the retained-era circuit
 * id: providers sit at a version-tagged seam and serve both eras, so there is no
 * separate retained-era provider surface
 * (`docs/adr/0006-version-tagged-payloads-at-provider-seams.md`).
 */
export type Ledger8ContractProviders<C extends Ledger8Contract, K extends Ledger8CircuitId<C>> = MidnightProviders<
  K,
  PrivateStateId,
  Ledger8PrivateState<C>
>;

/**
 * The target of a retained-era circuit invocation, without its arguments.
 */
export interface Ledger8CallTxTarget<C extends Ledger8Contract, K extends Ledger8CircuitId<C>> {
  /**
   * The retained-era contract instance, passed raw — there is no
   * `CompiledContract` container for this era.
   */
  readonly compiledContract: C;
  /**
   * The address of the contract being called.
   */
  readonly contractAddress: ContractAddress;
  /**
   * The identifier of the circuit to call.
   */
  readonly circuitId: K;
}

/**
 * Base configuration for a retained-era call transaction.
 *
 * `args` is CONDITIONAL, mirroring the current era's `CallOptionsWithArguments`: a circuit that
 * takes no arguments of its own has no `args` member at all, rather than one the caller has to
 * satisfy with an empty array. The two eras would otherwise disagree about the same
 * zero-argument circuit — one caller writing `args: []` and the other writing nothing — which is a
 * difference in the API surface, not in the contract.
 */
export type Ledger8CallTxOptionsBase<C extends Ledger8Contract, K extends Ledger8CircuitId<C>> =
  Ledger8CircuitParameters<C, K> extends []
    ? Ledger8CallTxTarget<C, K>
    : Ledger8CallTxTarget<C, K> & {
        /**
         * Arguments to pass to the circuit being called.
         */
        readonly args: Ledger8CircuitParameters<C, K>;
      };

/**
 * A retained-era call transaction configuration that also names where to store
 * the private state the call produces.
 */
export type Ledger8CallTxOptionsWithPrivateStateId<C extends Ledger8Contract, K extends Ledger8CircuitId<C>> =
  Ledger8CallTxOptionsBase<C, K> & {
    /**
     * The identifier for the private state of the contract.
     */
    readonly privateStateId: PrivateStateId;
  };

/**
 * Retained-era call transaction configuration.
 */
export type Ledger8CallTxOptions<C extends Ledger8Contract, K extends Ledger8CircuitId<C>> =
  | Ledger8CallTxOptionsBase<C, K>
  | Ledger8CallTxOptionsWithPrivateStateId<C, K>;

/**
 * The finalized data a retained-era call transaction resolves with.
 *
 * `txData` is version-tagged rather than single-era: the same retained-era
 * contract is called as a v8 transaction before the fork and as a v9
 * keep-state transaction after it, so the record it finalizes as carries the
 * era that produced it
 * (`docs/adr/0006-version-tagged-payloads-at-provider-seams.md`).
 */
export interface Ledger8FinalizedCallTxData<C extends Ledger8Contract, K extends Ledger8CircuitId<C>> {
  readonly circuitId: K;
  readonly nextPrivateState: Ledger8PrivateState<C>;
  readonly txData: VersionedFinalizedTxData;
}

/**
 * What a retained-era call transaction resolves with when submitted without
 * waiting for finalization.
 */
export interface Ledger8SubmittedCallTx<C extends Ledger8Contract, K extends Ledger8CircuitId<C>> {
  readonly txId: string;
  readonly circuitId: K;
  readonly nextPrivateState: Ledger8PrivateState<C>;
}

/**
 * Configuration for deploying a retained-era contract.
 */
export interface Ledger8DeployContractOptions<C extends Ledger8Contract> {
  readonly compiledContract: C;
  readonly signingKey?: SigningKey;
}

/**
 * Configuration for attaching to an already-deployed retained-era contract.
 */
export interface Ledger8FindDeployedContractOptions<C extends Ledger8Contract> {
  readonly compiledContract: C;
  readonly contractAddress: ContractAddress;
  readonly signingKey?: SigningKey;
}

/**
 * A retained-era contract found on the blockchain.
 */
export interface Ledger8FoundContract<C extends Ledger8Contract> {
  readonly compiledContract: C;
  readonly contractAddress: ContractAddress;
  readonly deployTxData: VersionedFinalizedTxData;
}

/**
 * A retained-era contract deployed by the caller, which additionally holds the
 * signing key registered as the contract's maintenance authority — something
 * only the deployer has.
 */
export interface Ledger8DeployedContract<C extends Ledger8Contract> extends Ledger8FoundContract<C> {
  readonly signingKey: SigningKey;
}

/**
 * The widest instantiation of each retained-era type, which the era-dispatching implementation
 * signatures widen to.
 *
 * An implementation signature has to be compatible with every overload declared over it, so each
 * entry point's implementation carries the retained-era arm's parameter and result types alongside
 * the current era's. It is never the signature a caller sees — the overloads above it are — so it
 * names the era top type rather than re-deriving a caller's concrete one.
 */
export type AnyLedger8CallTxOptions = Ledger8CallTxOptions<Ledger8Contract, Ledger8CircuitId<Ledger8Contract>>;
/** @see {@link AnyLedger8CallTxOptions} */
export type AnyLedger8FinalizedCallTxData = Ledger8FinalizedCallTxData<Ledger8Contract, Ledger8CircuitId<Ledger8Contract>>;
/** @see {@link AnyLedger8CallTxOptions} */
export type AnyLedger8SubmittedCallTx = Ledger8SubmittedCallTx<Ledger8Contract, Ledger8CircuitId<Ledger8Contract>>;
/** @see {@link AnyLedger8CallTxOptions} */
export type AnyLedger8DeployContractOptions = Ledger8DeployContractOptions<Ledger8Contract>;
/** @see {@link AnyLedger8CallTxOptions} */
export type AnyLedger8DeployedContract = Ledger8DeployedContract<Ledger8Contract>;
/** @see {@link AnyLedger8CallTxOptions} */
export type AnyLedger8FindDeployedContractOptions = Ledger8FindDeployedContractOptions<Ledger8Contract>;
/** @see {@link AnyLedger8CallTxOptions} */
export type AnyLedger8FoundContract = Ledger8FoundContract<Ledger8Contract>;

/**
 * The migration-guide message for a contract belonging to neither era. This is the SINGLE place its
 * text is written.
 *
 * DO NOT DELETE AS UNUSED, and do not inline it either. It is consumed by
 * `EraArtifactMismatchError` in `./errors`, which is what `pipelineEraOf` in `./internal/era`
 * raises when it is handed an object belonging to neither era. A thrown error can carry full
 * remediation text; a compiler diagnostic cannot, which is why this is not wired into an overload
 * arm (see the module documentation above).
 *
 * A runtime `const` rather than a bare literal inside {@link NeitherContractShape} so that the text
 * is written ONCE and can be read by a runtime consumer — the error above, and any test asserting
 * on one — while `typeof` still gives the type a string LITERAL member.
 * `src/test/typecheck/overloads.test-d.ts` pins the wording verbatim.
 *
 * Not re-exported from the package index: the error that carries it is the consumer surface, and
 * that error is not exported yet either — the entry points still refuse a retained-era request
 * before any pipeline runs, so nothing a consumer can reach throws it.
 */
export const NEITHER_ERA_CONTRACT_MESSAGE =
  'Object is neither a 0.16- nor a 0.18-generated contract. See migration guide §window.';

/**
 * The type the catch-all arm of every era-dispatching entry point expects, so that an object
 * matching NEITHER era's shape is refused against a name whose own definition says what went
 * wrong.
 *
 * The `__error` member exists only to carry {@link NEITHER_ERA_CONTRACT_MESSAGE}; nothing
 * constructs a value of this type. Retained here alongside the message for the same reason the
 * message is retained: `pipelineEraOf` in `./internal/era` refuses a neither-era object by
 * throwing, and this is the shape that names what it refused.
 * `src/test/typecheck/overloads.test-d.ts` pins the wording.
 */
export type NeitherContractShape = { readonly __error: typeof NEITHER_ERA_CONTRACT_MESSAGE }

/**
 * An options object whose contract belongs to neither era, kept as the named counterpart to
 * {@link NeitherContractShape}.
 *
 * No overload arm takes this type: an arm that is not last never renders a diagnostic, and putting
 * one last made every mistyped CURRENT-era call claim the caller's contract belonged to neither era
 * (see the module documentation above). It is retained as the shape era resolution reports against
 * when it throws, and `src/test/typecheck/overloads.test-d.ts` pins that a neither-era object
 * really is refused by it — which is the assignability fact the overloads rely on, whether or not
 * any arm spells it out.
 */
export interface NeitherEraContractOptions {
  readonly compiledContract: NeitherContractShape;
}

/**
 * The message every retained-era overload body throws with at this stage.
 *
 * The overloads accept and type-check the retained-era shape, but no execution
 * path exists behind them yet. A bare `Error` on purpose: a registered error
 * code is a published consumer surface, and this condition is removed as soon
 * as the pipeline lands.
 */
export const LEDGER8_PIPELINE_NOT_WIRED =
  'The retained-era contract pipeline is not wired yet; this overload accepts the shape but cannot execute it.';
