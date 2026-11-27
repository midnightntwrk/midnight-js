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

import { InvalidArgumentError } from '@midnightntwrk/midnight-js-protocol/errors';
import type { Contract } from '@midnightntwrk/midnight-js-protocol/v9/compact-js/effect/Contract';
import { type FinalizedTx, type Ledger9FinalizedTxData, SucceedEntirely } from '@midnightntwrk/midnight-js-types';

import { Ledger9SubmittedTxUnconfirmedError, TxFailedError } from '../errors';
import { type Ledger9PayloadSubmitOptions, type Ledger9SubmitTxProviders, submitLedger9Payload } from '../submit-tx';
import type * as Transaction from '../transaction';
import { ledgerTransactionOf } from './ledger9-scope-checks';
import { pendingPrivateStates, type ScopePrivateState, storePrivateStates } from './ledger9-scope-states';
import { type PrepareSubmission } from './submit-payload';

/**
 * How a scope prepares the submission of the transaction the wallet balanced: runs the scope's own
 * check of it, reads its identifiers once, awaits `beforeSubmit` with the last of them and the
 * private states left, and returns both for the rejection of the submission to carry. What any step
 * throws is thrown as it is, and nothing is submitted.
 */
const preparedBy =
  (
    options: Transaction.ScopedTransactionOptions | undefined,
    checkBalanced: ((balanced: FinalizedTx) => void) | undefined,
    pending: readonly Transaction.Ledger9PendingPrivateState[]
  ): PrepareSubmission =>
  async (balanced) => {
    checkBalanced?.(balanced);
    const txIds = ledgerTransactionOf(balanced).identifiers();
    const beforeSubmit = options?.beforeSubmit;
    if (beforeSubmit !== undefined) {
      if (txIds.length === 0) {
        throw new InvalidArgumentError(
          'The transaction the wallet balanced has no identifier, so beforeSubmit could not be handed one ' +
            'and nothing was submitted: the transaction could not be tracked.'
        );
      }
      await beforeSubmit(Object.freeze([...txIds]), pending);
    }
    return { pendingPrivateStates: pending, txIds };
  };

/**
 * Submits a scope's ONE transaction and, once it succeeded entirely, stores the private states its
 * calls left, from `held`: one snapshot, taken before submitting, which is what `beforeSubmit` is
 * handed and what is stored. A call recorded later is in neither.
 *
 * @param held The scope's private states when it began to submit, in the order it first reached each.
 * @param checkBalanced The scope's check of the transaction the wallet balanced, run before anything
 *        else is done with it.
 * @throws InvalidArgumentError if `beforeSubmit` is given and the balanced transaction has no identifier.
 * @throws ProviderFailedError if `submitTx` rejects, with the private states left and the transaction's
 *         identifiers on it, hidden; a coded error the midnight provider raised is thrown as itself.
 * @throws Ledger9SubmittedTxUnconfirmedError if the transaction was submitted and the wait for its outcome
 *         failed, with the identifier the midnight provider returned and the private states left.
 * @throws TxFailedError if the chain recorded another status than `SucceedEntirely`, with the private
 *         states left.
 * @throws Ledger9PrivateStatesNotStoredError if a provider refused to store a state, once every state was tried.
 */
export const submitScopeTransaction = async <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: Ledger9SubmitTxProviders<C, PCK>,
  options: Transaction.ScopedTransactionOptions | undefined,
  transaction: Ledger9PayloadSubmitOptions<PCK>,
  held: readonly ScopePrivateState[],
  checkBalanced?: (balanced: FinalizedTx) => void
): Promise<Ledger9FinalizedTxData> => {
  const pending = pendingPrivateStates(held);
  const prepareSubmission = preparedBy(options, checkBalanced, pending);
  let submittedTxId: string | undefined;
  let finalizedTxData: Ledger9FinalizedTxData;
  try {
    finalizedTxData = await submitLedger9Payload(providers, { ...transaction, prepareSubmission }, (txId) => {
      submittedTxId = txId;
    });
  } catch (err: unknown) {
    // Only once submitTx has returned is a failure the wait's; before that it is thrown as it is.
    if (submittedTxId !== undefined) throw new Ledger9SubmittedTxUnconfirmedError(submittedTxId, pending, err);
    throw err;
  }
  if (finalizedTxData.status !== SucceedEntirely) {
    throw new TxFailedError('call', finalizedTxData, {
      circuitId: transaction.circuitId ?? [],
      pendingPrivateStates: pending
    });
  }
  await storePrivateStates(finalizedTxData.txId, held);
  return finalizedTxData;
};
