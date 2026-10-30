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

import { type LedgerVersion, NO_CIRCUIT } from '@midnight-ntwrk/midnight-js-protocol';
import { InvariantViolationError, MidnightJsError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import type { ContractAddress, ContractState, SigningKey } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import { CURRENT_LEDGER_VERSION } from '@midnight-ntwrk/midnight-js-protocol/version';
import {
  type AnyProvableCircuitId,
  FailFallible,
  type FinalizedTxRead,
  type PrivateStateId,
  type ProviderMethod,
  SegmentFail
} from '@midnight-ntwrk/midnight-js-types';
import { CONTRACTS_ERROR_CATEGORIES, CONTRACTS_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';

import { NEITHER_ERA_CONTRACT_MESSAGE } from './ledger8-contract';

const assignDefined = (target: object, values: Readonly<Record<string, unknown>>): void => {
  Object.assign(target, Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)));
};

const hideSigningKey = (target: object, signingKey: SigningKey): void => {
  Object.defineProperty(target, 'signingKey', { value: signingKey, enumerable: false });
};

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
 * The transaction methods and the read methods both carry two eras, but any ONE
 * flow through this package hands every provider a transaction handle of a
 * single era and cannot submit or report anything else. An answer in the other
 * era therefore means the provider answered with a handle of an era it was not
 * handed, or that the flow is pointed at a network whose records belong to the
 * other era.
 *
 * {@link EraInvariantViolationError.expected} names the only era this flow can
 * accept back, and so which direction the violation went. For the current
 * era's flows that is the era they submit, which is always `'v9'` — the
 * default, so call sites that predate the retained-era pipelines read exactly
 * as they did before it existed. The retained era's finalizing path passes the
 * network's ledger version instead: it composes retained-era transactions but is
 * recorded by whichever ledger the network is on, so the network, not the pipeline, is what
 * the record has to agree with.
 *
 * {@link EraInvariantViolationError.received} names the era that actually came
 * back. An answer that is not a transaction handle at all is a different
 * fault and raises `InvalidTransactionHandleError` instead; a read-surface
 * record whose `era` is missing or unrecognised raises
 * `UnknownLedgerVersionError`.
 */
export class EraInvariantViolationError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.ERA_INVARIANT_VIOLATION;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.ERA_INVARIANT_VIOLATION];

  /**
   * @param method The provider method that returned the payload.
   * @param circuitId The circuit, or circuits, whose flow this happened on,
   *                  when known. A dApp firing many circuits needs this to
   *                  tell which call broke.
   * @param expected The only era this flow can accept back. Defaults to
   *                 `'v9'`. See the class comment for which fact this names
   *                 on each path.
   * @param received The era the payload actually carried, when it carried a
   *                 readable one. Named in the message: a refusal that states
   *                 only what it wanted leaves the reader to find out what it
   *                 got.
   * @param contractAddress The contract the payload was read for, when the
   *                        flow reads one contract's records.
   * @param txId The transaction the payload belongs to, when it is already on
   *             chain. A caller needs it to reconcile a transaction it cannot
   *             take back.
   */
  constructor(
    readonly method: ProviderMethod,
    readonly circuitId?: string | readonly string[],
    readonly expected: LedgerVersion = 'v9',
    readonly received?: LedgerVersion,
    readonly contractAddress?: string,
    readonly txId?: string
  ) {
    super(
      `${method} returned a transaction from the '${received ?? 'other'}' ledger era, on a flow that can only ` +
        `accept '${expected}'${formatCircuitClause(circuitId) ?? ''}` +
        `${contractAddress === undefined ? '' : ` (contract '${contractAddress}')`}` +
        `${txId === undefined ? '' : ` (transaction '${txId}', already submitted)`}. ` +
        `Check that the configured provider matches the network this application targets, and that no custom ` +
        `provider implementation answers in another era than the handle it was handed.`
    );
    this.name = 'EraInvariantViolationError';
  }
}

/**
 * Why an object was refused as belonging to the wrong era, or to neither.
 *
 * One error class over every reason rather than a class per reason: a caller catches "this operation
 * cannot be placed on a ledger era" as one condition, and the reason is what tells it which mistake
 * it made. Some reasons are about the CALLER's contract object, some about the artifact set its ZK
 * config provider serves, and two about a transaction handed to `submitTx`. From the caller's side
 * that is one condition: something it passed does not belong to the era it is being run against.
 */
export type EraMismatchReason =
  /** A raw ledger 9 contract instance, passed where its `CompiledContract` container belongs. */
  | 'unwrapped-ledger9-contract'
  /** An object matching no era's shape at all. */
  | 'unrecognised-contract-shape'
  /** A ledger 9 artifact, on a network that is still on ledger 8. */
  | 'ledger9-artifact-on-ledger8-network'
  /** A v9 transaction handed to `submitTx`, on a network that is still pre-fork. */
  | 'ledger9-transaction-on-ledger8-network'
  /** A v8 transaction handed to `submitTx`, on a network that has crossed the fork. */
  | 'ledger8-transaction-on-ledger9-network'
  /** An artifact set that does not declare which `compact-runtime` produced it. */
  | 'artifact-era-undeclared'
  /** A ZK config provider that cannot report a declared runtime version at all. */
  | 'provider-cannot-declare-era'
  /** An artifact set declaring a `compact-runtime` this framework places on no ledger era. */
  | 'unknown-artifact-runtime-version'
  /** A ledger 8 (pre-fork) contract submitted for deployment to a network that has crossed the fork. */
  | 'ledger8-deploy-on-ledger9-network'
  /** A ledger 8 (pre-fork) contract given to a maintenance update on a network that has crossed the fork. */
  | 'ledger8-maintenance-on-ledger9-network'
  /** Ledger 8 artifacts given for a contract held on chain in a ledger 9 state they do not describe. `detail` carries the contract address; `cause` the key mismatch. */
  | 'ledger8-artifact-on-ledger9-contract'
  /** A read that handles only ledger 9 states met a state the v8 ledger wrote. `detail` carries the contract address and the operation. */
  | 'ledger8-contract-state-unsupported'
  /** A contract-scoped transaction created while the network is still on ledger 8. `detail` carries the network version. */
  | 'scope-on-ledger8-network'
  /** A call against a ledger 8 (pre-fork) contract given a contract-scoped transaction to join. `detail` carries the circuit id. */
  | 'ledger8-call-in-scope'
  /** A contract whose artifacts declare an era the low-level function does not serve. `detail` carries the function name and that era. */
  | 'contract-era-unsupported'
  /** A result whose `era` tag names neither pipeline. `detail` carries the value received. */
  | 'unrecognised-result-era';

