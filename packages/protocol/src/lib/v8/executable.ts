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
  type CompiledContract,
  ContractExecutable,
  Ledger,
  ZKConfiguration,
  ZKConfigurationReadError
} from '@midnight-ntwrk/compact-js/v8/effect';
import * as CoinPublicKey from '@midnight-ntwrk/platform-js/effect/CoinPublicKey';
import * as Configuration from '@midnight-ntwrk/platform-js/effect/Configuration';
import * as PlatformContractAddress from '@midnight-ntwrk/platform-js/effect/ContractAddress';
import * as SigningKey from '@midnight-ntwrk/platform-js/effect/SigningKey';
import { Clock, Effect, Layer, Option } from 'effect';

import { ComposeOptionError } from '../../errors';
import type { EncodedStateValue } from '../era/envelope';
import type { PartitionContext } from '../shared/compose-types';

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
 * A retained-era contract, as a compact-js `CompiledContract`.
 *
 * The same container the current era uses. Before compact-js published an
 * era-pinned ledger-8 line there was none for this era and callers passed a
 * constructed instance; that is no longer true, and the two eras now take the
 * same shape.
 */
export type RetainedCompiledContract<C extends Contract.Contract<PS>, PS> = CompiledContract.CompiledContract<
  C,
  PS,
  never
>;

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
export interface RunRetainedCircuitOptions<C extends Contract.Contract<PS>, PS> {
  readonly compiledContract: RetainedCompiledContract<C, PS>;
  readonly circuitId: Contract.Contract.ProvableCircuitId<C>;
  readonly args: readonly unknown[];
  /**
   * The contract state the call runs against, as the SERIALIZED bytes the chain
   * serves.
   *
   * Bytes rather than an extracted primary state, because the balances a
   * circuit reads live on the contract state and not in that primary state.
   * The retained runtime populates the query context's `block.balance` only
   * when it is handed a whole `ContractState`; handed a bare state value it
   * substitutes an empty map, and a circuit that reads a balance then executes
   * against nothing with every guard green. That substitution is what #1345
   * was.
   */
  readonly contractStateBytes: Uint8Array;
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
export interface RunRetainedConstructorOptions<C extends Contract.Contract<PS>, PS> {
  readonly compiledContract: RetainedCompiledContract<C, PS>;
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
  const millis = nowSeconds * 1_000;
  const nanos = BigInt(millis) * 1_000_000n;
  return {
    ...Clock.make(),
    unsafeCurrentTimeMillis: () => millis,
    currentTimeMillis: Effect.succeed(millis),
    unsafeCurrentTimeNanos: () => nanos,
    currentTimeNanos: Effect.succeed(nanos)
  };
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
 * The state is decoded from the caller's own chain bytes inside this call, so
 * the balances the contract holds travel with it — see
 * {@link RunRetainedCircuitOptions.contractStateBytes}.
 *
 * @param options The compiled contract, circuit id, arguments, state bytes,
 *   address, coin public key, private state and optional pinned clock.
 * @returns Every artifact a v9-native call prototype needs.
 * @see {@link RetainedEraExecution}
 */
export const runRetainedCircuit = async <C extends Contract.Contract<PS>, PS>(
  options: RunRetainedCircuitOptions<C, PS>
): Promise<TranscriptPojo> => {
  const executable = ContractExecutable.make(options.compiledContract);

  const program = Effect.gen(function* () {
    const ledgerState = yield* Ledger.contractStateFromBytes(options.contractStateBytes);
    const contractState = yield* Ledger.toRuntimeContractState(ledgerState);
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
      ...(options.args as Contract.Contract.CircuitParameters<C, Contract.ProvableCircuitId<C>>)
    );
  });

  const call = await Effect.runPromise(
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
export const runRetainedConstructor = async <C extends Contract.Contract<PS>, PS>(
  options: RunRetainedConstructorOptions<C, PS>
): Promise<ConstructorResultPojo> => {
  // BEFORE the constructor runs, so nothing is executed against a key the
  // maintenance authority could never have been built from, and the refusal
  // names the option rather than leaving the runtime's own buffer message to
  // stand for it.
  if (options.signingKey !== undefined && !LEDGER8_SIGNING_KEY_PATTERN.test(options.signingKey)) {
    throw new ComposeOptionError('v8', 'signingKey');
  }

  const executable = ContractExecutable.make(options.compiledContract);
  const deployed = await Effect.runPromise(
    executable
      .initialize(options.privateState, ...(options.args as Contract.Contract.InitializeParameters<C>))
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
