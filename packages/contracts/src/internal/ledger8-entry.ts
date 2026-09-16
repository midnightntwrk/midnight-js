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
 * orchestration ORDER and is pure; this one is the part that touches the
 * outside world.
 *
 * A successful operation reads the head ONCE. Two re-reads exist beyond it and neither happens on
 * the ordinary path. EVERY head reading is breadcrumbed with a `HeadReadingProvenance` naming
 * which it is — adding a reading without one is the mistake that list exists to prevent.
 *
 * @see {@link KeepStatePipeline} for the acquisition rules, the seam arms, and
 *      how a provider's own failure is sanitized.
 * @see {@link Breadcrumbs} for all four readings and what each provenance means.
 */

import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { DownConvertedState, Ledger8SigningKey, LedgerEra } from '@midnight-ntwrk/midnight-js-protocol';
import {
  type LedgerVersion,
  loadLedger8Engine,
  loadLedgerEra,
  UnknownLedgerVersionError
} from '@midnight-ntwrk/midnight-js-protocol';
import { Transaction, type UnprovenTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  assertSeamsSupportEra,
  type MidnightProvider,
  type PrivateStateId,
  type PrivateStateProvider,
  type ProofProvider,
  type PublicDataProvider,
  type ReadSeam,
  SucceedEntirely,
  type TransactionSeams,
  type VersionedFinalizedTxData,
  type WalletProvider,
  type ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';
import {
  assertDefined,
  assertIsContractAddress,
  hasErrorCode,
  parseCoinPublicKeyToHex,
  ttlOneHour
} from '@midnight-ntwrk/midnight-js-utils';

import { RETAINED_PIPELINE_ERA } from '../era';
import {
  EraInvariantViolationError,
  type EraSeam,
  IncompleteCallTxPrivateStateConfig,
  IncompleteDeployContractPrivateStateConfig,
  Ledger8CallTxFailedError,
  Ledger8DeployRecordEraError,
  Ledger8DeployRecordUnavailableError,
  Ledger8DeployTxFailedError,
  Ledger8SeamFailedError,
  type SubmittedOperation
} from '../errors';
import type {
  AnyLedger8CallTxOptions,
  AnyLedger8FinalizedCallTxData,
  AnyLedger8SubmittedCallTx,
  AnyLedger8UnsubmittedCallTxData
} from '../ledger8-contract';
import { type BreadcrumbSink, emitPipelineSelection } from './breadcrumbs';
import {
  assertEraCompatible,
  type HeadVersionSource,
  requireTaggedRecord,
  requireV8,
  requireV9,
  type ResolvedOperationEra,
  resolveOperationEra
} from './era';
import {
  assertSnapshotVerifierKey,
  type Ledger8CallPipelineResult,
  type Ledger8ConstructedState,
  type Ledger8ContractSlice,
  type Ledger8DeployPipelineResult,
  type Ledger8ExecutionEngine,
  readLedger8Snapshot,
  runLedger8CallPipeline,
  runLedger8DeployPipeline
} from './ledger8-pipeline';
import { handleSubmitRejection } from './stale-head';
import { createEncryptionPublicKeyResolver } from './utils';

/**
 * Reads the current era's own freshly composed bytes back into the live
 * transaction its provider seams take.
 *
 * The three markers name the transaction's stage — signature-enabled,
 * unproven, unbound — which is what `composeCallTx` documents its output as.
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
 * What {@link acquireLedger8Runtime} consults: the read surface for the one
 * head read, and the three write seams for their era declarations.
 *
 * Narrower than {@link Ledger8EntryProviders} — no ZK config, no logger — so a
 * reader can see that acquisition reads nothing else, and so a test can drive
 * it without standing up a provider set it does not exercise. A full
 * `Ledger8EntryProviders` satisfies it structurally.
 */
export interface Ledger8RuntimeProviders extends TransactionSeams {
  readonly publicDataProvider: HeadVersionSource;
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
  /**
   * The RETAINED era facade, which reads the contract's on-chain state.
   *
   * Separate from `resolved.era` on purpose. `resolved.era` follows the network head and is what a
   * transaction is composed on; this one follows the bytes the chain holds, which the fork does not
   * rewrite. Post-fork the two differ, and that difference IS keep-state.
   *
   * Acquiring it costs nothing extra here: the engine beside it has already pulled the retained
   * runtime, and the era load is memoised.
   */
  readonly retainedEra: LedgerEra;
}

/**
 * Resolves the head era and acquires the retained engine, then refuses the
 * `(retained artifact, head era)` pairings that cannot run and the provider
 * sets that cannot carry a retained-era transaction.
 *
 * The two acquisitions are independent and are started together; keep them
 * that way, because neither needs the other's answer.
 *
 * Every retained-era operation funnels through here — the call arm and the
 * deploy arm both — which is why the seam check belongs here rather than in
 * each of them.
 *
 * The era checked is `resolved.head`, because that is what picks the seam arm
 * in {@link submitLedger8Tx}: a pre-fork head crosses as `{ version: 'v8',
 * txBytes }` and a post-fork head as `{ version: 'v9', tx }`, since the tag
 * names the runtime that produced the bytes and keep-state composes on the
 * CURRENT era. Checking the artifact's era instead would refuse every keep-state
 * operation whose wallet serves only the current era — which is the ordinary
 * post-fork wallet.
 *
 * @param providers The provider set, for the one head read and for the three
 * write seams' era declarations.
 * @param kind Whether this operation deploys a contract or calls one already
 * deployed — the one cell where the era table differs.
 * @param breadcrumbs The optional logger the head-resolution and
 * pipeline-selection breadcrumbs are written to, and the contract this
 * operation names — omitted by a deploy, which has no address yet.
 * @returns The resolved era facts and the acquired engine.
 * @throws Ledger8DeployOnV9Error for a retained-era deploy on a post-fork head.
 * @throws UnknownProtocolVersionError if the head integer is off the era timeline.
 * @throws Ledger8RuntimeMissingError if the retained runtime cannot be acquired.
 * @throws SeamEraUnsupportedError if a write seam does not serve the era this
 * operation's payloads will carry, which is the head era.
 * @see {@link EraDispatch} for the pairing table.
 */
export const acquireLedger8Runtime = async (
  providers: Ledger8RuntimeProviders,
  kind: 'call' | 'deploy',
  breadcrumbs?: { readonly logger?: BreadcrumbSink; readonly contractAddress?: string }
): Promise<Ledger8Runtime> => {
  const [resolved, engine, retainedEra] = await Promise.all([
    resolveOperationEra(providers.publicDataProvider, breadcrumbs?.logger),
    loadLedger8Engine(),
    loadLedgerEra('v8')
  ]);
  assertEraCompatible('ledger8', resolved.head, kind);
  // AFTER the era gate, and both before the selection breadcrumb and before any
  // composition: a proof is the expensive step and the first of the three, so a
  // seam that cannot take this operation's payload has to be found now rather
  // than after one has been paid for.
  assertSeamsSupportEra(resolved.head, providers);
  // AFTER the gates: a selection breadcrumb written before them would claim a
  // pipeline for an operation the very next line refuses.
  emitPipelineSelection(breadcrumbs?.logger, resolved, 'ledger8', breadcrumbs?.contractAddress);

  return { resolved, engine, retainedEra };
};

/**
 * The three shapes transaction and witness material takes inside an error
 * message: a long run of hex, a long run of base64 or base64url, or a long list
 * of decimal byte values.
 *
 * Matched by SHAPE rather than by any provider's message format, because the
 * set of providers is open. Each alternative is deliberately narrow:
 *
 * - HEX at 24 characters and up, which is a 12-byte value. The floor is not
 *   lower because a run of hex-alphabet characters can be an ordinary word
 *   (`decade`, `defaced`); at 24 it cannot be. A secret shorter than 12 bytes
 *   is NOT redacted — see {@link Ledger8SeamFailedError} for why this is stated
 *   as best effort rather than as a guarantee.
 * - BASE64 / BASE64URL at 40 characters and up, and only when the run mixes
 *   lower case, upper case and a digit. That mixture is what separates an
 *   encoded payload from a URL path or a long class name, both of which are
 *   high-value diagnostics: `com/api/v1/graphql/subscriptions` has no upper
 *   case, and `ContractStateDeserializationFailed` has no digit, so neither is
 *   eaten. Do not drop the three lookaheads to "simplify" this — without them
 *   the endpoint a misconfiguration names is exactly what disappears.
 * - A DECIMAL BYTE LIST of 13 values or more, which is what
 *   `JSON.stringify(new Uint8Array(...))` and Node's own inspection of a typed
 *   array produce. Commas and spaces break the other two alternatives, so
 *   without this a payload rendered as numbers passes through untouched.
 *
 * @see {@link KeepStatePipeline} for what each alternative catches and misses.
 */
const PAYLOAD_SHAPED = new RegExp(
  [
    '[0-9a-fA-F]{24,}',
    '(?=[A-Za-z0-9+/_-]*[a-z])(?=[A-Za-z0-9+/_-]*[A-Z])(?=[A-Za-z0-9+/_-]*[0-9])[A-Za-z0-9+/_-]{40,}={0,2}',
    '(?:\\d{1,3}\\s*,\\s*){12,}\\d{1,3}'
  ].join('|'),
  'g'
);
const REDACTED = '[redacted]';

/**
 * How much of a provider's message is copied onto the sanitized cause.
 *
 * An unbounded copy ends up in `error.stack` and from there in every log sink
 * the caller has. A provider that renders a whole transaction in a shape no
 * alternative above matches would otherwise put all of it there.
 */
const MAX_SEAM_MESSAGE_LENGTH = 2_000;

/** How many links of a `cause` chain are rebuilt before the walk stops. */
const MAX_SEAM_CAUSE_DEPTH = 5;

/** How many members of an `AggregateError` are rebuilt. */
const MAX_SEAM_AGGREGATE = 5;

/**
 * Whether a value is an `Error`, including one minted in another realm.
 *
 * `instanceof` is realm-sensitive: an `Error` from a worker, a `vm` context or
 * a WASM module fails it and would be reported as `object: ...`, losing both
 * the class name and the message.
 *
 * @param value The rejection to classify.
 * @returns `true` if the value is an `Error` from any realm.
 */
const isErrorLike = (value: unknown): value is Error =>
  value instanceof Error || Object.prototype.toString.call(value) === '[object Error]';

/**
 * The class name to report for a rejection.
 *
 * `name` is only correct when a subclass assigns it — this repo's own errors do,
 * third-party provider errors routinely do not, and for those `name` reads
 * `'Error'`. The constructor name is the fallback, so a
 * `ProofServerHttpError` is still named one.
 *
 * @param cause The rejection to name.
 * @returns The most specific class name available, or the `typeof` for a
 * non-error rejection.
 */
const describeSeamKind = (cause: unknown): string => {
  if (!isErrorLike(cause)) {
    return typeof cause;
  }
  const constructorName = cause.constructor?.name;
  return cause.name !== 'Error' || constructorName === undefined ? cause.name : constructorName;
};

/**
 * Renders a rejection as text without being able to throw.
 *
 * `String(value)` throws for a null-prototype object and for anything with a
 * throwing `toString` or `Symbol.toPrimitive` — shapes that RPC bridges and
 * WASM glue do produce. Unguarded, that `TypeError` would propagate FROM THE
 * CATCH BLOCK and replace the provider's rejection entirely, losing the seam,
 * the circuit and the original value.
 *
 * @param cause The rejection to render.
 * @returns Its message, its string form, or a placeholder naming its shape.
 */
const renderSeamCause = (cause: unknown): string => {
  try {
    return isErrorLike(cause) ? cause.message : String(cause);
  } catch {
    return `<unrenderable ${Object.prototype.toString.call(cause)}>`;
  }
};

/** Redacts payload-shaped runs and caps the length of a copied message. */
const redact = (text: string): string => {
  const redacted = text.replace(PAYLOAD_SHAPED, REDACTED);
  return redacted.length <= MAX_SEAM_MESSAGE_LENGTH
    ? redacted
    : `${redacted.slice(0, MAX_SEAM_MESSAGE_LENGTH)}... [truncated]`;
};

/**
 * Rebuilds an external failure as a plain {@link Error} carrying its class
 * name, a redacted message, a redacted stack and a redacted `cause` chain.
 *
 * The provider's ENUMERABLE PROPERTIES are dropped — that is where HTTP clients
 * keep echoed request bodies, and there is no shape-independent way to redact
 * an arbitrary object graph. Everything else is kept REDACTED rather than
 * dropped, because dropping it buys nothing the redaction does not already buy:
 *
 * - The `cause` CHAIN is where modern wrapping errors keep the diagnosis. A
 *   bare `fetch` failure is `Error: fetch failed` with the real reason — wrong
 *   port, DNS, TLS, connection refused — one or two links down. Truncating at
 *   depth one renders every one of those identically.
 * - The STACK is where a bug in the caller's OWN provider implementation is
 *   located. A fresh stack points at this function instead, which is the one
 *   place the answer certainly is not. Frames are paths and function names, and
 *   they go through the same redaction anyway.
 *
 * @param cause Whatever the provider rejected with — `unknown`, because a
 * rejection is not obliged to be an `Error`.
 * @param depth How many links have already been rebuilt.
 * @returns A plain error safe to hand to a logger.
 * @see {@link KeepStatePipeline} for what is dropped and what is kept redacted.
 */
const sanitizeSeamCause = (cause: unknown, depth = 0): Error => {
  const nested = isErrorLike(cause) ? (cause as Error).cause : undefined;
  const rebuilt = new Error(
    `${describeSeamKind(cause)}: ${redact(renderSeamCause(cause))}`,
    depth < MAX_SEAM_CAUSE_DEPTH && nested !== undefined
      ? { cause: sanitizeSeamCause(nested, depth + 1) }
      : undefined
  );
  if (isErrorLike(cause) && typeof cause.stack === 'string') {
    rebuilt.stack = redact(cause.stack);
  }
  // `AggregateError.errors` is where `fetch` reports the per-address failures
  // behind a connection error, and it is an own property, so it does not travel
  // with the message or the cause chain.
  if (cause instanceof AggregateError && depth < MAX_SEAM_CAUSE_DEPTH) {
    Object.defineProperty(rebuilt, 'errors', {
      value: cause.errors
        .slice(0, MAX_SEAM_AGGREGATE)
        .map((member: unknown) => sanitizeSeamCause(member, depth + 1)),
      enumerable: true
    });
  }
  return rebuilt;
};

/**
 * Runs one provider seam call, converting a rejection from the provider into
 * {@link Ledger8SeamFailedError} with the failure sanitized onto `cause`.
 *
 * This framework's OWN coded errors pass through UNCHANGED: a caller narrowing
 * on `V8PayloadUnsupportedError` or {@link EraInvariantViolationError} has to
 * keep seeing them. `hasErrorCode` is the registry-backed test, so a foreign
 * coded error is still treated as external and sanitized.
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
 * How an era arm reaches the submit seam.
 *
 * Taken as a parameter rather than called directly, so the fork-crossing
 * diagnosis is applied ONCE, by the caller, around whichever arm runs. Two arms
 * each calling `atSeam('submitTx', ...)` themselves is exactly how they drift
 * into different failure handling.
 */
type SubmitSeam = (call: () => Promise<string>) => Promise<string>;

/**
 * Proves, balances and submits on the CURRENT-era seam arm, as a live handle.
 *
 * @param providers The proof, wallet and submission providers.
 * @param txBytes The serialized unproven transaction the era composed.
 * @param circuitId The circuit this flow is running, named in any refusal.
 * @param submit The submit seam, already wrapped with the fork-crossing
 * diagnosis by {@link submitLedger8Tx}.
 * @returns The transaction id the network assigned.
 */
const submitLedger8TxOnCurrentEra = async (
  providers: Pick<Ledger8EntryProviders, 'proofProvider' | 'walletProvider' | 'midnightProvider'>,
  txBytes: Uint8Array,
  circuitId: string,
  submit: SubmitSeam
): Promise<string> => {
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
};

/**
 * Proves, balances and submits on the RETAINED-era seam arm, as serialized
 * bytes.
 *
 * @param providers The proof, wallet and submission providers.
 * @param txBytes The serialized unproven transaction the era composed.
 * @param circuitId The circuit this flow is running, named in any refusal.
 * @returns The transaction id the network assigned.
 */
const submitLedger8TxOnRetainedEra = async (
  providers: Pick<Ledger8EntryProviders, 'proofProvider' | 'walletProvider' | 'midnightProvider'>,
  txBytes: Uint8Array,
  circuitId: string,
  submit: SubmitSeam
): Promise<string> => {
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
/**
 * Proves, balances and submits a retained-era-executed transaction, and
 * returns the transaction id.
 *
 * The seam arm is NOT the same on both heads: a pre-fork head crosses as
 * `{ version: 'v8', txBytes }` and a post-fork head as `{ version: 'v9', tx }`,
 * because the `version` tag names the ledger runtime that produced the bytes,
 * never the toolchain that produced the contract.
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
 * @see {@link KeepStatePipeline} for the seam table and why tagging the
 *      post-fork arm `'v8'` would be false.
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
  // Wrapped ONCE, around whichever arm's submit runs, so the two arms cannot end
  // up with different failure handling. `atSeam` still does the sanitizing --
  // what this adds is the fork-crossing diagnosis on top of its result.
  const submit: SubmitSeam = async (call) => {
    try {
      return await atSeam('submitTx', circuitId, call);
    } catch (rejection) {
      return handleSubmitRejection(providers.publicDataProvider, operation, rejection, providers.loggerProvider);
    }
  };

  // A SWITCH closing on `never`, not an `if`: an era added to `LedgerVersion`
  // must not fall through into the pre-fork arm and submit retained-era bytes
  // to a head that never asked for them. Every other era decision in this
  // package closes the same way -- see `assertEraCompatible`.
  switch (head) {
    case 'v9':
      return submitLedger8TxOnCurrentEra(providers, txBytes, circuitId, submit);
    case 'v8':
      return submitLedger8TxOnRetainedEra(providers, txBytes, circuitId, submit);
    default: {
      const unhandled: never = head;
      throw new UnknownLedgerVersionError(String(unhandled));
    }
  }
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
  readonly call: Ledger8CallPipelineResult<DownConvertedState>;
  /**
   * The era the network head was on when this call started.
   *
   * Deliberately NOT on the published `Ledger8SubmittedCallTx`: that type names
   * the era of the PIPELINE, and this is the era of the NETWORK. The two are
   * different facts and they disagree on this arm every time a retained-era
   * call is recorded post-fork. The finalizing arm needs this one to attribute
   * the record it fetches, so it travels on this internal shape instead.
   */
  readonly head: LedgerVersion;
}

/**
 * Runs one retained-era call end to end: acquire, compose through the
 * pipeline, then prove, balance and submit.
 *
 * The verifier key the pre-proving check compares is fetched BEFORE the
 * pipeline runs, because the pipeline's key check has to happen before any
 * proof exists.
 *
 * The pipeline is handed a RESOLVER, never a bare encryption key, so shielded
 * outputs are encrypted per recipient and an unresolvable recipient is refused
 * rather than mis-encrypted.
 *
 * @param providers The provider set.
 * @param request The contract, its address, the circuit, its arguments and the
 * private state to run against.
 * @returns The transaction id and what the call produced.
 * @throws EraArtifactMismatchError, UnknownLedgerVersionError from era resolution.
 * @throws HeadStateEraMismatchError, IndexerInconsistencyError if the fetched
 * envelope's era disagrees with the head.
 * @throws StateDecodeFailedError if the envelope will not decode on this era.
 * @throws Ledger8AmbiguousEntryPointError if the state names the circuit twice.
 * @throws BlankVerifierKeySlotError, VerifierKeyMismatchError from the
 * pre-proving key check.
 * @throws Ledger8ShieldedSpendUnsupportedError if the circuit spends a coin the
 * contract already held.
 * @throws Ledger8RecipientUnmappableError if a shielded output pays a recipient
 * this arm cannot resolve.
 * @throws V8PayloadUnsupportedError if a provider does not serve the pre-fork arm.
 * @throws EraInvariantViolationError if a provider answers in the other era.
 * @throws Ledger8SeamFailedError if a provider rejects.
 * @see {@link KeepStatePipeline} for the per-recipient encryption rule and what
 *      a bare key would cost.
 */
export const runLedger8Call = async (
  providers: Ledger8EntryProviders,
  request: Ledger8CallRequest
): Promise<Ledger8SubmittedCall> => {
  const { resolved, engine, retainedEra } = await acquireLedger8Runtime(providers, 'call', {
    logger: providers.loggerProvider,
    contractAddress: request.contractAddress
  });
  const localVerifierKey = await providers.zkConfigProvider.getVerifierKey(request.circuitId);

  // Read ONCE and used for both the circuit's coin public key and the
  // resolver's notion of "the wallet's own key". Two reads of the same wallet
  // member could disagree, and a resolver built against a different key than
  // the circuit executed under is exactly the mismatch that mis-encrypts.
  //
  // NORMALIZED, exactly as every current-era call site normalizes it. A real
  // wallet hands this over Bech32m-encoded; the retained runtime's
  // `encodeCoinPublicKey` accepts hex only and throws `Invalid character 'm' at
  // position 0` from inside the WASM on anything else. `parseCoinPublicKeyToHex`
  // passes hex through unchanged, so this is free for a wallet that already
  // answers in hex. DO NOT DROP IT: the testkit wallet answers in hex, so no
  // test in this repo can catch its absence.
  const coinPublicKey = parseCoinPublicKeyToHex(providers.walletProvider.getCoinPublicKey(), getNetworkId());

  const call = await runLedger8CallPipeline({
    era: resolved.era,
    retainedEra,
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

  return { txId, call, head: resolved.head };
};

/** What a retained-era deploy arrived with. */
export interface Ledger8DeployRequest {
  readonly contract: Ledger8ContractSlice;
  readonly args: readonly unknown[];
  readonly privateState: unknown;
  /**
   * Fetches one verifier key per entry point the constructor's state will
   * declare.
   *
   * A RESOLVER rather than the map itself, because an argument is evaluated
   * before the call it is an argument to: a map built inline was fetched ahead
   * of the era and seam gates below, so a retained artifact on a post-fork head
   * - whose ZK config an ordinary browser no longer serves after the fork - got
   * the provider's fetch rejection in place of `Ledger8DeployOnV9Error`, which
   * is the reason a caller can act on.
   */
  readonly resolveVerifierKeys: () => Promise<ReadonlyMap<string, Uint8Array>>;
  /**
   * The key to register as the deployed contract's maintenance authority. A
   * caller that names none gets a sampled one, reported on the result.
   */
  readonly signingKey?: Ledger8SigningKey;
}

/** A composed and submitted retained-era deploy. */
export interface Ledger8SubmittedDeploy {
  readonly txId: string;
  readonly deploy: Ledger8DeployPipelineResult;
  /**
   * The era the network head was on when this deploy started, for the same
   * reason {@link Ledger8SubmittedCall.head} carries it: the finalizing step
   * needs it to attribute the record it fetches, and re-reading the head there
   * could answer differently.
   */
  readonly head: LedgerVersion;
}

/**
 * Runs one retained-era deploy end to end: acquire, execute the constructor and
 * compose through the pipeline, then prove, balance and submit.
 *
 * Reachable only on a pre-fork head; {@link acquireLedger8Runtime} refuses the
 * post-fork case before the constructor is executed.
 *
 * @param providers The provider set.
 * @param request The contract, its constructor arguments, the private state,
 * the verifier keys to register and the optional signing key.
 * @returns The transaction id, the composed deploy record and the head era.
 * @throws Ledger8DeployOnV9Error on a post-fork head.
 */
export const runLedger8Deploy = async (
  providers: Ledger8EntryProviders,
  request: Ledger8DeployRequest
): Promise<Ledger8SubmittedDeploy> => {
  // No contract address on this arm: a deploy has none until the composition
  // below mints one, so the selection breadcrumb leaves the field out.
  const { resolved, engine } = await acquireLedger8Runtime(providers, 'deploy', {
    logger: providers.loggerProvider
  });

  // AFTER the gates above, never as an argument to the composition below: an
  // argument is evaluated before its call, which put this fetch ahead of the
  // very refusals that exist to be raised first. See the field's own comment.
  const verifierKeys = await request.resolveVerifierKeys();

  // Read ONCE. The call arm forbids the second read for the reason that applies
  // here unchanged: a resolver built against a different key than the one the
  // constructor executed under is exactly the mismatch that mis-encrypts a coin
  // the constructor minted. Normalized once too, so both uses get the same
  // form rather than relying on the resolver normalizing again internally.
  const coinPublicKey = parseCoinPublicKeyToHex(providers.walletProvider.getCoinPublicKey(), getNetworkId());

  const deploy = runLedger8DeployPipeline({
    era: resolved.era,
    engine,
    contract: request.contract,
    args: request.args,
    privateState: request.privateState,
    coinPublicKey,
    verifierKeys,
    signingKey: request.signingKey,
    networkId: getNetworkId(),
    ttl: ttlOneHour(),
    // Built the same way the call arm builds it, so a coin a constructor mints
    // is encrypted to the same key a coin a circuit mints would be.
    encryptionPublicKey: createEncryptionPublicKeyResolver(
      coinPublicKey,
      providers.walletProvider.getEncryptionPublicKey()
    )
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

  return { txId, deploy, head: resolved.head };
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
 * It still resolves the head era, dates the fetched state's envelope against
 * it, and byte-matches the local verifier key — the checks that make a later
 * call safe, done once here so a mis-dispatch is caught at attach time.
 *
 * The deploy record is returned version-tagged rather than narrowed.
 *
 * @param providers The provider set.
 * @param request The contract, its address and the entry points to check.
 * @returns The deploy record as the read surface reported it.
 * @throws Error if the artifact declares no callable circuits, or if the
 * address is malformed.
 * @throws EraArtifactMismatchError, UnknownLedgerVersionError from era resolution.
 * @throws HeadStateEraMismatchError, IndexerInconsistencyError if the fetched
 * envelope's era disagrees with the head.
 * @throws StateDecodeFailedError if the envelope will not decode on this era.
 * @throws Ledger8AmbiguousEntryPointError if the state names a circuit twice.
 * @throws BlankVerifierKeySlotError, VerifierKeyMismatchError if the chain's
 * slot is empty or holds different bytes.
 * @see {@link KeepStatePipeline} for why the record keeps its version tag.
 */
export const findLedger8Contract = async (
  providers: Pick<Ledger8EntryProviders, 'publicDataProvider' | 'zkConfigProvider' | 'loggerProvider'>,
  request: Ledger8FindRequest
): Promise<Ledger8FoundState> => {
  assertIsContractAddress(request.contractAddress);

  const [resolved, retainedEra] = await Promise.all([
    resolveOperationEra(providers.publicDataProvider, providers.loggerProvider),
    loadLedgerEra('v8')
  ]);
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
    retainedEra,
    // `resolved.era`, not a second `loadLedgerEra`: the facade bound to this head was acquired at
    // the operation's start, and acquiring one is a lazy WASM load.
    resolved.era,
    resolved.head,
    providers.publicDataProvider,
    request.contractAddress,
    providers.loggerProvider
  );
  for (const circuitId of request.circuitIds) {
    assertSnapshotVerifierKey(
      snapshot,
      circuitId,
      await providers.zkConfigProvider.getVerifierKey(circuitId),
      request.contractAddress
    );
  }

  // Tagged, not attributed to the head: a contract found on chain was deployed
  // in whichever era was current THEN, so either arm is a legitimate answer
  // here and there is no era to compare against. The current era's arm narrows
  // to v9 at this same seam because v9 is its only legitimate answer.
  return {
    deployTxData: requireTaggedRecord(
      await providers.publicDataProvider.watchForDeployTxData(request.contractAddress),
      'watchForDeployTxData'
    )
  };
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
 * @throws Ledger8CallTxFailedError if the recorded status is not `SucceedEntirely`.
 */
const assertLedger8TxSucceeded = (record: VersionedFinalizedTxData, circuitId: string): void => {
  if (record.status === SucceedEntirely) {
    return;
  }
  throw new Ledger8CallTxFailedError(record, circuitId);
};

/**
 * Refuses a retained-era DEPLOYMENT the node recorded with a non-success
 * status.
 *
 * Its own refusal rather than {@link assertLedger8TxSucceeded} because the
 * remediation differs: a failed call can be run again unchanged, while a deploy
 * mints a fresh nonce, so repeating one that in fact finalized leaves two
 * copies of the contract on chain.
 *
 * @param record The finalized record the read surface reported.
 * @param contractAddress The address this deployment composed, which is the
 * one thing a caller has to reconcile before deploying again.
 * @param signingKey The key the deployment's maintenance authority was built
 * from. Carried onto the refusal because a `FailFallible` deployment LANDED -
 * a contract deployment sits in the guaranteed phase - and a sampled key
 * discarded there leaves an address nobody can maintain.
 * @throws Ledger8DeployTxFailedError if the recorded status is not `SucceedEntirely`.
 */
const assertLedger8DeploySucceeded = (
  record: VersionedFinalizedTxData,
  contractAddress: string,
  signingKey: Ledger8SigningKey
): void => {
  if (record.status === SucceedEntirely) {
    return;
  }
  throw new Ledger8DeployTxFailedError(record, contractAddress, signingKey);
};

/**
 * Refuses a finalized record the head this operation resolved cannot have
 * recorded.
 *
 * `version` on the record SELECTS the runtime of the live `tx` handle beside
 * it, so a mislabelled record does not fail loudly: a caller that narrows on
 * it reaches into the other ledger module and is handed a plausible wrong
 * value. The current era refuses the mirror of this at the same seam, through
 * `requireV9Record`. This is the retained arm's half, and it compares the
 * record against the HEAD rather than against a fixed era, because a
 * retained-era call is legitimately recorded by EITHER era -- which is why the
 * result type keeps `version` a union in the first place.
 *
 * What this does NOT assert is that the result's `era` and the record's
 * `version` agree. They legitimately disagree: `era: 'ledger8'` with
 * `version: 'v9'` IS a keep-state transaction. The agreement that has to hold
 * is between the record and the head the operation started on.
 *
 * Checked BEFORE the status, because `status` is a field of the very record
 * whose provenance is in doubt. A call that both failed and came back
 * mislabelled therefore reports the era fault, which is the one naming a cause
 * a caller can act on.
 *
 * @param record The finalized record the read surface returned.
 * @param head The era the network head was on when this operation started.
 * @param circuitId The circuit this flow ran, named in the refusal. A deploy
 * names the constructor's own vocabulary, having no circuit of its own.
 * @param seam The read-surface method that returned the record: a call watches
 * for its transaction id, a deploy for its address. Named rather than fixed so
 * the refusal points a caller at the method that actually answered.
 * @throws EraInvariantViolationError if the record's era is not the head's.
 */
const assertLedger8RecordEra = (
  record: VersionedFinalizedTxData,
  head: LedgerVersion,
  circuitId: string,
  seam: ReadSeam
): void => {
  // Shape before era: a tag that names no era is a DIFFERENT fault from one
  // naming the wrong era, and it wants a different remediation. Telling a
  // caller whose provider emitted no tag to check that nothing "re-tags" the
  // payload points them away from the fault. This is the same split the
  // current era's `requireV9Record` makes in its own default branch.
  const tagged = requireTaggedRecord(record, seam);
  if (tagged.version === head) {
    return;
  }
  throw new EraInvariantViolationError(seam, circuitId, head, tagged.version);
};

/** The private-state members a retained-era call reads and writes. */
export type Ledger8PrivateStateSurface = Pick<PrivateStateProvider, 'get' | 'set' | 'setContractAddress'>;

/**
 * Reads the private state a retained-era call runs against, or `undefined`
 * when the caller named no private-state id.
 *
 * NO ID is not an error — a retained-era contract may carry no private state.
 * AN ID WITH NOTHING STORED UNDER IT is an error, and must stay one: passing
 * `undefined` down produces a valid proof against a default state and then
 * writes the result back under the caller's id. Nothing errors at any stage.
 *
 * @param privateStateProvider The private-state surface to read through.
 * @param privateStateId The id the caller named, or `undefined` for a contract
 * that carries no private state.
 * @returns The stored private state, or `undefined` when no id was named.
 * @throws Error if an id was named and the provider holds nothing under it.
 * @see {@link KeepStatePipeline} for the full failure mode.
 */
const readLedger8PrivateState = async (
  privateStateProvider: Ledger8PrivateStateSurface,
  privateStateId: string | undefined
): Promise<unknown> => {
  if (privateStateId === undefined) {
    return undefined;
  }
  const privateState = await privateStateProvider.get(privateStateId);
  // The current era raises the same first sentence from `get-states.ts`, and the
  // REMEDIATION is appended rather than replacing it: a CALL cannot seed the id
  // it was handed - its options carry no `initialPrivateState` - so the state
  // must already have been written by an earlier operation, and naming which
  // operations those are is what separates "nothing is stored under this id"
  // from "there is no way to store anything under it".
  assertDefined(
    privateState,
    `No private state found at private state ID '${privateStateId}'. A retained-era call cannot ` +
      'seed one - only `deployContract` and `findDeployedContract` take an `initialPrivateState`, ' +
      'each alongside the `privateStateId` it is stored under - so seed it at deploy time or at ' +
      'attach time, or write it directly with `privateStateProvider.set(privateStateId, state)` ' +
      'before calling, or omit `privateStateId` for a contract that carries no private state.'
  );
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
 *
 * @param options The options a retained-era call entry point received.
 * @returns The same call in the shape this layer reads.
 */
export const toLedger8CallEntryOptions = (options: AnyLedger8CallTxOptions): Ledger8CallEntryOptions => ({
  compiledContract: options.compiledContract,
  contractAddress: options.contractAddress,
  circuitId: options.circuitId,
  args: 'args' in options ? options.args : [],
  privateStateId: 'privateStateId' in options ? options.privateStateId : undefined
});

/**
 * The retained era's execution data, built in ONE place: the async arm
 * publishes it as it stands, and the finalizing arm merges the record onto its
 * public half. Two construction sites could report different executions of the
 * same call.
 */
const toLedger8CallTxData = (
  call: Ledger8CallPipelineResult<DownConvertedState>
): AnyLedger8UnsubmittedCallTxData => ({
  era: RETAINED_PIPELINE_ERA,
  public: {
    publicTranscript: call.publicTranscript,
    partitionedTranscript: call.partitionedTranscript,
    nextContractState: call.nextContractState,
    nextContractStateEncoded: call.nextContractStateEncoded
  },
  private: {
    input: call.input,
    output: call.output,
    privateTranscriptOutputs: call.privateTranscriptOutputs,
    result: call.result,
    nextPrivateState: call.nextPrivateState,
    nextZswapLocalState: call.nextZswapLocalState,
    newCoins: call.newCoins,
    txBytes: call.txBytes
  },
  calls: call.calls
});

/**
 * What one retained-era call entry produced: the submitted-call result the
 * public arms answer with, and the era the network head was on.
 *
 * The head is here rather than on `Ledger8SubmittedCallTx` for the reason
 * given on {@link Ledger8SubmittedCall.head}: that type names the era of the
 * PIPELINE, this is the era of the NETWORK, and on this arm they routinely
 * differ. The finalizing arm needs the network's to attribute the record it
 * fetches, and no caller needs it at all.
 */
interface Ledger8CallEntryOutcome {
  readonly submitted: AnyLedger8SubmittedCallTx;
  readonly head: LedgerVersion;
}

/**
 * Runs one retained-era call: the local refusals, the private-state read, the
 * pipeline, and the submission -- everything both public arms share.
 *
 * Extracted so the finalizing arm can reach the head this call resolved
 * WITHOUT a second head read. Re-reading it would break the single-head-read
 * invariant the entry points are asserted against, and worse, a second reading
 * could answer differently and attribute the record against an era the
 * transaction was never built for.
 *
 * @param providers The provider set.
 * @param options The call the entry point received.
 * @returns The submitted-call result and the head era it resolved.
 * @throws Every error the public arms document.
 */
const runLedger8CallEntry = async (
  providers: Ledger8CallEntryProviders,
  options: Ledger8CallEntryOptions
): Promise<Ledger8CallEntryOutcome> => {
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

  const { txId, call, head } = await runLedger8Call(providers, {
    contract: options.compiledContract,
    contractAddress: options.contractAddress,
    circuitId: options.circuitId,
    args: options.args ?? [],
    privateState
  });

  return {
    submitted: {
      era: RETAINED_PIPELINE_ERA,
      txId,
      circuitId: call.circuitId,
      callTxData: toLedger8CallTxData(call)
    },
    head
  };
};

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
 * @returns The transaction id, the circuit, the next private state, and the
 * execution data — everything but a finalized record, which a submission that
 * does not wait for one cannot have.
 * @throws TypeError if the contract address is malformed.
 * @throws Error if the artifact declares no such circuit, or if a named
 * `privateStateId` has nothing stored under it.
 * @throws IncompleteCallTxPrivateStateConfig if a `privateStateId` is named
 * with no private-state provider.
 * @throws Every error {@link runLedger8Call} raises.
 */
export const submitLedger8CallTxAsync = async (
  providers: Ledger8CallEntryProviders,
  options: Ledger8CallEntryOptions
): Promise<AnyLedger8SubmittedCallTx> => (await runLedger8CallEntry(providers, options)).submitted;

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
 * @throws Ledger8CallTxFailedError if the node recorded a non-success status —
 * see {@link assertLedger8TxSucceeded}. Raised BEFORE the private state is
 * stored, so a failed call never leaves the local state ahead of the chain.
 * @throws Every error {@link submitLedger8CallTxAsync} raises.
 */
export const submitLedger8CallTx = async (
  providers: Ledger8CallEntryProviders,
  options: Ledger8CallEntryOptions
): Promise<AnyLedger8FinalizedCallTxData> => {
  const { submitted, head } = await runLedger8CallEntry(providers, options);
  const { txId, circuitId, callTxData } = submitted;
  // The ONE path to the next private state, the same one the current era
  // publishes and this arm's own asynchronous surface documents.
  const nextPrivateState = callTxData.private.nextPrivateState;
  const txData = await providers.publicDataProvider.watchForTxData(txId);
  // Attribute the record BEFORE reading anything off it -- see the helper.
  assertLedger8RecordEra(txData, head, circuitId, 'watchForTxData');
  assertLedger8TxSucceeded(txData, circuitId);

  if (options.privateStateId !== undefined && providers.privateStateProvider !== undefined) {
    await providers.privateStateProvider.set(options.privateStateId, nextPrivateState);
  }

  // The finalized answer is the SAME execution data the async arm published,
  // with the record merged onto its public half. Built from one place so the
  // two surfaces cannot report different executions of the same call.
  return {
    era: RETAINED_PIPELINE_ERA,
    circuitId,
    public: { ...txData, ...callTxData.public },
    private: callTxData.private,
    calls: callTxData.calls
  };
};

/** The options a retained-era deploy entry point received, in the shape this layer reads them. */
export interface Ledger8DeployEntryOptions {
  readonly compiledContract: Ledger8ContractSlice;
  readonly args?: readonly unknown[];
  readonly privateStateId?: PrivateStateId;
  readonly initialPrivateState?: unknown;
  readonly signingKey?: Ledger8SigningKey;
}

/**
 * The providers a retained-era deploy entry point needs.
 *
 * `privateStateProvider` is REQUIRED here where the call arm's is optional, and
 * that follows the provider set a caller actually holds: `MidnightProviders`
 * declares it, and both this arm and the attach arm write through it without a
 * guard.
 */
export interface Ledger8DeployEntryProviders extends Ledger8EntryProviders {
  readonly privateStateProvider: Ledger8PrivateStateSurface;
}

/** Everything one retained-era deployment produced that a caller is handed. */
export interface Ledger8DeployedState {
  /** The address the composition minted, which no other deployment shares. */
  readonly contractAddress: string;
  readonly deployTxData: VersionedFinalizedTxData;
  readonly signingKey: Ledger8SigningKey;
  readonly initialState: Uint8Array;
  readonly initialContractState: Ledger8ConstructedState['contractState'];
  /** The private state the CONSTRUCTOR produced. */
  readonly initialPrivateState: unknown;
  readonly initialZswapState: Ledger8DeployPipelineResult['initialZswapState'];
}

/**
 * Deploys a retained-era contract and waits for the chain to record it, storing
 * the private state only once it has.
 *
 * The ORDER below is the whole of what this function adds over
 * {@link runLedger8Deploy}, and it mirrors {@link submitLedger8CallTx}: watch,
 * attribute the record against the head, refuse a non-success status, and only
 * then store. A deploy that the chain refused must leave no local private state
 * ahead of it — and on this arm that matters more than on the call arm, because
 * a second attempt lands at a different address.
 *
 * The verifier keys are fetched for EVERY entry point the artifact declares,
 * off the artifact rather than off any state: a retained constructor builds
 * every slot blank and the retained deploy registers no keys of its own, so a
 * map naming anything else puts a contract on chain that nothing can call.
 *
 * @param providers The provider set.
 * @param options The deployment the entry point received.
 * @returns The minted address, the finalized record, the signing key and
 * everything the constructor produced.
 * @throws IncompleteDeployContractPrivateStateConfig if an `initialPrivateState`
 * is supplied with no `privateStateId` to store it under.
 * @throws Error if `privateStateId` is present with an undefined value, which is
 * a caller that believes it named an id.
 * @throws Ledger8DeployTxFailedError if the node recorded a non-success status.
 * @throws Ledger8DeployRecordEraError if the record's era is not the head's.
 * @throws Ledger8DeployRecordUnavailableError if the record cannot be read back
 * and attributed at all.
 * @throws Every error {@link runLedger8Deploy} raises.
 */
export const submitLedger8DeployTx = async (
  providers: Ledger8DeployEntryProviders,
  options: Ledger8DeployEntryOptions
): Promise<Ledger8DeployedState> => {
  // Before any provider is touched, and read off the KEY rather than the value,
  // exactly as the attach arm reads it. `undefined` is a legitimate private
  // state -- a contract that declares none stores exactly that -- but no id is a
  // usable id: a caller that wrote `privateStateId: cfg.someId` with an
  // undefined `someId` BELIEVES it named one, and reading that as "no id given"
  // stores nothing and hands `callTx` an undefined id, so every later call
  // proves against a state the contract never had and writes nothing back.
  const namesPrivateStateId = 'privateStateId' in options;
  const privateStateId = namesPrivateStateId ? options.privateStateId : undefined;
  if (namesPrivateStateId) {
    assertDefined(
      privateStateId,
      "'privateStateId' was given as undefined. Name a private state id, or omit the property entirely " +
        'for a contract that stores no private state.'
    );
  } else if ('initialPrivateState' in options) {
    // There is nowhere to put the state, so it would be silently dropped -- and
    // a caller that supplied one believes it was stored.
    throw new IncompleteDeployContractPrivateStateConfig();
  }

  const { deploy, head } = await runLedger8Deploy(providers, {
    contract: options.compiledContract,
    args: options.args ?? [],
    privateState: options.initialPrivateState,
    // Handed as a THUNK, so the fetch runs behind the era and seam gates rather
    // than ahead of them.
    resolveVerifierKeys: async () =>
      new Map(await providers.zkConfigProvider.getVerifierKeys(Object.keys(options.compiledContract.impureCircuits))),
    signingKey: options.signingKey
  });

  // PAST THIS POINT the transaction is on the network and may finalize whatever
  // happens here, so every refusal below carries the signing key. A sampled key
  // discarded here leaves a contract on chain that nobody can ever maintain,
  // which is the harm this arm exists to remove.
  let deployTxData: VersionedFinalizedTxData;
  try {
    // The ADDRESS, not the transaction id: a deployment is recorded against the
    // contract it created, and `watchForDeployTxData` is the read surface's own
    // arm for that.
    deployTxData = await providers.publicDataProvider.watchForDeployTxData(deploy.contractAddress);
    // Attribute the record BEFORE reading anything off it -- see the helper.
    assertLedger8RecordEra(deployTxData, head, 'initialState', 'watchForDeployTxData');
  } catch (error) {
    // EVERY way this step can fail -- the read surface rejecting, a record from
    // the wrong era, a record with no readable tag at all -- leaves the same
    // caller holding the same problem, so every one of them carries the key.
    // The era arm keeps its own class so the violation, its seam and its
    // registered code stay what a caller branches on.
    throw error instanceof EraInvariantViolationError
      ? new Ledger8DeployRecordEraError(deploy.contractAddress, deploy.signingKey, error)
      : new Ledger8DeployRecordUnavailableError(deploy.contractAddress, deploy.signingKey, error);
  }
  assertLedger8DeploySucceeded(deployTxData, deploy.contractAddress, deploy.signingKey);

  if (privateStateId !== undefined) {
    // FIRST the address. A provider namespaces every entry by the address last
    // named and refuses a write before any has been named, so the write below
    // would otherwise either throw or land under whichever contract the process
    // touched last -- and a later call, which names this address itself, would
    // read its own key, find nothing, and report nothing.
    providers.privateStateProvider.setContractAddress(deploy.contractAddress);
    await providers.privateStateProvider.set(privateStateId, deploy.nextPrivateState);
  }

  return {
    contractAddress: deploy.contractAddress,
    deployTxData,
    signingKey: deploy.signingKey,
    initialState: deploy.initialState,
    initialContractState: deploy.initialContractState,
    initialPrivateState: deploy.nextPrivateState,
    initialZswapState: deploy.initialZswapState
  };
};