const ERA_MISMATCH_MESSAGES: Readonly<Record<EraMismatchReason, string>> = Object.freeze({
  // Named as the mistake it is: the raw instance and the container both carry `impureCircuits`, so
  // nothing about the value the caller passed looks wrong to it.
  'unwrapped-ledger9-contract':
    'A raw contract instance was passed where a CompiledContract container is expected. ' +
    'The ledger 9 Compact toolchain wraps its generated contract in a CompiledContract, which is what ' +
    'carries the witnesses and the compiled-asset paths an execution needs; the bare instance carries ' +
    'neither. Wrap it — CompiledContract.make(tag, Contract), then attach its witnesses — and pass the ' +
    'container instead of the instance.',
  // The single settled wording, read from where it is written rather than restated.
  'unrecognised-contract-shape':
    `${NEITHER_ERA_CONTRACT_MESSAGE} ` +
    'Pass either a CompiledContract container produced by the ledger 9 Compact toolchain, or the contract ' +
    'instance the ledger 8 (pre-fork) Compact toolchain generates.',
  'ledger9-artifact-on-ledger8-network':
    'This contract was produced by the ledger 9 Compact toolchain, but the network is still on ' +
    'ledger 8, which cannot execute it. Run this operation against a contract produced by the ' +
    'ledger 8 (pre-fork) Compact toolchain until the network has crossed the fork.',
  'ledger9-transaction-on-ledger8-network':
    'A v9 transaction was handed to submitTx, but the network is still on ledger 8, ' +
    'which cannot accept it. Nothing was proved. Submit a v8 transaction until the network has ' +
    'crossed the fork.',
  'ledger8-transaction-on-ledger9-network':
    'A v8 transaction was handed to submitTx, but the network has crossed the fork to the v9 ' +
    'ledger era, which cannot read it. Nothing was proved. Compose the transaction again against the ' +
    'v9 ledger and submit the v9 transaction.',
  // Named as a missing DECLARATION rather than a missing file: the fix is to serve what the compiler
  // already emitted, not to produce something new.
  'artifact-era-undeclared':
    'The ZK config provider for this operation could not report which compact-runtime built these ' +
    'artifacts, so the ledger era they belong to cannot be established. The compiler records it in ' +
    'compiler/contract-info.json beside the keys; serve that file from the same location as the ' +
    'artifacts. The era is never inferred from the generated code, because a build step can rewrite it.',
  // Distinct from `artifact-era-undeclared`: nothing is wrong with the artifacts, and serving a
  // file cannot fix it. What is missing is a capability of the provider itself.
  'provider-cannot-declare-era':
    'The ZK config provider supplied for this operation cannot report which compact-runtime built ' +
    'its artifacts, so the ledger era they belong to cannot be established. The providers this ' +
    'framework ships all report it; a provider written elsewhere must override ' +
    'getArtifactRuntimeVersion() to read the runtime-version from the compiler output beside the ' +
    'keys. See this refusal\'s cause for which provider could not answer.',
  'unknown-artifact-runtime-version':
    'These artifacts declare a compact-runtime this version of midnight-js places on no ledger era, so ' +
    'no pipeline can be chosen for them. Upgrade midnight-js to one that knows this toolchain, or ' +
    'rebuild the contract with a toolchain this version supports.',
  'ledger8-deploy-on-ledger9-network':
    'A contract produced by the ledger 8 (pre-fork) Compact toolchain cannot be deployed to a network that ' +
    'has crossed the fork. Ledger 8 stays supported for calls against contracts that were deployed before the ' +
    'fork, but a new deployment has no pre-fork history to preserve. Recompile the contract with the ' +
    'ledger 9 Compact toolchain and deploy that artifact — see the runtime-deploy chapter of the migration guide.',
  'ledger8-maintenance-on-ledger9-network':
    'A contract produced by the ledger 8 (pre-fork) Compact toolchain cannot maintain a contract on a ' +
    'network that has crossed the fork. Recompile the contract with the ledger 9 Compact toolchain and run the same ' +
    'maintenance function with that artifact: it maintains the migrated contract with the signing key ' +
    'already stored for its address.',
  'ledger8-artifact-on-ledger9-contract':
    'The contract is held on chain in a ledger 9 state whose verifier key ' +
    'for this circuit is not the one the supplied artifacts carry, so those artifacts do not describe ' +
    'this contract. A contract deployed before the fork keeps its ledger 8 keys even after the fork ' +
    'translates its state, so this is not that case: it is a contract built with ledger 9 Compact toolchain ' +
    'artifacts. Re-run the operation with the artifacts the ledger 9 Compact toolchain produced for it. Retrying ' +
    'with the same artifacts cannot succeed.',
  'ledger8-contract-state-unsupported':
    'The contract is held on chain in a state written by the v8 ledger, and ' +
    'the operation runs only against states written by the v9 ledger. Before the hard fork, run the ' +
    'operation through the contract the ledger 8 (pre-fork) Compact toolchain produced. After the fork, the ' +
    'indexer serves every contract\'s state translated to v9 from version 4.4.0-rc.6 on: upgrade an ' +
    'older indexer.',
  'scope-on-ledger8-network':
    'A contract-scoped transaction cannot be created on the era the network is on, named below. ' +
    'A scope batches several circuit calls into one transaction, and only the ledger 9 era composes ' +
    'more than one call per transaction, so there is nothing for a scope to batch into. Either submit ' +
    'each call as its own transaction with submitCallTx, or run the scope once the network is on the ' +
    'ledger 9 era.',
  'ledger8-call-in-scope':
    'A circuit of a contract produced by the ledger 8 (pre-fork) Compact toolchain cannot ' +
    'join a contract-scoped transaction: a scope merges its calls into one ledger 9 transaction, ' +
    'while a ledger 8 call is composed and submitted on its own. Submit this call as its own ' +
    'transaction with submitCallTx, outside the scope, and keep the scope for calls against contracts ' +
    'produced by the ledger 9 Compact toolchain.',
  'contract-era-unsupported':
    'This low-level function does not serve the ledger era the contract\'s artifacts declare, named below. ' +
    'The low-level functions that build a call or deploy transaction from a compiled contract serve only ' +
    'contracts produced by the ledger 9 Compact toolchain. For a contract of another era, call submitCallTx ' +
    'or deployContract, which run contracts of both eras and submit the transaction, or join a deployed ' +
    'contract with findDeployedContract.',
  'unrecognised-result-era':
    `A result carried an era tag naming neither pipeline. ` +
    `Results are tagged '${CURRENT_LEDGER_VERSION}' or 'v8' by the pipeline that built ` +
    `them. A tag lost in transit -- through a queue, a JSON boundary, a structured clone -- cannot be ` +
    `recovered here: narrow the result before it crosses that boundary, or carry the era beside it. ` +
    `A result stored under a 5.0.0 pre-release carries 'ledger9' or 'ledger8': map those to 'v9' and 'v8'.`
});

/** Options for {@link EraMismatchError}. */
export interface EraMismatchOptions extends ErrorOptions {
  /**
   * A sentence appended to the settled wording for this reason, naming the value that was actually
   * seen. Kept OUT of the reason's own message so every instance of a reason reads identically up to
   * the fact that varies.
   */
  readonly detail?: string;
  /** The contract the refused value belongs to. Set for `'ledger8-artifact-on-ledger9-contract'` and `'ledger8-contract-state-unsupported'`. */
  readonly contractAddress?: ContractAddress;
  /** The circuit the refused call names. Set for `'ledger8-call-in-scope'`. */
  readonly circuitId?: string;
}

/**
 * An error indicating that a value the caller passed does not belong to the era the operation can
 * execute — or to either era. The value is a contract, an artifact set, a transaction, a scope, a
 * result, or a contract state read from the chain.
 *
 * Raised before anything is proved or submitted, except `'unrecognised-result-era'`, which is raised
 * when a result that came back from the chain is read.
 *
 * @see {@link EraDispatch} for how the era is established and which pairings are refused.
 */
export class EraMismatchError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.ERA_MISMATCH;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.ERA_MISMATCH];
  /** The sentence appended to the reason's wording, naming the value that was seen. */
  declare readonly detail?: string;
  /** The contract the refused value belongs to, for the reasons that have one. */
  declare readonly contractAddress?: ContractAddress;
  /** The circuit the refused call names, for `'ledger8-call-in-scope'`. */
  declare readonly circuitId?: string;

  /**
   * @param reason Which era mismatch this is. Also the discriminant a caller branches on, so it is
   *               retained on the error rather than only rendered.
   * @param options Carries the originating failure on `cause` -- a provider that could not serve the
   *                artifact description reports WHY there -- and an optional `detail` naming the
   *                value that was seen.
   */
  constructor(
    readonly reason: EraMismatchReason,
    options?: EraMismatchOptions
  ) {
    const message = ERA_MISMATCH_MESSAGES[reason];
    super(options?.detail === undefined ? message : `${message} ${options.detail}`, { cause: options?.cause });
    this.name = 'EraMismatchError';
    assignDefined(this, {
      detail: options?.detail,
      contractAddress: options?.contractAddress,
      circuitId: options?.circuitId
    });
  }
}

