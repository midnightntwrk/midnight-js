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

import type { ContractAddress, ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { AnyProvableCircuitId, FinalizedTxData, PrivateStateId } from '@midnight-ntwrk/midnight-js-types';

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
