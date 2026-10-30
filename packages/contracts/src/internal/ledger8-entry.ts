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
 * transaction through the provider methods.
 *
 * Split from `./ledger8-pipeline.ts` on purpose. That module is the
 * orchestration ORDER and is pure; this one is the part that touches the
 * outside world.
 *
 * A successful operation reads the head ONCE. Two re-reads exist beyond it and neither happens on
 * the ordinary path. EVERY head reading is breadcrumbed with a `HeadReadingProvenance` naming
 * which it is — adding a reading without one is the mistake that list exists to prevent.
 *
 * @see {@link KeepStatePipeline} for the acquisition rules, the era each head crosses in, and
 *      how a provider's own failure is sanitized.
 * @see {@link Breadcrumbs} for all four readings and what each provenance means.
 */

import type {
  Ledger8SigningKey,
  LedgerEra
} from '@midnight-ntwrk/midnight-js-protocol';
import {
  type LedgerVersion,
  loadLedger8Engine,
  loadLedgerEra,
  NO_CIRCUIT
} from '@midnight-ntwrk/midnight-js-protocol';
import { InvalidArgumentError, InvariantViolationError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { type CoinPublicKey, type EncPublicKey } from '@midnight-ntwrk/midnight-js-protocol/v9';
import type { SigningKey } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import {
  assertProvidersSupportEra,
  type FinalizedTxRead,
  type Ledger8FinalizedTxData,
  type MidnightConfig,
  type MidnightProvider,
  type PrivateStateId,
  type PrivateStateProvider,
  type ProofProvider,
  type PublicDataProvider,
  type ReadMethod,
  SucceedEntirely,
  type TransactionProviders,
  type UnprovenTx,
  type WalletProvider,
  type ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';
import {
  assertIsContractAddress,
  assertNever,
  assertValidMidnightConfig,
  intentTtl,
  parseCoinPublicKeyToHex
} from '@midnight-ntwrk/midnight-js-utils';

import {
  EraInvariantViolationError,
  ForkCrossedDuringOperationError,
  IncompleteCallTxPrivateStateConfig,
  Ledger8CallTxFailedError,
  Ledger8DeployNotStoredError,
  Ledger8DeployTxFailedError,
  Ledger8DeployUnconfirmedError,
  Ledger8ReplaceAuthorityUnconfirmedError,
  Ledger8SigningKeyNotStoredError,
  Ledger8SigningKeyUnavailableError,
  PrivateStateNotFoundError,
  SubmitRejectionUndiagnosedError,
  type SubmittedOperation,
  type SubmittedOperationKind} from '../errors';
import {
  Ledger8InsertVerifierKeyTxFailedError,
  Ledger8RemoveVerifierKeyTxFailedError,
  Ledger8ReplaceMaintenanceAuthorityTxFailedError
} from '../governance/errors';
import type { Ledger8Contract } from '../ledger8-contract';
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
  type ResolvedOperationEra,
  resolveOperationEra
} from './era';
import {
  assertSnapshotVerifierKey,
  type Ledger8CallPipelineResult,
  type Ledger8ConstructedState,
  type Ledger8DeployPipelineResult,
  type Ledger8ExecutionEngine,
  type Ledger8MaintenanceUpdate,
  type Ledger8StateValue,
  readLedger8Snapshot,
  runLedger8CallPipeline,
  runLedger8DeployPipeline,
  runLedger8MaintenancePipeline
} from './ledger8-pipeline';
import {
  fromStoredLedger8SigningKey,
  requireLedger8SigningKey,
  toStoredLedger8SigningKey
} from './ledger8-signing-key';
import { handleSubmitRejection } from './stale-head';
import { atProviderMethod, proveBalanceSubmit, type SubmitRunner } from './submit-payload';
import { createEncryptionPublicKeyResolver } from './utils';

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
  readonly config: MidnightConfig;
  /**
   * OPTIONAL, exactly as it is on the provider set the entry points receive.
   * Only the dispatch breadcrumbs read it, so an absent logger costs an
   * operation nothing.
   */
  readonly loggerProvider?: BreadcrumbSink;
}

/**
 * What {@link acquireLedger8Runtime} consults: the read surface for the one
 * head read, and the three transaction providers for their era declarations.
 *
 * Narrower than {@link Ledger8EntryProviders} — no ZK config, no logger — so a
 * reader can see that acquisition reads nothing else, and so a test can drive
 * it without standing up a provider set it does not exercise. A full
 * `Ledger8EntryProviders` satisfies it structurally.
 */