/**
 * An error indicating that the ledger version this operation read from the network is a different ledger era from
 * the one the contract state it fetched was written by, and that a fresh read of the network's ledger version
 * confirms the first reading was the stale half.
 *
 * The two are read at separate moments, so during the fork window an operation can start from a
 * network version reading that is already behind the state it goes on to fetch.
 *
 * The message deliberately does NOT claim which of the two readings moved: the check establishes
 * that they disagree and that a fresh read agrees with the state, never a direction. Do not add
 * one.
 *
 * @see {@link EraDispatch} for the five-step check that produces this error.
 */
export class NetworkVersionStateMismatchError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.NETWORK_VERSION_STATE_MISMATCH;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.NETWORK_VERSION_STATE_MISMATCH];

  /**
   * @param networkVersion The ledger version the network reported when the operation started.
   * @param stateEra The ledger era that wrote the fetched state.
   */
  constructor(
    readonly networkVersion: LedgerVersion,
    readonly stateEra: LedgerVersion
  ) {
    super(
      `This operation started while the network reported ledger '${networkVersion}', but the contract state it ` +
        `fetched carries a '${stateEra}' version tag, and reading the network's ledger version again returned ` +
        `'${stateEra}' as well. The ledger this operation started from is not the one the network now reports, ` +
        `which is what happens while the network crosses the ledger fork. Re-run the operation: it reads the ` +
        `network's ledger version again and runs against the ledger it now reports.`
    );
    this.name = 'NetworkVersionStateMismatchError';
  }
}

/**
 * An error indicating that the read surface reported a network ledger version and a contract state whose eras
 * disagree, and that the disagreement survived a fresh read of the network's ledger version.
 *
 * Distinct from {@link NetworkVersionStateMismatchError}, and the distinction is the point: there the network
 * version reading was merely stale and re-running fixes it. Here the network version is confirmed, so the served
 * state and the served network version cannot both describe one chain — which is a fault in the data served, not a
 * timing artefact the caller can correct. Deliberately NOT reported as a fork in progress: nothing
 * observed here establishes that one is under way, and telling a caller to wait out a fork that is
 * not happening is worse than telling it to retry.
 */
export class IndexerInconsistencyError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.INDEXER_INCONSISTENCY;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.INDEXER_INCONSISTENCY];

  /**
   * @param networkVersion The ledger version the network reported, confirmed by a second read.
   * @param stateEra The ledger era that wrote the fetched state.
   */
  constructor(
    readonly networkVersion: LedgerVersion,
    readonly stateEra: LedgerVersion
  ) {
    super(
      `The read surface reported that the network is on ledger '${networkVersion}' — confirmed by a second, fresh ` +
        `read — while serving a contract state that carries a '${stateEra}' version tag. Those two answers cannot both ` +
        `describe one chain, so this is an inconsistency in what was served rather than a stale reading this ` +
        `client can correct. Retry the operation, and if it persists check the health of the configured indexer.`
    );
    this.name = 'IndexerInconsistencyError';
  }
}

/**
 * An error indicating that the read surface served the ledger parameters or the zswap chain state of
 * a contract written by another ledger era than the one the call is built on, or did not serve them.
 * One read carries the states of one era, so the states cannot be combined into a call.
 */
export class PublicStatesEraMismatchError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.PUBLIC_STATES_ERA_MISMATCH;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.PUBLIC_STATES_ERA_MISMATCH];

  /**
   * @param contractAddress The contract whose public states were read.
   * @param field The state that does not match the call.
   * @param expected The ledger era the call is built on.
   * @param received The era of that state, or `undefined` when it was missing.
   */
  constructor(
    readonly contractAddress: string,
    readonly field: 'ledgerParameters' | 'zswapChainState',
    readonly expected: LedgerVersion,
    readonly received: LedgerVersion | undefined
  ) {
    super(
      `A call to the contract at '${contractAddress}' is built on the ${expected} ledger, but the read surface ` +
        `served ${received === undefined ? `no ${field}` : `a ${field} written by the ${received} ledger`}. ` +
        `One read carries the states of one era, so they cannot be combined into a call. Use a ` +
        `PublicDataProvider that serves the states of one block together — the bundled indexer provider does.`
    );
    this.name = 'PublicStatesEraMismatchError';
  }
}

/**
 * An error indicating that the read surface served a contract state without the block's ledger
 * parameters, so a call cannot be composed against the cost model the chain is running.
 *
 * A caller that genuinely cannot read the chain selects the compatibility path by name — see
 * `INITIAL_LEDGER_PARAMETERS` in `midnight-js-protocol`.
 *
 * @see {@link ErrorTaxonomy} for why this refuses rather than substituting the ledger's initial
 * parameters.
 */
export class LedgerParametersUnservedError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.LEDGER_PARAMETERS_UNSERVED;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.LEDGER_PARAMETERS_UNSERVED];

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
        `PublicDataProvider that serves 'ledgerParameters' on 'queryContractState' — the bundled indexer ` +
        `provider does.`
    );
    this.name = 'LedgerParametersUnservedError';
  }
}

/**
 * An error indicating that a provider rejected a transaction at one of the
 * three transaction methods, with the provider's own failure SANITIZED onto
 * `cause`. Raised on every submit path, whatever era the transaction belongs to.
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
 * payload, and a caller narrowing on `ProviderEraUnsupportedError`,
 * `InvalidTransactionHandleError` or {@link EraInvariantViolationError} must keep seeing them.
 *
 * @see {@link KeepStatePipeline} for what redaction removes and what is dropped.
 */
export class ProviderFailedError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.PROVIDER_FAILED;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.PROVIDER_FAILED];

  /**
   * @param method The provider method that rejected.
   * @param circuitId The circuit, or circuits, the transaction runs, when known.
   * @param cause The provider's failure, already sanitized by the caller.
   */
  constructor(
    readonly method: ProviderMethod,
    readonly circuitId: string | readonly string[] | undefined,
    cause: Error
  ) {
    super(
      `${method} rejected the transaction${formatCircuitClause(circuitId) ?? ''}. The provider's own failure ` +
        'is on `cause`, with its message redacted of anything that could carry transaction or witness ' +
        'material; read the provider\'s own logs for the unredacted detail.',
      { cause }
    );
    this.name = 'ProviderFailedError';
  }
}

/**
 * Whether the operation a {@link ForkCrossedDuringOperationError} refuses was deploying a
 * contract, calling one already deployed, or maintaining one.
 *
 * The same discriminant the era pairing table takes, kept as its own type here
 * because it decides which of the genuinely different remediations the error
 * carries.
 */
