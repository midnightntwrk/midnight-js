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

import { CONTRACTS_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it } from 'vitest';

import { CURRENT_PIPELINE_ERA, type PipelineEra, RETAINED_PIPELINE_ERA } from '../era';
import { isLedger8Result } from '../era-results';
import { UnrecognisedResultEraError } from '../errors';

// A result is only ever read here through its `era` tag, so the smallest thing
// carrying one is the whole fixture this needs.
const taggedResult = (era: PipelineEra) => ({ era, txId: 'tx-1' });

describe('isLedger8Result', () => {
  it('answers true for the retained pipeline and false for the current one', () => {
    expect(isLedger8Result(taggedResult(RETAINED_PIPELINE_ERA))).toBe(true);
    expect(isLedger8Result(taggedResult(CURRENT_PIPELINE_ERA))).toBe(false);
  });

  // The failure this exists to stop: answering `false` for a tag it cannot
  // read means answering "current era", which sends the caller down the wrong
  // branch to read the result through the other era's shape. Every one of
  // these reaches the guard only by crossing a boundary that dropped or
  // rewrote the tag.
  it.each([
    ['a tag naming no known pipeline', { era: 'ledger7', txId: 'tx-1' }],
    ['a tag lost in transit', { txId: 'tx-1' }],
    ['a tag explicitly undefined', { era: undefined, txId: 'tx-1' }],
    ['a tag of the wrong primitive type', { era: 9, txId: 'tx-1' }]
  ])('refuses %s rather than answering false', (_label, result) => {
    expect(() => isLedger8Result(result as unknown as { readonly era: PipelineEra })).toThrow(
      UnrecognisedResultEraError
    );
  });

  it('names the tag it received and carries a branchable code', () => {
    const caught = (() => {
      try {
        isLedger8Result({ era: 'ledger7' } as unknown as { readonly era: PipelineEra });
        return undefined;
      } catch (error: unknown) {
        return error;
      }
    })();

    expect(caught).toBeInstanceOf(UnrecognisedResultEraError);
    expect((caught as UnrecognisedResultEraError).received).toBe('ledger7');
    expect((caught as UnrecognisedResultEraError).code).toBe(CONTRACTS_ERROR_CODES.UNRECOGNISED_RESULT_ERA);
    expect((caught as UnrecognisedResultEraError).message).toContain('ledger7');
  });

  it('refuses a null or undefined result rather than reading a member off it', () => {
    expect(() => isLedger8Result(null as unknown as { readonly era: PipelineEra })).toThrow(
      UnrecognisedResultEraError
    );
    expect(() => isLedger8Result(undefined as unknown as { readonly era: PipelineEra })).toThrow(
      UnrecognisedResultEraError
    );
  });
});