export interface Ledger8RuntimeProviders extends TransactionProviders {
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
  readonly engine: Ledger8ExecutionEngine<Ledger8StateValue>;
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
 * The two acquisitions are independent and are started together; keep them that
 * way. Every retained-era operation funnels through here — the call path and the
 * deploy path both — so the provider check belongs here rather than in each of them.
 * The era checked is `resolved.head`, not the artifact's.
 *
 * @param providers The provider set, for the one head read and for the three
 * transaction providers' era declarations.
 * @param kind Whether this operation deploys a contract, calls one already
 * deployed, or maintains one — the cell where the era table differs.
 * @param breadcrumbs The optional logger the network-version-read and
 * pipeline-selection breadcrumbs are written to, and the contract this
 * operation names — omitted by a deploy, which has no address yet.
 * @returns The resolved era facts and the acquired engine.
 * @throws Ledger8DeployOnLedger9Error for a retained-era deploy on a post-fork head.
 * @throws Ledger8MaintenanceOnLedger9Error for a retained-era maintenance update on a post-fork head.
 * @throws UnknownProtocolVersionError if the head integer is off the era timeline.
 * @throws Ledger8RuntimeMissingError if the retained runtime cannot be acquired.
 * @throws ProviderEraUnsupportedError if a transaction provider does not serve the era this
 * operation's payloads will carry, which is the head era.
 * @see {@link EraDispatch} for the pairing table, and for why the provider check
 * reads the head era rather than the artifact's.
 * @see {@link KeepStatePipeline} for why both acquisitions start together.
 */
export const acquireLedger8Runtime = async (
  providers: Ledger8RuntimeProviders,
  kind: SubmittedOperationKind,
  breadcrumbs?: { readonly logger?: BreadcrumbSink; readonly contractAddress?: string }
): Promise<Ledger8Runtime> => {
  const [resolved, engine, retainedEra] = await Promise.all([
    resolveOperationEra(providers.publicDataProvider, breadcrumbs?.logger),
    loadLedger8Engine(),
    loadLedgerEra('v8')
  ]);
  assertEraCompatible('v8', resolved.head, kind);
  // AFTER the era gate, and both before the selection breadcrumb and before any
  // composition: a proof is the expensive step and the first of the three, so a
  // provider that cannot take this operation's payload has to be found now rather
  // than after one has been paid for.
  assertProvidersSupportEra(resolved.head, providers);
  // AFTER the gates: a selection breadcrumb written before them would claim a
  // pipeline for an operation the very next line refuses.
  emitPipelineSelection(breadcrumbs?.logger, resolved, 'v8', breadcrumbs?.contractAddress);

  return { resolved, engine, retainedEra };
};

/**
 * Proves, balances and submits a retained-era-executed transaction, and
 * returns the transaction id.
 *
 * The era is NOT the same on both heads: the pipeline composed the transaction
 * for the head, so a pre-fork head crosses as a v8 handle and a post-fork head as
 * a v9 one. The handle's era names the ledger runtime that produced the
 * transaction, never the toolchain that produced the contract.
 *
 * ## `submitTx` is the one that gets a second look
 *
 * A rejection at `proveTx` or `balanceTx` is what it says it is. A rejection at
 * `submitTx` is the one that can mean the network moved while this transaction
 * was being built, so that one — and only that one — is handed to
 * {@link handleSubmitRejection}, which re-reads the head and compares eras. The
 * proving and balancing methods touch no chain state and cannot tell a fork
 * crossing from anything else, so asking the network about their rejections
 * would be a round trip that could not change the answer.
 *
 * @param providers The read surface (for the fork-crossing head re-read) plus
 * the proof, wallet and submission providers.
 * @param unprovenTx The unproven transaction the pipeline composed and sealed.
 * @param operation Which operation this is: the head era it resolved, whether
 * it is a call or a deploy, and the identifiers a fork-crossing refusal has to
 * name.
 * @returns The transaction id the network assigned.
 * @throws InvariantViolationError if `unprovenTx` is not in the head's era,
 * before any provider is called.
 * @throws EraInvariantViolationError if a provider answers in the other era.
 * @throws InvalidTransactionHandleError if a provider answers with something
 * other than a handle at the next stage.
 * @throws ProviderFailedError if a provider rejects, with its own failure
 * sanitized onto `cause` — see {@link atProviderMethod}.
 * @throws ForkCrossedDuringOperationError, SubmitRejectionUndiagnosedError if the submission was
 * rejected and the head has moved, or cannot be compared — see
 * {@link handleSubmitRejection}.
 * @see {@link KeepStatePipeline} for the era table and why sealing the
 *      post-fork transaction as `'v8'` would be false.
 */
export const submitLedger8Tx = async (
  providers: Pick<
    Ledger8EntryProviders,
    'publicDataProvider' | 'proofProvider' | 'walletProvider' | 'midnightProvider' | 'loggerProvider' | 'config'
  >,
  unprovenTx: UnprovenTx,
  operation: SubmittedOperation
): Promise<string> => {
  const { circuitId, networkVersion } = operation;
  if (unprovenTx.era !== networkVersion) {
    throw new InvariantViolationError(
      `The ledger 8 pipeline built a '${unprovenTx.era}' transaction while the network was on '${networkVersion}' ` +
        `for circuit '${circuitId}' of contract '${operation.contractAddress}', before any provider was called`
    );
  }
  // Wrapped ONCE, around whichever era's submit runs, so the two cannot end
  // up with different failure handling. `atProviderMethod` still does the sanitizing --
  // what this adds is the fork-crossing diagnosis on top of its result.
  const submit: SubmitRunner = async (call) => {
    try {
      return await atProviderMethod('submitTx', circuitId, call);
    } catch (rejection) {
      return handleSubmitRejection(providers.publicDataProvider, operation, rejection, providers.loggerProvider);
    }
  };

  return proveBalanceSubmit(providers, unprovenTx, circuitId, submit);
};

/** What a retained-era call arrived with. */
export interface Ledger8CallRequest {
  readonly contract: Ledger8Contract;
  readonly contractAddress: string;
  readonly circuitId: string;
  readonly args: readonly unknown[];
  readonly privateState: unknown;
  readonly additionalCoinEncPublicKeyMappings?: ReadonlyMap<CoinPublicKey, EncPublicKey>;
}

/** A composed and submitted retained-era call. */
export interface Ledger8SubmittedCall {
  readonly txId: string;
  readonly call: Ledger8CallPipelineResult<Ledger8StateValue>;
  /**
   * The era the network head was on when this call started.
   *
   * Deliberately NOT on the published `Ledger8SubmittedCallTx`: that type names
   * the era of the PIPELINE, and this is the era of the NETWORK. The two are
   * different facts and they disagree on this path every time a retained-era
   * call is recorded post-fork. The finalizing path needs this one to attribute
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
 * @throws NetworkVersionStateMismatchError, IndexerInconsistencyError if the fetched
 * envelope's era disagrees with the head.
 * @throws StateDecodeFailedError if the envelope will not decode on this era.
 * @throws StateInconsistentError if the decoded state is internally inconsistent.
 * @throws Ledger8AmbiguousEntryPointError if the state names the circuit twice.
 * @throws BlankVerifierKeySlotError, VerifierKeyMismatchError from the
 * pre-proving key check.
 * @throws Ledger8ShieldedSpendUnsupportedError if the circuit spends a coin the
 * contract already held.
 * @throws Ledger8RecipientUnmappableError if a shielded output pays a recipient
 * that is not the calling wallet, the burn address, or a key in
 * `additionalCoinEncPublicKeyMappings`.
 * @throws ProviderEraUnsupportedError if a provider does not serve the head's era.
 * @throws EraInvariantViolationError if a provider answers in the other era.
 * @throws ProviderFailedError if a provider rejects.
 * @see {@link KeepStatePipeline} for the per-recipient encryption rule and what
 *      a bare key would cost.
 */
export const runLedger8Call = async (
  providers: Ledger8EntryProviders,
  request: Ledger8CallRequest
): Promise<Ledger8SubmittedCall> => {
  assertValidMidnightConfig(providers.config);
  const { networkId } = providers.config;
  const ttl = intentTtl(providers.config);
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
  const coinPublicKey = parseCoinPublicKeyToHex(providers.walletProvider.getCoinPublicKey(), networkId);

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
    networkId,
    ttl,
    encryptionPublicKey: createEncryptionPublicKeyResolver(
      networkId,
      coinPublicKey,
      providers.walletProvider.getEncryptionPublicKey(),
      request.additionalCoinEncPublicKeyMappings
    )
  });