export type SubmittedOperationKind = 'call' | 'deploy' | 'maintenance';

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
   * The ledger version the network was on when this operation started.
   *
   * One field, two uses, and they are the same fact: it is the era of the
   * transaction carried across the provider methods, and it is the `startEra` a
   * fork diagnosis compares a fresh reading against.
   */
  readonly networkVersion: LedgerVersion;
  /** Whether this operation deploys a contract, calls one already deployed, or maintains one. */
  readonly kind: SubmittedOperationKind;
  /**
   * The entry point this operation ran. A deploy has no circuit of its own and
   * reports the constructor's own name, `'initialState'`; a maintenance
   * authority replacement reports {@link NO_CIRCUIT}.
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

// The remediation, written once per operation kind. The kinds do NOT share one
// text, and the reason is not tone: after the network has crossed, a retained-era
// CALL can simply be run again -- it lands on the keep-state pipeline with no
// change to the caller's code -- while a retained-era DEPLOY or MAINTENANCE
// update cannot be run again at all, because the retained era has neither after
// the fork. Telling a deployer or a maintainer to re-run would send them at a refusal.
//
// Every text opens with the same first step, and its position is load-bearing:
// a submission rejected while the network was crossing the fork may still have been recorded,
// so anything that repeats the operation has to come second. Each also NAMES the
// thing to check, because "verify it did not finalize" is not an instruction a
// caller with several operations in flight can act on otherwise.
//
// Every kind is reachable in production: `call` through `submitCallTx`,
// `deploy` through `deployContract`'s retained-era overload, and `maintenance`
// through the retained-era overloads of the governance functions. `kind: 'deploy'`
// is set at exactly one place, inside `runLedger8Deploy`, and `kind: 'maintenance'`
// inside `submitLedger8MaintenanceTx`.
const FORK_CROSSED_MESSAGES: Readonly<
  Record<SubmittedOperationKind, (operation: SubmittedOperation, freshEra: LedgerVersion) => string>
> = Object.freeze({
  call: (operation, freshEra) =>
    `This call was built while the network was on ledger '${operation.networkVersion}' and the node rejected its ` +
    `transaction; the network now reports ledger '${freshEra}', so the network crossed the ledger ` +
    `fork while the call was being built. Take two steps, in this order. First, verify the transaction did ` +
    `not finalize: a submission rejected while the fork was happening can still have been recorded, so read ` +
    `the state of the contract at '${operation.contractAddress}' and check whether the call to ` +
    `'${operation.circuitId}' is already reflected in it before doing anything that would repeat it. Then ` +
    `re-run the call unchanged - it reads the network's ledger version again and executes against the ` +
    `ledger the network now reports.`,
  deploy: (operation, freshEra) =>
    `This deployment was built while the network was on ledger '${operation.networkVersion}' and the node rejected its ` +
    `transaction; the network now reports ledger '${freshEra}', so the network crossed the ledger ` +
    `fork while the deployment was being built. Take two steps, in this order. First, verify the ` +
    `deployment did not finalize: a submission rejected while the fork was happening can still have been ` +
    `recorded, so check the address this deployment composed, '${operation.contractAddress}', before ` +
    `deploying again - a deploy mints a fresh nonce, so a second attempt lands at a different address and ` +
    `would leave two copies of the contract on chain. Then recompile the contract with the ledger 9 ` +
    `Compact toolchain and deploy that artifact instead - a contract produced by the ledger 8 (pre-fork) Compact toolchain ` +
    `cannot be deployed to a network that has crossed the fork. See the runtime-deploy chapter of the migration guide.`,
  maintenance: (operation, freshEra) =>
    `This maintenance update was built while the network was on ledger '${operation.networkVersion}' and the node rejected ` +
    `its transaction; the network now reports ledger '${freshEra}', so the network crossed the ledger fork ` +
    `while the update was being built. Take two steps, in this order. First, verify the update did not ` +
    `finalize: a submission rejected while the fork was happening can still have been recorded, so read the ` +
    `state of the contract at '${operation.contractAddress}' and check whether its ` +
    (operation.circuitId === NO_CIRCUIT
      ? 'maintenance authority'
      : `verifier key for '${operation.circuitId}'`) +
    ` already reflects the update before doing anything that would repeat it. Then recompile the contract with the ledger 9 Compact toolchain and run the same ` +
    `maintenance function with that artifact - a contract produced by the ledger 8 (pre-fork) Compact toolchain ` +
    `cannot maintain a contract on a network that has crossed the fork.`
});

/**
 * An error indicating that the network crossed the ledger fork between an
 * operation reading the network's ledger version and its transaction being submitted, and
 * that a fresh read confirms the move.
 *
 * Carries a two-step remediation, and the order matters: verify the transaction
 * did not finalize BEFORE acting, because a submission rejected while the network
 * was crossing the fork can still have been recorded.
 *
 * The provider's own rejection travels on `cause`, already sanitized of
 * anything that could carry transaction or witness material — see
 * {@link ProviderFailedError}, which is the form it arrives in.
 *
 * @see {@link ForkCrossedRemediation} for why a submit rejection is diagnosed
 *      rather than propagated, and why a deploy's remediation differs.
 */
export class ForkCrossedDuringOperationError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.FORK_CROSSED_DURING_OPERATION;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.FORK_CROSSED_DURING_OPERATION];

  /** The era the operation resolved when it started. */
  readonly startEra: LedgerVersion;
  /**
   * Whether the refused operation was a call, a deploy or a maintenance update —
   * the discriminant a caller branches on, and which remediation the message carries.
   */
  readonly kind: SubmittedOperationKind;
  /** The entry point that was run, so a caller with several in flight knows which. */
  readonly circuitId: string;
  /** The contract to reconcile, which is the first remediation step's subject. */
  readonly contractAddress: string;

  /**
   * @param operation Which operation was rejected. Flattened onto the error
   *                  rather than nested, so a caller reads `error.circuitId`
   *                  without knowing this type exists.
   * @param freshEra The era a fresh read of the network reports now. Retained on the
   *                 error because it is what a caller re-runs against.
   * @param cause The submit rejection, already sanitized.
   */
  constructor(
    operation: SubmittedOperation,
    readonly freshEra: LedgerVersion,
    cause: unknown
  ) {
    super(FORK_CROSSED_MESSAGES[operation.kind](operation, freshEra), { cause });
    this.name = 'ForkCrossedDuringOperationError';
    this.startEra = operation.networkVersion;
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
  /** Reading the network's ledger version again itself failed, so no reading is available to compare. */
  | { readonly reason: 'network-version-read-failed'; readonly networkVersionReadFailure: unknown }
  /**
   * The fresh read reported an EARLIER era than the operation started against.
   * A ledger era only ever moves forward, so the two readings cannot both
   * describe one chain.
   */
  | { readonly reason: 'network-version-went-backwards'; readonly freshEra: LedgerVersion };

// Neither text claims a fork is under way, and that restraint is the point:
// nothing observed in either case establishes one, and telling a caller to wait
// out a fork that is not happening is worse than telling it to retry. Same
// discipline as `IndexerInconsistencyError`.
const undiagnosedSubject = (kind: SubmittedOperationKind): string => {
  switch (kind) {
    case 'call':
      return 'call';
    case 'deploy':
      return 'deployment';
    case 'maintenance':
      return 'maintenance update';
    default: {
      const unhandled: never = kind;
      throw new InvariantViolationError(`unknown operation kind '${String(unhandled)}'`);
    }
  }
};

const undiagnosedMessage = (operation: SubmittedOperation, undiagnosed: SubmitRejectionUndiagnosedCause): string => {
  const subject = undiagnosedSubject(operation.kind);
  const target =
    operation.circuitId === NO_CIRCUIT
      ? `contract '${operation.contractAddress}'`
      : `circuit '${operation.circuitId}', contract '${operation.contractAddress}'`;
  const opening =
    `This ${subject} was built while the network was on ledger '${operation.networkVersion}' and the node rejected its ` +
    `transaction (${target}).`;

  switch (undiagnosed.reason) {
    case 'network-version-read-failed':
      return (
        `${opening} The network's ledger version could not be read again, so whether the network crossed the ` +
        `ledger fork while this ${subject} was being built is unresolved. Both failures are on 'errors': the ` +
        `submission rejection first, the failed read second. Check whether the transaction finalized, ` +
        `then retry once the read surface is reachable.`
      );
    case 'network-version-went-backwards':
      return (
        `${opening} The network now reports ledger '${undiagnosed.freshEra}', an EARLIER ledger era. An ` +
        `era only ever moves forward, so those two readings cannot both describe one chain and this ` +
        `rejection cannot be diagnosed either way. The submission rejection is on 'errors'. Check whether ` +
        `the transaction finalized, then check the health of the configured indexer before retrying.`
      );
    default: {
      // The runtime throw is not redundant with the compile-time gate: a new reason reaches here
      // before this switch is updated.
      const unhandled: never = undiagnosed;
      throw new InvariantViolationError(`unhandled undiagnosed-rejection reason: ${String(unhandled)}`);
    }
  }
};

const undiagnosedErrors = (rejection: unknown, undiagnosed: SubmitRejectionUndiagnosedCause): readonly unknown[] =>
  undiagnosed.reason === 'network-version-read-failed' ? [rejection, undiagnosed.networkVersionReadFailure] : [rejection];

/**
 * An error indicating that a submission was rejected and that whether the
 * network crossed the ledger fork under it could not be established.
 *
 * The submission rejection is what happened to the transaction and is always
 * the FIRST entry of `errors`, {@link reason} is why
 * no diagnosis could be made, and `cause` names the proximate failure.
 *
 * DO NOT COPY THE CARRIED REJECTION'S CODE ONTO THIS ERROR. It has its own.
 *
 * @see {@link ErrorTaxonomy} for why the two codes name different things.
 * @see {@link ForkCrossedRemediation} for the two reasons.
 */
export class SubmitRejectionUndiagnosedError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.SUBMIT_REJECTION_UNDIAGNOSED;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.SUBMIT_REJECTION_UNDIAGNOSED];

  /** The submission rejection first, then the failure to read the network's ledger version again, when there was one. */
  readonly errors: readonly unknown[];
  /** Which of the two undiagnosable conditions this is. */
  readonly reason: SubmitRejectionUndiagnosedCause['reason'];
  /** The era the operation resolved when it started. */
  readonly startEra: LedgerVersion;
  readonly kind: SubmittedOperationKind;
  readonly circuitId: string;
  readonly contractAddress: string;

  /**
   * @param operation Which operation was rejected.
   * @param rejection The submit rejection, already sanitized. Always the FIRST
   *                  entry of `errors`.
   * @param undiagnosed Why no diagnosis could be made.
   */
  constructor(operation: SubmittedOperation, rejection: unknown, undiagnosed: SubmitRejectionUndiagnosedCause) {
    super(undiagnosedMessage(operation, undiagnosed), {
      cause: undiagnosed.reason === 'network-version-read-failed' ? undiagnosed.networkVersionReadFailure : rejection
    });
    this.name = 'SubmitRejectionUndiagnosedError';
    this.errors = undiagnosedErrors(rejection, undiagnosed);
    this.reason = undiagnosed.reason;
    this.startEra = operation.networkVersion;
    this.kind = operation.kind;
    this.circuitId = operation.circuitId;
    this.contractAddress = operation.contractAddress;
  }
}

