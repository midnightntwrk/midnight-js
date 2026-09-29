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
 * Retained-era (ledger 8) execution, on compact-js's own era-pinned entries.
 *
 * This module replaced a hand-maintained execution layer — `execute.ts`, which
 * drove `compact-runtime@0.16` directly, and `down-convert.ts`, which built the
 * state it ran against. Both are gone; see
 * `docs/adr/0015-retained-era-execution-on-compact-js.md` for why.
 *
 * Everything crossing this module's surface is PLAIN DATA or an era-tagged
 * handle the caller already holds. No `Effect` value leaves it: the effects
 * compact-js returns are discharged here with `Effect.runPromise`, which is
 * also why every entry point is asynchronous — `ContractExecutable` builds its
 * work on `Effect.tryPromise`, so `runSync` cannot discharge it.
 *
 * @see {@link RetainedEraExecution}
 */

import * as Contract from '@midnight-ntwrk/compact-js/effect/Contract';
import {
  CompiledContract,
  ContractExecutable,
  ZKConfiguration,
  ZKConfigurationReadError
} from '@midnight-ntwrk/compact-js/v8/effect';
import * as CoinPublicKey from '@midnight-ntwrk/platform-js/effect/CoinPublicKey';
import * as Configuration from '@midnight-ntwrk/platform-js/effect/Configuration';
import * as PlatformContractAddress from '@midnight-ntwrk/platform-js/effect/ContractAddress';
import * as SigningKey from '@midnight-ntwrk/platform-js/effect/SigningKey';
import * as glue from 'compact-runtime-ledger8';
import { Cause, Clock, Effect, Exit, Layer, Option, type Types } from 'effect';

import { ComposeOptionError, DownConvertFailedError } from '../../errors';
import type { EncodedStateValue } from '../era/envelope';
import type { PartitionContext } from '../shared/compose-types';
import { type ContractStatePojo, describeValue, isContractBalance } from '../shared/contract-state';

/**
 * The shape the retained runtime reads a signing key in: 32 bytes written in
 * hex, either case.
 *
 * MEASURED against the pinned runtime rather than guessed. `sampleSigningKey()`
 * answers 64 lowercase hex characters; an uppercase key of the same length is
 * accepted, a shorter or longer one fails with `failed to fill whole buffer`
 * and a non-hex one with `Invalid character 'z' at position 0`. The value being
 * a valid Schnorr scalar is a cryptographic property this cannot check, and the
 * runtime's own `Malformed Schnorr signing key` already names it.
 */
const LEDGER8_SIGNING_KEY_PATTERN = /^[0-9a-fA-F]{64}$/;

/**
 * The signature kind this era's maintenance authority accepts.
 *
 * MEASURED, not chosen: the era reports `supportsCmaSignatureKind` as
 * `schnorr=true, ecdsa=false`, and `Ledger.fromPlatformSigningKey` answers
 * `Left(ContractConfigurationError)` for an ecdsa key. Naming it here keeps the
 * bare hex string this era's callers hold assignable to platform-js's tagged
 * `SigningKey`, which is what `Configuration.Keys` serves.
 */
const LEDGER8_SIGNATURE_KIND = 'schnorr' as const;

/** A retained-era signing key: 32 bytes of hex. @see {@link LEDGER8_SIGNING_KEY_PATTERN} */
export type Ledger8SigningKey = string;

/**
 * A retained-era contract, as the caller holds it: the CONSTRUCTED artifact the
 * previous toolchain generates.
 *
 * Deliberately not compact-js's `CompiledContract` container. That container is
 * a recipe — a class plus witnesses, instantiated fresh per operation — and the
 * retained era's callers hold an instance whose witnesses are already bound.
 * {@link containerFor} adapts one to the other at this seam, which keeps the
 * adaptation in one place instead of on every consumer.
 */
export interface RetainedContract {
  /** The map compact-js indexes to find the circuit to run. */
  readonly provableCircuits: Readonly<Record<string, unknown>>;
  /** The constructor a deployment runs. */
  initialState(...args: never[]): unknown;
}

/**
 * The tag compact-js reports a retained contract under.
 *
 * It reaches nothing but error messages: the container's tag is chosen by
 * whoever builds it, and this era's callers pass an instance that carries no
 * name of its own.
 */
const RETAINED_CONTRACT_TAG = 'retained-era-contract';

