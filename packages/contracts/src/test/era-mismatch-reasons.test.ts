/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { CONTRACTS_ERROR_CODES, hasErrorCode } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it } from 'vitest';

import { EraMismatchError, type EraMismatchReason } from '../errors';

const DETAIL_CASES: readonly (readonly [EraMismatchReason, string])[] = [
  ['ledger8-artifact-on-ledger9-contract', 'Contract address: ab12.'],
  ['ledger8-contract-state-unsupported', 'Contract address: ab12. Operation: findDeployedContract.'],
  ['scope-on-ledger8-network', "Network version: 'v8'."],
  ['ledger8-call-in-scope', "Circuit: 'increment'."],
  ['ledger8-contract-unsupported', 'Function: createUnprovenCallTx.'],
  ['unrecognised-result-era', 'Received: v7.']
];

describe('EraMismatchError reasons that carry a detail', () => {
  it.each(DETAIL_CASES)('renders the detail of %s into the message', (reason, detail) => {
    const error = new EraMismatchError(reason, { detail });

    expect(error.reason).toBe(reason);
    expect(error.message).toContain(detail);
    expect(hasErrorCode(error, CONTRACTS_ERROR_CODES.ERA_MISMATCH)).toBe(true);
  });

  it('does not name the network era in the scope refusal, so the message holds for any head that is not ledger 9', () => {
    const error = new EraMismatchError('scope-on-ledger8-network', { detail: "Network version: 'v10'." });

    expect(error.message).not.toContain('ledger 8');
    expect(error.message).toContain("Network version: 'v10'.");
  });

  it('keeps the pre-fork and indexer-upgrade advice on a state the v8 ledger wrote', () => {
    const error = new EraMismatchError('ledger8-contract-state-unsupported', { detail: 'Contract address: ab12.' });

    expect(error.message).toContain('Before the hard fork');
    expect(error.message).toContain('4.4.0-rc.6');
  });
});
