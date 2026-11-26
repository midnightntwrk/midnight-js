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

import type { Contract } from '@midnightntwrk/midnight-js-protocol/v9/compact-js/effect/Contract';
import { type FinalizedTx, type Ledger9FinalizedTxData, SucceedEntirely } from '@midnightntwrk/midnight-js-types';

import { TxFailedError } from '../errors';
import { type Ledger9PayloadSubmitOptions, type Ledger9SubmitTxProviders, submitLedger9Payload } from '../submit-tx';
import { type ScopePrivateState, storePrivateStates } from './ledger9-scope-states';

/**
 * Submits a scope's ONE transaction and, once it succeeded entirely, stores the private states its
 * calls left, from `held`: one snapshot, taken before submitting, which is what is stored. A call
 * recorded later is not.
 *
 * @param held The scope's private states when it began to submit, in the order it first reached each.
 * @param checkBalanced The scope's check of the transaction the wallet balanced, run before anything
 *        else is done with it.
 * @throws ProviderFailedError if `submitTx` rejects; a coded error the midnight provider raised is
 *         thrown as itself.
 * @throws TxFailedError if the chain recorded another status than `SucceedEntirely`.
 */
export const submitScopeTransaction = async <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: Ledger9SubmitTxProviders<C, PCK>,
  transaction: Ledger9PayloadSubmitOptions<PCK>,
  held: readonly ScopePrivateState[],
  checkBalanced?: (balanced: FinalizedTx) => void
): Promise<Ledger9FinalizedTxData> => {
  const prepareSubmission =
    checkBalanced === undefined
      ? undefined
      : async (balanced: FinalizedTx): Promise<void> => {
          checkBalanced(balanced);
        };
  const finalizedTxData = await submitLedger9Payload(providers, { ...transaction, prepareSubmission });
  if (finalizedTxData.status !== SucceedEntirely) {
    throw new TxFailedError('call', finalizedTxData, { circuitId: transaction.circuitId ?? [] });
  }
  await storePrivateStates(held);
  return finalizedTxData;
};
