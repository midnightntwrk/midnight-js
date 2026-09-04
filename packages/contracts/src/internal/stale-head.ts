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

import { type LedgerVersion, networkHeadVersion } from '@midnight-ntwrk/midnight-js-protocol';
import { CONTRACTS_ERROR_CODES, hasErrorCode } from '@midnight-ntwrk/midnight-js-utils';

import { StaleHeadError, type StaleHeadOperationKind } from '../errors';
import type { HeadVersionSource } from './era';

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
 * | a DIFFERENT era from `startEra` | {@link StaleHeadError}, with the two-step remediation |
 * | the SAME era | `rejection`, unchanged |
 * | nothing — the read itself rejects | `AggregateError` carrying both failures |
 *
 * One rejection never reaches the head read: this framework's OWN coded
 * refusals. A provider that does not serve the pre-fork arm refuses on the way
 * IN, before anything is submitted, and a caller narrowing on that refusal has
 * to keep seeing it — so a coded error is re-thrown untouched, and the network
 * is not asked about it. {@link Ledger8SeamFailedError} is the one exception:
 * it IS the sanitized external rejection, so it is the input this diagnosis is
 * written for.
 *
 * @param pdp The read surface, for the one fresh head read. Declared as the
 * head-read slice rather than the whole provider, so a reader — and a test —
 * sees exactly which member is consulted; a full `PublicDataProvider`
 * satisfies it.
 * @param startEra The era the operation resolved when it started.
 * @param kind Whether this operation deploys a contract or calls one already
 * deployed. A call and a deploy get different remediations.
 * @param rejection Whatever the submit seam rejected with — `unknown`, because
 * a rejection is not obliged to be an `Error`.
 * @returns Never; the returned promise always rejects.
 * @throws StaleHeadError if a fresh head read reports a different era.
 * @throws UnknownProtocolVersionError if the fresh head integer cannot be
 * placed on the era timeline.
 * @throws AggregateError carrying `[rejection, cause]` on `errors`, and the
 * failed head read on `cause`, if the fresh head read itself rejects — so
 * neither failure is lost while the question is unresolved.
 * @throws the rejection unchanged in every other case.
 */
export const handleSubmitRejection = async (
  pdp: HeadVersionSource,
  startEra: LedgerVersion,
  kind: StaleHeadOperationKind,
  rejection: unknown
): Promise<never> => {
  if (hasErrorCode(rejection) && !hasErrorCode(rejection, CONTRACTS_ERROR_CODES.LEDGER8_SEAM_FAILED)) {
    throw rejection;
  }

  let freshEra: LedgerVersion;
  try {
    freshEra = await networkHeadVersion(pdp);
  } catch (cause) {
    // Both failures are carried, and neither is the diagnosis: the submission
    // was rejected, and whether the network moved under it is now unresolved.
    // Reporting only the transport failure would hide what actually happened
    // to the transaction; reporting only the rejection would claim a diagnosis
    // that was never made.
    // `errors` carries both, in the order they happened; `cause` names the
    // proximate one -- the failed head read -- so a consumer that only follows
    // `cause` chains still lands on why the diagnosis could not be made.
    throw new AggregateError(
      [rejection, cause],
      `A ${kind === 'deploy' ? 'deployment' : 'call'} built against a '${startEra}'-era network head was ` +
        `rejected on submission, and the network head could not be re-read to tell a fork crossing from an ` +
        `ordinary rejection. Both failures are on 'errors': the submission rejection first, the failed head ` +
        `read second. Check whether the transaction finalized, then retry once the read surface is reachable.`,
      { cause }
    );
  }

  if (freshEra === startEra) {
    // Not a fork. The rejection is re-thrown exactly as the seam wrapper built
    // it -- already carrying the provider's own failure, redacted, on `cause`.
    throw rejection;
  }

  throw new StaleHeadError(startEra, freshEra, kind, rejection);
};
