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

import type { SigningKey } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import type { Ledger8FinalizedTxData,Ledger9FinalizedTxData } from '@midnight-ntwrk/midnight-js-types';

import { AnyEraTxFailedError, TxFailedError } from '../errors';

/**
 * An error indicating that a contract maintenance authority replacement transaction failed.
 */
export class ReplaceMaintenanceAuthorityTxFailedError extends TxFailedError {
  constructor(finalizedTxData: Ledger9FinalizedTxData) {
    super(finalizedTxData);
    this.name = 'ReplaceMaintenanceAuthorityTxFailedError';
  }
}

/**
 * An error indicating that a verifier key removal transaction failed.
 */
export class RemoveVerifierKeyTxFailedError extends TxFailedError {
  constructor(finalizedTxData: Ledger9FinalizedTxData) {
    super(finalizedTxData);
    this.name = 'RemoveVerifierKeyTxFailedError';
  }
}

/**
 * An error indicating that a verifier key insertion transaction failed.
 */
export class InsertVerifierKeyTxFailedError extends TxFailedError {
  constructor(finalizedTxData: Ledger9FinalizedTxData) {
    super(finalizedTxData);
    this.name = 'InsertVerifierKeyTxFailedError';
  }
}

/**
 * The retained-era counterpart of the three classes above: a maintenance update composed by the
 * ledger 8 pipeline that the chain recorded with a status other than `SucceedEntirely`.
 *
 * Not a subclass of {@link TxFailedError}, which carries a `Ledger9FinalizedTxData`; the record
 * here is the ledger 8 one. Carries no registered error code of its own, exactly as
 * `Ledger8CallTxFailedError` does: branch on the class, or on the inherited
 * {@link AnyEraTxFailedError.code}.
 *
 * A maintenance update sits in the guaranteed part of the transaction, so on `FailFallible` it may
 * have landed: the message says what to read before acting.
 */
abstract class Ledger8MaintenanceTxFailedError extends AnyEraTxFailedError {
  constructor(
    readonly txData: Ledger8FinalizedTxData,
    readonly contractAddress: string,
    update: string,
    reconcile: string
  ) {
    super(
      `The ledger 8 ${update} on the contract at '${contractAddress}' was recorded on chain with status ` +
        `'${txData.status}' rather than 'SucceedEntirely' (transaction id '${txData.txId}'). ${reconcile}`
    );
  }

  /** See {@link AnyEraTxFailedError.record}. Always the ledger 8 variant on this class. */
  get record(): Ledger8FinalizedTxData {
    return this.txData;
  }
}

const reconcileVerifierKey = (circuitId: string): string =>
  `Read the contract's verifier key for '${circuitId}' before retrying: the update may have landed.`;

/**
 * A retained-era maintenance authority replacement that the chain recorded as failed.
 *
 * {@link Ledger8ReplaceMaintenanceAuthorityTxFailedError.signingKey} is NAMED but never rendered
 * into the message: the store still holds the old key, and if the replacement landed this is the
 * only copy of the one that authorizes the contract.
 */
export class Ledger8ReplaceMaintenanceAuthorityTxFailedError extends Ledger8MaintenanceTxFailedError {
  constructor(
    txData: Ledger8FinalizedTxData,
    contractAddress: string,
    readonly signingKey: SigningKey
  ) {
    super(
      txData,
      contractAddress,
      'maintenance authority replacement',
      "The new key was NOT stored; the store still holds the old one. Keep this error's 'signingKey': if the " +
        'replacement landed after all, it is the only key that authorizes the contract. Try a maintenance ' +
        'update with the stored key; if it is refused with MaintenanceAuthorityMismatchError, store this ' +
        "error's 'signingKey' with `privateStateProvider.setSigningKey(address, error.signingKey)`."
    );
    this.name = 'Ledger8ReplaceMaintenanceAuthorityTxFailedError';
  }
}

/** A retained-era verifier key removal that the chain recorded as failed. */
export class Ledger8RemoveVerifierKeyTxFailedError extends Ledger8MaintenanceTxFailedError {
  constructor(
    txData: Ledger8FinalizedTxData,
    contractAddress: string,
    readonly circuitId: string
  ) {
    super(txData, contractAddress, 'verifier key removal', reconcileVerifierKey(circuitId));
    this.name = 'Ledger8RemoveVerifierKeyTxFailedError';
  }
}

/** A retained-era verifier key insertion that the chain recorded as failed. */
export class Ledger8InsertVerifierKeyTxFailedError extends Ledger8MaintenanceTxFailedError {
  constructor(
    txData: Ledger8FinalizedTxData,
    contractAddress: string,
    readonly circuitId: string
  ) {
    super(txData, contractAddress, 'verifier key insertion', reconcileVerifierKey(circuitId));
    this.name = 'Ledger8InsertVerifierKeyTxFailedError';
  }
}