interface EffectContractError {
  readonly _tag: string;
  readonly cause: { readonly name: string; readonly message: string; readonly isCompactError?: boolean };
}

/**
 * The network's ledger version could not be read: either re-reading it while checking an era disagreement failed,
 * or the public data provider returned no latest block to pin a call to. Retry when the read surface is
 * reachable; a transport failure, when there is one, is on `cause`.
 */
export class NetworkVersionReadFailedError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.NETWORK_VERSION_READ_FAILED;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.NETWORK_VERSION_READ_FAILED];

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'NetworkVersionReadFailedError';
  }
}

/** A Zswap output or its recipient's encryption key could not be resolved for this transaction. */
export class ZswapOutputResolutionError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.ZSWAP_OUTPUT_UNRESOLVED;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.ZSWAP_OUTPUT_UNRESOLVED];

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ZswapOutputResolutionError';
  }
}

/** No contract is deployed at the given address on the network the providers point to. */
export class ContractNotFoundError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.CONTRACT_NOT_FOUND;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.CONTRACT_NOT_FOUND];

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ContractNotFoundError';
  }
}

/** No private state is stored under the private state id the caller named. */
export class PrivateStateNotFoundError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.PRIVATE_STATE_NOT_FOUND;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.PRIVATE_STATE_NOT_FOUND];

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PrivateStateNotFoundError';
  }
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
 * The operations whose transaction the chain can record as failed.
 */
export type TxFailedOperation = 'call' | 'deploy' | 'insert-verifier-key' | 'remove-verifier-key' | 'replace-authority';

/**
 * What a failed transaction was about, beyond its record.
 */
export interface TxFailedDetails {
  /** Set by a ledger 8 call, a deploy and the three maintenance operations. Not set by a ledger 9 call. */
  readonly contractAddress?: ContractAddress;
  /** A call, or an insert or removal of a verifier key. A list when a scope made several calls. */
  readonly circuitId?: string | readonly string[];
  /** A deploy (the authority the contract was built with) or a replacement (the new authority). */
  readonly signingKey?: SigningKey;
}

const TX_FAILED_NOUNS: Readonly<Record<TxFailedOperation, string>> = {
  call: 'call',
  deploy: 'deployment',
  'insert-verifier-key': 'verifier key insertion',
  'remove-verifier-key': 'verifier key removal',
  'replace-authority': 'maintenance authority replacement'
};

const FAIL_FALLIBLE_OUTCOME =
  "The guaranteed effects were kept, so some of this operation's effects may be on chain. No private state " +
  'was stored locally. Read the record and the chain before repeating the operation.';

const txFailedFollowUp = (operation: TxFailedOperation, fallible: boolean, circuits: string): string | undefined => {
  switch (operation) {
    case 'call':
      return fallible
        ? undefined
        : 'No private state was stored, and no effect of this call landed on chain, so the local state still matches it.';
    case 'deploy':
      return (
        (fallible
          ? "A contract deployment sits in the guaranteed phase, so the contract may exist on chain, under the maintenance authority built from this error's 'signingKey'. Keep that key: nothing else holds a copy, and without it the contract can never be maintained."
          : "Nothing was deployed and no private state was stored. This error's 'signingKey' carries the key this attempt would have used, so an address that turns out to hold a contract after all is still maintainable.") +
        ' Check the contract address before deploying again: a deploy mints a fresh nonce, so a second attempt lands at a different address and would leave two copies of the contract on chain.'
      );
    case 'insert-verifier-key':
    case 'remove-verifier-key':
      return fallible
        ? `Read the contract's verifier key for ${circuits} before retrying: the update may have landed.`
        : undefined;
    case 'replace-authority':
      return (
        "The new key was NOT stored; the store still holds the old one. Keep this error's 'signingKey': if the " +
        'replacement landed after all, it is the only key that authorizes the contract. To find out, read the ' +
        "contract state with `publicDataProvider.queryContractState(address)` and compare its " +
        "`maintenanceAuthority` committee with `signatureVerifyingKey(error.signingKey)`. If the new key is " +
        'there, store it with `privateStateProvider.setSigningKey(address, error.signingKey)`.'
      );
  }
};

const describeFailedSegments = (record: FinalizedTxRead): string | undefined => {
  const failed = [...(record.segmentStatusMap ?? [])]
    .filter(([, status]) => status === SegmentFail)
    .map(([segment]) => segment);
  return failed.length === 0 ? undefined : `Failed segments: ${failed.join(', ')}.`;
};

const describeTxFailure = (operation: TxFailedOperation, record: FinalizedTxRead, details: TxFailedDetails): string => {
  const fallible = record.status === FailFallible;
  const circuitClause = formatCircuitClause(details.circuitId) ?? '';
  const contractClause = details.contractAddress === undefined ? '' : ` on the contract at '${details.contractAddress}'`;
  const circuits = [details.circuitId ?? []].flat().map((id) => `'${id}'`).join(', ');
  const head =
    `The ${TX_FAILED_NOUNS[operation]}${circuitClause}${contractClause} was recorded on chain with status ` +
    `'${record.status}' rather than 'SucceedEntirely' (transaction id '${record.txId}', hash '${record.txHash}', ` +
    `block ${record.blockHeight}).`;
  return [
    head,
    describeFailedSegments(record),
    fallible ? FAIL_FALLIBLE_OUTCOME : undefined,
    txFailedFollowUp(operation, fallible, circuits)
  ]
    .filter((part): part is string => part !== undefined)
    .join(' ');
};

