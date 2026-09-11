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

import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';

import { type ProviderSeam, SeamEraUnsupportedError } from './errors';

/** What every provider on a transaction seam states about the eras it serves. */
export interface EraDeclaringProvider {
  readonly supportedEras: readonly LedgerVersion[];
}

/**
 * The three providers one transaction passes through, in the order it passes
 * through them.
 *
 * Structural rather than the full `MidnightProviders` set, so the check can be
 * applied to any subset that happens to carry the three seams — including the
 * reduced sets the contracts package threads through its internal entry points.
 */
export interface TransactionSeams {
  readonly proofProvider: EraDeclaringProvider;
  readonly walletProvider: EraDeclaringProvider;
  readonly midnightProvider: EraDeclaringProvider;
}

// Declared and consulted in pipeline order — prove, balance, submit — so a set
// with several gaps reports the one a caller would reach first rather than
// whichever the check happened to notice.
const SEAMS_IN_PIPELINE_ORDER: readonly (readonly [keyof TransactionSeams, ProviderSeam])[] = Object.freeze([
  ['proofProvider', 'proveTx'],
  ['walletProvider', 'balanceTx'],
  ['midnightProvider', 'submitTx']
] as const);

// A declaration is only believed when it is actually a list of strings. Anything
// else — a missing field on a provider built against an older
// `midnight-js-types`, or a bare string from a JavaScript caller — reads as
// "declares nothing", which refuses. Reading it as "declares everything" would
// turn a provider that has never heard of this check into one that silently
// passes it.
const declarationOf = (provider: EraDeclaringProvider): readonly string[] => {
  const declared: unknown = provider?.supportedEras;
  return Array.isArray(declared) ? declared.filter((era): era is string => typeof era === 'string') : [];
};

/**
 * Refuses an operation whose ledger era is not served by all three transaction
 * seams, before the operation does any work.
 *
 * The point is WHERE this runs, not what it tests. Proving is the expensive
 * step and it is the first of the three, so a wallet that cannot balance a
 * retained-era transaction otherwise costs a full proving cycle before anything
 * notices. Called at the start of an operation, the same gap costs one
 * comparison.
 *
 * This does not make the seams safe by itself and is not meant to. A
 * declaration is a claim by an implementation and nothing verifies it, so each
 * seam still narrows its own payload and still reports
 * `V8PayloadUnsupportedError` when a declaration turns out to be wrong — see
 * {@link SeamEraUnsupportedError} for why the two errors stay distinct.
 *
 * Generic in the era, so a further ledger era needs no change here.
 *
 * @param era The ledger era this operation will run on.
 * @param seams The three providers the transaction will pass through.
 * @throws SeamEraUnsupportedError naming the first seam, in pipeline order,
 *         that does not declare `era`.
 */
export const assertSeamsSupportEra = (era: LedgerVersion, seams: TransactionSeams): void => {
  for (const [key, seamName] of SEAMS_IN_PIPELINE_ORDER) {
    const declared = declarationOf(seams[key]);
    if (!declared.includes(era)) {
      throw new SeamEraUnsupportedError(seamName, era, declared);
    }
  }
};
