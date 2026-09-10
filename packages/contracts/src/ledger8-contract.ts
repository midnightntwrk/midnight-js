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
 * There is no era predicate in this file. The single RUNTIME predicate is
 * `pipelineEraOf` in `./internal/era`; do not add a second one here.
 *
 * @see {@link OverloadTyping} for why the declarations are hand-written and
 *      runtime-pinned, how openness is expressed without `any`, and why the
 *      order of the overload arms is load-bearing.
 * @see {@link EraDispatch} for the runtime predicate and what it may not use.
 */

import type {
  DownConvertedState,
  EncodedStateValue,
  Ledger8DeployableContractState
} from '@midnight-ntwrk/midnight-js-protocol';
import type {
  CommunicationCommitmentData,
  ContractAddress,
  SigningKey,
  ZswapLocalState
} from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type {
  CallResultPrivateBase,
  CallResultPublicBase,
  ContractCallPrivateBase,
  MidnightProviders,
  PrivateStateId,
  SubmittedCallTxBase,
  UnsubmittedTxDataBase,
  VersionedFinalizedTxData
} from '@midnight-ntwrk/midnight-js-types';
import type { Option } from 'effect';

import type { RetainedPipelineEra } from './era';

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
 * Two things here are load-bearing and neither is cosmetic: the leading context is declared
 * EXPLICITLY, and the argument tail is `never[]` rather than `unknown[]`. Do not widen either for
 * readability.
 *
 * @see {@link OverloadTyping} for what each buys and what breaks without it.
 */
export type Ledger8Circuit = (context: Ledger8CircuitContext<never>, ...args: never[]) => Ledger8CircuitResult;

/**
 * A retained-era witness implementation, which returns the next private state
 * paired with the value the circuit reads.
 *
 * `PS` is threaded through the FIRST tuple member so a witness declared over the wrong private
 * state is refused. It sits in a result position, where `PS` is covariant, so every concrete
 * contract still satisfies the era top type.
 */
export type Ledger8Witness<PS = unknown> = (...args: never[]) => readonly [PS, unknown];

/**
 * What a retained-era artifact's own `initialState` returns: a plain object,
 * NOT a `Promise`.
 *
 * A declaration OF THE ARTIFACT, not a framework result. It is the shape
 * {@link Ledger8Contract.initialState} is read through, and it is what makes
 * the era discriminable at the type level -- the current era's `initialState`
 * answers with a `Promise`.
 *
 * Deliberately NOT the retained counterpart of `ContractConstructorResult`,
 * which is a framework result carrying `era` and `next*` members. There is no
 * retained counterpart of that type: the constructor output a retained deploy
 * would publish is spread across `Ledger8DeployedContract`'s `initial*`
 * members, and nothing constructs one today. This type was called
 * `Ledger8ConstructorResult`, which put a false pairing next to
 * `ContractConstructorResult` on the published surface.
 */
