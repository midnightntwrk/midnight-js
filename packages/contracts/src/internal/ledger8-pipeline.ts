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
 * The retained-era pipelines: the ORDER in which one operation against a
 * previous-toolchain contract touches the era facade, the retained execution
 * engine, and the read surface.
 *
 * This module owns the order and nothing else, and is pure — the era and the
 * engine arrive as values. DO NOT ADD A RETAINED-RUNTIME DEPENDENCY HERE, not
 * even a development one: the engine's construction guard exists to detect a
 * second acquisition path, and an alias here would create one.
 *
 * @see {@link KeepStatePipeline} for the two arms, why `wrapKeepStateCall` is
 *      not called from here, and why the engine is a narrowed generic slice.
 */

import type {
  ContractStatePojo,
  DeployResultPojo,
  EncodedStateValue,
  LedgerEra,
  LedgerVersion,
  TranscriptPojo
} from '@midnight-ntwrk/midnight-js-protocol';
import type { PublicDataProvider, RawContractState } from '@midnight-ntwrk/midnight-js-types';
import { assertDefined } from '@midnight-ntwrk/midnight-js-utils';

import { Ledger8ShieldedSpendUnsupportedError } from '../errors';
import {
  type EncryptionPublicKeyResolver,
  serializeCoinInfo,
  serializeQualifiedShieldedCoinInfo,
  zswapStateToSegmentedOffer
} from '../utils/zswap-utils';
import type { BreadcrumbSink } from './breadcrumbs';
import { assertHeadStateEraAgreement } from './era';
import { assertVerifierKeyMatches } from './verifier-key';

/**
 * The transcript members this pipeline reads, narrowed off the engine's own
 * result type so the two cannot drift.
 *
 * Three members of the engine's result are deliberately left out.
 *
 * @see {@link KeepStatePipeline} for which three, and why nothing is lost by
 *      dropping them.
 */
export type Ledger8Transcript = Pick<
  TranscriptPojo,
  | 'circuitId'
  | 'input'
  | 'output'
  | 'publicTranscript'
  | 'privateTranscriptOutputs'
  | 'partitionContext'
  | 'privateStateAfter'
  | 'zswapLocalState'
>;

/**
 * The one member the pipeline needs off a caller's retained-era contract: the
 * circuit collection, passed through to the engine untouched.
 *
 * Widened to `unknown` values on purpose. The circuits are the previous
 * runtime's own functions and nothing here calls them — only the engine does —
 * so naming their signature would tie this package to a shape it never uses,
 * and would stop the real engine's own narrower contract type from satisfying
 * this slice.
 */
export interface Ledger8ContractSlice extends Ledger8CallableContract, Ledger8ConstructibleContract {}

/** The circuit collection alone, which is all the call arm passes on. */
export interface Ledger8CallableContract {
  readonly impureCircuits: Readonly<Record<string, unknown>>;
}

/**
 * The constructor alone, which is all the deploy arm passes on.
 *
 * Separate from {@link Ledger8CallableContract} rather than folded into one
 * slice, and that separation is load-bearing: each engine method declares only
 * the member it uses, which is what keeps the real engine's own narrower
 * request types comparable with these and so assignable to
 * {@link Ledger8ExecutionEngine}.
 */
export interface Ledger8ConstructibleContract {
  readonly initialState: unknown;
}

/**
 * What {@link Ledger8ExecutionEngine.executeCircuit} is asked to run.
 *
 * @typeParam TState The engine's own down-converted state type, opaque here.
 */
export interface Ledger8ExecuteRequest<TState> {
  readonly contract: Ledger8CallableContract;
  readonly circuitId: string;
  readonly args: readonly unknown[];
  readonly state: TState;
  readonly address: string;
  readonly coinPk: string;
  readonly privateState: unknown;
}

/**
 * The freshly built initial state a retained-era constructor produced, and the
 * private state beside it.
 *
 * The state is a retained-runtime HANDLE, not plain data, and the ONE thing
 * this package does with it is ask it to serialize itself — which is the form
 * the era's deploy composition takes. It is never inspected.
 */
export interface Ledger8ConstructedState {
  readonly contractState: { serialize(): Uint8Array };
  readonly privateState: unknown;
}

/** What {@link Ledger8ExecutionEngine.executeConstructor} is asked to run. */
export interface Ledger8ConstructRequest {
  readonly contract: Ledger8ConstructibleContract;
  readonly args: readonly unknown[];
  readonly privateState: unknown;
  readonly coinPk: string;
}

