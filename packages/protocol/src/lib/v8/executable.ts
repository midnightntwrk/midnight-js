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

// Ledger 8 execution on compact-js's era-pinned entries; see ADR 0015 and Ledger8Execution.

import * as CoinPublicKey from '@midnight-ntwrk/platform-js/effect/CoinPublicKey';
import * as Configuration from '@midnight-ntwrk/platform-js/effect/Configuration';
import * as PlatformContractAddress from '@midnight-ntwrk/platform-js/effect/ContractAddress';
import * as SigningKey from '@midnight-ntwrk/platform-js/effect/SigningKey';
import * as Contract from '@midnightntwrk/compact-js/effect/Contract';
import * as ContractConfigurationError from '@midnightntwrk/compact-js/effect/ContractConfigurationError';
import {
  CompiledContract,
  ContractExecutable,
  ZKConfiguration,
  ZKConfigurationReadError
} from '@midnightntwrk/compact-js/v8/effect';
import * as glue from 'compact-runtime-ledger8';
import { Cause, Clock, Effect, Exit, Layer, Option, type Types } from 'effect';

import {
  ComposeFailedError,
  ComposeOptionError,
  ContractExecutionError,
  findCodedCause,
  InvalidArgumentError,
  InvariantViolationError,
  StateConversionFailedError} from '../../errors';
import type { EncodedStateValue } from '../era/envelope';
import type { PartitionContext } from '../shared/compose-types';
import { type ContractStatePojo, describeValue, isContractBalance } from '../shared/contract-state';

// 32 bytes in hex, either case: measured against the pinned runtime (see Ledger8Execution).
export const LEDGER8_SIGNING_KEY_PATTERN = /^[0-9a-fA-F]{64}$/;

// Measured, not chosen: schnorr only (see Ledger8Execution, "Constructor execution").
const LEDGER8_SIGNATURE_KIND = 'schnorr' as const;

/** A ledger 8 signing key: 32 bytes of hex. @see {@link LEDGER8_SIGNING_KEY_PATTERN} */
export type Ledger8SigningKey = string;

/** A ledger 8 key as the tagged `SigningKey` compact-js reads. */
export const toPlatformSigningKey = (signingKey: Ledger8SigningKey): SigningKey.SigningKey =>
  SigningKey.make(signingKey, LEDGER8_SIGNATURE_KIND);

/**
 * A ledger 8 contract as the caller holds it: the constructed artifact the
 * ledger 8 toolchain generates, not compact-js's `CompiledContract`.
 *
 * @see {@link Ledger8Execution}
 */
export interface Ledger8EngineContract {
  /** The map compact-js indexes to find the circuit to run. */
  readonly provableCircuits: Readonly<Record<string, unknown>>;
  /** The constructor a deployment runs. */
  initialState(...args: never[]): unknown;
}

// Reaches nothing but compact-js's error messages.
const LEDGER8_CONTRACT_TAG = 'ledger8-contract';

// compact-js builds the contract with `new ctor(witnesses)`; the constructor hands back the caller's
// instance, whose witnesses are already bound. The assets path '.' is never read: zkConfigurationLayer
// replaces the reader.
export const containerFor = <PS>(contract: Ledger8EngineContract): CompiledContract.CompiledContract<
  Contract.Contract<PS>,
  PS,
  never
> =>
  CompiledContract.make<Contract.Contract<PS>, PS>(
    LEDGER8_CONTRACT_TAG,
    // The structural match is real, but the private-state parameters differ, so TypeScript needs
    // this one assertion; see Ledger8Execution.
    class {
      constructor() {
        return contract;
      }
    } as Types.Ctor<Contract.Contract<PS>>
  ).pipe(CompiledContract.withVacantWitnesses, CompiledContract.withCompiledFileAssets('.'));

export type { PartitionContext };

/**
 * The result of one ledger 8 circuit call: what `wrapKeepStateCall` needs to
 * build a v9 call prototype. `preContractState` and `postContractState` are
 * live ledger 8 handles; every other member is plain data.
 *
 * @see {@link Ledger8Execution}
 */
