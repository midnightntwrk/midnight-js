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
 * What the entry points do around the retained-era pipelines: acquire the era
 * and the engine, refuse the pairings that cannot run, and carry the composed
 * transaction across the provider seams.
 *
 * Split from `./ledger8-pipeline.ts` on purpose. That module is the
 * orchestration ORDER and is pure — it is handed an era and an engine and calls
 * them in one fixed sequence. This module is the part that touches the outside
 * world: two independent acquisitions at the operation's asynchronous start,
 * and the version-tagged provider round trip afterwards.
 *
 * ## Both acquisitions happen at the start, and both are threaded down as values
 *
 * The era and the engine are acquired once, before anything else runs, so no
 * step deeper in the pipeline awaits a runtime and no two steps can end up
 * bound to different acquisitions.
 *
 * ## One head read per operation, plus two re-reads that each need a reason
 *
 * `resolveOperationEra` makes the head read every operation takes at its start,
 * and the era it resolves is used for every era-dependent decision afterwards.
 * Nothing re-reads the head to answer a question that reading already answered.
 *
 * Two re-reads exist beyond it, and neither happens on the ordinary path:
 *
 * - `assertHeadStateEraAgreement` re-reads when the fetched state's envelope
 *   disagrees with the starting reading — a re-read that exists precisely to
 *   tell a stale reading from an inconsistent one, and which does not happen at
 *   all when the two agree.
 * - {@link handleSubmitRejection} re-reads after the node REJECTED a submitted
 *   transaction, to decide whether the head crossed the fork underneath the
 *   operation. Only on a `submitTx` rejection: a proving or balancing failure
 *   cannot mean the network moved, and is not given a re-read.
 *
 * So a successful operation reads the head ONCE; a submit rejection reads it
 * twice, which is what `src/test/v8-native.test.ts` measures. `./breadcrumbs.ts`
 * is the authority on the full count — four across this package, the fourth
 * being the reading a SCOPE takes at its start — and every one of them is
 * breadcrumbed with a `HeadReadingProvenance` naming which it is. Do not
 * describe this module as making a single re-read: adding one without a
 * provenance member is the mistake that list exists to prevent.
 *
 * @see docs/adr/0006-version-tagged-payloads-at-provider-seams.md
 * @see docs/adr/0008-never-latch-the-network-head-version.md
 */