/**
 * The retained execution capability this pipeline consumes: down-convert a
 * state for retained-era execution, then run one circuit on it.
 *
 * Both members use METHOD syntax deliberately, so their parameters compare
 * bivariantly. Do not rewrite them as property-typed arrow signatures — the
 * real engine stops satisfying the slice.
 *
 * @typeParam TState The down-converted state, threaded through opaquely.
 * @see {@link KeepStatePipeline} for why the state is generic.
 */
export interface Ledger8ExecutionEngine<TState> {
  downConvertForExecution(state: EncodedStateValue): TState;
  executeCircuit(options: Ledger8ExecuteRequest<TState>): Ledger8Transcript;
  executeConstructor(options: Ledger8ConstructRequest): Ledger8ConstructedState;
}

/**
 * The read surface every retained-era pipeline consults: the contract state,
 * plus the head read {@link assertHeadStateEraAgreement} makes only when the
 * state's envelope disagrees with the head this operation started from.
 *
 * A `Pick` rather than the whole provider, so a reader sees exactly which two
 * members are reachable from here — and so a test can count them.
 */
export type Ledger8PipelineReadSurface = Pick<
  PublicDataProvider,
  'queryLatestProtocolVersion' | 'queryRawContractState'
>;

/**
 * The snapshot every retained-era operation is built against: ONE
 * `queryRawContractState`, whose bytes then feed the era check, the key check,
 * the execution and the composition.
 *
 * Returned as a value rather than re-read per step, which is the whole point:
 * a second read could answer differently mid-operation and leave one
 * transaction built half against each answer.
 */
export interface Ledger8Snapshot {
  readonly state: RawContractState;
  /** The primary state, as this era reads it out of {@link Ledger8Snapshot.state}. */
  readonly encoded: EncodedStateValue;
  /** The entry points the state declares, with the key registered against each. */
  readonly decoded: ContractStatePojo;
}

/**
 * Fetches the one contract-state snapshot an operation runs against and dates
 * it against the head era.
 *
 * The envelope is dated BEFORE anything decodes it, so a decoder is never
 * handed bytes from the other era. `extractState` and `decodeContractState`
 * are two separate reads of the same bytes on purpose; do not collapse them.
 *
 * The verifier-key check is NOT here — see {@link assertSnapshotVerifierKey},
 * which runs against the snapshot this returns.
 *
 * @param era The era facade bound to the head this operation resolved.
 * @param head The era the network head is on.
 * @param pdp The read surface.
 * @param contractAddress The contract being operated on.
 * @param logger The optional logger the dating step's breadcrumbs are written to.
 * @returns The snapshot, its extracted state and its decoded entry points.
 * @throws Error if no contract is deployed at `contractAddress`.
 * @throws HeadStateEraMismatchError, IndexerInconsistencyError if the head and
 * the state's envelope belong to different eras.
 * @throws StateDecodeFailedError if this era's decoder rejects the envelope.
 * @see {@link KeepStatePipeline} for why the two reads stay separate.
 */
export const readLedger8Snapshot = async (
  era: LedgerEra,
  head: LedgerVersion,
  pdp: Ledger8PipelineReadSurface,
  contractAddress: string,
  logger?: BreadcrumbSink
): Promise<Ledger8Snapshot> => {
  const state = await pdp.queryRawContractState(contractAddress);
  assertDefined(state, `No contract deployed at contract address '${contractAddress}'`);

  await assertHeadStateEraAgreement(head, state, pdp, logger);

  const encoded = era.extractState(state.raw);
  const decoded = era.decodeContractState(state.raw);

  return { state, encoded, decoded };
};

/**
 * Checks one entry point's local verifier key against the slot the fetched
 * snapshot says the chain holds.
 *
 * `entryPoints` is an ARRAY and two byte entry points can decode to the same
 * name, so this takes the first match by name and lets the byte comparison
 * refuse a slot that does not hold this artifact's key.
 *
 * @param snapshot The one snapshot this operation read.
 * @param circuitId The entry point to check.
 * @param localVerifierKey The key compiled beside the local artifact.
 * @throws BlankVerifierKeySlotError if the chain declares no key for it.
 * @throws VerifierKeyMismatchError if the two keys differ byte for byte.
 * @see {@link VerificationPath} for what this check buys.
 */
export const assertSnapshotVerifierKey = (
  snapshot: Ledger8Snapshot,
  circuitId: string,
  localVerifierKey: Uint8Array
): void => {
  const entryPoint = snapshot.decoded.entryPoints.find((candidate) => candidate.circuitId === circuitId);
  assertVerifierKeyMatches(localVerifierKey, entryPoint?.verifierKey, circuitId);
};