/**
 * Wraps a constructed retained contract in the container compact-js executes.
 *
 * `ContractExecutable` resolves the contract through `new ctor(witnesses)`, so
 * it needs a constructor. The caller has an instance, and its witnesses are
 * already bound to it — so the constructor hands that same instance back and
 * the witnesses arrive with it. Returning an object from a constructor is
 * ordinary JavaScript; the assertion is needed only because TypeScript types a
 * class expression by its declaration rather than by what it returns.
 *
 * Reusing one instance across calls is what this era already did before
 * compact-js served it, so this is the existing lifetime, not a new one.
 *
 * The compiled-assets path is a placeholder: it is read only by compact-js's
 * own `ZKConfiguration` reader, and {@link zkConfigurationLayer} replaces that
 * service outright, so nothing ever resolves it.
 */
const containerFor = <PS>(contract: RetainedContract): CompiledContract.CompiledContract<
  Contract.Contract<PS>,
  PS,
  never
> =>
  CompiledContract.make<Contract.Contract<PS>, PS>(
    RETAINED_CONTRACT_TAG,
    // The single assertion this seam needs, and it is here rather than at any
    // caller. A retained artifact satisfies compact-js's `Contract` structurally
    // -- same four circuit maps, and a synchronous `initialState` satisfies its
    // `Awaitable` return -- but the two declare their members over different
    // private-state parameters, so TypeScript will not see it. Narrowing what
    // this module ASKS for (see `RetainedContract`) is what keeps the assertion
    // to one line instead of pushing a cast onto every consumer.
    class {
      constructor() {
        return contract;
      }
    } as Types.Ctor<Contract.Contract<PS>>
  ).pipe(CompiledContract.withVacantWitnesses, CompiledContract.withCompiledFileAssets('.'));

/**
 * The query-context members a composition leg needs to re-partition a call's
 * transcript in the TARGET era, as compact-js publishes them
 * (midnightntwrk/midnight-sdk#400).
 *
 * `block` and `effects` are the PRE-execution context's and `comIndices` the
 * POST-execution one's. compact-js's own partitioner makes exactly that split;
 * reading `block.comIndices` instead — one dot away, and keyed to `number`
 * rather than `bigint` — produces a partition the target era refuses, and
 * nothing reports it.
 */
export type { PartitionContext };

/**
 * The result of one retained-era circuit call: every artifact
 * {@link wrapKeepStateCall} (`../v9/wrap.ts`) needs to assemble a v9-native
 * `ContractCallPrototype`.
 *
 * `preContractState` and `postContractState` are LIVE HANDLES from the retained
 * runtime; every other member is plain data. `postContractStateEncoded` is the
 * post-state's encoded form, carried beside the handle so a caller has a value
 * that outlives the runtime instance.
 *
 * @see {@link RetainedEraExecution}
 */
export interface TranscriptPojo {
  readonly circuitId: string;
  readonly result: unknown;
  readonly input: ContractExecutable.ContractExecutable.ContractCallPrivate['input'];
  readonly output: ContractExecutable.ContractExecutable.ContractCallPrivate['output'];
  readonly publicTranscript: ContractExecutable.ContractExecutable.ContractCallPublic['publicTranscript'];
  readonly privateTranscriptOutputs: ContractExecutable.ContractExecutable.ContractCallPrivate['privateTranscriptOutputs'];
  /** The state the call BOUND to, i.e. `partitionInputs.state`. */
  readonly preContractState: ContractExecutable.ContractExecutable.CallPartitionInputs['state'];
  /** The state the call LEFT, i.e. compact-js's own `contractState`. */
  readonly postContractState: ContractExecutable.ContractExecutable.ContractCallPublic['contractState'];
  /**
   * The post-call state as an {@link EncodedStateValue}: the same value
   * {@link postContractState} holds, in the form that survives this process.
   *
   * `EncodedStateValue` is pinned identical across the retained and current
   * runtimes, so this is the member era-agnostic code reads, and the one that
   * can be persisted, cloned or sent to a worker.
   */
  readonly postContractStateEncoded: EncodedStateValue;
  readonly privateStateAfter: unknown;
  readonly partitionContext: PartitionContext;
  readonly zswapLocalState: ContractExecutable.ContractExecutable.DeployResultPrivate<unknown>['zswapLocalState'];
}

