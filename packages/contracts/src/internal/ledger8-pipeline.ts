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
import type { AlignedValue, Op } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { PartitionedTranscript } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { PublicDataProvider, RawContractState } from '@midnight-ntwrk/midnight-js-types';
import { assertDefined } from '@midnight-ntwrk/midnight-js-utils';

import {
  Ledger8AmbiguousEntryPointError,
  Ledger8RecipientUnmappableError,
  Ledger8ShieldedSpendUnsupportedError,
  LedgerParametersUnservedError
} from '../errors';
import {
  type EncryptionPublicKeyResolver,
  serializeCoinInfo,
  serializeQualifiedShieldedCoinInfo,
  zswapStateToSegmentedOffer
} from '../utils/zswap-utils';
import type { BreadcrumbSink } from './breadcrumbs';
import { assertRetainedStateEnvelope } from './era';
import { assertVerifierKeyMatches } from './verifier-key';

/**
 * The transcript members this pipeline is entitled to read, narrowed off the
 * engine's own result type so the two cannot drift.
 *
 * `circuitId` is in the set but is not read: the pipeline names the circuit
 * from its own request, so reading it back off the transcript would let a
 * mismatched recording rename the call. It stays in the `Pick` because the
 * replay harness requires the fixture to carry it, which is what makes a
 * recording's own claim about which circuit it recorded checkable.
 *
 * Two members of the engine's result are deliberately left out. `result` USED to
 * be a third: it was narrowed away here and so could not reach a caller, even
 * though the recording carried it and the current era answers with it.
 *
 * @see {@link KeepStatePipeline} for which two, and why nothing is lost by
 *      dropping them.
 */
export type Ledger8Transcript = Pick<
  TranscriptPojo,
  | 'circuitId'
  | 'result'
  | 'input'
  | 'output'
  | 'publicTranscript'
  | 'privateTranscriptOutputs'
  | 'partitionContext'
  | 'privateStateAfter'
  | 'zswapLocalState'
>;

/**
 * Everything either arm needs off a caller's retained-era contract: the UNION of
 * the two arms' slices, so one entry point can accept a contract it will route
 * to whichever arm applies.
 *
 * Each arm passes on only its own member — see {@link Ledger8CallableContract}
 * and {@link Ledger8ConstructibleContract}, and why they stay separate.
 */
export interface Ledger8ContractSlice extends Ledger8CallableContract, Ledger8ConstructibleContract {}

/**
 * The circuit collection alone, which is all the call arm passes on.
 *
 * Widened to `unknown` values on purpose. The circuits are the previous
 * runtime's own functions and nothing here calls them — only the engine does —
 * so naming their signature would tie this package to a shape it never uses,
 * and would stop the real engine's own narrower contract type from satisfying
 * this slice.
 */
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
  /**
   * Re-expresses the entry points a retained-era state declared as a CURRENT-era contract state.
   *
   * Needed only when the two eras differ, i.e. keep-state. See the call below for why the chain's
   * own bytes cannot be passed through in that case.
   */
  reexpressOperationsForCurrentEra(entryPoints: ContractStatePojo['entryPoints']): Uint8Array;
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
 * @param retainedEra The RETAINED era facade, which is the only one that can read a retained-era
 * envelope. Deliberately not the head's facade -- see the read below.
 * @param head The era the network head is on, for the envelope check's impossible-case branch.
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
  retainedEra: LedgerEra,
  head: LedgerVersion,
  pdp: Ledger8PipelineReadSurface,
  contractAddress: string,
  logger?: BreadcrumbSink
): Promise<Ledger8Snapshot> => {
  const state = await pdp.queryRawContractState(contractAddress);
  assertDefined(state, `No contract deployed at contract address '${contractAddress}'`);

  await assertRetainedStateEnvelope(head, state, contractAddress, pdp, logger);

  // Read with the RETAINED era, never with the head's. The check above has just
  // established that the retained ledger wrote these bytes, and it is the only
  // ledger that can read them -- post-fork included, because the fork does not
  // rewrite a contract's stored state. Handing them to the head's era is what
  // made keep-state impossible.
  const encoded = retainedEra.extractState(state.raw);
  const decoded = retainedEra.decodeContractState(state.raw);

  return { state, encoded, decoded };
};

/**
 * Checks one entry point's local verifier key against the slot the fetched
 * snapshot says the chain holds.
 *
 * `entryPoints` is an ARRAY and two byte entry points can decode to the same
 * name. AMBIGUITY IS REFUSED rather than resolved by taking the first match:
 * the chain dispatches on the raw bytes, not on the decoded name, so checking
 * one slot's key would not establish that the proof is verified against that
 * same slot — and a proof verified against another slot is paid for and then
 * rejected at submission, which is the late failure this check exists to
 * prevent.
 *
 * @param snapshot The one snapshot this operation read.
 * @param circuitId The entry point to check.
 * @param localVerifierKey The key compiled beside the local artifact.
 * @throws Ledger8AmbiguousEntryPointError if the state declares the name twice.
 * @throws BlankVerifierKeySlotError if the chain declares no key for it.
 * @throws VerifierKeyMismatchError if the two keys differ byte for byte.
 * @see {@link VerificationPath} for what this check buys.
 */