export interface TranscriptPojo {
  readonly circuitId: string;
  readonly result: unknown;
  readonly input: ContractExecutable.ContractExecutable.ContractCallPrivate['input'];
  readonly output: ContractExecutable.ContractExecutable.ContractCallPrivate['output'];
  readonly publicTranscript: ContractExecutable.ContractExecutable.ContractCallPublic['publicTranscript'];
  readonly privateTranscriptOutputs: ContractExecutable.ContractExecutable.ContractCallPrivate['privateTranscriptOutputs'];
  /**
   * The state the call BOUND to. Same type as
   * {@link TranscriptPojo.postContractState}, so swapping them is not a compile
   * error; partitioning against the wrong one is refused or mis-charged.
   */
  readonly preContractState: ContractExecutable.ContractExecutable.CallPartitionInputs['state'];
  /**
   * The state the call LEFT. See {@link TranscriptPojo.preContractState}.
   */
  readonly postContractState: ContractExecutable.ContractExecutable.ContractCallPublic['contractState'];
  /**
   * The post-call state as an {@link EncodedStateValue}, which can be
   * persisted, cloned or sent to a worker, unlike the handle.
   */
  readonly postContractStateEncoded: EncodedStateValue;
  readonly privateStateAfter: unknown;
  readonly partitionContext: PartitionContext;
  readonly zswapLocalState: ContractExecutable.ContractExecutable.DeployResultPrivate<unknown>['zswapLocalState'];
}

/** The freshly built state a ledger 8 constructor produced. */
export interface ConstructorResultPojo {
  readonly contractState: ContractExecutable.ContractExecutable.DeployResultPublic['contractState'];
  readonly privateState: unknown;
  readonly zswapLocalState: ContractExecutable.ContractExecutable.DeployResultPrivate<unknown>['zswapLocalState'];
  /**
   * The key the maintenance authority was built from: the caller's own, or the
   * one compact-js sampled. Persist it: a sampled key exists nowhere else.
   */
  readonly signingKey: Ledger8SigningKey;
}

/** Reads verifier keys for the entry points a contract declares; `undefined` when none is served. */
export type VerifierKeyReader = (provableCircuitId: string) => Promise<Uint8Array | undefined>;

/** Everything {@link runLedger8Circuit} needs to run one circuit. */
export interface Ledger8CircuitOptions<C extends Ledger8EngineContract, PS> {
  readonly contract: C;
  readonly circuitId: string;
  readonly args: readonly unknown[];
  /**
   * The decoded contract state the call runs against, with the contract's
   * balances on the same value so both come from one read. Either era's reader
   * produces it, so a contract already migrated after the fork runs the same way.
   * A contract that holds nothing declares an empty map.
   *
   * @see {@link Ledger8Execution}
   */
  readonly contractState: ContractStatePojo;
  readonly address: string;
  readonly coinPk: string;
  readonly privateState: PS;
  /**
   * The execution clock, in SECONDS since the epoch; omitted means the wall
   * clock. Pin it for a reproducible transcript.
   */
  readonly nowSeconds?: number;
}