/** The freshly built state a retained-era constructor produced. */
export interface ConstructorResultPojo {
  readonly contractState: ContractExecutable.ContractExecutable.DeployResultPublic['contractState'];
  readonly privateState: unknown;
  readonly zswapLocalState: ContractExecutable.ContractExecutable.DeployResultPrivate<unknown>['zswapLocalState'];
  /**
   * The key the state's maintenance authority was built from: the caller's own
   * when one was named, otherwise the one compact-js sampled.
   *
   * REQUIRED, unlike the request's, and that asymmetry is the point — a sampled
   * key exists nowhere else, so a result that did not report it would leave the
   * deployment as unmaintainable as the empty committee the retained
   * constructor writes on its own.
   */
  readonly signingKey: Ledger8SigningKey;
}

/**
 * Reads verifier keys for the entry points a contract declares.
 *
 * A plain function rather than compact-js's `ZKConfiguration` service, so no
 * Effect type reaches this package's callers; {@link zkConfigurationLayer}
 * adapts it at the seam.
 */
export type VerifierKeyReader = (provableCircuitId: string) => Promise<Uint8Array | undefined>;

/** Everything {@link runRetainedCircuit} needs to run one circuit. */
export interface RunRetainedCircuitOptions<C extends RetainedContract, PS> {
  readonly contract: C;
  readonly circuitId: string;
  readonly args: readonly unknown[];
  /**
   * The contract state the call runs against, DECODED — the primary state in
   * its era-neutral encoded form, with the balances the contract holds beside
   * it.
   *
   * Era-neutral rather than one era's serialized bytes, because a contract that
   * an earlier post-fork call has already migrated carries a CURRENT-era
   * envelope while still executing on the retained runtime. Chain bytes would
   * have to be decoded by the era that wrote them; this shape is what both
   * envelopes' readers produce, so one path serves a pre-fork contract and a
   * migrated one alike.
   *
   * The balance travels on the same value, so the two halves cannot come off
   * different reads. {@link executableStateFrom} writes it onto a whole
   * `ContractState`, which is the only form the retained runtime reads a
   * balance from — handed a bare state value it substitutes an empty map, and a
   * circuit reading a balance then executes against nothing with every guard
   * green. That substitution is what #1345 was.
   */
  readonly contractState: ContractStatePojo;
  readonly address: string;
  readonly coinPk: string;
  readonly privateState: PS;
  /**
   * The execution clock, in SECONDS since the epoch. Omitted, the wall clock is
   * used.
   *
   * Lands on the query context's `block.secondsSinceEpoch`, which
   * {@link TranscriptPojo.partitionContext} reports — so without pinning it a
   * recorded fixture differs on every run
   * (midnightntwrk/midnight-sdk#403).
   */
  readonly nowSeconds?: number;
}

/** Everything {@link runRetainedConstructor} needs to run one constructor. */
export interface RunRetainedConstructorOptions<C extends RetainedContract, PS> {
  readonly contract: C;
  readonly args: readonly unknown[];
  readonly privateState: PS;
  readonly coinPk: string;
  /**
   * The key the contract's maintenance authority is built from. Optional:
   * compact-js samples one when it is absent, and the result reports whichever
   * was used.
   */
  readonly signingKey?: Ledger8SigningKey;
  /** Reads the verifier key for each entry point the constructor registers. */
  readonly verifierKeys: VerifierKeyReader;
}

/**
 * Serves the coin public key and signing key compact-js reads off
 * `Configuration.Keys`.
 *
 * Built with `Layer.succeed` over the values the caller already holds, rather
 * than through platform-js's own `Configuration.layer`, which sources them from
 * a `ConfigProvider`. The service is a plain `Context.Tag` with two members, so
 * there is nothing a config round trip would add except a second place for the
 * values to disagree.
 */
const keysLayer = (coinPk: string, signingKey: Ledger8SigningKey | undefined): Layer.Layer<Configuration.Keys> =>
  Layer.succeed(
    Configuration.Keys,
    Configuration.Keys.of({
      coinPublicKey: CoinPublicKey.make(coinPk),
      getSigningKey: () =>
        signingKey === undefined
          ? Option.none()
          : Option.some(SigningKey.make(signingKey, LEDGER8_SIGNATURE_KIND))
    })
  );