/**
 * A transaction this framework submitted that the chain recorded with a
 * non-success status, in either ledger era. The one class to catch.
 *
 * Read {@link TxFailedError.operation} for which operation failed, and
 * {@link TxFailedError.record} for what the chain recorded. `record.tx` is a
 * `FinalizedTx` in the era `record.era` names; read it with
 * `LedgerTransaction.unwrap(record.tx, record.era)` after narrowing on `era`.
 *
 * {@link TxFailedError.signingKey} is NAMED in the message but never rendered
 * into it: after a failed deploy or replacement it may be the only copy of the
 * authority over a contract that landed. It is not enumerable, so a logger that
 * serializes an error's properties does not write it out.
 *
 * Branch on the registered code rather than `instanceof` where more than one
 * copy of this package may be loaded.
 */
export class TxFailedError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.TX_FAILED;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.TX_FAILED];
  declare readonly contractAddress?: ContractAddress;
  declare readonly circuitId?: string | readonly string[];
  declare readonly signingKey?: SigningKey;

  /**
   * @param operation The operation whose transaction failed.
   * @param record The finalized record the chain reported, tagged with its era.
   * @param details What the operation was about. Each operation requires the members it always has.
   */
  constructor(
    operation: 'deploy' | 'replace-authority',
    record: FinalizedTxRead,
    details: { readonly contractAddress: ContractAddress; readonly signingKey: SigningKey }
  );
  constructor(
    operation: 'insert-verifier-key' | 'remove-verifier-key',
    record: FinalizedTxRead,
    details: { readonly contractAddress: ContractAddress; readonly circuitId: string }
  );
  constructor(
    operation: 'call',
    record: FinalizedTxRead,
    details: { readonly circuitId: string | readonly string[]; readonly contractAddress?: ContractAddress }
  );
  constructor(
    readonly operation: TxFailedOperation,
    readonly record: FinalizedTxRead,
    details: TxFailedDetails
  ) {
    super(describeTxFailure(operation, record, details));
    this.name = 'TxFailedError';
    assignDefined(this, { contractAddress: details.contractAddress, circuitId: details.circuitId });
    if (details.signingKey !== undefined) {
      hideSigningKey(this, details.signingKey);
    }
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
export class ContractTypeError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.CONTRACT_TYPE_MISMATCH;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.CONTRACT_TYPE_MISMATCH];

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
    this.name = 'ContractTypeError';
    this.missingCircuitIds = mismatch.missing;
    this.keylessCircuitIds = mismatch.keyless;
    this.mismatchedCircuitIds = mismatch.mismatched;
    this.circuitIds = [...mismatch.missing, ...mismatch.keyless, ...mismatch.mismatched];
  }
}

/**
 * An error indicating that a private state ID was specified for a call transaction while a private
 * state provider was not. We want to let the user know so that they aren't under the impression the
 * private state of a contract was updated when it wasn't.
 */
export class IncompleteCallTxPrivateStateConfig extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.INCOMPLETE_CALL_TX_PRIVATE_STATE_CONFIG;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.INCOMPLETE_CALL_TX_PRIVATE_STATE_CONFIG];

  constructor() {
    super('Incorrect call transaction configuration');
    this.message = "'privateStateId' was defined for call transaction while 'privateStateProvider' was undefined";
    this.name = 'IncompleteCallTxPrivateStateConfig';
  }
}

/**
 * An error indicating that a contract deploy named only one half of the private-state pairing:
 * an initial private state with no private state ID to store it under, or a private state ID with
 * no initial private state to store. The message names the missing half.
 *
 * Raised by `deployContract` (both eras) and `submitDeployTx`, before any provider is touched.
 * It is the deploy member of the three-refusal family `IncompleteCallTxPrivateStateConfig` and
 * {@link IncompleteFindContractPrivateStateConfig} belong to — one client-side rule per entry
 * point, and client-side storage is era-independent.
 */
export class IncompleteDeployContractPrivateStateConfig extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.INCOMPLETE_DEPLOY_PRIVATE_STATE_CONFIG;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.INCOMPLETE_DEPLOY_PRIVATE_STATE_CONFIG];

  constructor(missing: 'privateStateId' | 'initialPrivateState' = 'privateStateId') {
    super('Incorrect deploy contract configuration');
    this.message =
      missing === 'privateStateId'
        ? "'initialPrivateState' was defined for contract deploy while 'privateStateId' was undefined"
        : "'privateStateId' was defined for contract deploy while 'initialPrivateState' was omitted";
    this.name = 'IncompleteDeployContractPrivateStateConfig';
  }
}

/**
 * An error indicating that an initial private state was specified for a contract find while a
 * private state ID was not. We can't store the initial private state if we don't have a private state ID,
 * and we need to let the user know that.
 */
export class IncompleteFindContractPrivateStateConfig extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.INCOMPLETE_FIND_PRIVATE_STATE_CONFIG;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.INCOMPLETE_FIND_PRIVATE_STATE_CONFIG];

  constructor() {
    super('Incorrect find contract configuration');
    this.message = "'initialPrivateState' was defined for contract find while 'privateStateId' was undefined";
    this.name = 'IncompleteFindContractPrivateStateConfig';
  }
}

/**
 * An error indicating that a scoped transaction attempted to use cached states
 * with a different contract address or private state ID than the one originally cached.
 * This prevents silent state mismatches when batching calls to different contracts.
 */
export class ScopedTransactionIdentityMismatchError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.SCOPED_TRANSACTION_IDENTITY_MISMATCH;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.SCOPED_TRANSACTION_IDENTITY_MISMATCH];

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
export class BlankVerifierKeySlotError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.BLANK_VERIFIER_KEY_SLOT;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.BLANK_VERIFIER_KEY_SLOT];

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
export class VerifierKeyMismatchError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.VERIFIER_KEY_MISMATCH;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.VERIFIER_KEY_MISMATCH];

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
 * The sentence a post-submission retained-era deploy refusal ends on.
 *
 * One text rather than one per condition: the conditions below differ in WHY
 * the deployment could not be confirmed, and not at all in what the caller has
 * to do about the key.
 */
const DEPLOY_KEY_STRANDED_REMEDIATION =
  "The deploy transaction was SUBMITTED and may still finalize. This error's 'signingKey' is the key its " +
  'maintenance authority was built from - keep it, because nothing else holds a copy, and a deployment ' +
  'that does land without it is an address nobody can ever maintain. Check that address before deploying ' +
  'again: a deploy mints a fresh nonce, so a second attempt lands at a different one.';

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
 * It reports a chain state this package cannot act on, and there is no remediation a caller can apply
 * beyond reporting it.
 */
export class Ledger8AmbiguousEntryPointError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.LEDGER8_AMBIGUOUS_ENTRY_POINT;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.LEDGER8_AMBIGUOUS_ENTRY_POINT];

  constructor(
    readonly contractAddress: string,
    readonly circuitId: string,
    readonly matchCount: number
  ) {
    super(
      `The contract state on chain at '${contractAddress}' declares ${matchCount} entry points that decode ` +
        `to the name '${circuitId}', so which slot a call would dispatch on is ambiguous. Checking one slot's ` +
        'verifier key would not establish that the chain verifies the proof against that same slot. ' +
        'Report this contract address: a state with duplicate entry-point names is not something a ' +
        'caller can work around.'
    );
    this.name = 'Ledger8AmbiguousEntryPointError';
  }
}

export const LEDGER8_CONSTRUCTOR_ENTRY_POINT = 'initialState';

/** Why a retained-era signing key could not be used. */
export type Ledger8SigningKeyReason =
  /** A key the caller supplied in this call is not one the retained era can sign with. */
  | 'unusable'
  /** A maintenance update found no usable key held for the contract it targets. */
  | 'unavailable';