/**
 * Whether a call spends a shielded coin the contract already HELD, as opposed
 * to one the same call produced.
 *
 * The distinction decides whether the offer can be built at all: a held coin
 * has to be located in the chain's Merkle tree, and this pipeline reads no
 * Zswap chain state. The pairing test is the offer builder's OWN one, reused
 * rather than restated so the two cannot disagree.
 *
 * @param zswapLocalState The call's post-execution Zswap local state.
 * @returns `true` if any input needs a chain state to be spent.
 * @see {@link KeepStatePipeline} for the transient-versus-held distinction.
 */
const spendsHeldCoin = (zswapLocalState: Ledger8Transcript['zswapLocalState']): boolean => {
  const producedByThisCall = new Set(zswapLocalState.outputs.map((output) => serializeCoinInfo(output.coinInfo)));
  return zswapLocalState.inputs.some(
    (input) => !producedByThisCall.has(serializeQualifiedShieldedCoinInfo(input))
  );
};

/** Everything one retained-era call needs. */
export interface Ledger8CallPipelineRequest<TState> {
  readonly era: LedgerEra;
  readonly engine: Ledger8ExecutionEngine<TState>;
  readonly publicDataProvider: Ledger8PipelineReadSurface;
  readonly head: LedgerVersion;
  /** The optional logger the dating step's breadcrumbs are written to. */
  readonly logger?: BreadcrumbSink;
  readonly contract: Ledger8ContractSlice;
  readonly contractAddress: string;
  readonly circuitId: string;
  readonly args: readonly unknown[];
  readonly coinPublicKey: string;
  readonly privateState: unknown;
  readonly localVerifierKey: Uint8Array;
  readonly networkId: string;
  readonly ttl: Date;
  /**
   * A RESOLVER, never a bare key. DO NOT WIDEN THIS TO ACCEPT A KEY: a bare key
   * is coerced into the constant resolver `() => key`, which encrypts every
   * output to the caller's own key and silences `createZswapOutput`'s refusal
   * branch. The result submits successfully and loses the recipient's coin.
   *
   * @see {@link KeepStatePipeline} for the full failure mode.
   */
  readonly encryptionPublicKey: EncryptionPublicKeyResolver;
}

/** What one retained-era call produced. */
export interface Ledger8CallPipelineResult {
  /**
   * The UNPROVEN transaction, serialized. Bytes rather than a handle: the two
   * eras' ledgers are separate runtimes, so the transaction crosses the
   * provider seams in its serialized form.
   */
  readonly txBytes: Uint8Array;
  readonly circuitId: string;
  readonly nextPrivateState: unknown;
  /** Present exactly when the call moved shielded coins. */
  readonly guaranteedZswapOffer: Uint8Array | undefined;
  /**
   * Always `undefined` today, and the reason is structural rather than a
   * simplification — see the comment at the offer build below.
   */
  readonly fallibleZswapOffer: Uint8Array | undefined;
}

/**
 * Runs one call against a retained-era contract, in the order this module
 * exists to fix: fetch the one snapshot, date it, check the key, extract the
 * state, down-convert it, execute the circuit, compose the transaction.
 *
 * @param request The era and engine to run against, the read surface, and the
 * call's own inputs.
 * @returns The serialized unproven transaction and what the circuit produced.
 * @throws Error if no contract is deployed at the address.
 * @throws HeadStateEraMismatchError, IndexerInconsistencyError, BlankVerifierKeySlotError,
 * VerifierKeyMismatchError from {@link readLedger8Snapshot}.
 * @throws Ledger8ShieldedSpendUnsupportedError if the circuit spends a shielded
 * coin the contract already held — see {@link spendsHeldCoin}.
 * @throws ComposeOptionError, ComposeFailedError if the era refuses the composed call.
 */