/**
 * Pins the execution clock, or leaves the ambient one in place.
 *
 * `Effect.withClock`, NOT a `Layer` over `Clock.Clock`. The clock is one of
 * Effect's DEFAULT services: it lives on the fiber rather than in the context,
 * so providing a layer for it type-checks, runs, and is silently ignored — the
 * wall clock still wins. That was measured here, by a test that asserted a
 * pinned second and got `Date.now()`.
 *
 * Only `currentTimeMillis` and its unsafe twin reach an execution — compact-js
 * converts to seconds at the call site — but the whole interface is pinned so a
 * future read cannot quietly fall back to the wall clock.
 */
export const pinnedClock = (nowSeconds: number): Clock.Clock => {
  // ROUNDED, not used raw. `nowSeconds` is a plain `number` on the published
  // option and `Date.now() / 1000` -- the expression a consumer reaches for --
  // is fractional, which makes `BigInt(millis)` throw `RangeError: ... not an
  // integer` from inside the clock builder, naming neither the option nor the
  // era. The millisecond is the finest unit this interface carries and
  // compact-js divides it back down to seconds, so rounding loses nothing an
  // execution can observe.
  const millis = Math.round(nowSeconds * 1_000);
  const nanos = BigInt(millis) * 1_000_000n;
  // `Object.assign` onto the real clock, NOT a spread of it. `Clock.make()`
  // returns a class instance whose `sleep` and `scheduler` live on the
  // prototype; a spread copies own enumerable properties only and silently
  // drops both, leaving a `Clock` that throws `clock.sleep is not a function`
  // the first time anything schedules work. TypeScript cannot see it, because a
  // spread type keeps the declared members.
  return Object.assign(Clock.make(), {
    unsafeCurrentTimeMillis: () => millis,
    currentTimeMillis: Effect.succeed(millis),
    unsafeCurrentTimeNanos: () => nanos,
    currentTimeNanos: Effect.succeed(nanos)
  });
};

const withPinnedClock = <A, E, R>(nowSeconds: number | undefined, effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  nowSeconds === undefined ? effect : Effect.withClock(pinnedClock(nowSeconds))(effect);

/**
 * Adapts a {@link VerifierKeyReader} into the service compact-js's
 * `initialize` reads keys through.
 *
 * A key the reader does not answer for becomes `Option.none()`, and compact-js
 * REFUSES it: `initialize` fails with a `ContractConfigurationError` naming the
 * circuit. That is measured, not assumed, and it is stricter than the leg this
 * replaced — a retained-era constructor used to leave every slot blank and the
 * deploy composition was the only thing that checked coverage. It now fails
 * before a state is built at all.
 */
const zkConfigurationLayer = (read: VerifierKeyReader): Layer.Layer<ZKConfiguration.ZKConfiguration> =>
  Layer.succeed(
    ZKConfiguration.ZKConfiguration,
    ZKConfiguration.ZKConfiguration.of({
      createReader: <C extends Contract.Contract<PS>, PS>(
        compiledContract: CompiledContract.CompiledContract<C, PS, never>
      ) =>
        Effect.sync(() => {
          const getVerifierKey = (provableCircuitId: Contract.ProvableCircuitId<C>) =>
            Effect.tryPromise({
              try: () =>
                read(provableCircuitId).then((key) =>
                  key === undefined ? Option.none() : Option.some(Contract.VerifierKey(key))
                ),
              catch: (cause: unknown) =>
                ZKConfigurationReadError.make(compiledContract.tag, provableCircuitId, 'verifier-key', cause)
            });
          return {
            getVerifierKey,
            getVerifierKeys: (provableCircuitIds: Contract.ProvableCircuitId<C>[]) =>
              Effect.forEach(
                provableCircuitIds,
                (provableCircuitId) =>
                  getVerifierKey(provableCircuitId).pipe(
                    Effect.map((verifierKey) => [provableCircuitId, verifierKey] as const)
                  ),
                { concurrency: 'unbounded', discard: false }
              )
          } satisfies ZKConfiguration.ZKConfiguration.Reader<C, PS>;
        })
    })
  );

/**
 * The verifier-key reader a CIRCUIT call is given.
 *
 * `ContractExecutable` declares `ZKConfiguration` in its context for every
 * method, but only `initialize` and the maintenance operations read a key — a
 * circuit call needs none, which is measured, not assumed. Providing a reader
 * that refuses keeps that fact enforced: were a future version to read a key
 * during a circuit call, this fails by name instead of silently serving
 * `Option.none()` and composing a call with a blank key slot.
 */
export const refuseVerifierKeyRead: VerifierKeyReader = (provableCircuitId) =>
  Promise.reject(
    new Error(
      `a retained-era circuit call read the verifier key for '${provableCircuitId}'. Circuit calls are ` +
        'not supposed to read ZK configuration; only deployment and maintenance are.'
    )
  );

/**
 * Structural equality over the `EncodedStateValue` algebra -- plain objects,
 * arrays, `Map`s, `Uint8Array`s and primitives.
 *
 * `Map`s are compared pairwise in iteration order, deliberately, and that order
 * is not ascending by key -- do not reason about it as sorted. The
 * order-sensitivity is what makes {@link decodeExecutableStateValue}'s
 * comparison exact; a `get()`-based rewrite would silently drop it.
 *
 * @param a One value in the algebra.
 * @param b The value to compare it against.
 * @returns `true` when the two are structurally equal.
 */
export const structurallyEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) {
    return true;
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }

  if (a instanceof Uint8Array || b instanceof Uint8Array) {
    return (
      a instanceof Uint8Array && b instanceof Uint8Array && a.length === b.length && a.every((byte, i) => byte === b[i])
    );
  }

  if (a instanceof Map || b instanceof Map) {
    if (!(a instanceof Map) || !(b instanceof Map) || a.size !== b.size) {
      return false;
    }
    const bEntries = Array.from(b);
    return Array.from(a).every(([key, value], i) => {
      const bEntry = bEntries[i];
      return bEntry !== undefined && structurallyEqual(key, bEntry[0]) && structurallyEqual(value, bEntry[1]);
    });
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => structurallyEqual(item, b[i]))
    );
  }

  const aRecord: Record<string, unknown> = { ...a };
  const bRecord: Record<string, unknown> = { ...b };
  const aKeys = Object.keys(aRecord);
  // `key in bRecord`, not just a matching key count: looking each of a's keys
  // up in b without checking it exists reads `undefined` on both sides and
  // short-circuits to equal.
  return (
    aKeys.length === Object.keys(bRecord).length &&
    aKeys.every((key) => key in bRecord && structurallyEqual(aRecord[key], bRecord[key]))
  );
};