  const txId = await submitLedger8Tx(providers, call.unprovenTx, {
    networkVersion: resolved.head,
    kind: 'call',
    circuitId: request.circuitId,
    contractAddress: request.contractAddress
  });

  return { txId, call, head: resolved.head };
};

/** What a retained-era deploy arrived with. */
export interface Ledger8DeployRequest {
  readonly contract: Ledger8Contract;
  readonly args: readonly unknown[];
  readonly privateState: unknown;
  /**
   * Fetches one verifier key per entry point the constructor's state will
   * declare.
   *
   * A RESOLVER rather than the map itself, because an argument is evaluated
   * before the call it is an argument to: a map built inline was fetched ahead
   * of the era and provider gates below, so a retained artifact on a post-fork head
   * - whose ZK config an ordinary browser no longer serves after the fork - got
   * the provider's fetch rejection in place of `Ledger8DeployOnLedger9Error`, which
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
 * @throws Ledger8DeployOnLedger9Error on a post-fork head.
 */
export const runLedger8Deploy = async (
  providers: Ledger8EntryProviders,
  request: Ledger8DeployRequest
): Promise<Ledger8SubmittedDeploy> => {
  assertValidMidnightConfig(providers.config);
  const { networkId } = providers.config;
  const ttl = intentTtl(providers.config);
  // No contract address on this path: a deploy has none until the composition
  // below mints one, so the selection breadcrumb leaves the field out.
  const { resolved, engine } = await acquireLedger8Runtime(providers, 'deploy', {
    logger: providers.loggerProvider
  });

  // AFTER the gates above, never as an argument to the composition below: an
  // argument is evaluated before its call, which put this fetch ahead of the
  // very refusals that exist to be raised first. See the field's own comment.
  const verifierKeys = await request.resolveVerifierKeys();

  // Read ONCE. The call path forbids the second read for the reason that applies
  // here unchanged: a resolver built against a different key than the one the
  // constructor executed under is exactly the mismatch that mis-encrypts a coin
  // the constructor minted. Normalized once too, so both uses get the same
  // form rather than relying on the resolver normalizing again internally.
  const coinPublicKey = parseCoinPublicKeyToHex(providers.walletProvider.getCoinPublicKey(), networkId);

  const deploy = await runLedger8DeployPipeline({
    era: resolved.era,
    engine,
    contract: request.contract,
    args: request.args,
    privateState: request.privateState,
    coinPublicKey,
    verifierKeys,
    signingKey: request.signingKey,
    networkId,
    ttl,
    // Built the same way the call path builds it, so a coin a constructor mints
    // is encrypted to the same key a coin a circuit mints would be.
    encryptionPublicKey: createEncryptionPublicKeyResolver(
      networkId,
      coinPublicKey,
      providers.walletProvider.getEncryptionPublicKey()
    )
  });

  const txId = await submitLedger8Tx(providers, deploy.unprovenTx, {
    // Only ever a pre-fork head here -- a retained-era deploy against a
    // network after the fork was refused above.
    networkVersion: resolved.head,
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
  readonly contract: Ledger8Contract;
  readonly contractAddress: string;
  /** Every entry point whose key is checked against the chain's slot. */
  readonly circuitIds: readonly string[];
}

/** The result of attaching to an already-deployed retained-era contract. */
export interface Ledger8FoundState {
  readonly deployTxData: FinalizedTxRead;
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
 * @throws InvalidArgumentError if the artifact declares no callable circuits,
 * or if the address is malformed.
 * @throws EraArtifactMismatchError, UnknownLedgerVersionError from era resolution.
 * @throws NetworkVersionStateMismatchError, IndexerInconsistencyError if the fetched
 * envelope's era disagrees with the head.
 * @throws StateDecodeFailedError if the envelope will not decode on this era.
 * @throws StateInconsistentError if the decoded state is internally inconsistent.
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
  assertEraCompatible('v8', resolved.head, 'call');
  emitPipelineSelection(providers.loggerProvider, resolved, 'v8', request.contractAddress);

  // EVERY cheap refusal happens before the deploy record is watched for, and
  // that order is the whole value of checking here: `watchForDeployTxData` is
  // an UNBOUNDED watch, so a mis-dispatch checked after it would not be
  // reported until the record arrived -- which for a wrong address may be
  // never. An empty circuit list is refused first of all: it would otherwise
  // make the loop below a no-op and attach to any state at all without
  // checking a single key.
  if (request.circuitIds.length === 0) {
    throw new InvalidArgumentError(
      `Contract at '${request.contractAddress}' cannot be attached to: the artifact declares no callable ` +
        'circuits, so there is no verifier key to check it against and nothing to call on it.'
    );
  }

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
  // in whichever era was current THEN, so either variant is a legitimate answer
  // here and there is no era to compare against. The current era's path narrows
  // to v9 at this same read because v9 is its only legitimate answer.
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
 * Raises the retained-era path's own class rather than {@link Ledger9CallTxFailedError},
 * which carries a `Ledger9FinalizedTxData`.
 *
 * @param record The finalized record the read surface reported.
 * @param circuitId The circuit this flow ran.
 * @throws Ledger8CallTxFailedError if the recorded status is not `SucceedEntirely`.
 * @see {@link ErrorTaxonomy} for why the two eras cannot share a record type.
 */
const assertLedger8TxSucceeded = (record: FinalizedTxRead, circuitId: string): void => {
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
  record: FinalizedTxRead,
  contractAddress: string,
  signingKey: SigningKey
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
 * Compares the record against the HEAD, not against a fixed era. It does NOT
 * assert that the result's `era` and the record's `public.era` agree: those
 * legitimately disagree, since `era: 'v8'` with `public.era: 'v9'` IS a
 * keep-state transaction.
 *
 * KEEP THIS AHEAD OF THE STATUS CHECK. `status` is a field of the very record
 * whose provenance is in doubt.
 *
 * @param record The finalized record the read surface returned.
 * @param head The era the network head was on when this operation started.
 * @param circuitId The circuit this flow ran, named in the refusal. A deploy
 * names the constructor's own vocabulary, having no circuit of its own.
 * @param method The read-surface method that returned the record: a call watches
 * for its transaction id, a deploy for its address. Named rather than fixed so
 * the refusal points a caller at the method that actually answered.
 * @throws EraInvariantViolationError if the record's era is not the head's.
 * @see {@link EraDispatch} for why a mislabelled record fails silently without
 * this, and why the check precedes the status read.
 */
const assertLedger8RecordEra = (
  record: FinalizedTxRead,
  head: LedgerVersion,
  circuitId: string,
  method: ReadMethod
): void => {
  // Shape before era: a tag that names no era is a DIFFERENT fault from one
  // naming the wrong era, and it wants a different remediation. Telling a
  // caller whose provider emitted no tag to check the era its provider answers
  // in points them away from the fault. This is the same split the
  // current era's `requireLedger9Record` makes in its own default branch.
  const tagged = requireTaggedRecord(record, method, circuitId);
  if (tagged.era === head) {
    return;
  }
  throw new EraInvariantViolationError(method, circuitId, head, tagged.era);
};

/**
 * Reads back a record that only the ledger 8 era can have made, narrowing it to that era: the
 * record of an operation the era gate admits only on a pre-fork head.
 *
 * @throws UnknownLedgerVersionError if the record carries no era tag.
 * @throws EraInvariantViolationError if the record is not a ledger 8 one.
 */
const requireLedger8Record = (
  record: FinalizedTxRead,
  head: LedgerVersion,
  circuitId: string,
  method: ReadMethod
): Ledger8FinalizedTxData => {
  const tagged = requireTaggedRecord(record, method, circuitId);
  if (tagged.era !== 'v8') {
    throw new EraInvariantViolationError(method, circuitId, head, tagged.era);
  }
  return tagged;
};

/** The private-state members a retained-era call reads and writes. */
export type Ledger8PrivateStateSurface = Pick<PrivateStateProvider, 'get' | 'set' | 'setContractAddress'>;

/**
 * The private-state members a retained-era DEPLOY reads and writes: the call
 * path's, plus the signing-key write only a deployer ever makes.
 *
 * Widened here rather than on {@link Ledger8PrivateStateSurface} so a reader —
 * and a test — can see that a CALL never writes a signing key.
 */
export type Ledger8DeployPrivateStateSurface = Ledger8PrivateStateSurface &
  Pick<PrivateStateProvider, 'setSigningKey'>;

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
 * @throws PrivateStateNotFoundError if an id was named and the provider holds nothing under it.
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
  if (privateState === undefined || privateState === null) {
    throw new PrivateStateNotFoundError(
      `No private state found at private state ID '${privateStateId}'. A ledger 8 call cannot ` +
        'seed one - only `deployContract` and `findDeployedContract` take an `initialPrivateState`, ' +
        'each alongside the `privateStateId` it is stored under - so seed it at deploy time or at ' +
        'attach time, or write it directly with `privateStateProvider.set(privateStateId, state)` ' +
        'before calling, or omit `privateStateId` for a contract that carries no private state.'
    );
  }
  return privateState;
};

/** The options a retained-era call entry point received, in the shape this layer reads them. */
export interface Ledger8CallEntryOptions {
  readonly compiledContract: Ledger8Contract;
  readonly contractAddress: string;
  readonly circuitId: string;
  readonly args?: readonly unknown[];
  readonly privateStateId?: string;
  readonly additionalCoinEncPublicKeyMappings?: ReadonlyMap<CoinPublicKey, EncPublicKey>;
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
  privateStateId: 'privateStateId' in options ? options.privateStateId : undefined,
  additionalCoinEncPublicKeyMappings: options.additionalCoinEncPublicKeyMappings
});

/**
 * The retained era's execution data, built in ONE place: the async entry point
 * publishes it as it stands, and the finalizing entry point merges the record onto its
 * public half. Two construction sites could report different executions of the
 * same call.
 */
const toLedger8CallTxData = (
  call: Ledger8CallPipelineResult<Ledger8StateValue>
): AnyLedger8UnsubmittedCallTxData => ({
  era: 'v8',
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
    unprovenTx: call.unprovenTx
  },
  calls: call.calls
});

/**
 * What one retained-era call entry produced: the submitted-call result the
 * public entry points answer with, and the era the network head was on.
 *
 * The head is here rather than on `Ledger8SubmittedCallTx` for the reason
 * given on {@link Ledger8SubmittedCall.head}: that type names the era of the
 * PIPELINE, this is the era of the NETWORK, and on this path they routinely
 * differ. The finalizing entry point needs the network's to attribute the record it
 * fetches, and no caller needs it at all.
 */
interface Ledger8CallEntryOutcome {
  readonly submitted: AnyLedger8SubmittedCallTx;
  readonly head: LedgerVersion;
}

/**
 * Runs one retained-era call: the local refusals, the private-state read, the
 * pipeline, and the submission -- everything both public entry points share.
 *
 * Extracted so the finalizing entry point can reach the head this call resolved
 * WITHOUT a second head read. Re-reading it would break the single-head-read
 * invariant the entry points are asserted against, and worse, a second reading
 * could answer differently and attribute the record against an era the
 * transaction was never built for.
 *
 * @param providers The provider set.
 * @param options The call the entry point received.
 * @returns The submitted-call result and the head era it resolved.
 * @throws Every error the public entry points document.
 */
const runLedger8CallEntry = async (
  providers: Ledger8CallEntryProviders,
  options: Ledger8CallEntryOptions
): Promise<Ledger8CallEntryOutcome> => {
  // The same two local refusals the current-era path makes before any provider
  // is touched. A malformed address would otherwise cost a network round trip
  // to discover, and an unknown circuit id would surface as a blank
  // verifier-key slot -- a diagnosis pointing at the chain when the fault is a
  // typo in the caller's own call.
  assertIsContractAddress(options.contractAddress);
  if (!Object.hasOwn(options.compiledContract.provableCircuits, options.circuitId)) {
    throw new InvalidArgumentError(`Circuit '${options.circuitId}' is undefined`);
  }

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
    privateState,
    additionalCoinEncPublicKeyMappings: options.additionalCoinEncPublicKeyMappings
  });