export const assertSnapshotVerifierKey = (
  snapshot: Ledger8Snapshot,
  circuitId: string,
  localVerifierKey: Uint8Array
): void => {
  const matches = snapshot.decoded.entryPoints.filter((candidate) => candidate.circuitId === circuitId);
  if (matches.length > 1) {
    throw new Ledger8AmbiguousEntryPointError(circuitId, matches.length);
  }
  assertVerifierKeyMatches(localVerifierKey, matches[0]?.verifierKey, circuitId);
};

/**
 * Whether a call spends a shielded coin the contract already HELD, as opposed
 * to one the same call produced.
 *
 * The distinction decides whether the offer can be built at all: a held coin
 * has to be located in the chain's Merkle tree, and this pipeline reads no
 * Zswap chain state. This shares the offer builder's own SERIALIZERS, so the
 * two agree on coin identity; the pairing itself is not shared — the builder
 * consumes a matched candidate and this does not, so two inputs serializing
 * identically would pass here and reach the builder's own assertion.
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

/**
 * Refuses a call whose shielded outputs pay a recipient the resolver cannot
 * answer for, BEFORE the offer is built.
 *
 * Without this the condition surfaces from inside `createZswapOutput` as a bare
 * `Error` naming neither the era nor the circuit, and advising a resolver
 * mapping the retained-era options carry no field for.
 *
 * Only USER-owned outputs are checked. A contract-owned output takes
 * `ZswapOutput.newContractOwned`, which is given an address and never consults
 * the resolver at all.
 *
 * @param zswapLocalState The call's post-execution Zswap local state.
 * @param resolve The resolver this call will build its offer with.
 * @param circuitId The circuit this flow is running, for the refusal.
 * @throws Ledger8RecipientUnmappableError for the first unresolvable recipient.
 */
const assertRecipientsResolvable = (
  zswapLocalState: Ledger8Transcript['zswapLocalState'],
  resolve: EncryptionPublicKeyResolver,
  circuitId: string
): void => {
  for (const { recipient } of zswapLocalState.outputs) {
    if (recipient.is_left && resolve(recipient.left) === undefined) {
      throw new Ledger8RecipientUnmappableError(circuitId, recipient.left);
    }
  }
};

/** Everything one retained-era call needs. */
export interface Ledger8CallPipelineRequest<TState> {
  /**
   * The era facade the composed transaction is built on, bound to the network head.
   *
   * Distinct from {@link Ledger8CallPipelineRequest.retainedEra}, and the distinction is the whole
   * of keep-state: the call is composed on the ledger the network is running NOW, over a state the
   * RETAINED ledger wrote and still owns. Collapsing the two back into one facade is what refused
   * every post-fork call against a pre-fork contract.
   */
  readonly era: LedgerEra;
  /** The retained era facade, which reads the contract's on-chain state. Always the pre-fork one. */
  readonly retainedEra: LedgerEra;
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
   * The UNPROVEN transaction, serialized. Bytes rather than a handle because
   * `LedgerEra.composeCallTx` returns bytes and nothing in this module may hold
   * a live ledger handle.
   *
   * Which form it crosses the PROVIDER SEAMS in is a separate question decided
   * by the network head, not by this field — a post-fork head deserializes
   * these bytes and crosses as a live current-era handle. See
   * `submitLedger8Tx`.
   */
  readonly txBytes: Uint8Array;
  readonly circuitId: string;
  readonly nextPrivateState: unknown;
  /**
   * The circuit's own return value.
   *
   * Carried rather than dropped: the retained execution leg computes it -- it
   * has to, it ran the circuit -- and answers with it on
   * `TranscriptPojo.result`. Stopping it here made it reachable in the current
   * era only, and by omission rather than by any decision.
   */
  readonly result: unknown;
  /** The ZK input the circuit was executed against. */
  readonly input: AlignedValue;
  /** The circuit's ZK output. */
  readonly output: AlignedValue;
  /** The private transcript outputs the execution produced. */
  readonly privateTranscriptOutputs: AlignedValue[];
  /** The public transcript the execution produced, unpartitioned. */
  readonly publicTranscript: Op<AlignedValue>[];
  /**
   * The guaranteed/fallible pair this call was composed against -- the same one
   * the Zswap offer was routed with, resolved once above.
   */
  readonly partitionedTranscript: PartitionedTranscript;
  /** Present exactly when the call moved shielded coins. */
  readonly guaranteedZswapOffer: Uint8Array | undefined;
  /**
   * Present exactly when the call's own partition places a shielded movement in
   * the fallible half. The pipeline resolves that partition before it builds
   * the offer, so a movement the transcript places there is routed there rather
   * than falling into the guaranteed segment.
   */
  readonly fallibleZswapOffer: Uint8Array | undefined;
}