/**
 * Decodes the primary state a circuit executes against, refusing a value that
 * does not re-encode to the bytes it came from.
 *
 * The comparison is CROSS-CODEC in production, which is what it is for. A
 * contract an earlier post-fork call migrated carries a current-era envelope,
 * so the pipeline reads it with the HEAD era's reader
 * (`readLedger8Snapshot`) -- the state is then encoded by ledger-v9 and
 * decoded here by the retained runtime. A retained-era envelope is encoded by
 * ledger-v8 and decoded by the same retained runtime, which is still a
 * different physical copy. Either way a shape one side writes and the other
 * merely tolerates would decode without complaint and execute a circuit
 * against a state that is not the chain's, with every guard green.
 *
 * Reachable with the REAL decoder, not only an injected one: the seam takes a
 * bare {@link EncodedStateValue} a caller can assemble by hand, and the
 * retained runtime canonicalises map order and drops members it does not
 * declare. Both are refused here rather than executed on.
 *
 * @param state The era-neutral encoded primary state.
 * @returns The decoded state value.
 * @throws DownConvertFailedError at stage `'state down-convert'` when the
 *   decoded value does not re-encode to its source, with the mismatch on
 *   `cause`.
 * @see {@link RetainedEraExecution}
 * @see {@link FailClosedDecoding}
 */
const decodeExecutableStateValue = (state: EncodedStateValue): glue.StateValue => {
  const decoded = glue.StateValue.decode(state);
  if (!structurallyEqual(decoded.encode(), state)) {
    throw new DownConvertFailedError(
      'state down-convert',
      new Error(`decoded StateValue did not re-encode to its source (source tag '${state.tag}')`)
    );
  }
  return decoded;
};

/**
 * Builds the retained-era `ContractState` a circuit executes against, from the
 * era-neutral state the envelope's own reader produced.
 *
 * `StateValue` and `ChargedState` come from the retained glue rather than from
 * compact-js: its `CompactRuntime` binding re-exports neither as a VALUE
 * (midnightntwrk/midnight-sdk, spec finding E9), and building them through
 * ledger-v8's own same-named classes instead would be the dual instantiation
 * this era must not perform. `ContractState` is the glue's as well, so all
 * three come from one module.
 *
 * A WHOLE `ContractState` rather than the bare `ChargedState` its predecessor
 * built: the runtime reads `block.balance` off a contract state and substitutes
 * an empty map for anything less, so writing the balance here is what makes it
 * reach the circuit at all. It used to be injected into the query context after
 * the fact, which is what #1345 was.
 *
 * @param contractState The decoded state and the balances beside it.
 * @returns The state the retained runtime executes against.
 */