  return {
    submitted: {
      era: 'v8',
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
 * @throws InvalidArgumentError if the contract address is malformed, or if the
 * artifact declares no such circuit.
 * @throws PrivateStateNotFoundError if a named `privateStateId` has nothing
 * stored under it.
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
 * narrowing to one variant here would refuse the very records this pipeline exists
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
  // publishes and this path's own asynchronous surface documents.
  const nextPrivateState = callTxData.private.nextPrivateState;
  const txData = await providers.publicDataProvider.watchForTxData(txId);
  // Attribute the record BEFORE reading anything off it -- see the helper.
  assertLedger8RecordEra(txData, head, circuitId, 'watchForTxData');
  assertLedger8TxSucceeded(txData, circuitId);

  if (options.privateStateId !== undefined && providers.privateStateProvider !== undefined) {
    await providers.privateStateProvider.set(options.privateStateId, nextPrivateState);
  }

  // The finalized answer is the SAME execution data the async entry point published,
  // with the record merged onto its public half. Built from one place so the
  // two surfaces cannot report different executions of the same call.
  return {
    era: 'v8',
    circuitId,
    public: { ...txData, ...callTxData.public },
    private: callTxData.private,
    calls: callTxData.calls
  };
};

/** The options a retained-era deploy entry point received, in the shape this layer reads them. */
export interface Ledger8DeployEntryOptions {
  readonly compiledContract: Ledger8Contract;
  readonly args?: readonly unknown[];
  readonly privateStateId?: PrivateStateId;
  readonly initialPrivateState?: unknown;
  readonly signingKey?: SigningKey;
}

/**
 * The providers a retained-era deploy entry point needs.
 *
 * `privateStateProvider` is REQUIRED here where the call path's is optional, and
 * that follows the provider set a caller actually holds: `MidnightProviders`
 * declares it, and both this path and the attach path write through it without a
 * guard.
 */
export interface Ledger8DeployEntryProviders extends Ledger8EntryProviders {
  readonly privateStateProvider: Ledger8DeployPrivateStateSurface;
}

/** Everything one retained-era deployment produced that a caller is handed. */
export interface Ledger8DeployedState {
  /** The address the composition minted, which no other deployment shares. */
  readonly contractAddress: string;
  readonly deployTxData: Ledger8FinalizedTxData;
  readonly signingKey: SigningKey;
  readonly initialContractStateBytes: Uint8Array;
  readonly initialContractState: Ledger8ConstructedState['contractState'];
  /** The private state the CONSTRUCTOR produced. */
  readonly initialPrivateState: unknown;
  readonly initialZswapState: Ledger8DeployPipelineResult['initialZswapState'];
}

/**
 * Deploys a retained-era contract and waits for the chain to record it, storing
 * the private state and the signing key only once it has.
 *
 * The ORDER below is the whole of what this function adds over
 * {@link runLedger8Deploy}, and it mirrors {@link submitLedger8CallTx}: watch,
 * attribute the record against the head, refuse a non-success status, and only
 * then store. A deploy that the chain refused must leave no local state ahead of
 * it — and on this path that matters more than on the call path, because a second
 * attempt lands at a different address.
 *
 * The verifier keys are fetched for EVERY entry point the artifact declares,
 * off the artifact rather than off any state.
 *
 * The private-state pairing is NOT checked here: `deployContract`, the only
 * caller, checks it before any provider is touched.
 *
 * @param providers The provider set.
 * @param options The deployment the entry point received.
 * @returns The minted address, the finalized record, the signing key now stored
 * against that address, and everything the constructor produced.
 * @throws Ledger8DeployTxFailedError if the node recorded a non-success status.
 * @throws Ledger8DeployUnconfirmedError if the record cannot be read back and
 * attributed to the head at all, the record's era included.
 * @throws Ledger8DeployNotStoredError if the deployment was CONFIRMED and the
 * private-state provider then refused to store the signing key or the initial
 * private state. It carries the key either way.
 * @throws Ledger8SigningKeyUnusableError if a supplied key is not one the
 * retained era can sign with. Raised before the head is read.
 * @throws Every error {@link runLedger8Deploy} raises.
 * @see {@link KeepStatePipeline} for why every slot has to be registered, and
 * for the order after submission.
 */
export const submitLedger8DeployTx = async (
  providers: Ledger8DeployEntryProviders,
  options: Ledger8DeployEntryOptions
): Promise<Ledger8DeployedState> => {
  const { privateStateId } = options;
  const suppliedSigningKey =
    options.signingKey === undefined ? undefined : requireLedger8SigningKey(options.signingKey, undefined);

  const { deploy, head } = await runLedger8Deploy(providers, {
    contract: options.compiledContract,
    args: options.args ?? [],
    privateState: options.initialPrivateState,
    // Handed as a THUNK, so the fetch runs behind the era and provider gates rather
    // than ahead of them.
    resolveVerifierKeys: async () =>
      new Map(await providers.zkConfigProvider.getVerifierKeys(Object.keys(options.compiledContract.provableCircuits))),
    signingKey: suppliedSigningKey
  });
  const signingKey = toStoredLedger8SigningKey(deploy.signingKey);

  // PAST THIS POINT the transaction is on the network and may finalize whatever
  // happens here, so every refusal below carries the signing key. A sampled key
  // discarded here leaves a contract on chain that nobody can ever maintain,
  // which is the harm this path exists to remove.
  let deployTxData: Ledger8FinalizedTxData;
  try {
    // The ADDRESS, not the transaction id: a deployment is recorded against the
    // contract it created, and `watchForDeployTxData` is the read surface's own
    // method for that. Attributed BEFORE anything is read off it: a deploy runs
    // only on a pre-fork head, so its record can only be a ledger 8 one.
    deployTxData = requireLedger8Record(
      await providers.publicDataProvider.watchForDeployTxData(deploy.contractAddress),
      head,
      'initialState',
      'watchForDeployTxData'
    );
  } catch (error) {
    // EVERY way this step can fail -- the read surface rejecting, a record from
    // the wrong era, a record with no readable tag at all -- leaves the same
    // caller holding the same problem, so one class carries the key over all of
    // them. The failure itself rides on `cause`, so an era violation keeps its
    // method and its registered code where a caller branches on them.
    throw new Ledger8DeployUnconfirmedError(deploy.contractAddress, signingKey, error);
  }
  assertLedger8DeploySucceeded(deployTxData, deploy.contractAddress, signingKey);

  // FIRST the address, for the PRIVATE-STATE write below and for that one
  // only. A provider namespaces every private-state entry by the address last
  // named and refuses a `get` or a `set` before any has been named, so a `set`
  // made first would either throw or land under whichever contract the process
  // touched last -- and a later call, which names this address itself, would
  // read its own key, find nothing, and report nothing.
  //
  // `setSigningKey` does NOT depend on it: it takes the address as an argument
  // and the level-backed provider keys the entry with it directly. The
  // interface states that for `getSigningKey`, whose `@remarks` in
  // `packages/types/src/private-state-provider.ts` say it does not require
  // `setContractAddress` first; `setSigningKey` carries no `@remarks` of its
  // own, and what actually settles it for both is that the address is an
  // argument rather than ambient state.
  //
  // Named unconditionally rather than only alongside a private state, matching
  // `submit-deploy-tx.ts`: after a deploy, the provider's current namespace is
  // the contract just deployed, whether or not this deployment stored a state
  // under it.
  providers.privateStateProvider.setContractAddress(deploy.contractAddress);
  // THE SIGNING KEY FIRST, before the private state. It is the sole backing of a
  // one-key authority at threshold 1, so a sampled key that reached only the
  // returned handle left an address nobody could ever maintain. It has no
  // ordering dependency of its own -- see above -- so nothing forced it to go
  // second, and going second is a window in which the private-state write
  // rejects and the only copy of the key dies with this call frame.
  //
  // BOTH writes are wrapped, so the region's promise holds to its last
  // statement: past the confirmation above, every refusal carries the key. A raw
  // store rejection here reads to a caller as "the deploy failed, retry", and a
  // retry mints a fresh nonce and a SECOND contract at a different address while
  // the first sits on chain unmaintainable.
  try {
    await providers.privateStateProvider.setSigningKey(deploy.contractAddress, signingKey);
  } catch (error) {
    throw new Ledger8DeployNotStoredError(deploy.contractAddress, signingKey, 'signing-key', error);
  }
  if (privateStateId !== undefined) {
    try {
      await providers.privateStateProvider.set(privateStateId, deploy.nextPrivateState);
    } catch (error) {
      throw new Ledger8DeployNotStoredError(deploy.contractAddress, signingKey, 'private-state', error);
    }
  }

  return {
    contractAddress: deploy.contractAddress,
    deployTxData,
    signingKey,
    initialContractStateBytes: deploy.initialContractStateBytes,
    initialContractState: deploy.initialContractState,
    initialPrivateState: deploy.nextPrivateState,
    initialZswapState: deploy.initialZswapState
  };
};

/**
 * One maintenance update as a retained-era entry point receives it: the replacement key in the
 * public `SigningKey` shape both eras share, rather than the bare string the retained runtime takes.
 */
export type Ledger8MaintenanceEntryUpdate =
  | Exclude<Ledger8MaintenanceUpdate, { readonly kind: 'replace-authority' }>
  | { readonly kind: 'replace-authority'; readonly newSigningKey: SigningKey };

/** What a retained-era maintenance entry point received. */
export interface Ledger8MaintenanceEntryRequest {
  readonly contract: Ledger8Contract;
  readonly contractAddress: string;
  readonly update: Ledger8MaintenanceEntryUpdate;
}

/**
 * The providers a retained-era maintenance update needs: the transaction providers, plus the
 * signing-key half of the private-state provider, which it reads and, for a replacement, writes.
 */
export interface Ledger8MaintenanceEntryProviders extends Ledger8EntryProviders {
  readonly privateStateProvider: Pick<PrivateStateProvider, 'getSigningKey' | 'setSigningKey'>;
}

/**
 * Reads the key a retained-era maintenance update is signed with.
 *
 * Every way of not having one is a refusal here, where the attach path reports the same entries
 * as absent: an attach can call circuits without the key, and a maintenance update cannot do
 * anything without it.
 *
 * @param privateStateProvider The signing-key half of the private-state provider.
 * @param contractAddress The contract being maintained.
 * @param sink The configured logger, or `undefined`.
 * @returns The retained-era key held for the address.
 * @throws Ledger8SigningKeyUnavailableError if nothing usable is stored, or the store cannot be read.
 */
const readLedger8MaintenanceSigningKey = async (
  privateStateProvider: Pick<PrivateStateProvider, 'getSigningKey'>,
  contractAddress: string,
  sink: BreadcrumbSink | undefined
): Promise<Ledger8SigningKey> => {
  let stored: SigningKey | null | undefined;
  try {
    stored = await privateStateProvider.getSigningKey(contractAddress);
  } catch (error) {
    throw new Ledger8SigningKeyUnavailableError(contractAddress, error);
  }
  const signingKey =
    stored === undefined || stored === null ? undefined : fromStoredLedger8SigningKey(stored, contractAddress, sink);
  if (signingKey === undefined) {
    throw new Ledger8SigningKeyUnavailableError(contractAddress);
  }
  return signingKey;
};

/**
 * The update in the shape the engine takes, with the replacement key checked and unwrapped.
 *
 * @throws InvalidArgumentError if the artifact declares no circuit of that name.
 * @throws Ledger8SigningKeyUnusableError if the replacement key is not one the retained era can sign with.
 */
const toLedger8MaintenanceUpdate = (
  contract: Ledger8Contract,
  contractAddress: string,
  update: Ledger8MaintenanceEntryUpdate
): Ledger8MaintenanceUpdate => {
  if (update.kind === 'replace-authority') {
    return { kind: update.kind, newSigningKey: requireLedger8SigningKey(update.newSigningKey, contractAddress) };
  }
  if (!Object.hasOwn(contract.provableCircuits, update.circuitId)) {
    throw new InvalidArgumentError(`Circuit '${update.circuitId}' is undefined`);
  }
  return update;
};

/**
 * Refuses a retained-era maintenance update the node recorded with a non-success status, with the
 * class that names the update.
 *
 * @throws Ledger8InsertVerifierKeyTxFailedError, Ledger8RemoveVerifierKeyTxFailedError,
 * Ledger8ReplaceMaintenanceAuthorityTxFailedError if the recorded status is not `SucceedEntirely`.
 */
const assertLedger8MaintenanceSucceeded = (
  record: Ledger8FinalizedTxData,
  contractAddress: string,
  update: Ledger8MaintenanceEntryUpdate
): void => {
  if (record.status === SucceedEntirely) {
    return;
  }
  switch (update.kind) {
    case 'insert-verifier-key':
      throw new Ledger8InsertVerifierKeyTxFailedError(record, contractAddress, update.circuitId);
    case 'remove-verifier-key':
      throw new Ledger8RemoveVerifierKeyTxFailedError(record, contractAddress, update.circuitId);
    case 'replace-authority':
      throw new Ledger8ReplaceMaintenanceAuthorityTxFailedError(record, contractAddress, update.newSigningKey);
    default:
      return assertNever(update, 'assertLedger8MaintenanceSucceeded');
  }
};

/**
 * Whether a failure from {@link submitLedger8Tx} leaves open that the transaction landed: only a
 * submission rejected while the head was moving, or one whose rejection could not be diagnosed.
 */
const mayHaveLanded = (error: unknown): boolean =>
  error instanceof ForkCrossedDuringOperationError || error instanceof SubmitRejectionUndiagnosedError;

/**
 * Runs one retained-era maintenance update end to end and waits for the chain to record it: check
 * the request, acquire the era, read the signing key, compose through the pipeline, prove, balance,
 * submit, and attribute the record. A successful replacement then stores the new key.
 *
 * Reachable only on a pre-fork head; {@link acquireLedger8Runtime} refuses the post-fork case
 * before the key is read. The record is therefore always a ledger 8 one, and anything else is an
 * era violation rather than a variant to report.
 *
 * @param providers The provider set.
 * @param request The contract, its address and the update.
 * @returns The finalized ledger 8 record.
 * @throws InvalidArgumentError if the address is malformed, or the artifact declares no such circuit.
 * @throws Ledger8SigningKeyUnusableError if a replacement key is not one the retained era can sign with.
 * Raised before the head is read.
 * @throws Ledger8MaintenanceOnLedger9Error on a post-fork head.
 * @throws Ledger8SigningKeyUnavailableError if no usable key is held for the address.
 * @throws MaintenanceAuthorityMismatchError if the held key is not the contract's authority. Raised
 * before anything is proven.
 * @throws EraInvariantViolationError if the record comes back from an era other than ledger 8.
 * @throws Ledger8InsertVerifierKeyTxFailedError, Ledger8RemoveVerifierKeyTxFailedError,
 * Ledger8ReplaceMaintenanceAuthorityTxFailedError if the node recorded a non-success status.
 * @throws Ledger8SigningKeyNotStoredError if a replacement was CONFIRMED and the store then refused
 * the new key. It carries the key.
 * @throws Every error {@link runLedger8MaintenancePipeline} and {@link submitLedger8Tx} raise.
 */
export const submitLedger8MaintenanceTx = async (
  providers: Ledger8MaintenanceEntryProviders,
  request: Ledger8MaintenanceEntryRequest
): Promise<Ledger8FinalizedTxData> => {
  assertValidMidnightConfig(providers.config);
  const { contract, contractAddress } = request;
  assertIsContractAddress(contractAddress);
  const update = toLedger8MaintenanceUpdate(contract, contractAddress, request.update);
  const { networkId } = providers.config;
  const ttl = intentTtl(providers.config);

  const { resolved, engine, retainedEra } = await acquireLedger8Runtime(providers, 'maintenance', {
    logger: providers.loggerProvider,
    contractAddress
  });
  const signingKey = await readLedger8MaintenanceSigningKey(
    providers.privateStateProvider,
    contractAddress,
    providers.loggerProvider
  );

  const unprovenTx = await runLedger8MaintenancePipeline({
    retainedEra,
    era: resolved.era,
    head: resolved.head,
    engine,
    publicDataProvider: providers.publicDataProvider,
    logger: providers.loggerProvider,
    contract,
    contractAddress,
    // Normalized as on the call path: the retained runtime reads hex only.
    coinPublicKey: parseCoinPublicKeyToHex(providers.walletProvider.getCoinPublicKey(), networkId),
    signingKey,
    networkId,
    ttl,
    update
  });

  const circuitId = update.kind === 'replace-authority' ? NO_CIRCUIT : update.circuitId;
  const unconfirmed = (error: unknown): unknown =>
    request.update.kind === 'replace-authority'
      ? new Ledger8ReplaceAuthorityUnconfirmedError(contractAddress, request.update.newSigningKey, error)
      : error;

  let txId: string;
  try {
    txId = await submitLedger8Tx(providers, unprovenTx, {
      networkVersion: resolved.head,
      kind: 'maintenance',
      circuitId,
      contractAddress
    });
  } catch (error) {
    throw mayHaveLanded(error) ? unconfirmed(error) : error;
  }

  let record: Ledger8FinalizedTxData;
  try {
    record = requireLedger8Record(
      await providers.publicDataProvider.watchForTxData(txId),
      resolved.head,
      circuitId,
      'watchForTxData'
    );
  } catch (error) {
    throw unconfirmed(error);
  }
  assertLedger8MaintenanceSucceeded(record, contractAddress, request.update);

  if (request.update.kind === 'replace-authority') {
    const newSigningKey = request.update.newSigningKey;
    try {
      await providers.privateStateProvider.setSigningKey(contractAddress, newSigningKey);
    } catch (error) {
      throw new Ledger8SigningKeyNotStoredError(contractAddress, newSigningKey, error);
    }
  }
  return record;
};