const LEDGER8_SIGNING_KEY_MESSAGES: Readonly<Record<Ledger8SigningKeyReason, (contractAddress?: string) => string>> =
  Object.freeze({
    unusable: (contractAddress) =>
      "The 'signingKey' supplied for the ledger 8 contract" +
      (contractAddress === undefined ? '' : ` at '${contractAddress}'`) +
      ' is not a key that era can sign with, so nothing was composed or stored. A ledger 8 key is a ' +
      "`schnorr` key whose value is exactly 64 hexadecimal characters - 32 bytes - which is what that era's " +
      '`sampleSigningKey` produces. The supplied value is not rendered here: it is secret material, and an ' +
      'error message reaches logs and issue trackers.',
    unavailable: (contractAddress) =>
      `No usable ledger 8 signing key is held for the contract${contractAddress === undefined ? '' : ` at '${contractAddress}'`}, ` +
      'so the maintenance update was not composed. Either nothing is stored for that address, the stored entry is not a ledger 8 ' +
      "key - a `schnorr` key of 64 hexadecimal characters - or the store could not be read (see this error's " +
      "cause). Store the key the contract's maintenance authority was built from with " +
      '`privateStateProvider.setSigningKey(address, key)`, or attach with `findDeployedContract` passing ' +
      '`signingKey`.'
  });

/**
 * An error indicating that a signing key is not usable by the retained era.
 *
 * `reason` is `'unusable'` when a key the caller supplied in this call - on a retained-era deploy, an
 * attach, or an authority replacement - is not one the retained era can sign with. It is refused
 * BEFORE anything is composed or stored. Stored unchecked, a key the read rejects is reported on the
 * attach that supplied it and read as ABSENT on every later one, and the bad entry has by then
 * already replaced whatever was held there. The caller can correct it, because the value came from
 * the caller, in this call.
 *
 * `reason` is `'unavailable'` when a retained-era maintenance update found no signing key it can
 * sign with for the contract it targets: nothing is stored for the address, the stored entry is not
 * a retained-era key, or the store could not be read, in which case the read failure is on `cause`.
 * Raised before anything is composed or proven. Unlike an attach, which reports an unusable entry as
 * absent, a maintenance update cannot proceed without the key.
 *
 * The key is never rendered, and is not carried as a member: the caller already holds it, or has none.
 */
export class Ledger8SigningKeyError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.LEDGER8_SIGNING_KEY;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.LEDGER8_SIGNING_KEY];

  /**
   * @param reason Which way the key could not be used. Also the discriminant a caller branches on.
   * @param contractAddress The address the key was supplied for or looked up under. `undefined` for a
   * deploy, which has no address until it is composed.
   * @param options Carries the store's own failure on `cause`, when the entry could not be read at all.
   */
  constructor(reason: 'unusable', contractAddress?: string);
  constructor(reason: 'unavailable', contractAddress: string, options?: ErrorOptions);
  constructor(
    readonly reason: Ledger8SigningKeyReason,
    readonly contractAddress?: string,
    options?: ErrorOptions
  ) {
    super(LEDGER8_SIGNING_KEY_MESSAGES[reason](contractAddress), options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'Ledger8SigningKeyError';
  }
}

/** The retained-era operation a submitted transaction belongs to. */
export type Ledger8KeyedOperation = 'deploy' | 'replace-authority';

const LEDGER8_UNCONFIRMED_MESSAGES: Readonly<
  Record<Ledger8KeyedOperation, (contractAddress: string, cause: unknown) => string>
> = Object.freeze({
  deploy: (contractAddress, cause) =>
    `The ledger 8 deployment of the contract at '${contractAddress}' was submitted, but what the ` +
    'chain did with it could not be confirmed. ' +
    (cause instanceof EraInvariantViolationError
      ? `The record came back from a ledger era that the network this deployment was built on cannot have recorded: ${cause.message}`
      : "The record the chain made of it could not be read back and attributed - see this error's " +
        'cause for what failed.') +
    ` ${DEPLOY_KEY_STRANDED_REMEDIATION}`,
  'replace-authority': (contractAddress) =>
    `The maintenance authority replacement for the ledger 8 contract at '${contractAddress}' was submitted, ` +
    "but whether the chain applied it could not be confirmed - see this error's cause for what failed. The " +
    "new key was NOT stored. Keep this error's 'signingKey': if the replacement landed, it is the only key " +
    "that authorizes the contract now. Find out which key the contract's authority holds before doing " +
    'anything else: try a maintenance update with the key still stored; if it is refused with ' +
    "MaintenanceAuthorityMismatchError, the replacement landed - store this error's 'signingKey' with " +
    '`privateStateProvider.setSigningKey(address, error.signingKey)`.'
});

/**
 * An error indicating that a retained-era transaction carrying a signing key was submitted, but what
 * the chain did with it could not be confirmed.
 *
 * `operation` `'deploy'`: covers the read surface rejecting, a record whose version tag is missing or
 * unrecognised, and a record arriving from an era the network this deployment composed on cannot have
 * recorded. DO NOT DEPLOY AGAIN on seeing this. The transaction may still finalize, this error holds
 * the only copy of the signing key, and the address has to be checked first. Reachable only AFTER
 * submission: every refusal ahead of it is raised with no key having been sampled.
 *
 * `operation` `'replace-authority'`: covers a submission rejected while the network was crossing the
 * fork (a {@link ForkCrossedDuringOperationError} or {@link SubmitRejectionUndiagnosedError} on
 * `cause`), the read surface rejecting, a record with no era tag, or a record from an era the network
 * cannot have recorded. The new key is NOT stored, because the replacement may not have landed - and
 * it may have, so this error carries it.
 *
 * Branch on `cause` for the underlying failure. It is wrapped rather than replaced, so a
 * `cause instanceof EraInvariantViolationError`, its method and its registered code stay reachable.
 *
 * {@link Ledger8UnconfirmedError.signingKey} is NAMED but never rendered into the message, and is
 * not enumerable.
 *
 * @see {@link ErrorTaxonomy} for why one class covers the whole window.
 */
export class Ledger8UnconfirmedError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.LEDGER8_UNCONFIRMED;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.LEDGER8_UNCONFIRMED];

  declare readonly signingKey: SigningKey;

  /**
   * @param operation Which submitted operation could not be confirmed.
   * @param contractAddress The address the submitted deployment composed, or the contract whose
   * authority the replacement targets.
   * @param signingKey The key that deployment's maintenance authority was built from, or the key the
   * replacement would install. Sampled when the caller named none, and then this is its only copy.
   * @param cause Why the operation could not be confirmed.
   */
  constructor(
    readonly operation: Ledger8KeyedOperation,
    readonly contractAddress: string,
    signingKey: SigningKey,
    cause: unknown
  ) {
    super(LEDGER8_UNCONFIRMED_MESSAGES[operation](contractAddress, cause), { cause });
    this.name = 'Ledger8UnconfirmedError';
    hideSigningKey(this, signingKey);
  }
}

/** Which write the private-state provider refused. */
export type Ledger8NotStoredStage = 'signing-key' | 'private-state';

const LEDGER8_NOT_STORED_MESSAGES: Readonly<
  Record<Ledger8KeyedOperation, (contractAddress: string, stage: Ledger8NotStoredStage) => string>
