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

import { CURRENT_LEDGER_VERSION, type LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';
import { CONTRACTS_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it } from 'vitest';

import { isLedger8Result } from '../era-results';
import { UnknownResultEraError } from '../errors';

// A result is only ever read here through its `era` tag, so the smallest thing
// carrying one is the whole fixture this needs.
const taggedResult = (era: LedgerVersion) => ({ era, txId: 'tx-1' });

describe('isLedger8Result', () => {
  it('answers true for the retained pipeline and false for the current one', () => {
    expect(isLedger8Result(taggedResult('v8'))).toBe(true);
    expect(isLedger8Result(taggedResult(CURRENT_LEDGER_VERSION))).toBe(false);
  });

  // The failure this exists to stop: answering `false` for a tag it cannot
  // read means answering "current era", which sends the caller down the wrong
  // branch to read the result through the other era's shape. Every one of
  // these reaches the guard only by crossing a boundary that dropped or
  // rewrote the tag.
  it.each([
    ['a tag naming no known pipeline', { era: 'v7', txId: 'tx-1' }],
    ['a retained-era tag from a 5.0.0 pre-release', { era: 'ledger8', txId: 'tx-1' }],
    ['a current-era tag from a 5.0.0 pre-release', { era: 'ledger9', txId: 'tx-1' }],
    ['a tag lost in transit', { txId: 'tx-1' }],
    ['a tag explicitly undefined', { era: undefined, txId: 'tx-1' }],
    ['a tag of the wrong primitive type', { era: 9, txId: 'tx-1' }]
  ])('refuses %s rather than answering false', (_label, result) => {
    expect(() => isLedger8Result(result as unknown as { readonly era: LedgerVersion })).toThrow(
      UnknownResultEraError
    );
  });

  it('names the tag it received and carries a branchable code', () => {
    const caught = (() => {
      try {
        isLedger8Result({ era: 'v7' } as unknown as { readonly era: LedgerVersion });
        return undefined;
      } catch (error: unknown) {
        return error;
      }
    })();

    expect(caught).toBeInstanceOf(UnknownResultEraError);
    expect((caught as UnknownResultEraError).received).toBe('v7');
    expect((caught as UnknownResultEraError).code).toBe(CONTRACTS_ERROR_CODES.UNKNOWN_RESULT_ERA);
    expect((caught as UnknownResultEraError).message).toEqual(
      'A result carried an era tag naming neither pipeline (got: "v7"). ' +
        "Results are tagged 'v9' or 'v8' by the pipeline that built them. A tag lost in transit -- through a queue, " +
        'a JSON boundary, a structured clone -- cannot be recovered here: narrow the result before it crosses that ' +
        "boundary, or carry the era beside it. A result stored under a 5.0.0 pre-release carries 'ledger9' or " +
        "'ledger8': map those to 'v9' and 'v8'."
    );
  });

  it('refuses a null or undefined result rather than reading a member off it', () => {
    expect(() => isLedger8Result(null as unknown as { readonly era: LedgerVersion })).toThrow(
      UnknownResultEraError
    );
    expect(() => isLedger8Result(undefined as unknown as { readonly era: LedgerVersion })).toThrow(
      UnknownResultEraError
    );
  });
});