const executableStateFrom = (contractState: ContractStatePojo): glue.ContractState => {
  // Read ONCE, then guarded. Not defaulted and not trusted: `new Map(...)`
  // turns an absent balance, a `null`, an empty array and an empty `Set` alike
  // into an EMPTY map, which is indistinguishable from a contract that holds
  // nothing -- the circuit then reads zero where the chain says otherwise and
  // the node refuses the resulting transcript, with every guard green. That is
  // #1345. `tsc` reaches neither an untyped JavaScript caller nor an options
  // object assembled dynamically, and both `RunRetainedCircuitOptions` and
  // `ContractStatePojo` are on the published surface.
  // @see FailClosedDecoding
  const { balance } = contractState;
  if (!isContractBalance(balance)) {
    throw new Error(
      `a contract state carries no usable balance (received ${describeValue(balance)}), so it cannot be ` +
        'executed against. Read it from a contract-state snapshot rather than assembling one; a contract that ' +
        'holds nothing declares an empty Map.'
    );
  }

  const state = new glue.ContractState();
  state.data = new glue.ChargedState(decodeExecutableStateValue(contractState.state));
  // Copied rather than shared, so an entry the caller adds or removes afterwards
  // cannot reach a running circuit.
  state.balance = new Map(balance);
  return state;
};

/**
 * Every message in a failure's cause chain, outermost first.
 *
 * compact-js reports an execution failure as `Error executing circuit 'x'` and
 * hangs the runtime's own diagnostic -- `Block time is <= time`, an out-of-gas,
 * a failed assertion -- on `cause`. Only the outer message reaches a caller who
 * reads `error.message`, so the reason the circuit ACTUALLY failed is lost at
 * exactly the moment someone needs it.
 */
export const causeChain = (error: unknown, seen: Set<unknown> = new Set()): readonly string[] => {
  if (typeof error !== 'object' || error === null || seen.has(error)) {
    return typeof error === 'string' ? [error] : [];
  }
  seen.add(error);
  const message = 'message' in error && typeof error.message === 'string' ? [error.message] : [];
  return 'cause' in error ? [...message, ...causeChain(error.cause, seen)] : message;
};

/**
 * Runs an effect and rethrows its failure with the whole cause chain in the
 * message.
 *
 * `Effect.runPromise` alone rejects with a `FiberFailure`, which carries neither
 * the failure's class nor its `cause` — so a caller loses both the error it
 * could have discriminated on and the diagnostic it needed. `runPromiseExit`
 * plus `Cause.squash` recovers the real error, which is then rethrown with the
 * underlying reason spelled out and the original on `cause`.
 */
export const runOrRethrow = async <A, E>(effect: Effect.Effect<A, E>): Promise<A> => {
  const exit = await Effect.runPromiseExit(effect);
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }
  const error: unknown = Cause.squash(exit.cause);
  const chain = causeChain(error);
  throw new Error(chain.length > 0 ? chain.join(': ') : String(error), { cause: error });
};

/**
 * Reads the ONE contract call a retained-era circuit produces.
 *
 * The retained era has no `crossContractCall`, so its execution adapter
 * synthesises a single-entry trace and a one-element list is complete by
 * construction. The list is still typed as a list, so the emptiness this era
 * cannot produce is refused by name rather than read as `undefined` and carried
 * into a composition.
 *
 * @param calls The calls the execution reported.
 * @param circuitId The circuit they were produced for, for the message.
 * @returns The sole call.
 * @throws Error If the list is empty.
 */
export const soleCall = <T>(calls: readonly T[], circuitId: string): T => {
  const [only] = calls;
  if (only === undefined) {
    throw new Error(
      `circuit '${circuitId}' produced no contract call. The retained era cannot make a ` +
        'cross-contract call, so exactly one is expected.'
    );
  }
  return only;
};

