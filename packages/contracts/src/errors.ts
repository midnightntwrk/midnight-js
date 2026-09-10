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

import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol';
import type { ContractAddress, ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type {
  AnyProvableCircuitId,
  FinalizedTxData,
  PrivateStateId,
  Seam,
  VersionedFinalizedTxData
} from '@midnight-ntwrk/midnight-js-types';
import { CONTRACTS_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';

import { CURRENT_PIPELINE_ERA, RETAINED_PIPELINE_ERA } from './era';
import { NEITHER_ERA_CONTRACT_MESSAGE } from './ledger8-contract';

/**
 * The seams this flow narrows an era at: the three transaction-flow provider
 * methods, plus the two read-surface methods that report a finalized record.
 *
 * An alias for {@link Seam} in `@midnight-ntwrk/midnight-js-types`, which owns
 * the vocabulary because it declares both the provider seams and the read
 * surface. Kept under this name so the error below reads in the era vocabulary
 * of this package.
 */
export type EraSeam = Seam;

// `SubmitTxOptions.circuitId` is a single id or a list — a merged transaction
// carries several. Each id is quoted individually so a two-circuit list cannot
// read as one circuit whose name happens to contain the separator. Returns
// `undefined` when there is nothing worth naming, so the caller drops the
// clause rather than rendering an empty one.
const formatCircuitClause = (circuitId: string | readonly string[] | undefined): string | undefined => {
  if (circuitId === undefined) {
    return undefined;
  }
  if (!Array.isArray(circuitId)) {
    return ` (circuit '${String(circuitId)}')`;
  }
  if (circuitId.length === 0) {
    return undefined;
  }
  const quoted = circuitId.map((id) => `'${id}'`).join(', ');
  return circuitId.length === 1 ? ` (circuit ${quoted})` : ` (circuits ${quoted})`;
};

/**
 * An error indicating that a provider, or the read surface, answered in a
 * different ledger era from the one the flow submitted.
 *
 * The provider seams and the read surface both carry two eras, but any ONE
 * flow through this package tags every outgoing payload with a single era and
 * cannot submit or report anything else. An answer in the other era therefore
 * means the provider re-tagged or converted the payload it was handed, or that
 * the flow is pointed at a network whose records belong to the other era.
 *
 * {@link EraInvariantViolationError.expected} names the only era this flow can
 * accept back, and so which direction the violation went. For the current
 * era's flows that is the era they submit, which is always `'v9'` — the
 * default, so call sites that predate the retained-era pipelines read exactly
 * as they did before it existed. The retained era's finalizing arm passes the
 * network HEAD instead: it composes retained-era transactions but is recorded
 * by whichever ledger the head is on, so the head, not the pipeline, is what
 * the record has to agree with.
 *
 * {@link EraInvariantViolationError.received} names the era that actually came
 * back, when the payload carried a readable one. A payload whose tag is
 * missing or unrecognised is a different fault and raises
 * {@link UntaggedPayloadError} instead.
 */
export class EraInvariantViolationError extends Error {
  readonly code = CONTRACTS_ERROR_CODES.ERA_INVARIANT_VIOLATION;

  /**
   * @param seam The provider method that returned the payload.
   * @param circuitId The circuit, or circuits, whose flow this happened on,
   *                  when known. A dApp firing many circuits needs this to
   *                  tell which call broke.
   * @param expected The only era this flow can accept back. Defaults to
   *                 `'v9'`. See the class comment for which fact this names
   *                 on each arm.
   * @param received The era the payload actually carried, when it carried a
   *                 readable one. Named in the message: a refusal that states
   *                 only what it wanted leaves the reader to find out what it
   *                 got.
   */
  constructor(
    readonly seam: EraSeam,
    readonly circuitId?: string | readonly string[],
    readonly expected: LedgerVersion = 'v9',
    readonly received?: LedgerVersion
  ) {
    super(
      `${seam} returned a payload from the '${received ?? 'other'}' ledger era, on a flow that can only ` +
        `accept '${expected}'${formatCircuitClause(circuitId) ?? ''}. ` +
        `Check that the configured provider matches the network this application targets, and that no custom ` +
        `provider implementation re-tags the payload it was handed.`
    );
    this.name = 'EraInvariantViolationError';
  }
}

/**
 * Why an object was refused as belonging to the wrong era, or to neither.
 *
 * One error class over three reasons rather than three classes: a caller catches "I handed the
 * framework the wrong kind of contract" as one condition, and the reason is what tells it which
 * of the three mistakes it made.
 */
export type EraArtifactMismatchReason =
  /** A raw current-era contract instance, passed where its `CompiledContract` container belongs. */
  | 'unwrapped-current-era-contract'
  /** An object matching no era's shape at all. */
  | 'unrecognised-contract-shape'
  /** A current-era artifact, on a network head that is still pre-fork. */
  | 'current-era-artifact-on-pre-fork-head';

const ERA_ARTIFACT_MISMATCH_MESSAGES: Readonly<Record<EraArtifactMismatchReason, string>> = Object.freeze({
  // Named as the mistake it is: the raw instance and the container both carry `impureCircuits`, so
  // nothing about the value the caller passed looks wrong to it.
  'unwrapped-current-era-contract':
    'A raw contract instance was passed where a CompiledContract container is expected. ' +
    'The current Compact toolchain wraps its generated contract in a CompiledContract, which is what ' +
    'carries the witnesses and the compiled-asset paths an execution needs; the bare instance carries ' +
    'neither. Wrap it — CompiledContract.make(tag, Contract), then attach its witnesses — and pass the ' +
    'container instead of the instance.',
  // The single settled wording, read from where it is written rather than restated.
  'unrecognised-contract-shape':
    `${NEITHER_ERA_CONTRACT_MESSAGE} ` +
    'Pass either a CompiledContract container produced by the current toolchain, or the contract ' +
    'instance the retained toolchain generates.',
  'current-era-artifact-on-pre-fork-head':
    'This contract was produced by the current Compact toolchain, but the network head is still on the ' +
    'pre-fork ledger era, which cannot execute it. Run this operation against a contract produced by the ' +
    'retained toolchain until the network head has crossed the fork.'
});

/**
 * An error indicating that the contract handed to an entry point does not belong to the era the
 * operation can execute — or to either era.
 *
 * Raised before any pipeline is entered, so no proving, no provider round trip and no state decode
 * happens on a request that cannot succeed.
 *
 * @see {@link EraDispatch} for how the era is established and which pairings are refused.
 */
export class EraArtifactMismatchError extends Error {
  readonly code = CONTRACTS_ERROR_CODES.ERA_ARTIFACT_MISMATCH;

  /**
   * @param reason Which of the three era mismatches this is. Also the discriminant a caller
   *               branches on, so it is retained on the error rather than only rendered.
   */
  constructor(readonly reason: EraArtifactMismatchReason) {
    super(ERA_ARTIFACT_MISMATCH_MESSAGES[reason]);
    this.name = 'EraArtifactMismatchError';
  }
}

/**
 * An error indicating that the contract at this address is held on chain in a CURRENT-era state,
 * while the artifacts handed to this operation came from the retained Compact toolchain.
 *
 * The retained era stays supported for a contract whose state the retained ledger wrote, and it
 * stays supported after that state has been MIGRATED: a contract's first post-fork call rewrites
 * its envelope to the current era, and the ledger carries the retained verifier keys across
 * unchanged. So a current-era envelope on its own says nothing about which toolchain built the
 * contract, and this error is not raised for one.
 *
 * What raises it is the pair: a current-era envelope AND a key these artifacts cannot match. A
 * migrated pre-fork contract still declares the keys the retained toolchain produced, so it does not
 * reach here; a contract deployed with current-toolchain artifacts declares keys no retained
 * artifact can match, and that is the case named here.
 *
 * Distinct from the era disagreements either side of it: nothing here is stale or inconsistent, and
 * a retry cannot change it. What has to change is which artifacts the caller passes.
 */
export class RetainedArtifactOnCurrentEraStateError extends Error {
  readonly code = CONTRACTS_ERROR_CODES.RETAINED_ARTIFACT_ON_CURRENT_ERA_STATE;

  /**
   * @param contractAddress The contract whose on-chain state was read.
   * @param options Carries the key-mismatch this refusal re-reports on `cause`, so the byte-level
   * diagnosis is not lost behind the era-level one.
   */
  constructor(
    readonly contractAddress: string,
    options?: ErrorOptions
  ) {
    super(
      `The contract at '${contractAddress}' is held on chain in a current-era state whose verifier key ` +
        `for this circuit is not the one the supplied artifacts carry, so those artifacts do not describe ` +
        `this contract. A contract deployed before the fork keeps its retained keys even after a post-fork ` +
        `call migrates its state, so this is not that case: it is a contract built with current-toolchain ` +
        `artifacts. Re-run the operation with the artifacts the current toolchain produced for it. Retrying ` +
        `with the same artifacts cannot succeed.`,
      options
    );
    this.name = 'RetainedArtifactOnCurrentEraStateError';
  }
}

/**
 * An error indicating that a contract produced by the retained Compact toolchain was submitted for
 * DEPLOYMENT to a network head that has already crossed the fork.
 *
 * The retained era is supported for calls against contracts already on chain, which is what keeps
 * pre-fork deployments callable. A new deployment has no such history to preserve, so it is refused
 * rather than written to the chain in an era the network has left.
 */
export class Ledger8DeployOnV9Error extends Error {
  readonly code = CONTRACTS_ERROR_CODES.LEDGER8_DEPLOY_ON_V9;

  constructor() {
    super(
      'A contract produced by the retained Compact toolchain cannot be deployed to a post-fork network ' +
        'head. The retained era stays supported for calls against contracts that were deployed before the ' +
        'fork, but a new deployment has no pre-fork history to preserve. Recompile the contract with the ' +
        'current toolchain and deploy that artifact — see the runtime-deploy chapter of the migration guide.'
    );
    this.name = 'Ledger8DeployOnV9Error';
  }
}

/**
 * An error indicating that the network head this operation resolved is a different ledger era from
 * the one the contract state it fetched was written by, and that a fresh head read confirms the
 * head reading was the stale half.
 *
 * The two are read at separate moments, so during the fork window an operation can start from a
 * head reading that is already behind the state it goes on to fetch.
 *
 * The message deliberately does NOT claim which of the two readings moved: the check establishes
 * that they disagree and that a fresh read agrees with the state, never a direction. Do not add
 * one.
 *
 * @see {@link EraDispatch} for the five-step check that produces this error.
 */
export class HeadStateEraMismatchError extends Error {
  readonly code = CONTRACTS_ERROR_CODES.HEAD_STATE_ERA_MISMATCH;

  /**
   * @param head The era the operation resolved from the network head.
   * @param stateEra The era the fetched state's own envelope was written by.
   */
  constructor(
    readonly head: LedgerVersion,
    readonly stateEra: LedgerVersion
  ) {
    super(
      `This operation resolved a '${head}'-era network head, but the contract state it fetched carries a ` +
        `'${stateEra}'-era envelope, and re-reading the head returned '${stateEra}' as well. The era this ` +
        `operation started from is not the era the network now reports, which is what happens while the ` +
        `network crosses the ledger fork. Re-read the network head, then re-run the operation against the ` +
        `era it now reports.`
    );
    this.name = 'HeadStateEraMismatchError';
  }
}

/**
 * An error indicating that the read surface reported a network head and a contract state whose eras
 * disagree, and that the disagreement survived a fresh head read.
 *
 * Distinct from {@link HeadStateEraMismatchError}, and the distinction is the point: there the head
 * reading was merely stale and re-running fixes it. Here the head is confirmed, so the served state
 * and the served head cannot both describe one chain — which is a fault in the data served, not a
 * timing artefact the caller can correct. Deliberately NOT reported as a fork in progress: nothing
 * observed here establishes that one is under way, and telling a caller to wait out a fork that is
 * not happening is worse than telling it to retry.
 */
export class IndexerInconsistencyError extends Error {
  readonly code = CONTRACTS_ERROR_CODES.INDEXER_INCONSISTENCY;

  /**
   * @param head The era the network head reported, confirmed by a fresh read.
   * @param stateEra The era the fetched state's own envelope was written by.
   */
  constructor(
    readonly head: LedgerVersion,
    readonly stateEra: LedgerVersion
  ) {
    super(
      `The read surface reported a '${head}'-era network head — confirmed by a second, fresh read — while ` +
        `serving a contract state that carries a '${stateEra}'-era envelope. Those two answers cannot both ` +
        `describe one chain, so this is an inconsistency in what was served rather than a stale reading this ` +
        `client can correct. Retry the operation, and if it persists check the health of the configured indexer.`
    );
    this.name = 'IndexerInconsistencyError';
  }
}

/**
 * An error indicating that the read surface served a contract state without the block's ledger
 * parameters, so a call cannot be composed against the cost model the chain is running.
 *
 * `RawContractState.ledgerParameters` is optional — a provider that cannot serve them is still a
 * usable provider, and the bundled indexer provider always does serve them. This pipeline, though,
 * has just read the chain, so an absent parameter set here is a provider that did not serve them
 * rather than a caller with no read surface.
 *
 * Raised instead of substituting the ledger's initial parameters, which is what happened before and
 * is the failure this error exists to replace: the partitioner drew the guaranteed/fallible boundary
 * from a cost model the chain does not run, the caller paid to prove the result, and the node then
 * refused the guaranteed segment with `Transcript(Execution(OutOfGas))`. Nothing in that path named
 * the cost model, so the diagnosis was unreachable from the error.
 *
 * The compatibility path still exists for a caller that genuinely cannot read the chain, but it has
 * to be selected by name — see `INITIAL_LEDGER_PARAMETERS` in `midnight-js-protocol`.
 */
export class LedgerParametersUnservedError extends Error {
  readonly code = CONTRACTS_ERROR_CODES.LEDGER_PARAMETERS_UNSERVED;

  /**
   * @param contractAddress The contract whose state was read without its block's parameters.
   */
  constructor(readonly contractAddress: string) {
    super(
      `The read surface served the state of the contract at '${contractAddress}' without the ledger ` +
        `parameters of the block that dates it, so this call cannot be partitioned against the cost model ` +
        `the chain is running. Substituting the ledger's initial parameters would draw the guaranteed and ` +
        `fallible segment boundary from a model the chain does not use, and the node would refuse the ` +
        `guaranteed segment for running out of gas after you had already paid to prove it. Use a ` +
        `PublicDataProvider that serves 'ledgerParameters' on 'queryRawContractState' — the bundled indexer ` +
        `provider does.`
    );
    this.name = 'LedgerParametersUnservedError';
  }
}

/**
 * An error indicating that a retained-era call would spend a shielded coin the
 * contract already holds on chain, which this pipeline structurally cannot
 * compose.
 *
 * Building the transaction's Zswap offer for such a spend needs the contract's
 * Zswap CHAIN state, to locate the coin's commitment in the chain's Merkle tree
 * — and the retained-era pipeline does not read one. A coin the same call
 * produced needs no chain state (it is paired with its own output as a
 * transient), which is why only spends of previously held coins are refused.
 *
 * Raised BEFORE the offer is built rather than left to fail deeper: without
 * this the condition surfaced as a bare assertion inside the offer builder,
 * naming neither the era nor the circuit, which told a caller nothing about
 * why its call could not be composed.
 *
 * The fix is to supply the retained arm with a Zswap chain state, which is
 * tracked separately; until then this refuses in the caller's own test run
 * rather than in production.
 */
export class Ledger8ShieldedSpendUnsupportedError extends Error {
  readonly code = CONTRACTS_ERROR_CODES.LEDGER8_SHIELDED_SPEND_UNSUPPORTED;

  /**
   * @param circuitId The circuit whose call was refused.
   */
  constructor(readonly circuitId: string) {
    super(
      `Circuit '${circuitId}' spends a shielded coin the contract already holds on chain, which a ` +
        'retained-era call cannot compose: building the Zswap offer for such a spend needs the ' +
        "contract's Zswap chain state, and the retained-era pipeline does not read one. A coin the same " +
        'call produces is fine — it is paired with its own output — so only spends of previously held ' +
        'coins are affected. Run this circuit against a contract produced by the current toolchain.'
    );
    this.name = 'Ledger8ShieldedSpendUnsupportedError';
  }
}

/**
 * An error indicating that a provider rejected a retained-era transaction at
 * one of the three transaction-flow seams, with the provider's own failure
 * SANITIZED onto `cause`.
 *
 * ## Why the external failure does not travel as-is
 *
 * A proof-server HTTP failure and a node submit rejection both routinely carry
 * payload material: a response body echoing the request, a message quoting the
 * serialized transaction, or vendor-specific own properties holding either.
 * Propagating such an error unchanged puts that material into whatever the
 * caller logs it with. So the cause is rebuilt here as a plain {@link Error}
 * carrying the original's CLASS NAME and a redacted message, and nothing else:
 * no own properties, and no further `cause` chain.
 *
 * This package's own coded errors are NOT wrapped: they carry no external
 * payload, and a caller narrowing on `V8PayloadUnsupportedError` or
 * {@link EraInvariantViolationError} must keep seeing them.
 *
 * @see {@link KeepStatePipeline} for what redaction removes and what is dropped.
 */
export class Ledger8SeamFailedError extends Error {
  readonly code = CONTRACTS_ERROR_CODES.LEDGER8_SEAM_FAILED;

  /**
   * @param seam The provider method that rejected.
   * @param circuitId The circuit this flow was running.
   * @param cause The provider's failure, already sanitized by the caller.
   */
  constructor(
    readonly seam: EraSeam,
    readonly circuitId: string,
    cause: Error
  ) {
    super(
      `${seam} rejected a retained-era transaction (circuit '${circuitId}'). The provider's own failure ` +
        'is on `cause`, with its message redacted of anything that could carry transaction or witness ' +
        'material; read the provider\'s own logs for the unredacted detail.',
      { cause }
    );
    this.name = 'Ledger8SeamFailedError';
  }
}

/**
 * Whether the operation a {@link StaleHeadError} refuses was deploying a
 * contract or calling one already deployed.
 *
 * The same discriminant the era pairing table takes, kept as its own type here
 * because it decides which of two genuinely different remediations the error
 * carries.
 */
export type StaleHeadOperationKind = 'call' | 'deploy';

/**
 * WHICH operation a submit rejection belongs to: the identity every refusal
 * below has to name so its remediation can actually be followed.
 *
 * A dApp with several calls in flight shares one error handler, so an error
 * telling it to "check whether this finalized" is unfollowable unless it says
 * which contract and which entry point. Contract addresses and circuit ids are
 * identifiers, which messages may carry; decoded state and key bytes are what
 * they may not.
 */
export interface SubmittedOperation {
  /**
   * The era the network head was on when this operation started.
   *
   * One field, two uses, and they are the same fact: it decides which arm of
   * the provider seams the transaction crossed on, and it is the `startEra` a
   * fork diagnosis compares a fresh reading against.
   */
  readonly head: LedgerVersion;
  /** Whether this operation deploys a contract or calls one already deployed. */
  readonly kind: StaleHeadOperationKind;
  /**
   * The entry point this operation ran. A deploy has no circuit of its own and
   * reports the constructor's own name, `'initialState'`.
   */
  readonly circuitId: string;
  /**
   * The contract this operation targets. For a deploy this is the address the
   * composition MINTED, which is the address a caller has to check before
   * deploying again — a deploy mints a fresh nonce, so a second attempt lands
   * at a different address and would not overwrite the first.
   */
  readonly contractAddress: string;
}

// The remediation, written once per operation kind. A call and a deploy do NOT
// share one text, and the reason is not tone: after the head has crossed, a
// retained-era CALL can simply be run again -- it lands on the keep-state
// pipeline with no change to the caller's code -- while a retained-era DEPLOY
// cannot be run again at all, because the retained era has no post-fork
// deployment. Telling a deployer to re-run would send them at a refusal.
//
// Both texts open with the same first step, and its position is load-bearing:
// a submission rejected while the head was moving may still have been recorded,
// so anything that repeats the operation has to come second. Both also NAME the
// thing to check, because "verify it did not finalize" is not an instruction a
// caller with several operations in flight can act on otherwise.
//
// Only the `call` arm is reachable in production today. It is driven through
// `submitCallTx`, and covered there. The `deploy` arm is DORMANT with
// `runLedger8Deploy`: `kind: 'deploy'` is set at exactly one place, inside that
// function, and no entry point invokes it -- `deployContract`'s retained arm
// refuses unconditionally with `Ledger8DeployUnmaintainableError` before any head
// is read. The text is written and tested against that internal function so it
// is correct on the day the deploy arm is enabled, which is the day the era
// seam carries a maintenance authority; it is NOT a message a consumer can
// provoke through this package's public surface now.
const STALE_HEAD_MESSAGES: Readonly<
  Record<StaleHeadOperationKind, (operation: SubmittedOperation, freshEra: LedgerVersion) => string>
> = Object.freeze({
  call: (operation, freshEra) =>
    `This call was built against a '${operation.head}'-era network head and the node rejected its ` +
    `transaction; a fresh read of the head now reports '${freshEra}', so the network crossed the ledger ` +
    `fork while the call was being built. Take two steps, in this order. First, verify the transaction did ` +
    `not finalize: a submission rejected while the head was moving can still have been recorded, so read ` +
    `the state of the contract at '${operation.contractAddress}' and check whether the call to ` +
    `'${operation.circuitId}' is already reflected in it before doing anything that would repeat it. Then ` +
    `re-run the call unchanged - it resolves the network head again and executes against the era the ` +
    `network now reports.`,
  deploy: (operation, freshEra) =>
    `This deployment was built against a '${operation.head}'-era network head and the node rejected its ` +
    `transaction; a fresh read of the head now reports '${freshEra}', so the network crossed the ledger ` +
    `fork while the deployment was being built. Take two steps, in this order. First, verify the ` +
    `deployment did not finalize: a submission rejected while the head was moving can still have been ` +
    `recorded, so check the address this deployment composed, '${operation.contractAddress}', before ` +
    `deploying again - a deploy mints a fresh nonce, so a second attempt lands at a different address and ` +
    `would leave two copies of the contract on chain. Then recompile the contract with the current ` +
    `Compact toolchain and deploy that artifact instead - a contract produced by the retained toolchain ` +
    `cannot be deployed to a post-fork head at all. See the runtime-deploy chapter of the migration guide.`
});

/**
 * An error indicating that the network crossed the ledger fork between an
 * operation resolving the head era and its transaction being submitted, and
 * that a fresh head read confirms the move.
 *
 * Carries a two-step remediation, and the order matters: verify the transaction
 * did not finalize BEFORE acting, because a submission rejected while the head
 * was moving can still have been recorded.
 *
 * The provider's own rejection travels on `cause`, already sanitized of
 * anything that could carry transaction or witness material — see
 * {@link Ledger8SeamFailedError}, which is the form it arrives in.
 *
 * @see {@link StaleHeadRemediation} for why a submit rejection is diagnosed
 *      rather than propagated, and why a deploy's remediation differs.
 */
export class StaleHeadError extends Error {
  readonly code = CONTRACTS_ERROR_CODES.STALE_HEAD;

  /** The era the operation resolved when it started. */
  readonly startEra: LedgerVersion;
  /**
   * Whether the refused operation was a call or a deploy — the discriminant a
   * caller branches on, and which remediation the message carries.
   */
  readonly kind: StaleHeadOperationKind;
  /** The entry point that was run, so a caller with several in flight knows which. */
  readonly circuitId: string;
  /** The contract to reconcile, which is the first remediation step's subject. */
  readonly contractAddress: string;

  /**
   * @param operation Which operation was rejected. Flattened onto the error
   *                  rather than nested, so a caller reads `error.circuitId`
   *                  without knowing this type exists.
   * @param freshEra The era a fresh head read reports now. Retained on the
   *                 error because it is what a caller re-runs against.
   * @param cause The submit rejection, already sanitized.
   */
  constructor(
    operation: SubmittedOperation,
    readonly freshEra: LedgerVersion,
    cause: unknown
  ) {
    super(STALE_HEAD_MESSAGES[operation.kind](operation, freshEra), { cause });
    this.name = 'StaleHeadError';
    this.startEra = operation.head;
    this.kind = operation.kind;
    this.circuitId = operation.circuitId;
    this.contractAddress = operation.contractAddress;
  }
}

/**
 * Why a submit rejection could NOT be diagnosed as a fork crossing or ruled out
 * as one.
 *
 * A discriminated union rather than two error classes, because a caller's
 * decision is the same for both — do not blindly retry, find out whether the
 * transaction landed, then look at the read surface — and the reason is what
 * tells it which of the two happened.
 */
export type SubmitRejectionUndiagnosedCause =
  /** The fresh head read itself rejected, so no reading is available to compare. */
  | { readonly reason: 'head-read-failed'; readonly headReadFailure: unknown }
  /**
   * The fresh read reported an EARLIER era than the operation started against.
   * A ledger era only ever moves forward, so the two readings cannot both
   * describe one chain.
   */
  | { readonly reason: 'head-moved-backwards'; readonly freshEra: LedgerVersion };

// Neither text claims a fork is under way, and that restraint is the point:
// nothing observed in either case establishes one, and telling a caller to wait
// out a fork that is not happening is worse than telling it to retry. Same
// discipline as `IndexerInconsistencyError`.
const undiagnosedMessage = (operation: SubmittedOperation, undiagnosed: SubmitRejectionUndiagnosedCause): string => {
  const subject = operation.kind === 'deploy' ? 'deployment' : 'call';
  const opening =
    `This ${subject} was built against a '${operation.head}'-era network head and the node rejected its ` +
    `transaction (circuit '${operation.circuitId}', contract '${operation.contractAddress}').`;

  switch (undiagnosed.reason) {
    case 'head-read-failed':
      return (
        `${opening} The network head could not be re-read, so whether the network crossed the ledger fork ` +
        `while this ${subject} was being built is unresolved. Both failures are on 'errors': the ` +
        `submission rejection first, the failed head read second. Check whether the transaction finalized, ` +
        `then retry once the read surface is reachable.`
      );
    case 'head-moved-backwards':
      return (
        `${opening} A fresh read of the head reports '${undiagnosed.freshEra}', an EARLIER ledger era. An ` +
        `era only ever moves forward, so those two readings cannot both describe one chain and this ` +
        `rejection cannot be diagnosed either way. The submission rejection is on 'errors'. Check whether ` +
        `the transaction finalized, then check the health of the configured indexer before retrying.`
      );
    default: {
      // The runtime throw is not redundant with the compile-time gate: a new reason reaches here
      // before this switch is updated.
      const unhandled: never = undiagnosed;
      throw new Error(`unhandled undiagnosed-rejection reason: ${String(unhandled)}`);
    }
  }
};

const undiagnosedErrors = (rejection: unknown, undiagnosed: SubmitRejectionUndiagnosedCause): unknown[] =>
  undiagnosed.reason === 'head-read-failed' ? [rejection, undiagnosed.headReadFailure] : [rejection];

/**
 * An error indicating that a submission was rejected and that whether the
 * network crossed the ledger fork under it could not be established.
 *
 * An `AggregateError` because nothing may be dropped: the submission rejection
 * is what happened to the transaction, and {@link reason} is why no diagnosis
 * could be made. `cause` names the proximate failure so a consumer walking only
 * cause chains still lands somewhere useful.
 *
 * DO NOT COPY THE CARRIED REJECTION'S CODE ONTO THIS ERROR. It has its own for
 * a reason.
 *
 * @see {@link StaleHeadRemediation} for that reason, and for the two arms.
 */
export class SubmitRejectionUndiagnosedError extends AggregateError {
  readonly code = CONTRACTS_ERROR_CODES.SUBMIT_REJECTION_UNDIAGNOSED;

  /** Which of the two undiagnosable conditions this is. */
  readonly reason: SubmitRejectionUndiagnosedCause['reason'];
  /** The era the operation resolved when it started. */
  readonly startEra: LedgerVersion;
  readonly kind: StaleHeadOperationKind;
  readonly circuitId: string;
  readonly contractAddress: string;

  /**
   * @param operation Which operation was rejected.
   * @param rejection The submit rejection, already sanitized. Always the FIRST
   *                  entry of `errors`.
   * @param undiagnosed Why no diagnosis could be made.
   */
  constructor(operation: SubmittedOperation, rejection: unknown, undiagnosed: SubmitRejectionUndiagnosedCause) {
    super(undiagnosedErrors(rejection, undiagnosed), undiagnosedMessage(operation, undiagnosed), {
      cause: undiagnosed.reason === 'head-read-failed' ? undiagnosed.headReadFailure : rejection
    });
    this.name = 'SubmitRejectionUndiagnosedError';
    this.reason = undiagnosed.reason;
    this.startEra = operation.head;
    this.kind = operation.kind;
    this.circuitId = operation.circuitId;
    this.contractAddress = operation.contractAddress;
  }
}

interface EffectContractError {
  readonly _tag: string;
  readonly cause: { readonly name: string; readonly message: string; readonly isCompactError?: boolean };
}

export const isEffectContractError = (error: unknown): error is EffectContractError =>
  typeof error === 'object' &&
  error !== null &&
  '_tag' in error &&
  'cause' in error &&
  typeof (error as Record<string, unknown>).cause === 'object' &&
  (error as Record<string, unknown>).cause !== null &&
  'name' in ((error as Record<string, unknown>).cause as object) &&
  'message' in ((error as Record<string, unknown>).cause as object);

/**
 * An era tag on a result that names neither pipeline.
 *
 * {@link isLedger8Result} refuses rather than answering `false`. Answering
 * `false` would mean "this is a current-era result", which for an unreadable
 * tag is a guess, and the caller would then read the result through the wrong
 * era's shape. Every result this framework builds carries one of the two
 * literals; a value that does not has been round-tripped through something
 * that dropped it -- a queue, a JSON boundary, a structured clone.
 */
export class UnrecognisedResultEraError extends Error {
  readonly code = CONTRACTS_ERROR_CODES.UNRECOGNISED_RESULT_ERA;

  /**
   * @param received What the result's `era` field actually held.
   */
  constructor(readonly received: unknown) {
    super(
      `A result carried an era tag naming neither pipeline (got: ${JSON.stringify(received) ?? 'undefined'}). ` +
        `Results are tagged '${CURRENT_PIPELINE_ERA}' or '${RETAINED_PIPELINE_ERA}' by the pipeline that built ` +
        `them. A tag lost in transit -- through a queue, a JSON boundary, a structured clone -- cannot be ` +
        `recovered here: narrow the result before it crosses that boundary, or carry the era beside it.`
    );
    this.name = 'UnrecognisedResultEraError';
  }
}

/**
 * A transaction this framework submitted that the chain recorded with a
 * non-success status, in EITHER era. The one class to catch.
 *
 * The two eras cannot share a record TYPE. The current era submits and accepts
 * only v9, so its record is `FinalizedTxData`. A retained-era call is recorded
 * by whichever era the network head is on, so its record is the version-tagged
 * union -- which is not assignable to the v9 arm, and narrowing the current
 * era's member to the union would change a type consumers already read. That
 * is why the retained era has a class of its own rather than extending
 * `TxFailedError`, and why this base declares the union.
 *
 * Each subclass keeps its own historical member -- `finalizedTxData` on the
 * current era's, `txData` on the retained one -- so nothing reading those
 * breaks. {@link AnyEraTxFailedError.record} is the member to write new code
 * against, and it needs narrowing on `version` before `tx` is touched.
 */
export abstract class AnyEraTxFailedError extends Error {
  /**
   * The one code every recorded-failure class in this package answers to.
   *
   * `instanceof` is the idiom this hierarchy is built for, but it is identity-
   * based: with two copies of this package resolved in one process it returns
   * `false` and a failed transaction walks past a correctly written handler.
   * A consumer that cannot import these classes, or cannot rely on there being
   * one copy of them, branches on this instead. Subclasses inherit it rather
   * than each declaring their own -- what a caller needs to distinguish is
   * WHICH transaction failed, which the class and the record answer, not a
   * finer code.
   */
  readonly code = CONTRACTS_ERROR_CODES.TX_FAILED;

  /**
   * The finalized record the chain reported, version-tagged.
   *
   * @remarks Narrow on `record.version` before reading `record.tx`: the handle
   * belongs to the ledger runtime the tag names.
   */
  abstract readonly record: VersionedFinalizedTxData;
}

/**
 * An error indicating that a transaction submitted to a consensus node failed.
 *
 * The current era's arm of {@link AnyEraTxFailedError}: its record is always
 * the v9 one. Catch the base to catch both eras.
 */
export class TxFailedError extends AnyEraTxFailedError {
  /**
   * @param finalizedTxData The finalization data of the transaction that failed.
   * @param circuitId The name of the circuit that was called to create the call
   *                  transaction that failed. Only defined if a call transaction
   *                  failed.
   */
  constructor(
    public readonly finalizedTxData: FinalizedTxData,
    public readonly circuitId?: AnyProvableCircuitId | AnyProvableCircuitId[]
  ) {
    super('Transaction failed');
    this.message = JSON.stringify(
      {
        ...(circuitId && { circuitId }),
        ...finalizedTxData
      },
      (_key, value) => {
        if (typeof value === 'bigint') return value.toString();
        if (value instanceof Map) return Object.fromEntries(value);
        return value;
      },
      '\t'
    );
  }

  /** See {@link AnyEraTxFailedError.record}. Always the v9 arm on this class. */
  get record(): VersionedFinalizedTxData {
    return this.finalizedTxData;
  }
}

/**
 * An error indicating that a deploy transaction was not successfully applied by the consensus node.
 */
export class DeployTxFailedError extends TxFailedError {
  /**
   * @param finalizedTxData The finalization data of the deployment transaction that failed.
   */
  constructor(finalizedTxData: FinalizedTxData) {
    super(finalizedTxData);
    this.name = 'DeployTxFailedError';
  }
}

/**
 * An error indicating that a call transaction was not successfully applied by the consensus node.
 *
 * `circuitId` names every circuit the failed TRANSACTION carried, so in a
 * scope that made several calls it is the whole list. That is deliberately
 * wider than {@link FinalizedCallTxData.circuitId}, which names the one call
 * its result describes: nothing about a transaction-level failure attributes
 * it to a single call within the transaction.
 */
export class CallTxFailedError extends TxFailedError {
  /**
   * @param finalizedTxData The finalization data of the call transaction that failed.
   * @param circuitId The name of the circuit that was called to build the transaction.
   */
  constructor(
    finalizedTxData: FinalizedTxData,
    circuitId: AnyProvableCircuitId | AnyProvableCircuitId[]
  ) {
    super(finalizedTxData, circuitId);
    this.name = 'CallTxFailedError';
  }
}

/**
 * The ways in which a circuit the client holds a verifier key for can fail to line up with the
 * contract state deployed on chain. Each circuit falls into exactly one of these.
 */
export interface ContractTypeMismatch {
  /**
   * Circuits for which the deployed state registers no operation at all.
   */
  readonly missing: AnyProvableCircuitId[];
  /**
   * Circuits whose operation is registered on the deployed state but carries no verifier key.
   */
  readonly keyless: AnyProvableCircuitId[];
  /**
   * Circuits whose deployed verifier key differs from the one the client holds.
   */
  readonly mismatched: AnyProvableCircuitId[];
}

const MAX_STATE_DESCRIPTION_CHARS = 2_000;

const describeContractState = (contractState: ContractState): string => {
  try {
    const description = contractState.toString(true);
    return description.length > MAX_STATE_DESCRIPTION_CHARS
      ? `${description.slice(0, MAX_STATE_DESCRIPTION_CHARS)}… (truncated from ${description.length} characters; the full state is on 'error.contractState')`
      : description;
  } catch (error) {
    // Deliberately narrow: this runs inside the error constructor, so letting a failure escape
    // would destroy the ContractTypeError and take 'circuitIds' with it. The state itself stays
    // reachable on 'error.contractState' for a caller that wants to inspect it.
    return `<the deployed state could not be rendered: ${error instanceof Error ? error.message : String(error)}>`;
  }
};

const describeMismatch = (mismatch: ContractTypeMismatch, contractAddress?: ContractAddress): string => {
  const subject = contractAddress === undefined ? 'The deployed contract' : `The contract at '${contractAddress}'`;
  const lines = [`${subject} is not the expected contract type.`];
  if (mismatch.missing.length > 0) {
    lines.push(`  Not registered on the deployed state: ${mismatch.missing.join(', ')}`);
  }
  if (mismatch.keyless.length > 0) {
    lines.push(
      `  Registered on the deployed state but carrying no verifier key: ${mismatch.keyless.join(', ')}. ` +
        'The deployed state is incomplete, so recompiling the local contract will not resolve this.'
    );
  }
  if (mismatch.mismatched.length > 0) {
    lines.push(
      `  Deployed verifier key differs from the local one: ${mismatch.mismatched.join(', ')}. ` +
        'The local artifacts were built from a different contract or a different version of it.'
    );
  }
  return lines.join('\n');
};

/**
 * The error that is thrown when there is a contract type mismatch between a given contract type,
 * and the initial state that is deployed at a given contract address.
 *
 * @remarks
 * This error is typically thrown during calls to {@link findDeployedContract} where the supplied contract
 * address represents a different type of contract to the contract type given.
 *
 * The three conditions are reported separately because they call for different responses: a
 * mismatched key means the local artifacts are wrong, while a keyless slot means the deployed state
 * itself is incomplete and rebuilding locally cannot help.
 */
export class ContractTypeError extends TypeError {
  /**
   * The circuits that the deployed state registers no operation for.
   */
  readonly missingCircuitIds: AnyProvableCircuitId[];
  /**
   * The circuits whose deployed operation carries no verifier key.
   */
  readonly keylessCircuitIds: AnyProvableCircuitId[];
  /**
   * The circuits whose deployed verifier key differs from the local one.
   */
  readonly mismatchedCircuitIds: AnyProvableCircuitId[];
  /**
   * Every circuit that failed to match, whatever the reason, grouped by condition: missing first,
   * then keyless, then mismatched.
   */
  readonly circuitIds: AnyProvableCircuitId[];

  /**
   * Initializes a new {@link ContractTypeError}.
   *
   * @param contractState The initial deployed contract state.
   * @param mismatch The circuits that failed to match, grouped by the condition that applied.
   * @param contractAddress The address the state was read from, when known.
   */
  constructor(
    readonly contractState: ContractState,
    mismatch: ContractTypeMismatch,
    readonly contractAddress?: ContractAddress
  ) {
    super(`${describeMismatch(mismatch, contractAddress)}\nDeployed state: ${describeContractState(contractState)}`);
    this.missingCircuitIds = mismatch.missing;
    this.keylessCircuitIds = mismatch.keyless;
    this.mismatchedCircuitIds = mismatch.mismatched;
    this.circuitIds = [...mismatch.missing, ...mismatch.keyless, ...mismatch.mismatched];
  }
}

/**
 * An error indicating that a contract-scoped transaction was created while the
 * network head is on a ledger era that has no way to express one.
 *
 * The pre-fork era composes exactly one call per transaction, which leaves a
 * pre-fork scope nothing to batch into.
 *
 * Raised when the scope is CREATED, and from the head READING alone — before
 * that era's runtime is acquired. Both are load-bearing; do not move it later.
 *
 * Both ways forward are named in the message, because the caller's batching
 * intent cannot be honoured either way and it needs to choose.
 *
 * @see {@link StaleHeadRemediation} for what each placement property prevents.
 */
export class ScopedTxEraUnsupportedError extends Error {
  readonly code = CONTRACTS_ERROR_CODES.SCOPED_TX_ERA_UNSUPPORTED;

  /**
   * @param head The era the network head is on, as the scope resolved it.
   */
  constructor(readonly head: LedgerVersion) {
    super(
      `A contract-scoped transaction cannot be created while the network head is on the '${head}' ledger ` +
        `era. A scope batches several circuit calls into one transaction, and this era composes exactly ` +
        `one call per transaction and refuses a longer list, so there is nothing for a scope to batch ` +
        `into. Either submit each call as its own transaction with submitCallTx, or run the scope once ` +
        `the network head has crossed the fork.`
    );
    this.name = 'ScopedTxEraUnsupportedError';
  }
}

/**
 * An error indicating that a call against a contract produced by the RETAINED
 * Compact toolchain was handed a contract-scoped transaction to join.
 *
 * A scope merges live CURRENT-era transactions, and a retained-era call crosses
 * the provider seams as its own transaction, so there is nothing to merge it
 * into at either head.
 *
 * Raised rather than ignored, and that is the change it makes: the retained-era
 * arm previously accepted a scope context and ran outside it.
 *
 * @see {@link StaleHeadRemediation} for why the two cannot be batched.
 */
export class MixedEraScopeError extends Error {
  readonly code = CONTRACTS_ERROR_CODES.MIXED_ERA_SCOPE;

  /**
   * @param circuitId The circuit whose call was refused.
   */
  constructor(readonly circuitId: string) {
    super(
      `Circuit '${circuitId}' belongs to a contract produced by the retained Compact toolchain and cannot ` +
        `join a contract-scoped transaction: a scope merges its calls into one current-era transaction, ` +
        `while a retained-era call is composed and submitted on its own. Submit this call as its own ` +
        `transaction with submitCallTx, outside the scope, and keep the scope for calls against contracts ` +
        `produced by the current toolchain.`
    );
    this.name = 'MixedEraScopeError';
  }
}

/**
 * An error indicating that a private state ID was specified for a call transaction while a private
 * state provider was not. We want to let the user know so that they aren't under the impression the
 * private state of a contract was updated when it wasn't.
 */
export class IncompleteCallTxPrivateStateConfig extends Error {
  constructor() {
    super('Incorrect call transaction configuration');
    this.message = "'privateStateId' was defined for call transaction while 'privateStateProvider' was undefined";
  }
}

/**
 * An error indicating that an initial private state was specified for a contract find while a
 * private state ID was not. We can't store the initial private state if we don't have a private state ID,
 * and we need to let the user know that.
 */
export class IncompleteFindContractPrivateStateConfig extends Error {
  constructor() {
    super('Incorrect find contract configuration');
    this.message = "'initialPrivateState' was defined for contract find while 'privateStateId' was undefined";
  }
}

/**
 * An error indicating that a scoped transaction attempted to use cached states
 * with a different contract address or private state ID than the one originally cached.
 * This prevents silent state mismatches when batching calls to different contracts.
 */
export class ScopedTransactionIdentityMismatchError extends Error {
  constructor(
    readonly cached: { contractAddress: string; privateStateId?: PrivateStateId },
    readonly requested: { contractAddress: string; privateStateId?: PrivateStateId }
  ) {
    super('Scoped transaction identity mismatch');
    this.name = 'ScopedTransactionIdentityMismatchError';
    this.message =
      `Cannot use cached states from contract '${cached.contractAddress}'` +
      (cached.privateStateId ? ` (privateStateId: '${cached.privateStateId}')` : '') +
      ` for contract '${requested.contractAddress}'` +
      (requested.privateStateId ? ` (privateStateId: '${requested.privateStateId}')` : '') +
      '. Scoped transactions must target the same contract and private state identity.';
  }
}

/**
 * An error indicating that a contract's on-chain entry point declares no verifier key at all.
 *
 * An absent key means that entry point was never deployed — the shape a constructor-built state
 * has before a deploy fills it in — rather than a key that happens to be empty
 * (`packages/protocol/docs/fail-closed-decoding.md`). There is nothing for a proof to be verified
 * against, so the call is refused before any proving happens.
 */
export class BlankVerifierKeySlotError extends Error {
  readonly code = CONTRACTS_ERROR_CODES.BLANK_VERIFIER_KEY_SLOT;

  /**
   * @param circuitId The entry point whose slot is blank.
   */
  constructor(readonly circuitId: string) {
    super(
      `The deployed contract declares entry point '${circuitId}' but registers no verifier key against ` +
        `it, so a call to '${circuitId}' has nothing to be verified against. A blank slot means that entry ` +
        `point was never deployed: deploy the contract's verifier keys, or check that the address this ` +
        `operation targets is the contract you compiled.`
    );
    this.name = 'BlankVerifierKeySlotError';
  }
}

/**
 * An error indicating that the verifier key compiled locally for a circuit does not byte-match the
 * key registered on chain for that entry point.
 *
 * Raised BEFORE proving, which is the whole value of the check: a proof generated against a key the
 * chain does not hold is rejected on submission, after the cost of generating it has been paid.
 *
 * This is also what catches a mis-dispatched operation — the wrong pipeline, or the wrong contract
 * address — because either one shows up here as a key that does not match the slot.
 *
 * @see {@link VerificationPath} for what this check buys and what it cannot classify.
 */
export class VerifierKeyMismatchError extends Error {
  readonly code = CONTRACTS_ERROR_CODES.VERIFIER_KEY_MISMATCH;

  /**
   * @param circuitId The entry point whose key did not match.
   */
  constructor(readonly circuitId: string) {
    super(
      `The verifier key compiled for '${circuitId}' does not match the key the deployed contract registers ` +
        `for that entry point, so a proof generated from this artifact would be rejected on submission. The ` +
        `deployed contract is a different build from this local one: point the operation at the address this ` +
        `artifact was compiled for, or rebuild against the deployed contract's source.`
    );
    this.name = 'VerifierKeyMismatchError';
  }
}

/**
 * An error indicating that a retained-era deploy was refused because this
 * pipeline does not set a maintenance authority on the contract it would
 * create.
 *
 * A retained constructor leaves behind an EMPTY committee with a threshold of
 * ONE — a rule set nothing can ever satisfy — so the deployed contract could
 * never have a verifier key inserted, removed or replaced, by anyone, its
 * deployer included. `packages/protocol/src/test/v8-deploy.test.ts` pins that
 * measurement.
 *
 * The refusal is about the AUTHORITY THIS PIPELINE SETS, not about a limit of
 * the retained era: the retained runtime exposes `sampleSigningKey`,
 * `signatureVerifyingKey` and a mutable `ContractState.maintenanceAuthority`,
 * and an authority written onto the constructor's own state survives into the
 * composed deploy. Lifting the refusal therefore means threading a signing key
 * through the retained execution leg in `packages/protocol` — not widening the
 * era seam, which already carries the serialized state the authority lives in.
 *
 * Carries no registered error code, deliberately: a code is a published
 * compatibility commitment, and this condition goes away when the authority is
 * threaded through. The exported CLASS is what a consumer needs in the
 * meantime — `instanceof` beats matching on a message that is expected to
 * change.
 *
 * @see {@link KeepStatePipeline} for the measurement in full.
 */
export class Ledger8DeployUnmaintainableError extends Error {
  constructor() {
    super(
      'A retained-era contract cannot be deployed by this release. The transaction composes, but this ' +
        'pipeline sets no maintenance authority, and the authority a retained constructor leaves behind ' +
        'is an empty committee with a threshold of one - which nothing can ever satisfy. The deployed ' +
        'contract could never have a verifier key inserted, removed or replaced, by anyone, including ' +
        'you. Deploy a contract produced by the current toolchain instead, and keep using the retained ' +
        'artifact for calls against contracts that were deployed before the fork - see the ' +
        'runtime-deploy chapter of the migration guide.'
    );
    this.name = 'Ledger8DeployUnmaintainableError';
  }
}

/**
 * An error indicating that a retained-era call was recorded on chain with a
 * status other than `SucceedEntirely`.
 *
 * The retained-era counterpart of {@link CallTxFailedError}, which cannot be
 * reused because it carries a current-era `FinalizedTxData` where a retained
 * call is recorded as a version-tagged {@link VersionedFinalizedTxData}.
 *
 * Carries no registered error code, for the same reason
 * {@link Ledger8DeployUnmaintainableError} does not: the code would be a
 * published commitment on an arm whose record type is expected to converge with
 * the current era's. The record itself is on {@link txData} so a caller can
 * branch on the status rather than read it out of the message.
 *
 * The message states the local-versus-chain consequence per STATUS, because the
 * two differ: with the whole transaction rejected nothing landed, but a
 * fallible-phase failure keeps every guaranteed effect — and this pipeline
 * places every movement it makes in the guaranteed segment, so the chain moved
 * while the private state was not stored.
 */
export class Ledger8CallTxFailedError extends AnyEraTxFailedError {
  constructor(
    readonly txData: VersionedFinalizedTxData,
    readonly circuitId: string
  ) {
    super(
      `The retained-era call to circuit '${circuitId}' was recorded on chain with status ` +
        `'${txData.status}' rather than 'SucceedEntirely' (transaction id '${txData.txId}'). ` +
        (txData.status === 'FailFallible'
          ? 'The guaranteed phase LANDED, so the contract state advanced on chain, but no private state ' +
            'was stored locally - reconcile the local state against the chain before calling again.'
          : 'No private state was stored, and no effect of this call landed on chain, so the local ' +
            'state still matches it.')
    );
    this.name = 'Ledger8CallTxFailedError';
  }

  /** See {@link AnyEraTxFailedError.record}. Either arm on this class. */
  get record(): VersionedFinalizedTxData {
    return this.txData;
  }
}

/**
 * An error indicating that the fetched contract state declares the same entry
 * point NAME more than once, so which slot a call would dispatch on is
 * ambiguous.
 *
 * Two byte entry points can decode to the same name. Picking the first match
 * would let the pre-proving key check pass against one slot while the chain
 * dispatches the proof on another, which is a paid-for proof rejected at
 * submission — the exact late failure that check exists to prevent.
 *
 * Carries no registered error code: it reports a chain state this package
 * cannot act on, and there is no remediation a caller can apply beyond
 * reporting it.
 */
export class Ledger8AmbiguousEntryPointError extends Error {
  constructor(
    readonly circuitId: string,
    readonly matchCount: number
  ) {
    super(
      `The contract state on chain declares ${matchCount} entry points that decode to the name ` +
        `'${circuitId}', so which slot a call would dispatch on is ambiguous. Checking one slot's ` +
        'verifier key would not establish that the chain verifies the proof against that same slot. ' +
        'Report this contract address: a state with duplicate entry-point names is not something a ' +
        'caller can work around.'
    );
    this.name = 'Ledger8AmbiguousEntryPointError';
  }
}

/**
 * An error indicating that a retained-era call would pay a shielded coin to a
 * recipient whose encryption public key this arm cannot resolve.
 *
 * Raised BEFORE the offer is built. Without it the condition surfaced from
 * inside `createZswapOutput` as a bare `Error` naming neither the era nor the
 * circuit, and advising a `encryptionPublicKeyResolver` mapping that the
 * retained-era options carry no field for — advice a caller structurally could
 * not follow.
 *
 * Refusal rather than a best effort is the only answer that cannot lose a coin:
 * encrypting the output to the caller's own key instead would compose, prove,
 * balance and submit, and leave the recipient owning a coin it could never
 * discover.
 *
 * @see {@link KeepStatePipeline} for why the retained arm resolves only the
 *      caller's own key and the burn address.
 */
export class Ledger8RecipientUnmappableError extends Error {
  constructor(
    readonly circuitId: string,
    readonly recipientCoinPublicKey: string
  ) {
    super(
      `Circuit '${circuitId}' pays a shielded coin to recipient '${recipientCoinPublicKey}', whose ` +
        'encryption public key a retained-era call cannot resolve: this arm resolves the calling ' +
        "wallet's own key and the burn address, and its options carry no field for additional " +
        'recipient mappings. Refusing is deliberate - encrypting the coin to the caller\'s own key ' +
        'would submit successfully and leave the recipient unable to discover it. Run this circuit ' +
        'against a contract produced by the current toolchain, which accepts ' +
        '`additionalCoinEncPublicKeyMappings`.'
    );
    this.name = 'Ledger8RecipientUnmappableError';
  }
}
