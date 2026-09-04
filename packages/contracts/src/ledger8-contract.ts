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
 * ## No `any`
 *
 * The vendor family reaches for `any` to get a "top" contract type that every
 * concrete contract satisfies. That is not available here, so the openness is
 * expressed by variance instead: every parameter position widens to `never`
 * (assignable to anything, so contravariance always holds) and every result
 * position the private state does not flow through widens to `unknown`
 * (everything is assignable to it, so covariance always holds). The result is a
 * genuine top type for the era that still excludes the current era's shape,
 * because a `Promise` has none of the members the retained results declare.
 *
 * ## Overload order, and why the catch-all arm's return type lies
 *
 * Two facts about TypeScript pull in opposite directions here, and every entry point's arm order
 * is the resolution of that tension. Both were measured against this code, not assumed:
 *
 * 1. When NO overload matches a call, the compiler details only the **LAST** overload. So the arm
 *    that renders the diagnostic a developer actually reads is whichever one sits last.
 * 2. `ReturnType<typeof f>` on an overloaded function ALSO resolves from the last overload. So an
 *    arm appended at the end silently retypes `ReturnType` for every existing consumer — and this
 *    package already reads `Awaited<ReturnType<typeof submitCallTx>>`.
 *
 * The order that satisfies both: the **retained-era arm goes FIRST** (before the current-era arms
 * that were already there, so it cannot be shadowed by one of them), and the **catch-all arm goes
 * LAST** (so an object belonging to neither era is reported against
 * {@link NeitherContractShape}). Fact 2 is then paid for by declaring the catch-all arm's return
 * type as a RESTATEMENT of the arm above it instead of the honest `never`. The arm is unreachable
 * — nothing can satisfy {@link NeitherContractShape} — so that declared type is never observed by a
 * real call, and each arm carries a comment saying so, because a reader who "tidies" it to `never`
 * would silently move the public surface.
 *
 * `src/test/typecheck/overloads.test-d.ts` is the guard on all of it, and under this arrangement
 * its `ReturnType` assertions are load-bearing rather than belt-and-braces. It pins:
 *
 * - that each retained-era arm is REACHABLE (a retained-era call resolves to the retained-era
 *   result type, not merely compiles), which fails if a current-era arm shadows it;
 * - that `ReturnType` on all four entry points still reports exactly what it reported before any
 *   era arm existed, which fails the moment a catch-all restatement drifts from the arm above it,
 *   or a catch-all is "corrected" to `never`;
 * - the migration-guide message verbatim.
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
 * The parameter list is `never[]` rather than `unknown[]`: parameters are
 * checked contravariantly, and `never` is assignable to every type, so a
 * concrete circuit with real argument types satisfies this while `unknown[]`
 * would reject it.
 */
export type Ledger8Circuit = (...args: never[]) => Ledger8CircuitResult;

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
 * Base configuration for a retained-era call transaction.
 */
export interface Ledger8CallTxOptionsBase<C extends Ledger8Contract, K extends Ledger8CircuitId<C>> {
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
  /**
   * Arguments to pass to the circuit being called.
   */
  readonly args: Ledger8CircuitParameters<C, K>;
}

/**
 * A retained-era call transaction configuration that also names where to store
 * the private state the call produces.
 */
export interface Ledger8CallTxOptionsWithPrivateStateId<C extends Ledger8Contract, K extends Ledger8CircuitId<C>>
  extends Ledger8CallTxOptionsBase<C, K> {
  /**
   * The identifier for the private state of the contract.
   */
  readonly privateStateId: PrivateStateId;
}

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
 * Tells the two eras apart at runtime, so each entry point's implementation can refuse a
 * retained-era request before touching the current-era pipeline.
 *
 * A PROVISIONAL structural check, and deliberately not the era predicate this framework will
 * ship: it tests for the member the retained-era artifact installs and the current era's
 * container does not, which is enough to fork a body whose retained-era branch only throws. The
 * shipped predicate tests the container's registered brand instead, which is what a
 * duplicate-install-safe answer needs; it arrives with the pipeline that needs it.
 *
 * The type parameter is named explicitly at each call site rather than inferred, so the narrowing
 * removes exactly the retained-era arm of that entry point's parameter union and leaves the
 * current-era arm the rest of the body is written against.
 */
export const isLedger8Options = <L extends { readonly compiledContract: Ledger8Contract }>(
  options: { readonly compiledContract: unknown } | L
): options is L =>
  typeof options.compiledContract === 'object' &&
  options.compiledContract !== null &&
  'impureCircuits' in options.compiledContract;

/**
 * The type the catch-all arm of every era-dispatching entry point expects, so that an object
 * matching NEITHER era's shape is refused against a name whose own definition says what went
 * wrong.
 *
 * The `__error` member exists only to carry that message into the compiler's diagnostic; nothing
 * constructs a value of this type. This declaration is the SINGLE source of the message text —
 * {@link NeitherEraContractOptions} reaches it by indexed access — and
 * `src/test/typecheck/overloads.test-d.ts` pins it verbatim.
 */
export type NeitherContractShape = { readonly __error: 'Object is neither a 0.16- nor a 0.18-generated contract. See migration guide §window.' }

/**
 * The catch-all arm's options type: an object whose contract belongs to neither era.
 *
 * `compiledContract` is {@link NeitherContractShape} INTERSECTED with a structurally identical
 * anonymous restatement of it, and both halves are load-bearing. TypeScript renders a named type
 * by NAME and an anonymous object type by EXPANSION, and a developer who hits this error wants
 * both: the name to look the type up, and the expansion to read the migration-guide pointer
 * without having to. Written this way, the diagnostic carries both — verified against the real
 * fixtures, and recorded in the module documentation above:
 *
 * ```text
 * Type '{ readonly nonsense: true; }' is not assignable to type 'NeitherContractShape & {
 *   readonly __error: "Object is neither a 0.16- nor a 0.18-generated contract. See migration
 *   guide §window."; }'.
 * ```
 *
 * Do NOT simplify the intersection away. Dropping the anonymous half leaves the name with no
 * message; dropping the named half leaves the message with no name. The text itself is written
 * ONCE, at {@link NeitherContractShape}, and reached here by indexed access, so the two halves
 * cannot drift — and `src/test/typecheck/overloads.test-d.ts` asserts they are the same type.
 */
export interface NeitherEraContractOptions {
  readonly compiledContract: NeitherContractShape & { readonly __error: NeitherContractShape['__error'] };
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