/**
 * Runs one circuit on a retained-era contract and packages every artifact a
 * v9-native call prototype needs.
 *
 * The balances the contract holds travel on the state it is given — see
 * {@link RunRetainedCircuitOptions.contractState}.
 *
 * @param options The compiled contract, circuit id, arguments, state bytes,
 *   address, coin public key, private state and optional pinned clock.
 * @returns Every artifact a v9-native call prototype needs.
 * @see {@link RetainedEraExecution}
 */
export const runRetainedCircuit = async <C extends RetainedContract, PS>(
  options: RunRetainedCircuitOptions<C, PS>
): Promise<TranscriptPojo> => {
  const executable = ContractExecutable.make(containerFor<PS>(options.contract));
  const contractState = executableStateFrom(options.contractState);

  const program = Effect.gen(function* () {
    return yield* executable.circuit(
      Contract.ProvableCircuitId(options.circuitId),
      {
        address: PlatformContractAddress.ContractAddress(options.address),
        contractState,
        privateState: options.privateState
      },
      // Asserted for the same reason `createCallTxOptions` asserts it in
      // `packages/contracts/src/tx-interfaces.ts`: resolved through a GENERIC
      // `C`, `CircuitParameters` degrades to `unknown[]` because TypeScript
      // indexes `provableCircuits` against the constraint rather than the
      // instantiated contract. The tuple is checked where `C` is concrete, at
      // the caller's own call site.
      ...(options.args as readonly never[])
    );
  });

  const call = await runOrRethrow(
    withPinnedClock(
      options.nowSeconds,
      program.pipe(
        Effect.provide(
          Layer.mergeAll(keysLayer(options.coinPk, undefined), zkConfigurationLayer(refuseVerifierKeyRead))
        )
      )
    )
  );

  const only = soleCall(call.calls, options.circuitId);

  return {
    circuitId: only.circuitId,
    result: call.result,
    input: only.private.input,
    output: only.private.output,
    publicTranscript: only.public.publicTranscript,
    privateTranscriptOutputs: only.private.privateTranscriptOutputs,
    preContractState: only.public.partitionInputs.state,
    postContractState: only.public.contractState,
    postContractStateEncoded: only.public.contractState.encode(),
    privateStateAfter: call.privateState,
    partitionContext: {
      block: only.public.partitionInputs.block,
      effects: only.public.partitionInputs.effects,
      comIndices: only.public.partitionInputs.comIndices
    },
    zswapLocalState: call.zswapLocalState
  };
};

/**
 * Runs a retained-era contract's constructor and packages the result.
 *
 * compact-js's `initialize` also writes the maintenance authority and registers
 * each entry point's verifier key onto the state, both of which this era's
 * deploy leg previously did for itself. The authority matters: the retained
 * constructor leaves an EMPTY committee with a threshold of one — one signature
 * from a set of zero keys, which nothing can satisfy — so a deployment left on
 * it could never have a verifier key inserted, removed or replaced.
 *
 * @param options The compiled contract, constructor arguments, private state,
 *   coin public key, optional signing key and verifier-key reader.
 * @throws ComposeOptionError naming option `'signingKey'` when a supplied key
 *   is not the 32 bytes of hex the retained runtime reads, raised before the
 *   constructor runs.
 * @returns The freshly built state, the resulting private state, the Zswap
 *   local state the constructor ended on and the signing key the authority was
 *   built from.
 * @see {@link RetainedEraExecution}
 */
export const runRetainedConstructor = async <C extends RetainedContract, PS>(
  options: RunRetainedConstructorOptions<C, PS>
): Promise<ConstructorResultPojo> => {
  // BEFORE the constructor runs, so nothing is executed against a key the
  // maintenance authority could never have been built from, and the refusal
  // names the option rather than leaving the runtime's own buffer message to
  // stand for it.
  if (options.signingKey !== undefined && !LEDGER8_SIGNING_KEY_PATTERN.test(options.signingKey)) {
    throw new ComposeOptionError('v8', 'signingKey');
  }

  const executable = ContractExecutable.make(containerFor<PS>(options.contract));
  const deployed = await runOrRethrow(
    executable
      .initialize(options.privateState, ...(options.args as readonly never[]))
      .pipe(
        Effect.provide(
          Layer.mergeAll(
            keysLayer(options.coinPk, options.signingKey),
            zkConfigurationLayer(options.verifierKeys)
          )
        )
      )
  );

  return {
    contractState: deployed.public.contractState,
    privateState: deployed.private.privateState,
    zswapLocalState: deployed.private.zswapLocalState,
    signingKey: deployed.private.signingKey.value
  };
};