import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { DownConvertedState } from '@midnight-ntwrk/midnight-js-protocol';
import { loadLedger8Engine } from '@midnight-ntwrk/midnight-js-protocol';
import { Transaction, type UnprovenTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  type MidnightProvider,
  type PrivateStateProvider,
  type ProofProvider,
  type PublicDataProvider,
  SucceedEntirely,
  type VersionedFinalizedTxData,
  type WalletProvider,
  type ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';
import { assertDefined, assertIsContractAddress, hasErrorCode, ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';

import {
  type EraSeam,
  IncompleteCallTxPrivateStateConfig,
  Ledger8SeamFailedError,
  type SubmittedOperation
} from '../errors';
import type { AnyLedger8CallTxOptions } from '../ledger8-contract';
import { createEncryptionPublicKeyResolver } from '../utils';
import { type BreadcrumbSink, emitPipelineSelection } from './breadcrumbs';
import {
  assertEraCompatible,
  type HeadVersionSource,
  requireV8,
  requireV9,
  type ResolvedOperationEra,
  resolveOperationEra
} from './era';
import {
  assertSnapshotVerifierKey,
  type Ledger8CallPipelineResult,
  type Ledger8ContractSlice,
  type Ledger8DeployPipelineResult,
  type Ledger8ExecutionEngine,
  readLedger8Snapshot,
  runLedger8CallPipeline,
  runLedger8DeployPipeline
} from './ledger8-pipeline';
import { handleSubmitRejection } from './stale-head';

/**
 * Reads the current era's own freshly composed bytes back into the live
 * transaction its provider seams take.
 *
 * The three markers name the transaction's stage — signature-enabled,
 * unproven, unbound — which is exactly what `composeCallTx` documents its
 * output as: the bytes `Transaction.serialize()` produces before `.prove()` is
 * ever called.
 *
 * @param txBytes The serialized unproven current-era transaction.
 * @returns The live transaction.
 */
const readCurrentEraTransaction = (txBytes: Uint8Array): UnprovenTransaction =>
  Transaction.deserialize('signature', 'pre-proof', 'pre-binding', txBytes);

/**
 * The providers a retained-era operation reaches. A `Pick` of the provider set
 * the entry points already receive, so nothing at a call site changes while a
 * reader — and a test — sees exactly which members are consulted.
 */
export interface Ledger8EntryProviders {
  readonly publicDataProvider: PublicDataProvider;
  readonly zkConfigProvider: ZKConfigProvider<string>;
  readonly proofProvider: ProofProvider;
  readonly walletProvider: WalletProvider;
  readonly midnightProvider: MidnightProvider;
  /**
   * OPTIONAL, exactly as it is on the provider set the entry points receive.
   * Only the dispatch breadcrumbs read it, so an absent logger costs an
   * operation nothing.
   */
  readonly loggerProvider?: BreadcrumbSink;
}

/**
 * The era facade and the retained engine, acquired once at an operation's
 * asynchronous start.
 *
 * The engine's own state type is fixed here, at the one place the real engine
 * is acquired: everything downstream is generic in it and never looks inside.
 */
export interface Ledger8Runtime {
  readonly resolved: ResolvedOperationEra;
  readonly engine: Ledger8ExecutionEngine<DownConvertedState>;
}

/**
 * Resolves the head era and acquires the retained engine, then refuses the
 * `(retained artifact, head era)` pairings that cannot run.
 *
 * The two acquisitions are independent and are started together: the head read
 * is a network round trip and the engine load instantiates WASM, and neither
 * needs the other's answer.
 *
 * @param pdp The read surface, for the one head read.
 * @param kind Whether this operation deploys a contract or calls one already
 * deployed — the one cell where the era table differs.
 * @param breadcrumbs The optional logger the head-resolution and
 * pipeline-selection breadcrumbs are written to, and the contract this
 * operation names — omitted by a deploy, which has no address yet.
 * @returns The resolved era facts and the acquired engine.
 * @throws Ledger8DeployOnV9Error for a retained-era deploy on a post-fork head.
 * @throws UnknownProtocolVersionError if the head integer is off the era timeline.
 * @throws Ledger8RuntimeMissingError if the retained runtime cannot be acquired.
 */
export const acquireLedger8Runtime = async (
  pdp: HeadVersionSource,
  kind: 'call' | 'deploy',
  breadcrumbs?: { readonly logger?: BreadcrumbSink; readonly contractAddress?: string }
): Promise<Ledger8Runtime> => {
  const [resolved, engine] = await Promise.all([
    resolveOperationEra(pdp, breadcrumbs?.logger),
    loadLedger8Engine()
  ]);
  assertEraCompatible('ledger8', resolved.head, kind);
  // AFTER the gate: a selection breadcrumb written before it would claim a
  // pipeline for an operation the very next line refuses.
  emitPipelineSelection(breadcrumbs?.logger, resolved, 'ledger8', breadcrumbs?.contractAddress);

  return { resolved, engine };
};

/**
 * The two shapes transaction and witness material takes inside an error
 * message: a long run of hex, or a long run of base64.
 *
 * Thirty-two characters is the shortest run worth redacting — a 16-byte hex
 * value — and is short enough that no ordinary English word or identifier
 * reaches it, so the redaction does not eat diagnostic text. Matching by SHAPE
 * rather than by a particular provider's message format is deliberate: the set
 * of providers is open, so there is no format to enumerate.
 */
const PAYLOAD_SHAPED = /[0-9a-fA-F]{32,}|[A-Za-z0-9+/]{32,}={0,2}/g;
const REDACTED = '[redacted]';

/**
 * Rebuilds an external failure as a plain {@link Error} carrying only its class
 * name and a redacted message.
 *
 * Everything else is dropped, and each omission is deliberate: a provider's own
 * ENUMERABLE PROPERTIES are where HTTP clients keep the response body (and
 * therefore the echoed request), and its own `cause` chain is where the
 * unredacted original would otherwise survive. Neither is carried.
 *
 * @param cause Whatever the provider rejected with — `unknown`, because a
 * rejection is not obliged to be an `Error`.
 * @returns A plain error safe to hand to a logger.
 */
const sanitizeSeamCause = (cause: unknown): Error => {
  const kind = cause instanceof Error ? cause.name : typeof cause;
  // `String(cause)` rather than `cause.message`, so a rejection that is not an
  // Error still contributes something, and is redacted just the same.
  const rendered = cause instanceof Error ? cause.message : String(cause);
  return new Error(`${kind}: ${rendered.replace(PAYLOAD_SHAPED, REDACTED)}`);
};

/**
 * Runs one provider seam call, converting a rejection from the provider into
 * {@link Ledger8SeamFailedError} with the failure sanitized onto `cause`.
 *
 * This framework's OWN coded errors pass through UNCHANGED. They carry no
 * external payload, and a caller narrowing on `V8PayloadUnsupportedError` — the
 * refusal a current-era-only provider raises on the way in — or on
 * {@link EraInvariantViolationError} has to keep seeing them. `hasErrorCode`
 * is the registry-backed test for that, so a foreign coded error (a Node
 * `ECONNREFUSED`, say) is still treated as external and sanitized.
 *
 * @param seam The provider method being called.
 * @param circuitId The circuit this flow is running.
 * @param call The seam call to run.
 * @returns Whatever the seam returned.
 * @throws Ledger8SeamFailedError for any external rejection.
 */
const atSeam = async <T>(seam: EraSeam, circuitId: string, call: () => Promise<T>): Promise<T> => {
  try {
    return await call();
  } catch (cause) {
    if (hasErrorCode(cause)) {
      throw cause;
    }
    throw new Ledger8SeamFailedError(seam, circuitId, sanitizeSeamCause(cause));
  }
};

/**
 * Proves, balances and submits a retained-era-executed transaction, and
 * returns the transaction id.
 *
 * ## Which seam arm the transaction crosses on, and why it is not the same on both heads
 *
 * The `version` tag on a provider payload names the ledger runtime that
 * produced the bytes — NOT the toolchain that produced the contract. A
 * retained-era contract's call is composed against whichever era the network
 * head is on, so the two heads hand the providers genuinely different things:
 *
 * | head | composed by | crosses as | narrowed with |
 * | ---- | ----------- | ---------- | ------------- |
 * | `v8` | the retained ledger | `{ version: 'v8', txBytes }` | {@link requireV8} |
 * | `v9` | the current ledger | `{ version: 'v9', tx }` | {@link requireV9} |
 *
 * On a post-fork head the transaction is an ORDINARY current-era transaction
 * that happens to carry a retained-era call, so it crosses the seams exactly
 * as every current-era transaction does — as a live handle, because both sides
 * of the seam share the current runtime. Tagging it `'v8'` would say the
 * retained runtime produced it, which is false, and would send a
 * current-era-only provider looking for a runtime it does not need.
 *
 * The composition returns bytes either way, so the post-fork arm reads them
 * back into a live transaction. That is not a re-encode across eras: they are
 * this package's OWN era's bytes, produced moments earlier by the same runtime
 * that reads them.
 *
 * A provider that does not serve the pre-fork arm refuses it on the way IN, at
 * the first seam, with `V8PayloadUnsupportedError` — before anything is
 * proven, which is the point of leaving that guard in `types` rather than
 * lifting it here.
 *
 * ## The SUBMIT seam is the one that gets a second look
 *
 * A rejection at `proveTx` or `balanceTx` is what it says it is. A rejection at
 * `submitTx` is the one that can mean the network moved while this transaction
 * was being built, so that one — and only that one — is handed to
 * {@link handleSubmitRejection}, which re-reads the head and compares eras. The
 * proving and balancing seams touch no chain state and cannot tell a fork
 * crossing from anything else, so asking the network about their rejections
 * would be a round trip that could not change the answer.
 *
 * @param providers The read surface (for the fork-crossing head re-read) plus
 * the proof, wallet and submission providers.
 * @param txBytes The serialized unproven transaction the era composed.
 * @param operation Which operation this is: the head era it resolved — which
 * also decides the seam arm — whether it is a call or a deploy, and the
 * identifiers a fork-crossing refusal has to name.
 * @returns The transaction id the network assigned.
 * @throws V8PayloadUnsupportedError if a provider does not serve the pre-fork arm.
 * @throws EraInvariantViolationError if a provider answers in the other era.
 * @throws Ledger8SeamFailedError if a provider rejects, with its own failure
 * sanitized onto `cause` — see {@link atSeam}.
 * @throws StaleHeadError, SubmitRejectionUndiagnosedError if the submission was
 * rejected and the head has moved, or cannot be compared — see
 * {@link handleSubmitRejection}.
 */
export const submitLedger8Tx = async (
  providers: Pick<
    Ledger8EntryProviders,
    'publicDataProvider' | 'proofProvider' | 'walletProvider' | 'midnightProvider' | 'loggerProvider'
  >,
  txBytes: Uint8Array,
  operation: SubmittedOperation
): Promise<string> => {
  const { circuitId, head } = operation;
  // Wrapped once, around whichever arm's submit runs, so the two arms cannot
  // end up with different failure handling. `atSeam` still does the sanitizing
  // -- what this adds is the fork-crossing diagnosis on top of its result.
  const submit = async (call: () => Promise<string>): Promise<string> => {
    try {
      return await atSeam('submitTx', circuitId, call);
    } catch (rejection) {
      return handleSubmitRejection(providers.publicDataProvider, operation, rejection, providers.loggerProvider);
    }
  };

  if (head === 'v9') {
    const unproven = readCurrentEraTransaction(txBytes);
    const proven = requireV9(
      await atSeam('proveTx', circuitId, () => providers.proofProvider.proveTx({ version: 'v9', tx: unproven })),
      'proveTx',
      circuitId
    );
    const balanced = requireV9(
      await atSeam('balanceTx', circuitId, () => providers.walletProvider.balanceTx({ version: 'v9', tx: proven })),
      'balanceTx',
      circuitId
    );
    return submit(() => providers.midnightProvider.submitTx({ version: 'v9', tx: balanced }));
  }

  const proven = requireV8(
    await atSeam('proveTx', circuitId, () => providers.proofProvider.proveTx({ version: 'v8', txBytes })),
    'proveTx',
    circuitId
  );
  const balanced = requireV8(
    await atSeam('balanceTx', circuitId, () => providers.walletProvider.balanceTx({ version: 'v8', txBytes: proven })),
    'balanceTx',
    circuitId
  );
  return submit(() => providers.midnightProvider.submitTx({ version: 'v8', txBytes: balanced }));
};

/** What a retained-era call arrived with. */
export interface Ledger8CallRequest {
  readonly contract: Ledger8ContractSlice;
  readonly contractAddress: string;
  readonly circuitId: string;
  readonly args: readonly unknown[];
  readonly privateState: unknown;
}

/** A composed and submitted retained-era call. */
export interface Ledger8SubmittedCall {
  readonly txId: string;
  readonly call: Ledger8CallPipelineResult;
}

/**
 * Runs one retained-era call end to end: acquire, compose through the
 * pipeline, then prove, balance and submit.
 *
 * The verifier key the pre-proving check compares comes from the configured
 * ZK config provider — the key compiled beside the local artifact — and is
 * fetched BEFORE the pipeline runs, because the pipeline's key check is the
 * step that has to happen before any proof exists.
 *
 * ## Shielded outputs are encrypted PER RECIPIENT, exactly as on the current era
 *
 * The pipeline is handed a RESOLVER rather than the wallet's encryption key.
 * The distinction is not stylistic: a bare key is coerced into the constant
 * resolver `() => key` inside the offer builder, which encrypts every output —
 * including one paying a third party — to the CALLER'S OWN key. Such a
 * transaction proves, balances and submits, and the recipient owns a coin
 * whose ciphertext they cannot decrypt, so they never discover it. Nothing
 * errors at any stage.
 *
 * {@link createEncryptionPublicKeyResolver} is the same era-independent helper
 * the current era's `unproven-call-tx.ts` resolves through: the wallet's own
 * coin public key maps to its encryption key, the well-known burn address maps
 * to `BURN_ENCRYPTION_PUBLIC_KEY`, and anyone else resolves to `undefined` —
 * which `createZswapOutput` turns into a refusal. A recipient this arm cannot
 * map is therefore REFUSED rather than silently mis-encrypted.
 *
 * No additional recipient mappings are passed, because the retained-era call
 * options carry none: `Ledger8CallTxOptions` has no
 * `additionalCoinEncPublicKeyMappings` member. So a third-party recipient is
 * refused here where the current era would consult the caller's mappings, and
 * the refusal names what to supply. Widening the retained options to accept
 * mappings is additive and belongs with the first contract that needs it — a
 * refusal is the correct answer until then, and is the one answer that cannot
 * lose a recipient's coin.
 *
 * @param providers The provider set.
 * @param request The contract, its address, the circuit, its arguments and the
 * private state to run against.
 * @returns The transaction id and what the call produced.
 */
export const runLedger8Call = async (
  providers: Ledger8EntryProviders,
  request: Ledger8CallRequest
): Promise<Ledger8SubmittedCall> => {
  const { resolved, engine } = await acquireLedger8Runtime(providers.publicDataProvider, 'call', {
    logger: providers.loggerProvider,
    contractAddress: request.contractAddress
  });
  const localVerifierKey = await providers.zkConfigProvider.getVerifierKey(request.circuitId);

  // Read ONCE and used for both the circuit's coin public key and the
  // resolver's notion of "the wallet's own key". Two reads of the same wallet
  // member could disagree, and a resolver built against a different key than
  // the circuit executed under is exactly the mismatch that mis-encrypts.
  const coinPublicKey = providers.walletProvider.getCoinPublicKey();

  const call = await runLedger8CallPipeline({
    era: resolved.era,
    engine,
    publicDataProvider: providers.publicDataProvider,
    head: resolved.head,
    logger: providers.loggerProvider,
    contract: request.contract,
    contractAddress: request.contractAddress,
    circuitId: request.circuitId,
    args: request.args,
    coinPublicKey,
    privateState: request.privateState,
    localVerifierKey,
    networkId: getNetworkId(),
    ttl: ttlOneHour(),
    encryptionPublicKey: createEncryptionPublicKeyResolver(
      coinPublicKey,
      providers.walletProvider.getEncryptionPublicKey()
    )
  });

  const txId = await submitLedger8Tx(providers, call.txBytes, {
    head: resolved.head,
    kind: 'call',
    circuitId: request.circuitId,
    contractAddress: request.contractAddress
  });

  return { txId, call };
};

/** What a retained-era deploy arrived with. */
export interface Ledger8DeployRequest {
  readonly contract: Ledger8ContractSlice;
  readonly args: readonly unknown[];
  readonly privateState: unknown;
  /** One entry per entry point the constructor's state will declare. */
  readonly verifierKeys: ReadonlyMap<string, Uint8Array>;
}

/** A composed and submitted retained-era deploy. */
export interface Ledger8SubmittedDeploy {
  readonly txId: string;
  readonly deploy: Ledger8DeployPipelineResult;
}

/**
 * Runs one retained-era deploy end to end.
 *
 * ## DELIBERATELY DORMANT — dormant by measurement, not dead by accident
 *
 * No entry point calls this, and its only callers are tests. That is a
 * recorded decision rather than an oversight, and the three parts of it are:
 *
 * - WHY IT IS UNREACHABLE: {@link LEDGER8_DEPLOY_UNMAINTAINABLE} records that
 *   a retained-era deployment lands with an unsatisfiable maintenance
 *   authority — an empty committee with a threshold of one — so
 *   `deployContract`'s retained arm refuses rather than offering a contract
 *   nobody could ever maintain.
 * - WHERE THAT MEASUREMENT IS PINNED: `packages/protocol/src/test/v8-deploy.test.ts`
 *   asserts the authority the retained constructor actually leaves behind. It
 *   is the test that will fail, and say so, if a future retained runtime or
 *   era seam gains an authority.
 * - WHAT WOULD MAKE IT REACHABLE: the era seam carrying a maintenance
 *   authority. On that day `deployContract`'s retained arm stops refusing and
 *   calls this instead — a one-line change. Deleting this in the meantime
 *   would mean re-deriving the whole composition later.
 *
 * The transaction path below composes and submits correctly and is exercised
 * directly by `src/test/v8-native.test.ts`, which is what keeps it honest
 * while it waits. Its pipeline-selection breadcrumb is likewise only reachable
 * from tests today, for the same reason and no other.
 *
 * Reachable only on a pre-fork head: a retained-era deploy against a post-fork
 * head is refused by {@link acquireLedger8Runtime} before the constructor is
 * executed, because a new deployment has no pre-fork history to preserve.
 *
 * @param providers The provider set.
 * @param request The contract, its constructor arguments, the private state and
 * the verifier keys to register.
 * @returns The transaction id and the composed deploy record.
 * @throws Ledger8DeployOnV9Error on a post-fork head.
 */
export const runLedger8Deploy = async (
  providers: Ledger8EntryProviders,
  request: Ledger8DeployRequest
): Promise<Ledger8SubmittedDeploy> => {
  // No contract address on this arm: a deploy has none until the composition
  // below mints one, so the selection breadcrumb leaves the field out.
  const { resolved, engine } = await acquireLedger8Runtime(providers.publicDataProvider, 'deploy', {
    logger: providers.loggerProvider
  });

  const deploy = runLedger8DeployPipeline({
    era: resolved.era,
    engine,
    contract: request.contract,
    args: request.args,
    privateState: request.privateState,
    coinPublicKey: providers.walletProvider.getCoinPublicKey(),
    verifierKeys: request.verifierKeys,
    networkId: getNetworkId(),
    ttl: ttlOneHour()
  });

  const txId = await submitLedger8Tx(providers, deploy.txBytes, {
    // Only ever a pre-fork head here -- a retained-era deploy against a
    // post-fork head was refused above -- but the era is passed rather than
    // assumed, so the seam arm is chosen by the same rule everywhere.
    head: resolved.head,
    kind: 'deploy',
    // The deploy has no circuit of its own to name, so the constructor's own
    // vocabulary is used rather than inventing a circuit id.
    circuitId: 'initialState',
    // READ OFF the composition record: a deploy mints a fresh nonce, so this is
    // the one address a caller has to check before deploying again.
    contractAddress: deploy.contractAddress
  });

  return { txId, deploy };
};

/** What attaching to an already-deployed retained-era contract arrived with. */
export interface Ledger8FindRequest {
  readonly contract: Ledger8ContractSlice;
  readonly contractAddress: string;
  /** Every entry point whose key is checked against the chain's slot. */
  readonly circuitIds: readonly string[];
}

/** The result of attaching to an already-deployed retained-era contract. */
export interface Ledger8FoundState {
  readonly deployTxData: VersionedFinalizedTxData;
}

/**
 * Attaches to an already-deployed retained-era contract: a READ path, so no
 * composition and no submission.
 *
 * It still resolves the head era, still dates the fetched state's envelope
 * against it, and still byte-matches the local verifier key against the slot
 * the chain holds — which are exactly the checks that make a later call
 * against this contract safe, done once here so a mis-dispatch is caught at
 * attach time instead of at the first call.
 *
 * The deploy record is returned version-tagged rather than narrowed: a
 * retained-era contract's deployment record belongs to whichever era was
 * current when it was deployed, and refusing the pre-fork arm here would
 * refuse every contract this pipeline exists to keep callable.
 *
 * @param providers The provider set.
 * @param request The contract, its address and the entry points to check.
 * @returns The deploy record as the read surface reported it.
 * @throws Error if the artifact declares no callable circuits, or if the
 * address is malformed.
 * @throws BlankVerifierKeySlotError, VerifierKeyMismatchError if the chain's
 * slot is empty or holds different bytes.
 */
export const findLedger8Contract = async (
  providers: Pick<Ledger8EntryProviders, 'publicDataProvider' | 'zkConfigProvider' | 'loggerProvider'>,
  request: Ledger8FindRequest
): Promise<Ledger8FoundState> => {
  assertIsContractAddress(request.contractAddress);

  const resolved = await resolveOperationEra(providers.publicDataProvider, providers.loggerProvider);
  assertEraCompatible('ledger8', resolved.head, 'call');
  emitPipelineSelection(providers.loggerProvider, resolved, 'ledger8', request.contractAddress);

  // EVERY cheap refusal happens before the deploy record is watched for, and
  // that order is the whole value of checking here: `watchForDeployTxData` is
  // an UNBOUNDED watch, so a mis-dispatch checked after it would not be
  // reported until the record arrived -- which for a wrong address may be
  // never. An empty circuit list is refused first of all: it would otherwise
  // make the loop below a no-op and attach to any state at all without
  // checking a single key.
  assertDefined(
    request.circuitIds.length > 0 ? request.circuitIds : undefined,
    `Contract at '${request.contractAddress}' cannot be attached to: the artifact declares no callable ` +
      'circuits, so there is no verifier key to check it against and nothing to call on it.'
  );

  // ONE snapshot for every key checked, never one read per circuit: two reads
  // could answer differently and leave half the keys checked against one state
  // and half against another.
  const snapshot = await readLedger8Snapshot(
    resolved.era,
    resolved.head,
    providers.publicDataProvider,
    request.contractAddress,
    providers.loggerProvider
  );
  for (const circuitId of request.circuitIds) {
    assertSnapshotVerifierKey(snapshot, circuitId, await providers.zkConfigProvider.getVerifierKey(circuitId));
  }

  return { deployTxData: await providers.publicDataProvider.watchForDeployTxData(request.contractAddress) };
};

/**
 * Refuses a retained-era transaction the node recorded with a non-success
 * status.
 *
 * A bare `Error` rather than {@link CallTxFailedError}, and the reason is a
 * type boundary rather than an oversight: that class carries a
 * current-era-only `FinalizedTxData`, and a retained-era record is the OTHER
 * arm of the read surface's union, which is not assignable to it. Narrowing
 * that class's property to the union would break every consumer that reads
 * `finalizedTxData.tx` today. The failure surface for this arm is settled
 * together with the submit-rejection handler that replaces this propagation,
 * so this fails closed and names the status in the meantime rather than
 * returning a record that reads as a success.
 *
 * @param record The finalized record the read surface reported.
 * @param circuitId The circuit this flow ran.
 * @throws Error if the recorded status is not `SucceedEntirely`.
 */
const assertLedger8TxSucceeded = (record: VersionedFinalizedTxData, circuitId: string): void => {
  if (record.status === SucceedEntirely) {
    return;
  }
  throw new Error(
    `The retained-era call to circuit '${circuitId}' was recorded on chain with status ` +
      `'${record.status}' rather than '${SucceedEntirely}' (transaction id '${record.txId}'). No private ` +
      `state was stored, so the local state still matches the chain.`
  );
};

/** The private-state members a retained-era call reads and writes. */
export type Ledger8PrivateStateSurface = Pick<PrivateStateProvider, 'get' | 'set' | 'setContractAddress'>;

/**
 * Reads the private state a retained-era call runs against, or `undefined`
 * when the caller named no private-state id.
 *
 * The two cases are DIFFERENT, and only one of them is `undefined`:
 *
 * - **No id at all.** Not an error: a contract with no private state is the
 *   normal case for the retained-era fixtures, and an absent id is the caller
 *   saying the circuit reads none.
 * - **An id, with nothing stored under it.** An ERROR, and the same one the
 *   current era raises at `get-states.ts` — naming an id is the caller saying
 *   there IS a private state to run against, so an empty provider means the
 *   state has not been written yet or the id is a typo.
 *
 * The second case is failed fast rather than passed through, because passing
 * `undefined` down is silent and expensive. The retained runtime's witnesses
 * would receive `currentPrivateState: undefined`, and a defensively written
 * witness (`state?.counter ?? 0n`) produces a perfectly valid proof against a
 * DEFAULT state instead of the caller's real one. `submitLedger8CallTx` then
 * writes the result back under that same id — storing a state derived from a
 * phantom starting point, or, on a typo, creating a state under an id nobody
 * reads while the real one goes untouched. Nothing errors at any stage.
 *
 * @param privateStateProvider The private-state surface to read through.
 * @param privateStateId The id the caller named, or `undefined` for a contract
 * that carries no private state.
 * @returns The stored private state, or `undefined` when no id was named.
 * @throws Error if an id was named and the provider holds nothing under it.
 */
const readLedger8PrivateState = async (
  privateStateProvider: Ledger8PrivateStateSurface,
  privateStateId: string | undefined
): Promise<unknown> => {
  if (privateStateId === undefined) {
    return undefined;
  }
  const privateState = await privateStateProvider.get(privateStateId);
  assertDefined(privateState, `No private state found at private state ID '${privateStateId}'`);
  return privateState;
};

/** The options a retained-era call entry point received, in the shape this layer reads them. */
export interface Ledger8CallEntryOptions {
  readonly compiledContract: Ledger8ContractSlice;
  readonly contractAddress: string;
  readonly circuitId: string;
  readonly args?: readonly unknown[];
  readonly privateStateId?: string;
}

/**
 * The providers a retained-era call entry point needs.
 *
 * `privateStateProvider` is OPTIONAL, mirroring the current era: an entry
 * point may legitimately be called with a provider set that omits it, for a
 * contract that carries no private state. Naming a `privateStateId` without
 * one is the caller error, and it is reported as such.
 */
export interface Ledger8CallEntryProviders extends Ledger8EntryProviders {
  readonly privateStateProvider?: Ledger8PrivateStateSurface;
}

/**
 * Reshapes the options a retained-era call entry point received into the
 * uniform shape this layer reads.
 *
 * `args` is a CONDITIONAL member on the caller's type — a circuit that takes
 * no arguments of its own has no `args` at all, rather than one the caller has
 * to satisfy with an empty array — so it is read with an `in` check and
 * defaulted here, in one place, rather than at each entry point.
 */
export const toLedger8CallEntryOptions = (options: AnyLedger8CallTxOptions): Ledger8CallEntryOptions => ({
  compiledContract: options.compiledContract,
  contractAddress: options.contractAddress,
  circuitId: options.circuitId,
  args: 'args' in options ? options.args : [],
  privateStateId: 'privateStateId' in options ? options.privateStateId : undefined
});

/**
 * Runs a retained-era call and returns immediately after submission.
 *
 * Stores nothing: without waiting for finalization there is no evidence the
 * chain accepted the call, and writing the next private state on the strength
 * of a submission alone is what leaves a caller's local state ahead of the
 * chain. The next private state is handed back so the caller can store it once
 * it has watched the transaction itself — the same division of labour the
 * current era's asynchronous submit follows.
 *
 * @param providers The provider set.
 * @param options The call the entry point received.
 * @returns The transaction id, the circuit, and the next private state.
 */
export const submitLedger8CallTxAsync = async (
  providers: Ledger8CallEntryProviders,
  options: Ledger8CallEntryOptions
): Promise<{ readonly txId: string; readonly circuitId: string; readonly nextPrivateState: unknown }> => {
  // The same two local refusals the current-era arm makes before any provider
  // is touched. A malformed address would otherwise cost a network round trip
  // to discover, and an unknown circuit id would surface as a blank
  // verifier-key slot -- a diagnosis pointing at the chain when the fault is a
  // typo in the caller's own call.
  assertIsContractAddress(options.contractAddress);
  assertDefined(
    Object.hasOwn(options.compiledContract.impureCircuits, options.circuitId) ? options.circuitId : undefined,
    `Circuit '${options.circuitId}' is undefined`
  );

  if (options.privateStateId !== undefined && providers.privateStateProvider === undefined) {
    throw new IncompleteCallTxPrivateStateConfig();
  }
  providers.privateStateProvider?.setContractAddress(options.contractAddress);
  const privateState =
    providers.privateStateProvider === undefined
      ? undefined
      : await readLedger8PrivateState(providers.privateStateProvider, options.privateStateId);

  const { txId, call } = await runLedger8Call(providers, {
    contract: options.compiledContract,
    contractAddress: options.contractAddress,
    circuitId: options.circuitId,
    args: options.args ?? [],
    privateState
  });

  return { txId, circuitId: call.circuitId, nextPrivateState: call.nextPrivateState };
};

/**
 * Runs a retained-era call and waits for the chain to record it, storing the
 * next private state only once it has.
 *
 * The finalized record is returned VERSION-TAGGED rather than narrowed: a
 * retained-era call is recorded by whichever era the network head is on, and
 * narrowing to one arm here would refuse the very records this pipeline exists
 * to produce.
 *
 * @param providers The provider set.
 * @param options The call the entry point received.
 * @returns The circuit, the next private state, and the finalized record.
 * @throws Error if the node recorded a non-success status — see
 * {@link assertLedger8TxSucceeded}.
 */
export const submitLedger8CallTx = async (
  providers: Ledger8CallEntryProviders,
  options: Ledger8CallEntryOptions
): Promise<{
  readonly circuitId: string;
  readonly nextPrivateState: unknown;
  readonly txData: VersionedFinalizedTxData;
}> => {
  const { txId, circuitId, nextPrivateState } = await submitLedger8CallTxAsync(providers, options);
  const txData = await providers.publicDataProvider.watchForTxData(txId);
  assertLedger8TxSucceeded(txData, circuitId);

  if (options.privateStateId !== undefined && providers.privateStateProvider !== undefined) {
    await providers.privateStateProvider.set(options.privateStateId, nextPrivateState);
  }

  return { circuitId, nextPrivateState, txData };
};

/**
 * Why {@link deployContract}'s retained-era arm refuses, in the SINGLE place
 * the text is written.
 *
 * ## The measured reason: the contract would be permanently unmaintainable
 *
 * Neither half of the retained deploy path accepts a maintenance authority.
 * The retained constructor context is built by
 * `createConstructorContext(initialPrivateState, coinPublicKey)` — two
 * parameters, no key — and the era facade's deploy composition takes
 * `{ contractState, verifierKeys, networkId, ttl }`, also no key. So the
 * authority a retained-era deployment carries is whatever the retained
 * constructor left behind.
 *
 * What it leaves behind was MEASURED, not assumed: an EMPTY committee with a
 * threshold of ONE (`committee: []`, `threshold: 1`, `counter: 0n`), on both
 * the constructor's own state and the state the deploy derives its address
 * from. A rule change on such a contract needs one signature from a set of
 * zero keys, which nothing can ever satisfy — so no verifier key could ever be
 * inserted, removed or replaced on it, and the authority itself could never be
 * updated either, because updating it is a rule change. The contract would be
 * permanently unmaintainable by anyone, including its deployer.
 * `packages/protocol/src/test/v8-deploy.test.ts` pins that measurement, and is
 * the test that will say so if a future retained runtime or era seam gains an
 * authority — at which point this refusal can be lifted.
 *
 * The current era does not have this problem because its constructor registers
 * the signing key it is given, which is what makes its
 * `DeployedContract.signingKey` a true statement about who can maintain the
 * deployment. On the retained era the same key would be registered nowhere, so
 * reporting one is not an option either.
 *
 * A deploy whose result cannot be maintained is not offered. The retained
 * era's purpose is to keep contracts deployed BEFORE the fork callable, and
 * those already carry the authority their own deployment registered; a new
 * retained-era deployment has no such history, which is the same reason a
 * retained-era deploy is refused outright on a post-fork head.
 *
 * A bare `Error` deliberately: a registered error code is a published consumer
 * surface, and this condition is removed as soon as the era seam carries an
 * authority.
 */
export const LEDGER8_DEPLOY_UNMAINTAINABLE =
  'A retained-era contract cannot be deployed. The transaction composes, but neither the retained ' +
  'constructor nor the era deploy composition accepts a maintenance authority, and the authority a ' +
  'retained constructor leaves behind is an empty committee with a threshold of one - which nothing ' +
  'can ever satisfy. The deployed contract could never have a verifier key inserted, removed or ' +
  'replaced, by anyone, including you. Deploy a contract produced by the current toolchain instead, ' +
  'and keep using the retained artifact for calls against contracts that were deployed before the ' +
  'fork - see the runtime-deploy chapter of the migration guide.';
