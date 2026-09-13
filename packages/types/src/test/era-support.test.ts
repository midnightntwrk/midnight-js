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
import { hasErrorCode, PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it } from 'vitest';

import { assertSeamsSupportEra, type TransactionSeams } from '../era-support';
import { SeamEraUnsupportedError } from '../errors';

const declaring = (...eras: LedgerVersion[]) => ({ supportedEras: Object.freeze(eras) });

const seams = (
  proof: readonly LedgerVersion[],
  wallet: readonly LedgerVersion[],
  midnight: readonly LedgerVersion[]
): TransactionSeams => ({
  proofProvider: declaring(...proof),
  walletProvider: declaring(...wallet),
  midnightProvider: declaring(...midnight)
});

const BOTH: readonly LedgerVersion[] = ['v8', 'v9'];
const CURRENT_ONLY: readonly LedgerVersion[] = ['v9'];

const refusalFrom = (era: LedgerVersion, set: TransactionSeams): SeamEraUnsupportedError => {
  try {
    assertSeamsSupportEra(era, set);
  } catch (error) {
    return error as SeamEraUnsupportedError;
  }
  throw new Error(`assertSeamsSupportEra accepted ${era} when it should have refused it`);
};

describe('assertSeamsSupportEra', () => {
  it('accepts a set where all three seams declare the era', () => {
    expect(() => assertSeamsSupportEra('v8', seams(BOTH, BOTH, BOTH))).not.toThrow();
    expect(() => assertSeamsSupportEra('v9', seams(BOTH, BOTH, BOTH))).not.toThrow();
  });

  it('accepts the current era on a set that serves nothing else', () => {
    expect(() => assertSeamsSupportEra('v9', seams(CURRENT_ONLY, CURRENT_ONLY, CURRENT_ONLY))).not.toThrow();
  });

  // The whole point of the pre-flight check: the refusal has to land before the
  // proof is paid for, so the wallet's gap is reported even though the proof
  // provider would have accepted the work.
  it('refuses on the wallet seam when only the wallet lacks the era', () => {
    const refusal = refusalFrom('v8', seams(BOTH, CURRENT_ONLY, BOTH));

    expect(refusal).toBeInstanceOf(SeamEraUnsupportedError);
    expect(refusal.seam).toBe('balanceTx');
    expect(refusal.era).toBe('v8');
    expect([...refusal.declared].sort()).toEqual(['v9']);
  });

  it('refuses on the proof seam when only the proof provider lacks the era', () => {
    expect(refusalFrom('v8', seams(CURRENT_ONLY, BOTH, BOTH)).seam).toBe('proveTx');
  });

  it('refuses on the submission seam when only the submitter lacks the era', () => {
    expect(refusalFrom('v8', seams(BOTH, BOTH, CURRENT_ONLY)).seam).toBe('submitTx');
  });

  // Reported in pipeline order so the message names the seam a caller would
  // hit first, rather than whichever gap the check happened to notice.
  it('names the earliest seam in pipeline order when several lack the era', () => {
    expect(refusalFrom('v8', seams(CURRENT_ONLY, CURRENT_ONLY, CURRENT_ONLY)).seam).toBe('proveTx');
  });

  it('carries the registered error code', () => {
    const refusal = refusalFrom('v8', seams(CURRENT_ONLY, BOTH, BOTH));

    expect(hasErrorCode(refusal, PROVIDER_ERROR_CODES.SEAM_ERA_UNSUPPORTED)).toBe(true);
  });

  it('names the era and the declaration in the message, so a report is actionable', () => {
    const refusal = refusalFrom('v8', seams(CURRENT_ONLY, BOTH, BOTH));

    expect(refusal.message).toContain('proveTx');
    expect(refusal.message).toContain('v8');
    expect(refusal.message).toContain('v9');
  });

  // A provider declaring nothing at all is refused rather than waved through:
  // an empty list is a statement that it serves no era, and the check reads
  // declarations literally.
  it('refuses an empty declaration', () => {
    expect(refusalFrom('v9', seams([], BOTH, BOTH)).seam).toBe('proveTx');
  });

  // Reachable from JavaScript and from a consumer built against an older
  // `midnight-js-types`, where the field simply is not there. Treated as
  // "declares nothing" rather than as "declares everything".
  it('refuses a provider carrying no declaration at all', () => {
    const undeclared = { proofProvider: {}, walletProvider: declaring('v9'), midnightProvider: declaring('v9') };

    const refusal = refusalFrom('v9', undeclared as unknown as TransactionSeams);

    expect(refusal.seam).toBe('proveTx');
    expect([...refusal.declared]).toEqual([]);
  });

  it('refuses a declaration that is not a list of eras', () => {
    const malformed = {
      proofProvider: { supportedEras: 'v9' },
      walletProvider: declaring('v9'),
      midnightProvider: declaring('v9')
    };

    expect(refusalFrom('v9', malformed as unknown as TransactionSeams).seam).toBe('proveTx');
  });
});
