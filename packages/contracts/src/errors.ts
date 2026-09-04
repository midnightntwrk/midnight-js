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
import type { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { AnyProvableCircuitId, FinalizedTxData, PrivateStateId, Seam } from '@midnight-ntwrk/midnight-js-types';
import { CONTRACTS_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';

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
 * {@link EraInvariantViolationError.expected} names the era the flow submitted,
 * and so which direction the violation went. It defaults to `'v9'` — the era
 * every flow that predates the retained-era pipelines submits — so existing
 * call sites read exactly as they did before it existed.
 */
export class EraInvariantViolationError extends Error {
  readonly code = CONTRACTS_ERROR_CODES.ERA_INVARIANT_VIOLATION;

  /**
   * @param seam The provider method that returned the payload.
   * @param circuitId The circuit, or circuits, whose flow this happened on,
   *                  when known. A dApp firing many circuits needs this to
   *                  tell which call broke.
   * @param expected The era this flow submits, and therefore the only era it
   *                 can accept back. Defaults to `'v9'`.
   */
  constructor(
    readonly seam: EraSeam,
    readonly circuitId?: string | readonly string[],
    readonly expected: LedgerVersion = 'v9'
  ) {
    super(
      `${seam} returned a payload from a ledger era other than '${expected}', on a flow that only submits ` +
        `'${expected}' transactions${formatCircuitClause(circuitId) ?? ''}. ` +
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
  // Named as the mistake it is, because it is the one a JavaScript caller actually makes: the raw
  // instance and the container both carry `impureCircuits`, so nothing about the value it passed
  // looks wrong to it.
  'unwrapped-current-era-contract':
    'A raw contract instance was passed where a CompiledContract container is expected. ' +
    'The current Compact toolchain wraps its generated contract in a CompiledContract, which is what ' +
    'carries the witnesses and the compiled-asset paths an execution needs; the bare instance carries ' +
    'neither. Wrap it — CompiledContract.make(tag, Contract), then attach its witnesses — and pass the ' +
    'container instead of the instance.',
  // The single settled wording, read from where it is written rather than restated. A thrown error
  // is where this guidance belongs: it can carry a remediation step, which a compiler diagnostic
  // cannot -- see the module documentation in `./ledger8-contract`.
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
 * @see docs/adr/0007-cross-the-era-boundary-with-plain-data-only.md
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
 * head reading that is already behind the state it goes on to fetch. Nothing in a head integer
 * announces that it has fallen behind, which is why the era is never latched
 * (`docs/adr/0008-never-latch-the-network-head-version.md`) and why this is checked rather than
 * assumed.
 *
 * The message deliberately does NOT claim which of the two readings moved. The routing establishes
 * only that they disagree and that a fresh read agrees with the state; it does not establish a
 * direction, and the realistic fork-window case (a stale pre-fork head against a migrated post-fork
 * state) and its mirror both arrive here. Naming a direction the check has not measured would send
 * a caller looking for the wrong thing.
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
 * Redaction removes the two shapes payload material takes in a message — long
 * hex runs and long base64 runs — rather than trying to recognise a particular
 * provider's format, because the set of providers is open.
 *
 * This package's own coded errors are NOT wrapped: they carry no external
 * payload, and a caller narrowing on `V8PayloadUnsupportedError` or
 * {@link EraInvariantViolationError} must keep seeing them.
 *
 * @see docs/adr/0006-version-tagged-payloads-at-provider-seams.md
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
// refuses unconditionally with `LEDGER8_DEPLOY_UNMAINTAINABLE` before any head
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
 * ## Why a submit rejection is diagnosed rather than propagated
 *
 * A node rejects a transaction for many reasons, and during the fork window one
 * of them is that the transaction belongs to the era the network has just left.
 * Nothing in the node's own rejection distinguishes that case, and the era the
 * operation started from cannot report itself as stale
 * (`docs/adr/0008-never-latch-the-network-head-version.md`) — so the head is
 * read again, once, and the two ERAS are compared. Two readings of the same era
 * one node minor release apart are not a fork and are not reported as one.
 *
 * The provider's own rejection travels on `cause`, already sanitized of
 * anything that could carry transaction or witness material — see
 * {@link Ledger8SeamFailedError}, which is the form it arrives in.
 *
 * @see docs/adr/0008-never-latch-the-network-head-version.md
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
      // A compile-time exhaustiveness gate; the runtime throw is not redundant
      // with it, because a new reason reaches here before this switch is updated.
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
 * ## Why this carries a code of its own
 *
 * Without one it would arrive as a bare `AggregateError`, and a caller
 * branching on `hasErrorCode(e, LEDGER8_SEAM_FAILED)` to decide retry-or-
 * escalate would escalate INTERMITTENTLY for one and the same node rejection —
 * depending on whether the read surface happened to answer. Both failures here
 * are the same network, so they correlate: they coincide more often than
 * independence would suggest.
 *
 * The code is its OWN rather than copied from the rejection it carries, because
 * copying would make one error report two different codes depending on which
 * of the two failures came first.
 *
 * An `AggregateError` because nothing may be dropped: the submission rejection
 * is what happened to the transaction, and the reason on
 * {@link SubmitRejectionUndiagnosedError.reason} is why no diagnosis could be
 * made. `cause` names the proximate failure so a consumer walking only cause
 * chains still lands somewhere useful.
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
 * An error indicating that a transaction submitted to a consensus node failed.
 */
export class TxFailedError extends Error {
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
 * The error that is thrown when there is a contract type mismatch between a given contract type,
 * and the initial state that is deployed at a given contract address.
 *
 * @remarks
 * This error is typically thrown during calls to {@link findDeployedContract} where the supplied contract
 * address represents a different type of contract to the contract type given.
 */
export class ContractTypeError extends TypeError {
  /**
   * Initializes a new {@link ContractTypeError}.
   *
   * @param contractState The initial deployed contract state.
   * @param circuitIds The circuits that are undefined, or have a verifier key mismatch with the
   *                   key present in `contractState`.
   */
  constructor(
    readonly contractState: ContractState,
    readonly circuitIds: AnyProvableCircuitId[]
  ) {
    super(
      `Following operations: ${circuitIds.join(
        ', '
      )}, are undefined or have mismatched verifier keys for contract state ${contractState.toString(false)}`
    );
  }
}

/**
 * An error indicating that a contract-scoped transaction was created while the
 * network head is on a ledger era that has no way to express one.
 *
 * ## Why this is a refusal rather than a narrower scope
 *
 * A scope exists to batch several circuit calls into ONE transaction. The
 * pre-fork era composes exactly one call per transaction and refuses a longer
 * list outright — a call tree is a post-fork ledger feature, so that era has no
 * structure to express a second call in — which leaves a pre-fork scope nothing
 * to batch into. A contract compiled by the retained toolchain is also
 * single-call by construction, so a pre-fork scope has little to be atomic
 * about in the first place.
 *
 * The refusal is raised when the scope is CREATED, before the scope body runs,
 * so no circuit is executed and no private state is touched on a batch that
 * could never be submitted. It is also raised from the head READING alone,
 * before that era's runtime is acquired: a caller that only ever uses the
 * current toolchain must not be made to instantiate the pre-fork ledger to be
 * told its scope cannot run, and must not receive an acquisition failure in
 * place of this refusal when that lazy subpath cannot be loaded at all
 * (`docs/adr/0004-lazy-v8-era-access-via-protocol-subpath.md`).
 *
 * Both ways forward are named in the message, because the caller's batching
 * intent cannot be honoured either way and it needs to choose: give up the
 * batching and submit each call on its own, or keep the batching and run the
 * scope once the network head has crossed the fork.
 *
 * @see docs/adr/0008-never-latch-the-network-head-version.md for why the head
 * era is read per scope rather than cached across scopes.
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
 * A scope merges its calls by merging live CURRENT-era transactions, and a
 * retained-era call is composed on its own, against whichever era the head is
 * on, and crosses the provider seams as its own transaction. So the two cannot
 * be batched: the scope would have to hold an era object this package is not
 * allowed to hold (`docs/adr/0007-cross-the-era-boundary-with-plain-data-only.md`).
 *
 * Raised rather than ignored, and that is the change it makes: the retained-era
 * arm previously accepted a scope context and ran outside it, which submitted a
 * transaction the caller believed had been batched.
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
 * @see packages/protocol/docs/verifier-keys.md
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