/** Everything {@link runLedger8Constructor} needs to run one constructor. */
export interface Ledger8ConstructorOptions<C extends Ledger8EngineContract, PS> {
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

// `Layer.succeed`, not `Configuration.layer`; see Ledger8Execution.
export const keysLayer = (coinPk: string, signingKey: Ledger8SigningKey | undefined): Layer.Layer<Configuration.Keys> =>
  Layer.succeed(
    Configuration.Keys,
    Configuration.Keys.of({
      coinPublicKey: CoinPublicKey.make(coinPk),
      getSigningKey: () =>
        signingKey === undefined
          ? Option.none()
          : Option.some(toPlatformSigningKey(signingKey))
    })
  );

// Applied with `Effect.withClock`, never a Layer, which Effect silently ignores (see Ledger8Execution).
// The whole interface is pinned so no future read falls back to the wall clock.
export const pinnedClock = (nowSeconds: number): Clock.Clock => {
  // Before rounding: `BigInt` refuses NaN and infinities with a bare RangeError.
  if (!Number.isFinite(nowSeconds)) {
    throw new InvalidArgumentError(
      `the ledger 8 runtime cannot pin its execution clock to '${String(nowSeconds)}'. ` +
        '`nowSeconds` must be a finite number of seconds since the epoch.'
    );
  }
  // Rounded: `Date.now() / 1000` is fractional and `BigInt` refuses it; compact-js reads seconds anyway.
  const millis = Math.round(nowSeconds * 1_000);
  const nanos = BigInt(millis) * 1_000_000n;
  // `Object.assign`, not a spread: `sleep` and `scheduler` live on the prototype and a spread drops
  // them, which TypeScript cannot see.
  return Object.assign(Clock.make(), {
    unsafeCurrentTimeMillis: () => millis,
    currentTimeMillis: Effect.succeed(millis),
    unsafeCurrentTimeNanos: () => nanos,
    currentTimeNanos: Effect.succeed(nanos)
  });
};

const withPinnedClock = <A, E, R>(nowSeconds: number | undefined, effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  nowSeconds === undefined ? effect : Effect.withClock(pinnedClock(nowSeconds))(effect);

// A key the reader does not serve becomes `Option.none()`, which `initialize` refuses by circuit name.
export const zkConfigurationLayer = (read: VerifierKeyReader): Layer.Layer<ZKConfiguration.ZKConfiguration> =>
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

// Neither a call nor a maintenance update reads a key; refusing keeps that enforced (see Ledger8Execution).
export const refuseVerifierKeyRead: VerifierKeyReader = (provableCircuitId) =>
  Promise.reject(
    new InvariantViolationError(
      `a ledger 8 circuit call or maintenance update read the verifier key for '${provableCircuitId}'. ` +
        'Only deployment is supposed to read ZK configuration.'
    )
  );

// Maps compare in iteration order on purpose; do not rewrite with `get()` (see Ledger8Execution).
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

// Refuses a state that does not re-encode to its source: the round trip crosses codecs. See
// Ledger8Execution.
const decodeExecutableStateValue = (state: EncodedStateValue): glue.StateValue => {
  try {
    const decoded = glue.StateValue.decode(state);
    if (!structurallyEqual(decoded.encode(), state)) {
      throw new StateConversionFailedError(
        'state conversion',
        new Error(`decoded StateValue did not re-encode to its source (source tag '${state.tag}')`)
      );
    }
    return decoded;
  } catch (cause) {
    // The vendor decoder raises bare errors; FailClosedDecoding promises a coded one.
    throw cause instanceof StateConversionFailedError ? cause : new StateConversionFailedError('state conversion', cause);
  }
};

// A whole `ContractState` from the ledger 8 glue, so the runtime reads the balance; see
// Ledger8Execution ("The state a circuit executes against").
const executableStateFrom = (contractState: ContractStatePojo): glue.ContractState => {
  // Read once and guarded, never defaulted: an empty map would read as a contract holding nothing.
  // See FailClosedDecoding.
  const { balance } = contractState;
  if (!isContractBalance(balance)) {
    throw new StateConversionFailedError(
      'state conversion',
      new Error(
        `a contract state carries no usable balance (received ${describeValue(balance)}), so it cannot be ` +
          'executed against. Read it from a contract-state snapshot rather than assembling one; a contract ' +
          'that holds nothing declares an empty Map.'
      )
    );
  }

  try {
    const state = new glue.ContractState();
    state.data = new glue.ChargedState(decodeExecutableStateValue(contractState.state));
    // Copied rather than shared, so an entry the caller adds or removes afterwards
    // cannot reach a running circuit.
    state.balance = new Map(balance);
    return state;
  } catch (cause) {
    // Both WASM setters raise bare errors with no `code`.
    throw cause instanceof StateConversionFailedError ? cause : new StateConversionFailedError('state conversion', cause);
  }
};

export { causeChain } from '../shared/cause-chain';

// Rethrows without losing the failure's class or `cause`; the rules are in Ledger8Execution
// ("Circuit dispatch").
export const runOrRethrow = async <A, E>(effect: Effect.Effect<A, E>): Promise<A> => {
  const exit = await Effect.runPromiseExit(effect);
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }
  // Every failure, not only the squashed first one: keys are read concurrently.
  const failures = Array.from(Cause.failures(exit.cause));
  const all = failures.length > 0 ? failures : [Cause.squash(exit.cause)];
  // The entry points' `@throws` promise a directly raised coded error unchanged.
  const direct = all.find((failure) => findCodedCause(failure) === failure);
  if (direct !== undefined) {
    throw direct;
  }
  const carried = all.length === 1 ? findCodedCause(all[0]) : undefined;
  if (carried !== undefined) {
    throw carried;
  }
  throw ContractExecutionError.fromFailures(all);
};

// Ledger 8 has no cross-contract call, so the trace has one entry; an empty one is refused by name.
export const soleCall = <T>(calls: readonly T[], circuitId: string): T => {
  const [only] = calls;
  if (only === undefined) {
    throw new InvariantViolationError(
      `circuit '${circuitId}' produced no contract call. The ledger 8 runtime cannot make a ` +
        'cross-contract call, so exactly one is expected.'
    );
  }
  return only;
};

// `Object.hasOwn`: compact-js guards only with `if (!circuit)`, so `'toString'` would be called as a
// circuit (see Ledger8Execution).
const assertDeclaredCircuit = (contract: Ledger8EngineContract, circuitId: string): void => {
  const circuit = Object.hasOwn(contract.provableCircuits, circuitId)
    ? contract.provableCircuits[circuitId]
    : undefined;
  if (typeof circuit !== 'function') {
    throw new InvalidArgumentError(
      `No circuit named '${circuitId}' on this ledger 8 contract instance. ` +
        `Available circuits: ${Object.keys(contract.provableCircuits).sort().join(', ')}.`
    );
  }
};

export const runLedger8Circuit = async <C extends Ledger8EngineContract, PS>(
  options: Ledger8CircuitOptions<C, PS>
): Promise<TranscriptPojo> => {
  assertDeclaredCircuit(options.contract, options.circuitId);
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
      // Through a generic `C`, `CircuitParameters` degrades to `unknown[]`; the tuple is checked at
      // the caller's call site, where `C` is concrete.
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
      // Not `block.comIndices`: see Ledger8Execution, "What a TranscriptPojo carries".
      comIndices: only.public.partitionInputs.comIndices
    },
    zswapLocalState: call.zswapLocalState
  };
};