/**
 * Runs one call against a retained-era contract, in the order this module
 * exists to fix: fetch the one snapshot, date it, read the state and the key
 * set off it, check the key, down-convert, execute the circuit, compose the
 * transaction.
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
  const { era, retainedEra, engine, publicDataProvider, head, contract, contractAddress, circuitId } = request;

  const snapshot = await readLedger8Snapshot(
    retainedEra,
    head,
    publicDataProvider,
    contractAddress,
    request.logger
  );
  // Checked HERE and not inside `readLedger8Snapshot`, which is also the attach path's reader:
  // attaching only checks verifier keys and composes nothing, so it has no use for the block's
  // parameters and must not be refused for their absence. This path composes, so it does.
  //
  // Checked before the circuit runs and before anything is proved: the alternative to refusing is
  // partitioning against a cost model the chain does not run, which the node rejects only after the
  // proof has been paid for.
  if (snapshot.state.ledgerParameters === undefined) {
    throw new LedgerParametersUnservedError(contractAddress);
  }
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

  // Also before the offer is built, and for the same reason: a recipient this
  // arm cannot resolve is refused by name here rather than by a bare assertion
  // inside the offer builder.
  assertRecipientsResolvable(transcript.zswapLocalState, request.encryptionPublicKey, circuitId);

  // Resolved BEFORE the offer is built, which is what lets the offer be routed
  // at all. Without it `zswapStateToSegmentedOffer`'s partition argument
  // defaults to `[undefined, undefined]`, `segmentForMatch` takes its "no
  // segment information" path, and every movement lands in the guaranteed
  // segment -- unbalanceable for a circuit whose transcript is wholly fallible,
  // which the wallet reports as `Wallet.InsufficientFunds`.
  //
  // Partitioned ONCE: the pair resolved here is handed to `composeCallTx` below
  // as an already-partitioned transcript, so the composer does not repeat the
  // work. Two partitions of the same transcript would have to agree, and
  // nothing would notice if they stopped.
  const partitionedTranscript = era.partitionCallTranscript({
    circuitId,
    contractAddress,
    transcript: {
      kind: 'unpartitioned',
      preState: snapshot.encoded,
      publicTranscript: transcript.publicTranscript,
      partitionContext: transcript.partitionContext
    },
    ledgerParameters: snapshot.state.ledgerParameters
  });

  const offers = zswapStateToSegmentedOffer(
    transcript.zswapLocalState,
    request.encryptionPublicKey,
    undefined,
    partitionedTranscript
  );
  const guaranteedZswapOffer = offers.guaranteed?.serialize();
  const fallibleZswapOffer = offers.fallible?.serialize();

  // WHICH BYTES THE COMPOSER GETS, and why it is not always the chain's own.
  //
  // This entry is an OPERATION REGISTRY: the composer reads one thing out of it, the
  // `ContractOperation` for this circuit, to get its verifier key. The state the call binds to
  // travels separately, as the transcript's `preState` below.
  //
  // Pre-fork the chain's own bytes already are in the composer's era, so they pass through
  // untouched -- and a constructor-built state will not do, because it declares its entry points
  // with blank keys.
  //
  // Post-fork they are NOT: the fork does not rewrite a contract's stored state, so a contract
  // deployed before it is still served carrying the retained envelope, which the current composer
  // cannot deserialize at all. The registry is therefore re-expressed in the current era, carrying
  // the same keys the chain holds -- the ones `assertSnapshotVerifierKey` above has just checked
  // the local artifact against.
  const registeredOperations =
    head === 'v9' ? engine.reexpressOperationsForCurrentEra(snapshot.decoded.entryPoints) : snapshot.state.raw;

  const txBytes = era.composeCallTx({
    calls: [
      {
        contractAddress,
        circuitId,
        contractState: registeredOperations,
        // From the SAME read as the state above, which is the point: the parameters are dynamic
        // and must date from the block the call is built against. Composing against the ledger's
        // initial parameters partitions the transcript with a cost model the chain does not use,
        // and the node refuses the guaranteed segment for running out of gas.
        ledgerParameters: snapshot.state.ledgerParameters,
        // Already split, above -- the same pair the offer was routed against, so
        // the two cannot describe different partitions. Note what this does NOT
        // claim: a caller-supplied pair is not passed through untouched, it is
        // refused when it carries neither half. Why that refusal cannot reach
        // the partitioner's own answer sent back through it is recorded under
        // "Resolving a call's transcript pair" in
        // `protocol/docs/compose-refusal-order.md`.
        transcript: {
          kind: 'partitioned',
          guaranteed: partitionedTranscript[0],
          fallible: partitionedTranscript[1]
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
    result: transcript.result,
    input: transcript.input,
    output: transcript.output,
    privateTranscriptOutputs: transcript.privateTranscriptOutputs,
    publicTranscript: transcript.publicTranscript,
    partitionedTranscript,
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
