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
 * ## Why the decision exists at all
 *
 * An operation resolves the head era at its asynchronous start and then spends
 * real time composing, proving and balancing before anything is submitted.
 * During the fork window the head can move inside that gap, and when it does
 * the node rejects a transaction that was correct when it was built. The node's
 * own rejection does not say so — it is an ordinary rejection — and the era the
 * operation started from cannot report itself as stale, because nothing in a
 * head reading announces that it has fallen behind
 * (`docs/adr/0008-never-latch-the-network-head-version.md`).
 *
 * So the head is read once more, and ERAS are compared. Never the raw
 * protocol-version integers: two readings one node minor release apart
 * (2_000_000 and 2_001_000) are different integers and the same ledger era, and
 * an integer comparison would report that ordinary node upgrade as a fork.
 *
 * ## The re-read really is a second reading of the network
 *
 * `queryLatestProtocolVersion` takes no argument and offers no freshness flag,
 * deliberately: implementations may only serve it from a cache that expires by
 * itself on a bound short relative to block time, so every answer is at most
 * one bound old and there is nothing for a caller to opt out of. That is why
 * this module simply asks again (see ADR 0008 and the method's own
 * documentation in `packages/types/src/public-data-provider.ts`).
 *
 * ## What this module does NOT do
 *
 * It does not sanitize. The rejection reaches it already rebuilt as
 * {@link Ledger8SeamFailedError}, with the provider's failure redacted onto
 * `cause` by the seam wrapper in `./ledger8-entry.ts` — one sanitizer, at the
 * boundary the external failure crosses, rather than a second one here that
 * could redact differently.
 */

import { LEDGER_VERSIONS, type LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol';
import { CONTRACTS_ERROR_CODES, hasErrorCode } from '@midnight-ntwrk/midnight-js-utils';

import { StaleHeadError, SubmitRejectionUndiagnosedError,type SubmittedOperation } from '../errors';
import { type BreadcrumbSink, emitHeadResolution } from './breadcrumbs';
import { type HeadEraReading, type HeadVersionSource, readHeadEra } from './era';

/**
 * Where an era sits on the timeline, for comparing two readings by DIRECTION
 * rather than merely by inequality.
 *
 * Read off `LEDGER_VERSIONS`, which is declared oldest-first, rather than
 * restated here — a second ordering could disagree with it. The order that
 * matters is pinned by `src/test/scoped-era.test.ts`, so an era inserted out of
 * order fails a test instead of silently inverting the direction test below.
 */
const eraPosition = (era: LedgerVersion): number => LEDGER_VERSIONS.indexOf(era);

/**
 * Diagnoses a rejected submission and throws — always.
 *
 * The return type is `Promise<never>`: there is no outcome in which a rejected
 * submission becomes a success, so this is the whole of the failure path rather
 * than a step in it, and a caller writes `return handleSubmitRejection(...)`
 * inside its `catch`.
 *
 * Three outcomes, and each is ruled rather than left to fall through:
 *
 * | what a fresh head read reports | thrown |
 * | ------------------------------ | ------ |
 * | a LATER era than the operation started against | {@link StaleHeadError}, with the two-step remediation |
 * | the SAME era | `rejection`, unchanged |
 * | an EARLIER era | {@link SubmitRejectionUndiagnosedError}, reason `'head-moved-backwards'` |
 * | nothing — the read itself rejects | {@link SubmitRejectionUndiagnosedError}, reason `'head-read-failed'` |
 *
 * The fork verdict is FORWARD-ONLY. An era only ever moves forward on a real
 * chain, so a reading that has gone backwards — an indexer rolled back to an
 * earlier snapshot, a provider repointed at a different network — is not a fork
 * crossing, and a message saying the network crossed the fork would be simply
 * false. Inequality alone cannot tell those two apart, so the positions are
 * compared rather than the values.
 *
 * One rejection never reaches the head read: this framework's OWN coded
 * refusals. A provider that does not serve the pre-fork arm refuses on the way
 * IN, before anything is submitted, and a caller narrowing on that refusal has
 * to keep seeing it — so a coded error is re-thrown untouched, and the network
 * is not asked about it. {@link Ledger8SeamFailedError} is the one exception:
 * it IS the sanitized external rejection, so it is the input this diagnosis is
 * written for.
 *
 * The fresh read is BREADCRUMBED, with its own `'post-rejection-re-read'`
 * provenance. It is the only head reading taken after bytes were already on
 * the wire, and it is the reading the verdict below rests on, so an operator
 * asked to act on a {@link StaleHeadError} needs the integer it returned —
 * see `./breadcrumbs.ts`.
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
 * @param logger The optional logger the post-rejection head reading is written to.
 * @returns Never; the returned promise always rejects.
 * @throws StaleHeadError if a fresh head read reports a LATER era.
 * @throws SubmitRejectionUndiagnosedError if the fresh read reports an earlier
 * era, or if the read itself rejects — so neither failure is lost while the
 * question is unresolved, and both arrive carrying a registered code. A head
 * integer that cannot be placed on the era timeline arrives here too, on the
 * `'head-read-failed'` arm, carried on `headReadFailure`: the read is what
 * failed, whether the transport or the mapping refused it.
 * @throws the rejection unchanged in every other case.
 */
export const handleSubmitRejection = async (
  pdp: HeadVersionSource,
  operation: SubmittedOperation,
  rejection: unknown,
  logger?: BreadcrumbSink
): Promise<never> => {
  if (hasErrorCode(rejection) && !hasErrorCode(rejection, CONTRACTS_ERROR_CODES.LEDGER8_SEAM_FAILED)) {
    throw rejection;
  }

  let freshReading: HeadEraReading;
  try {
    // `readHeadEra` rather than `networkHeadVersion`: the same one round trip
    // and the same `'construct'` era mapping, but it also yields the raw head
    // integer -- which is the value an operator acting on the verdict below
    // actually needs, and which the breadcrumb reports.
    freshReading = await readHeadEra(pdp);
  } catch (headReadFailure) {
    // Nothing is dropped: the submission was rejected, and whether the network
    // moved under it is now unresolved. Reporting only the transport failure
    // would hide what happened to the transaction; reporting only the rejection
    // would claim a diagnosis that was never made.
    throw new SubmitRejectionUndiagnosedError(operation, rejection, {
      reason: 'head-read-failed',
      headReadFailure
    });
  }

  // Reported BEFORE the verdict, so the reading is in the log whichever of the
  // three arms below is taken.
  emitHeadResolution(logger, freshReading, 'post-rejection-re-read');

  const freshEra = freshReading.head;
  const movement = eraPosition(freshEra) - eraPosition(operation.head);
  if (movement === 0) {
    // Not a fork. The rejection is re-thrown exactly as the seam wrapper built
    // it -- already carrying the provider's own failure, redacted, on `cause`.
    throw rejection;
  }
  if (movement < 0) {
    // The head went BACKWARDS, which no chain does. Reported as undiagnosable
    // rather than as a fork crossing, because a fork claim here would be false.
    throw new SubmitRejectionUndiagnosedError(operation, rejection, { reason: 'head-moved-backwards', freshEra });
  }

  throw new StaleHeadError(operation, freshEra, rejection);
};
