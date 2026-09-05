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
 * The ONE decision this module owns: whether a submit rejection means the
 * network crossed the ledger fork under the operation, or means what a submit
 * rejection ordinarily means.
 *
 * ERAS are compared, never the raw protocol-version integers — two readings one
 * node minor release apart are the same era.
 *
 * This module does NOT sanitize. The rejection arrives already rebuilt as
 * {@link Ledger8SeamFailedError} by the seam wrapper in `./ledger8-entry.ts`;
 * do not add a second sanitizer here that could redact differently.
 *
 * @see {@link StaleHeadRemediation} for why a rejection is diagnosed at all,
 *      and why the re-read is a real second reading of the network.
 */

import { LEDGER_VERSIONS, type LedgerVersion, networkHeadVersion } from '@midnight-ntwrk/midnight-js-protocol';
import { CONTRACTS_ERROR_CODES, hasErrorCode } from '@midnight-ntwrk/midnight-js-utils';

import { StaleHeadError, SubmitRejectionUndiagnosedError,type SubmittedOperation } from '../errors';
import type { HeadVersionSource } from './era';

/**
 * Where an era sits on the timeline, for comparing two readings by DIRECTION
 * rather than merely by inequality.
 *
 * Read off `LEDGER_VERSIONS`, which is declared oldest-first, rather than
 * restated here — a second ordering could disagree with it.
 * `src/test/scoped-era.test.ts` pins the order.
 */
const eraPosition = (era: LedgerVersion): number => LEDGER_VERSIONS.indexOf(era);

/**
 * Diagnoses a rejected submission and throws — always.
 *
 * The return type is `Promise<never>`: there is no outcome in which a rejected
 * submission becomes a success, so a caller writes
 * `return handleSubmitRejection(...)` inside its `catch`.
 *
 * The fork verdict is FORWARD-ONLY. Compare timeline POSITIONS, never mere
 * inequality: a head that moved backwards is not a fork crossing, and saying so
 * would be false.
 *
 * This framework's OWN coded refusals are re-thrown untouched and the network is
 * not asked about them. {@link Ledger8SeamFailedError} is the one exception — it
 * IS the sanitized external rejection this diagnosis is written for.
 *
 * @param pdp The read surface, for the one fresh head read. Declared as the
 * head-read slice rather than the whole provider, so a reader — and a test —
 * sees exactly which member is consulted; a full `PublicDataProvider`
 * satisfies it.
 * @param operation Which operation was rejected: the era it started against,
 * whether it is a call or a deploy, and the identifiers its remediation has to
 * name so a caller with several operations in flight can act on it.
 * @param rejection Whatever the submit seam rejected with — `unknown`, because
 * a rejection is not obliged to be an `Error`.
 * @returns Never; the returned promise always rejects.
 * @throws StaleHeadError if a fresh head read reports a LATER era.
 * @throws SubmitRejectionUndiagnosedError if the fresh read reports an earlier
 * era, or if the read itself rejects — so neither failure is lost while the
 * question is unresolved, and both arrive carrying a registered code. A head
 * integer that cannot be placed on the era timeline arrives here too, on the
 * `'head-read-failed'` arm, carried on `headReadFailure`.
 * @throws the rejection unchanged in every other case.
 * @see {@link StaleHeadRemediation} for the four outcomes and the remediation
 *      each one carries.
 */
export const handleSubmitRejection = async (
  pdp: HeadVersionSource,
  operation: SubmittedOperation,
  rejection: unknown
): Promise<never> => {
  if (hasErrorCode(rejection) && !hasErrorCode(rejection, CONTRACTS_ERROR_CODES.LEDGER8_SEAM_FAILED)) {
    throw rejection;
  }

  let freshEra: LedgerVersion;
  try {
    freshEra = await networkHeadVersion(pdp);
  } catch (headReadFailure) {
    // Nothing is dropped: reporting only the transport failure hides what happened to the
    // transaction, and reporting only the rejection claims a diagnosis that was never made.
    throw new SubmitRejectionUndiagnosedError(operation, rejection, {
      reason: 'head-read-failed',
      headReadFailure
    });
  }

  const movement = eraPosition(freshEra) - eraPosition(operation.head);
  if (movement === 0) {
    // Not a fork. Re-thrown exactly as the seam wrapper built it.
    throw rejection;
  }
  if (movement < 0) {
    // The head went BACKWARDS, which no chain does. Undiagnosable, not a fork claim.
    throw new SubmitRejectionUndiagnosedError(operation, rejection, { reason: 'head-moved-backwards', freshEra });
  }

  throw new StaleHeadError(operation, freshEra, rejection);
};
