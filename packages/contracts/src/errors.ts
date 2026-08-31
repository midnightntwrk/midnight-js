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

import type { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { AnyProvableCircuitId, FinalizedTxData, PrivateStateId, Seam } from '@midnight-ntwrk/midnight-js-types';
import { CONTRACTS_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';

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
 * An error indicating that a v8-era payload came back from a provider on a
 * flow that only ever hands out v9 transactions, or that a v8-era record came
 * back from the read surface into that same flow.
 *
 * The provider seams and the read surface both carry two eras, but this flow
 * tags every outgoing payload as v9 and cannot submit or report anything else.
 * A v8 response therefore means the provider re-tagged or down-converted the
 * payload it was handed, or that the flow is pointed at a network whose records
 * belong to the v8 era.
 */
export class EraInvariantViolationError extends Error {
  readonly code = CONTRACTS_ERROR_CODES.ERA_INVARIANT_VIOLATION;

  /**
   * @param seam The provider method that returned the payload.
   * @param circuitId The circuit, or circuits, whose flow this happened on,
   *                  when known. A dApp firing many circuits needs this to
   *                  tell which call broke.
   */
  constructor(
    readonly seam: EraSeam,
    readonly circuitId?: string | readonly string[]
  ) {
    super(
      `${seam} returned a v8-era payload on a flow that only submits v9 transactions` +
        `${formatCircuitClause(circuitId) ?? ''}. ` +
        `Check that the configured provider matches the network this application targets, and that no custom ` +
        `provider implementation re-tags the payload it was handed.`
    );
    this.name = 'EraInvariantViolationError';
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