// Both eras report a rejected key blob alike; only a refusal with a `cause` is a rejected blob.
// See VerifierKeys.
export const recodeVerifierKeyBlobFailure = (error: unknown): unknown => {
  if (!ContractConfigurationError.isConfigurationError(error) || error.cause === undefined) {
    return error;
  }
  const circuitId = /verifier key for circuit '([^']+)'/.exec(error.message)?.[1];
  return circuitId === undefined
    ? error
    : new ComposeFailedError('v8', 'deploy-verifier-key-blob', circuitId, error.cause);
};

// `initialize` also writes the maintenance authority; see Ledger8Execution ("Constructor execution").
export const runLedger8Constructor = async <C extends Ledger8EngineContract, PS>(
  options: Ledger8ConstructorOptions<C, PS>
): Promise<ConstructorResultPojo> => {
  // Before the constructor runs, so the refusal names the option, not a runtime buffer error.
  if (options.signingKey !== undefined && !LEDGER8_SIGNING_KEY_PATTERN.test(options.signingKey)) {
    throw new ComposeOptionError('v8', 'signingKey');
  }

  const executable = ContractExecutable.make(containerFor<PS>(options.contract));
  const deployed = await runOrRethrow(
    executable
      .initialize(options.privateState, ...(options.args as readonly never[]))
      .pipe(
        Effect.mapError(recodeVerifierKeyBlobFailure),
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