> = Object.freeze({
  deploy: (contractAddress, stage) =>
    `The ledger 8 deployment of the contract at '${contractAddress}' was CONFIRMED on chain, but the ` +
    'private-state provider refused to record it locally. ' +
    (stage === 'signing-key'
      ? "The SIGNING KEY could not be stored, so this error's 'signingKey' is the only copy that now " +
        'exists. The contract is on chain under a maintenance authority built from it, and without it ' +
        'no verifier key can ever be inserted, removed or replaced there. Keep it, fix what the store ' +
        "refused - see this error's cause - and write it back with " +
        '`privateStateProvider.setSigningKey(address, error.signingKey)`.'
      : 'The INITIAL PRIVATE STATE could not be stored. The signing key was written first and is held ' +
        "by the provider, and is on this error's 'signingKey' as well. Reconcile the local state " +
        "against the chain before calling this contract - see this error's cause for what the store " +
        'refused.') +
    ' Do NOT deploy again: this contract exists, and a deploy mints a fresh nonce, so a second attempt ' +
    'lands at a different address and leaves two copies on chain.',
  'replace-authority': (contractAddress) =>
    `The maintenance authority of the ledger 8 contract at '${contractAddress}' was REPLACED on chain, but the ` +
    "private-state provider refused to store the new key, so this error's 'signingKey' is the only copy that " +
    'now exists. The key held before no longer authorizes anything on that contract. Keep it, fix what the ' +
    "store refused - see this error's cause - and write it back with " +
    '`privateStateProvider.setSigningKey(address, error.signingKey)`.'
});

/**
 * An error indicating that a retained-era operation was CONFIRMED on chain, but the private-state
 * provider refused to record it locally.
 *
 * `operation` `'deploy'`: distinct from {@link Ledger8UnconfirmedError}, which covers the window where
 * the chain's answer is unknown. Here the answer arrived and it was success, so the contract EXISTS
 * and its maintenance authority is built from this error's key. DO NOT DEPLOY AGAIN. `stage` says
 * which of the two writes the store refused.
 *
 * `operation` `'replace-authority'`: a maintenance authority REPLACEMENT was confirmed, and the store
 * refused the new key (`stage` is `'signing-key'`). The key held before no longer authorizes anything
 * on the contract, so this is the only copy of the one that does.
 *
 * {@link Ledger8NotStoredError.signingKey} is NAMED but never rendered into the message, and is
 * not enumerable.
 *
 * @see {@link ErrorTaxonomy} for the after-submission region this closes and why the key rides along
 * even where only one write can strand it.
 */
export class Ledger8NotStoredError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.LEDGER8_NOT_STORED;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.LEDGER8_NOT_STORED];
  declare readonly signingKey: SigningKey;

  /**
   * @param operation Which confirmed operation the store refused to record.
   * @param contractAddress The address the confirmed deployment created, or the contract whose
   * authority was replaced.
   * @param signingKey The key the contract's maintenance authority was built from, or the new
   * authority's key.
   * @param stage Which write the store refused. `'signing-key'` means this error holds the only copy
   * of the key; `'private-state'` means the key was already stored and the local state is what is
   * missing.
   * @param cause What the private-state provider rejected with.
   */
  constructor(
    operation: 'deploy',
    contractAddress: string,
    signingKey: SigningKey,
    stage: Ledger8NotStoredStage,
    cause: unknown
  );
  constructor(
    operation: 'replace-authority',
    contractAddress: string,
    signingKey: SigningKey,
    stage: 'signing-key',
    cause: unknown
  );
  constructor(
    readonly operation: Ledger8KeyedOperation,
    readonly contractAddress: string,
    signingKey: SigningKey,
    readonly stage: Ledger8NotStoredStage,
    cause: unknown
  ) {
    super(LEDGER8_NOT_STORED_MESSAGES[operation](contractAddress, stage), { cause });
    this.name = 'Ledger8NotStoredError';
    hideSigningKey(this, signingKey);
  }
}

/** Why a retained-era call cannot be composed. */
export type Ledger8CallUnsupportedReason =
  /** The call would spend a shielded coin the contract already holds on chain. */
  | 'shielded-spend'
  /** The call would pay a shielded coin to a recipient whose encryption public key cannot be resolved. */
  | 'unmappable-recipient';

const LEDGER8_CALL_UNSUPPORTED_MESSAGES: Readonly<
  Record<Ledger8CallUnsupportedReason, (circuitId: string, recipientCoinPublicKey?: string) => string>
> = Object.freeze({
  'shielded-spend': (circuitId) =>
    `Circuit '${circuitId}' spends a shielded coin the contract already holds on chain, which a ` +
    'ledger 8 call cannot compose: building the Zswap offer for such a spend needs the ' +
    "contract's Zswap chain state, and the ledger 8 pipeline does not read one. A coin the same " +
    'call produces is fine — it is paired with its own output — so only spends of previously held ' +
    'coins are affected. Run this circuit against a contract produced by the ledger 9 Compact toolchain.',
  'unmappable-recipient': (circuitId, recipientCoinPublicKey) => {
    const isConstructor = circuitId === LEDGER8_CONSTRUCTOR_ENTRY_POINT;
    return (
      `${isConstructor ? 'The constructor' : `Circuit '${circuitId}'`} pays a shielded coin to recipient ` +
      `'${recipientCoinPublicKey}', whose encryption public key cannot be resolved: it is not the ` +
      "calling wallet's own key, the burn address, or a mapped recipient. Refusing is deliberate - " +
      "encrypting the coin to the caller's own key would submit successfully and leave the " +
      'recipient unable to discover it. ' +
      (isConstructor
        ? 'A ledger 8 deploy takes no `additionalCoinEncPublicKeyMappings`, so its constructor ' +
          'cannot pay a shielded coin to a third party.'
        : "Add the recipient's coin public key and encryption public key to " +
          '`additionalCoinEncPublicKeyMappings` on the call options.')
    );
  }
});

/**
 * An error indicating that a retained-era call cannot be composed, refused BEFORE the offer is built.
 *
 * `reason` `'shielded-spend'`: the call would spend a shielded coin the contract already holds on
 * chain, which this pipeline structurally cannot compose. A coin the same call produced is NOT
 * refused: it is paired with its own output as a transient and needs no chain state. Only spends of
 * previously held coins are.
 *
 * `reason` `'unmappable-recipient'`: the call would pay a shielded coin to a user-owned recipient
 * whose encryption public key it cannot resolve: not the calling wallet, not the burn address, and
 * not a key in the caller's `additionalCoinEncPublicKeyMappings`. Raised by a retained-era deploy
 * too, whose options carry no mappings, with `circuitId` set to `'initialState'`; the message then
 * names the constructor and gives the deploy-specific advice. Refusal rather than a best effort is the
 * only answer that cannot lose a coin: encrypting the output to the caller's own key would compose,
 * prove, balance and submit, and leave the recipient owning a coin it could never discover.
 *
 * @see {@link ErrorTaxonomy} for what the retained-era path is missing and why this refuses before
 * the offer is built.
 * @see {@link KeepStatePipeline} for how the retained-era path resolves each recipient's encryption key.
 */
export class Ledger8CallUnsupportedError extends MidnightJsError {
  readonly code = CONTRACTS_ERROR_CODES.LEDGER8_CALL_UNSUPPORTED;
  readonly category = CONTRACTS_ERROR_CATEGORIES[CONTRACTS_ERROR_CODES.LEDGER8_CALL_UNSUPPORTED];

  /**
   * @param reason Why the call was refused. Also the discriminant a caller branches on.
   * @param circuitId The circuit whose call was refused, or `'initialState'` for a deploy.
   * @param recipientCoinPublicKey The recipient that could not be resolved. Set for
   * `'unmappable-recipient'`.
   */
  constructor(reason: 'shielded-spend', circuitId: string);
  constructor(reason: 'unmappable-recipient', circuitId: string, recipientCoinPublicKey: string);
  constructor(
    readonly reason: Ledger8CallUnsupportedReason,
    readonly circuitId: string,
    readonly recipientCoinPublicKey?: string
  ) {
    super(LEDGER8_CALL_UNSUPPORTED_MESSAGES[reason](circuitId, recipientCoinPublicKey));
    this.name = 'Ledger8CallUnsupportedError';
  }
}