export interface Ledger8InitialStateResult<PS = unknown> {
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
  readonly witnesses: Readonly<Record<string, Ledger8Witness<PS>>>;
  readonly circuits: Readonly<Record<string, Ledger8Circuit>>;
  readonly impureCircuits: Readonly<Record<string, Ledger8Circuit>>;
  readonly provableCircuits: Readonly<Record<string, Ledger8Circuit>>;
  initialState(...args: never[]): Ledger8InitialStateResult<PS>;
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
 * A circuit whose parameters are not tuple-shaped falls to `never[]`, NOT to `never`: `never`
 * satisfies `extends []`, so it would make {@link Ledger8CallTxOptionsBase} report that such a
 * circuit takes no arguments at all. `never[]` is uninhabited but not empty, so the caller is
 * asked for an `args` it cannot supply and the mismatch surfaces instead of being swallowed.
 *
 * @see {@link OverloadTyping} for why a caller may not be handed the raw
 *      `Parameters<...>`.
 */
export type Ledger8CircuitParameters<C extends Ledger8Contract, K extends Ledger8CircuitId<C>> =
  Parameters<C['impureCircuits'][K]> extends [Ledger8CircuitContext, ...infer A] ? A : never[];

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
/**
 * What a retained-era circuit's own return value narrows to.
 *
 * Derived through `infer` with a fallback rather than read off
 * {@link Ledger8CircuitResult}, whose `result` is `unknown` because that type is
 * the ERA DISCRIMINATOR and has to stay wide enough to match any retained
 * codegen. A concrete contract type narrows it here; anything that does not
 * falls to `unknown` rather than to `never`, so a caller is handed a value it
 * has to check instead of one it cannot use.
 */
export type Ledger8CircuitReturnType<C extends Ledger8Contract, K extends Ledger8CircuitId<C>> =
  ReturnType<C['impureCircuits'][K]> extends { readonly result: infer R } ? R : unknown;

/**
 * The public, non-sensitive half of a retained-era circuit execution.
 *
 * Carries {@link CallResultPublicBase} plus the post-call state. Against the
 * current era's `CallResultPublic` exactly ONE member is missing: `logEvents`,
 * because the retained toolchain has no log-event concept at any layer, so
 * there is no value to carry rather than a value being dropped. That absence is
 * named in the era key-set parity gate's allow-list, which is what keeps a
 * second absence from joining it unnoticed.
 */
export interface Ledger8CallResultPublic extends CallResultPublicBase {
  /**
   * The state the execution ENDED on, as a LIVE `onchain-runtime-v3` handle
   * rather than as bytes.
   *
   * Valid only while the retained runtime instance that produced it is loaded.
   * It does not survive `structuredClone`, a `postMessage` to a worker, or
   * serialization — anything that walks it sees `__wbg_ptr`, an integer that
   * means nothing outside its module. Serialize it yourself if you need to
   * keep it; see ADR-0011.
   */
  readonly nextContractState: DownConvertedState;
  /**
   * The same state as an {@link EncodedStateValue}: the form that survives this
   * process, a `structuredClone`, a worker transfer and storage.
   *
   * `EncodedStateValue` is pinned identical across `onchain-runtime-v3`,
   * `ledger-v8` and `ledger-v9`, so this is the member era-agnostic code reads
   * and the one to persist. The handle above is for use in the process that
   * produced it.
   */
  readonly nextContractStateEncoded: EncodedStateValue;
}

/**
 * The private, ZK-confidential half of a retained-era circuit execution.
 *
 * Carries {@link CallResultPrivateBase} and {@link UnsubmittedTxDataBase} — so
 * the execution members and the caller's new coins come from the same
 * declarations the current era uses — and adds `txBytes`, which stands in for
 * `unprovenTx`: the retained composer answers with serialized bytes, and
 * deserializing one into a live `UnprovenTransaction` eagerly would pay for an
 * object most callers never read. ADR-0011 records that as a cost decision;
 * build one from these bytes through the same public loader if you want it.
 *
 * @remarks **Privacy-sensitive.** Carries the ZK input and output, the private
 * transcript outputs, the next private state, the post-call Zswap local state
 * and shielded coin material. Treat as confidential when logging, serializing
 * or transmitting.
 */
export interface Ledger8CallResultPrivate<C extends Ledger8Contract, K extends Ledger8CircuitId<C>>
  extends CallResultPrivateBase<Ledger8CircuitReturnType<C, K>, Ledger8PrivateState<C>>,
    UnsubmittedTxDataBase {
  /**
   * The UNPROVEN transaction this call composed, serialized.
   */
  readonly txBytes: Uint8Array;
}

/**
 * The public data of a finalized retained-era call: the execution's public half
 * combined with the finalized record.
 *
 * The record stays {@link VersionedFinalizedTxData} rather than being narrowed
 * to the current era's `FinalizedTxData`. A retained-era call is recorded by
 * whichever era the network head is on, so `version` is a union here where the
 * current era pins `'v9'` -- narrowing it would refuse the very records this
 * pipeline exists to produce.
 */
export type Ledger8FinalizedCallTxPublicData = Ledger8CallResultPublic & VersionedFinalizedTxData;

/**
 * What a retained-era call transaction resolves with once finalized.
 *
 * The SAME two-level structure the current era answers with -- `public` for the
 * non-sensitive half, `private` for the confidential one -- so a caller reads
 * `private.result`, `public.txId` and `public.status` identically in both eras.
 * Both halves are built from the shared bases in `midnight-js-types`, so the
 * members that differ are only the ones each era adds: see
 * {@link Ledger8CallResultPublic} and {@link Ledger8CallResultPrivate} for what
 * they are, what stands in for them, and why.
 */
export interface Ledger8FinalizedCallTxData<C extends Ledger8Contract, K extends Ledger8CircuitId<C>> {
  /**
   * The pipeline that produced this result: always the retained era here, even
   * when the transaction that recorded it is a keep-state transaction tagged
   * `'v9'`. Those are different facts, and only this one says which module
   * produced the objects below.
   */
  readonly era: RetainedPipelineEra;
  readonly circuitId: K;
  readonly public: Ledger8FinalizedCallTxPublicData;
  readonly private: Ledger8CallResultPrivate<C, K>;
  /** See {@link Ledger8UnsubmittedCallTxData.calls}. */
  readonly calls: readonly Ledger8ContractCall[];
}

/**
 * The public half of ONE retained-era contract call.
 *
 * Both state members are LIVE `onchain-runtime-v3` handles, valid only while
 * the retained runtime instance that produced them is loaded. Neither survives
 * `structuredClone`, a worker transfer or serialization; both are published
 * under ADR-0011 for callers that want the object rather than another decode of
 * the same bytes, and both carry an {@link EncodedStateValue} twin for
 * everything else.
 *
 * @typeParam TState - The down-converted state type; the framework's own
 * retained runtime fills it with {@link DownConvertedState}.
 */
export interface Ledger8ContractCallPublic<TState = DownConvertedState> extends CallResultPublicBase {
  /**
   * The state this call ENDED on.
   *
   * The current era's member of this name is filled from `compact-js`'s FINAL
   * query context, so the two eras answer the same question here. For the state
   * the call started from, read {@link Ledger8ContractCallPublic.preContractState}
   * — a different fact, under a different name.
   */
  readonly contractState: TState;
  /**
   * The same post-call state as an {@link EncodedStateValue} — see
   * {@link Ledger8CallResultPublic.nextContractStateEncoded} for which of the
   * two to reach for.
   */
  readonly contractStateEncoded: EncodedStateValue;
  /**
   * The state this call BOUND to: the down-converted handle the pipeline
   * executed against, forwarded rather than re-derived.
   *
   * Retained-era only. The current era publishes no pre-call state on a call
   * entry, so era-agnostic code must not reach for this member.
   */
  readonly preContractState: TState;
  /**
   * The same pre-call state as an {@link EncodedStateValue} — this one IS the
   * snapshot's own primary state, the value the handle was down-converted from,
   * so it is forwarded rather than re-encoded.
   */
  readonly preContractStateEncoded: EncodedStateValue;
}

/**
 * Proof data for ONE retained-era contract call.
 *
 * The retained era's counterpart of `compact-js`'s `ContractCall`: it carries
 * every member that one does, under the same name and meaning, and adds three.
 * `public.contractState` differs only in TYPE — each era's state handle comes
 * from its own runtime. The additions are `public.contractStateEncoded` and the
 * pre-call pair, which the current era has no counterpart for.
 *
 * @typeParam TState - See {@link Ledger8ContractCallPublic}.
 */
export interface Ledger8ContractCall<TState = DownConvertedState> {
  readonly contractAddress: ContractAddress;
  readonly circuitId: string;
  readonly public: Ledger8ContractCallPublic<TState>;
  readonly private: ContractCallPrivateBase;
  /**
   * ALWAYS `Option.none()` on this era: the commitment binds a cross-contract
   * sub-call to its caller, and a pre-fork contract cannot make one. The member
   * is carried rather than omitted so a caller reading a call entry does not
   * have to branch on which era produced it.
   */
  readonly communicationCommitment: Option.Option<CommunicationCommitmentData>;
}

/**
 * The execution data of a retained-era call, before the chain has recorded it.
 *
 * The same two halves {@link Ledger8FinalizedCallTxData} carries, minus the
 * finalized record — which is the one thing a submission that does not wait
 * for finalization cannot answer with.
 */
export interface Ledger8UnsubmittedCallTxData<C extends Ledger8Contract, K extends Ledger8CircuitId<C>> {
  /**
   * The pipeline that produced this result: always the retained era here, even
   * when the transaction that recorded it is a keep-state transaction tagged
   * `'v9'`. Those are different facts, and only this one says which module
   * produced the objects below.
   */
  readonly era: RetainedPipelineEra;
  readonly public: Ledger8CallResultPublic;
  readonly private: Ledger8CallResultPrivate<C, K>;
  /**
   * Proof data for every contract call this circuit made, as the current era's
   * `CallResult.calls` carries. Always exactly ONE entry, the root call: a
   * pre-fork contract cannot make a cross-contract call.
   */
  readonly calls: readonly Ledger8ContractCall[];
}

/**
 * What a retained-era call transaction resolves with when submitted without
 * waiting for finalization.
 *
 * Carries the execution data on `callTxData`, as the current era's
 * {@link SubmittedCallTx} does, and adds the two members this arm can answer
 * straight away.
 */
export interface Ledger8SubmittedCallTx<C extends Ledger8Contract, K extends Ledger8CircuitId<C>>
  extends SubmittedCallTxBase<Ledger8UnsubmittedCallTxData<C, K>> {
  /**
   * The pipeline that produced this result: always the retained era here, even
   * when the transaction that recorded it is a keep-state transaction tagged
   * `'v9'`. Those are different facts, and only this one says which module
   * produced the objects below.
   */
  readonly era: RetainedPipelineEra;
  readonly circuitId: K;
  readonly nextPrivateState: Ledger8PrivateState<C>;
}

/**
 * The arguments a retained-era CONSTRUCTOR takes, with the framework-built
 * context stripped — the constructor counterpart of
 * {@link Ledger8CircuitParameters}, and it follows the same rule: a constructor
 * whose parameters are not tuple-shaped falls to `never[]`, not to `never`, so
 * the caller is asked for an `args` it cannot supply rather than told there is
 * nothing to supply.
 */
export type Ledger8ConstructorParameters<C extends Ledger8Contract> =
  Parameters<C['initialState']> extends [unknown, ...infer A] ? A : never[];

/**
 * Base configuration for deploying a retained-era contract.
 */
export interface Ledger8DeployContractOptionsBase<C extends Ledger8Contract> {
  readonly compiledContract: C;
  readonly signingKey?: SigningKey;
}

/**
 * Configuration for deploying a retained-era contract.
 *
 * `args` is CONDITIONAL, exactly as {@link Ledger8CallTxOptionsBase}'s is: a
 * constructor that takes no arguments of its own has no `args` member at all.
 * A retained constructor CAN take arguments — `Ledger8Contract.initialState`
 * says so, and the pipeline under this arm has always passed them through — so
 * denying them here made a zero-argument constructor the only deployable one.
 *
 * The private-state members and `additionalCoinEncPublicKeyMappings` the
 * current era's deploy options carry stay absent by decision; see
 * {@link KeepStatePipeline}.
 */
export type Ledger8DeployContractOptions<C extends Ledger8Contract> =
  Ledger8ConstructorParameters<C> extends []
    ? Ledger8DeployContractOptionsBase<C>
    : Ledger8DeployContractOptionsBase<C> & {
        /** Arguments to pass to the contract's constructor. */
        readonly args: Ledger8ConstructorParameters<C>;
      };

/**
 * Configuration for attaching to an already-deployed retained-era contract.
 */
export interface Ledger8FindDeployedContractOptions<C extends Ledger8Contract> {
  readonly compiledContract: C;
  readonly contractAddress: ContractAddress;
  /**
   * Where the calls made through {@link Ledger8FoundContract.callTx} read and
   * store this contract's private state.
   *
   * Optional because a retained-era contract may genuinely carry none: naming
   * no id means nothing is read and nothing is written. Naming one the provider
   * holds nothing under is a caller error and is refused, rather than executing
   * against a default state.
   */
  readonly privateStateId?: PrivateStateId;
  /**
   * NOT HONOURED on this arm: a key supplied here is DISCARDED.
   *
   * The current era's `findDeployedContract` stores this key against the
   * contract address in the private-state provider, so a caller that deployed
   * the contract elsewhere can still issue maintenance transactions for it.
   * The retained arm stores nothing, so passing a key here has no effect —
   * which is recorded at the field rather than left for a caller to discover,
   * because a silently discarded key reads as a stored one.
   *
   * The field is retained rather than removed so this arm's options stay the
   * shape the current era's are, and so it can start being honoured without a
   * change to the type: honouring it is client-side storage, which is
   * era-independent, so nothing about the retained ledger prevents it. Store
   * the key yourself, through the private-state provider, if you need it for a
   * retained-era contract in the meantime.
   */
  readonly signingKey?: SigningKey;
}

/**
 * Lifts every circuit a retained-era contract declares to a function that
 * builds and submits a call transaction against one address.
 *
 * ONE signature per circuit, where the current era's `CircuitCallTxInterface`
 * has two: the retained era cannot join a scoped transaction — a scope refuses
 * a retained-era call with `MixedEraScopeError` — so there is no context-taking
 * arm to declare.
 */
export type Ledger8CircuitCallTxInterface<C extends Ledger8Contract> = {
  [K in Ledger8CircuitId<C>]: (
    ...args: Ledger8CircuitParameters<C, K>
  ) => Promise<Ledger8FinalizedCallTxData<C, K>>;
};

/**
 * A retained-era contract found on the blockchain.
 *
 * Carries a {@link Ledger8CircuitCallTxInterface} for the same reason the
 * current era's `FoundContract` carries one: a caller that has just supplied
 * the contract and its address should not have to supply them again to call it.
 *
 * The maintenance interfaces the current era's `FoundContract` also carries are
 * NOT here: the retained era has no governance arm at all, so there is nothing
 * for them to reach.
 */
export interface Ledger8FoundContract<C extends Ledger8Contract> {
  /**
   * The pipeline that produced this result: always the retained era here, even
   * when the transaction that recorded it is a keep-state transaction tagged
   * `'v9'`. Those are different facts, and only this one says which module
   * produced the objects below.
   */
  readonly era: RetainedPipelineEra;
  readonly compiledContract: C;
  readonly contractAddress: ContractAddress;
  readonly deployTxData: VersionedFinalizedTxData;
  readonly callTx: Ledger8CircuitCallTxInterface<C>;
}

/**
 * A retained-era contract deployed by the caller, which additionally holds the
 * signing key registered as the contract's maintenance authority — something
 * only the deployer has.
 *
 * NO VALUE OF THIS TYPE IS PRODUCED TODAY: `deployContract`'s retained-era arm
 * refuses with `Ledger8DeployUnmaintainableError`, so nothing constructs this.
 *
 * Do not read {@link Ledger8DeployedContract.signingKey}'s presence as evidence
 * that the deploy arm works, and do not fill it with a sampled key — on this arm
 * a sampled key is registered nowhere, so it would name an authority the
 * deployment never had.
 *
 * @see {@link KeepStatePipeline} for the measurement behind the refusal and what
 *      lifting it requires.
 */
export interface Ledger8DeployedContract<C extends Ledger8Contract> extends Ledger8FoundContract<C> {
  readonly signingKey: SigningKey;
  /**
   * The state the contract was deployed with, as the LIVE handle the retained
   * constructor built. See ADR-0011 for its lifetime, and prefer
   * {@link Ledger8DeployedContract.initialState} for anything that has to
   * outlive the runtime instance.
   */
  readonly initialContractState: Ledger8DeployableContractState;
  /**
   * The same state, serialized — the bytes the contract address was derived
   * from. A deploy mints a fresh nonce, so these bytes and that address belong
   * to each other and to no other deployment.
   */
  readonly initialState: Uint8Array;
  /**
   * The private state the constructor produced.
   *
   * @remarks **Privacy-sensitive.**
   */
  readonly initialPrivateState: Ledger8PrivateState<C>;
  /**
   * The Zswap local state the constructor ended on, carrying any coin it
   * minted. Empty for a constructor that minted none.
   *
   * @remarks **Privacy-sensitive.** Shielded coin material.
   */
  readonly initialZswapState: ZswapLocalState;
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

/** {@link Ledger8UnsubmittedCallTxData} at the era top type. */
export type AnyLedger8UnsubmittedCallTxData = Ledger8UnsubmittedCallTxData<
  Ledger8Contract,
  Ledger8CircuitId<Ledger8Contract>
>;
/** @see {@link AnyLedger8CallTxOptions} */
export type AnyLedger8DeployContractOptions = Ledger8DeployContractOptions<Ledger8Contract>;
/** @see {@link AnyLedger8CallTxOptions} */
export type AnyLedger8DeployedContract = Ledger8DeployedContract<Ledger8Contract>;
/** @see {@link AnyLedger8CallTxOptions} */
export type AnyLedger8FindDeployedContractOptions = Ledger8FindDeployedContractOptions<Ledger8Contract>;
/** @see {@link AnyLedger8CallTxOptions} */
export type AnyLedger8FoundContract = Ledger8FoundContract<Ledger8Contract>;

/**
 * The message for a contract belonging to neither era. This is the SINGLE place its text is
 * written.
 *
 * Names the two eras by ROLE, never by toolchain version: this text is thrown at users, and a
 * version number in it goes stale on every runtime bump. The retained/current vocabulary is the
 * one the rest of this package uses.
 *
 * DO NOT DELETE AS UNUSED, and do not inline it either. It is consumed by
 * `EraArtifactMismatchError` in `./errors`, which is what `pipelineEraOf` in `./internal/era`
 * raises when it is handed an object belonging to neither era.
 * `src/test/typecheck/overloads.test-d.ts` pins the wording verbatim, and it is not re-exported
 * from the package index.
 *
 * @see {@link OverloadTyping} for why the text is a runtime `const`, and why it is not wired into
 *      an overload arm.
 */
// WHY NO VERSION NUMBERS. Earlier wordings named the toolchains -- "neither a 0.16- nor a
// 0.18-generated contract" -- and that text contradicted itself as soon as the current side moved:
// a consumer on `0.19.0-rc.0`, which this release pins, was told their object matched neither of
// two versions, neither of which was theirs. The message is about which ERA an object belongs to,
// and the eras are named by role everywhere else in this package, so it names them that way here
// too and no future toolchain release invalidates it.
// ONE string literal deliberately, never a `+` concatenation: TypeScript widens `'a' + 'b'` to
// `string`, which would cost {@link NeitherContractShape} its string LITERAL member and break the
// verbatim pin in `src/test/typecheck/overloads.test-d.ts`.
export const NEITHER_ERA_CONTRACT_MESSAGE =
  'Object is neither a retained-era nor a current-era generated contract.';

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