export const runLedger8CallPipeline = async <TState>(
  request: Ledger8CallPipelineRequest<TState>
): Promise<Ledger8CallPipelineResult> => {
  const { era, engine, publicDataProvider, head, contract, contractAddress, circuitId } = request;

  const snapshot = await readLedger8Snapshot(era, head, publicDataProvider, contractAddress, request.logger);
  // BEFORE proving, and before the circuit runs: a proof generated against a
  // key the chain does not hold is rejected on submission, so checking here
  // turns a paid-for, late failure into a free, immediate one.
  assertSnapshotVerifierKey(snapshot, circuitId, request.localVerifierKey);

  const downConverted = engine.downConvertForExecution(snapshot.encoded);
  const transcript = engine.executeCircuit({
    contract,
    circuitId,
    args: request.args,
    state: downConverted,
    address: contractAddress,
    coinPk: request.coinPublicKey,
    privateState: request.privateState
  });

  // Refused BEFORE the offer is built, and before anything is composed: this
  // pipeline reads no Zswap chain state, so a coin the contract already held
  // cannot be located in the chain's commitment tree. Without this the
  // condition surfaced as a bare assertion inside the offer builder, naming
  // neither the era nor the circuit. Supplying the retained arm with a chain
  // state is the real fix and is tracked separately; until then this refuses in
  // the caller's own test run rather than in production.
  if (spendsHeldCoin(transcript.zswapLocalState)) {
    throw new Ledger8ShieldedSpendUnsupportedError(circuitId);
  }

  // Built with NO partition information, and that is the only thing available
  // here: the retained execution leg emits one unpartitioned op sequence, and
  // the guaranteed/fallible split is computed inside the composition below,
  // after this offer has to be an option on it. So every movement this call
  // makes lands in the GUARANTEED segment. Do not "tighten" this into a
  // two-segment expectation -- there is no partition to route against at this
  // point in the order, and a call whose coins are placed in the wrong segment
  // is refused by the ledger rather than silently mis-split.
  const offers = zswapStateToSegmentedOffer(transcript.zswapLocalState, request.encryptionPublicKey);
  const guaranteedZswapOffer = offers.guaranteed?.serialize();
  const fallibleZswapOffer = offers.fallible?.serialize();

  const txBytes = era.composeCallTx({
    calls: [
      {
        contractAddress,
        circuitId,
        // The raw state AS READ FROM CHAIN, which is what carries the
        // registered operation and its verifier key; a constructor-built state
        // declares its entry points with blank keys and will not do.
        contractState: snapshot.state.raw,
        transcript: {
          kind: 'unpartitioned',
          preState: snapshot.encoded,
          publicTranscript: transcript.publicTranscript,
          partitionContext: transcript.partitionContext
        },
        privateTranscriptOutputs: transcript.privateTranscriptOutputs,
        input: transcript.input,
        output: transcript.output
      }
    ],
    networkId: request.networkId,
    ttl: request.ttl,
    guaranteedZswapOffer,
    fallibleZswapOffer
  });

  return {
    txBytes,
    circuitId,
    nextPrivateState: transcript.privateStateAfter,
    guaranteedZswapOffer,
    fallibleZswapOffer
  };
};

/** Everything one retained-era deploy needs. */
export interface Ledger8DeployPipelineRequest {
  readonly era: LedgerEra;
  readonly engine: Ledger8ExecutionEngine<unknown>;
  readonly contract: Ledger8ContractSlice;
  readonly args: readonly unknown[];
  readonly privateState: unknown;
  readonly coinPublicKey: string;
  /**
   * REQUIRED, unlike on the current era. A retained-era constructor builds its
   * entry-point slots BLANK, and the retained deploy registers no keys of its
   * own, so a deploy without this map would put a contract on chain that
   * nothing can ever call. The map must name exactly the entry points the state
   * declares.
   */
  readonly verifierKeys: ReadonlyMap<string, Uint8Array>;
  readonly networkId: string;
  readonly ttl: Date;
}

/** What one retained-era deploy produced. */
export interface Ledger8DeployPipelineResult {
  readonly txBytes: Uint8Array;
  /**
   * READ OFF the composition record, never derived: a deploy mints a fresh
   * nonce, so the same initial state deploys to a different address every time.
   */
  readonly contractAddress: string;
  /** The state that address was derived from — what a caller later calls against. */
  readonly initialState: Uint8Array;
  readonly nextPrivateState: unknown;
}

/**
 * Runs one retained-era deploy: execute the constructor on the retained
 * runtime, serialize the state it built, and compose the deploy against the
 * era.
 *
 * No snapshot and no head read of its own — there is no deployed contract to
 * read yet. The `(artifact era, head era)` pairing this deploy is allowed on
 * is settled by the caller before it gets here.
 *
 * @param request The era and engine, the contract and its constructor
 * arguments, the verifier keys and the transaction envelope.
 * @returns The serialized unproven transaction, the address the deployment
 * will have, the initial state, and the private state the constructor produced.
 * @throws ComposeOptionError, ComposeFailedError if the era refuses the deploy —
 * including `option: 'verifierKeys'` for a map that does not name exactly the
 * state's declared entry points.
 */
export const runLedger8DeployPipeline = (request: Ledger8DeployPipelineRequest): Ledger8DeployPipelineResult => {
  const constructed = request.engine.executeConstructor({
    contract: request.contract,
    args: request.args,
    privateState: request.privateState,
    coinPk: request.coinPublicKey
  });

  const deployed: DeployResultPojo = request.era.composeDeployTx({
    contractState: constructed.contractState.serialize(),
    verifierKeys: request.verifierKeys,
    networkId: request.networkId,
    ttl: request.ttl
  });

  return {
    txBytes: deployed.transaction,
    contractAddress: deployed.contractAddress,
    initialState: deployed.initialState,
    nextPrivateState: constructed.privateState
  };
};
