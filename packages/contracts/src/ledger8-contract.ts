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
 * Every declaration here is hand-written from the real generated JavaScript,
 * because the retained toolchain emits no `index.d.ts` beside it. Two things
 * separate the eras at the type level: the current era's `CompiledContract`
 * container, and the fact that retained-era circuits and `initialState` return
 * plain objects where the current era returns `Promise`s.
 *
 * @see {@link OverloadTyping} for why the declarations are hand-written and
 *      runtime-pinned, how openness is expressed without `any`, and why the
 *      order of the overload arms is load-bearing.
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
 * Two things in this signature are load-bearing, and neither is cosmetic: the leading context is
 * declared EXPLICITLY so `Parameters<T>` stays tuple-shaped for
 * {@link Ledger8CircuitParameters}, and the argument tail is `never[]` rather than `unknown[]` so
 * that argument-taking circuits still satisfy the {@link Ledger8Contract} constraint under
 * `strictFunctionTypes`. Do not widen the tail for readability.
 *
 * @see {@link OverloadTyping} for what each widening buys and what breaks without it.
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
 * the caller.
 *
 * @see {@link OverloadTyping} for why a caller may not be handed the raw
 *      `Parameters<...>`.
 */
export type Ledger8CircuitParameters<C extends Ledger8Contract, K extends Ledger8CircuitId<C>> =
  Parameters<C['impureCircuits'][K]> extends [Ledger8CircuitContext, ...infer A] ? A : never;

/**
 * The providers a retained-era call transaction needs.
 *
 * The same provider set the current era uses, keyed by the retained-era circuit
 * id.
 *
 * @see {@link OverloadTyping} for why there is no separate retained-era provider
 *      surface.
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
 * satisfy with an empty array, so the two eras do not disagree about the same zero-argument
 * circuit.
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
 * contract is called as a v8 transaction before the fork and as a v9 keep-state
 * transaction after it, so the record it finalizes as carries the era that
 * produced it.
 *
 * @see {@link OverloadTyping} for the seam that rule follows from.
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
 * the current era's. It is never the signature a caller sees — the overloads above it are.
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
 * ship: it tests for the member the retained-era artifact installs and the current era's container
 * does not, which is enough to fork a body whose retained-era branch only throws.
 *
 * Name the type parameter explicitly at each call site rather than letting it infer, so the
 * narrowing removes exactly the retained-era arm of that entry point's parameter union.
 *
 * @param options The entry point's argument, before its era is known.
 * @returns `true` when the contract is a retained-era instance.
 * @see {@link OverloadTyping} for this check's known blind spot, and for the branded predicate
 *      that replaces it.
 */
export const isLedger8Options = <L extends { readonly compiledContract: Ledger8Contract }>(
  options: { readonly compiledContract: unknown } | L
): options is L =>
  typeof options.compiledContract === 'object' &&
  options.compiledContract !== null &&
  'impureCircuits' in options.compiledContract;

/**
 * The migration-guide message the compiler renders for a contract belonging to neither era. This is
 * the SINGLE place its text is written.
 *
 * DO NOT DELETE AS UNUSED. Nothing consumes this text yet, and that is expected: its destination
 * is the typed, thrown error that era resolution raises when it is handed an object belonging to
 * neither era. `src/test/typecheck/overloads.test-d.ts` pins the wording verbatim, and it is not
 * re-exported from the package index.
 *
 * @see {@link OverloadTyping} for why the text is retained ahead of its consumer, and why it is
 *      not wired into an overload arm.
 */
export const NEITHER_ERA_CONTRACT_MESSAGE =
  'Object is neither a 0.16- nor a 0.18-generated contract. See migration guide §window.';

/**
 * The type the catch-all arm of every era-dispatching entry point expects, so that an object
 * matching NEITHER era's shape is refused against a name whose own definition says what went
 * wrong.
 *
 * The `__error` member exists only to carry {@link NEITHER_ERA_CONTRACT_MESSAGE}; nothing
 * constructs a value of this type.
 *
 * @see {@link OverloadTyping} for why it is retained ahead of its consumer.
 */
export type NeitherContractShape = { readonly __error: typeof NEITHER_ERA_CONTRACT_MESSAGE }

/**
 * An options object whose contract belongs to neither era, kept as the named counterpart to
 * {@link NeitherContractShape}.
 *
 * No overload arm takes this type. `src/test/typecheck/overloads.test-d.ts` pins that a
 * neither-era object really is refused by it — the assignability fact the overloads rely on,
 * whether or not any arm spells it out.
 *
 * @see {@link OverloadTyping} for why no arm spells it out.
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
