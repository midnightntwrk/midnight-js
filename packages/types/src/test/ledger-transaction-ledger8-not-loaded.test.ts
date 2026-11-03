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

import { describe, expect, it } from 'vitest';

import { ForeignLedgerTransactionError } from '../errors';
import { LedgerTransaction } from '../ledger-transaction';

// A file of its own: the v8 ledger, once loaded, stays loaded for the process,
// so this refusal is only reachable in a test file that never loads it.
describe('LedgerTransaction.seal before the v8 ledger is loaded', () => {
  it('refuses a v8 value and names loadLedger8Protocol() as the fix', () => {
    const userBuiltV8Tx = { serialize: () => new Uint8Array() };

    let error: unknown;
    try {
      // @ts-expect-error the value stands in for a v8 transaction built from the user's own ledger import
      LedgerTransaction.seal('v8', 'Unproven', userBuiltV8Tx);
    } catch (thrown: unknown) {
      error = thrown;
    }

    expect(error).toBeInstanceOf(ForeignLedgerTransactionError);
    expect(error).toMatchObject({ era: 'v8', reason: 'ledger8-not-loaded' });
    expect(String(error)).toContain('loadLedger8Protocol()');
  });
});
