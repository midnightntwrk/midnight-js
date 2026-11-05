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

import { LEDGER_TRANSACTION_TAGS } from '@midnight-ntwrk/midnight-js-protocol/version';
import { describe, expect, it } from 'vitest';

import { LedgerTransaction } from '../ledger-transaction';

const ledger8Bytes = new TextEncoder().encode(`${LEDGER_TRANSACTION_TAGS.v8.Unproven}:body`);

// A file of its own: the v8 ledger, once loaded, stays loaded for the process,
// so only a test file that never loads it shows that a v8 handle does not need it.
describe('a v8 handle before the v8 ledger is loaded', () => {
  it('is made from bytes', () => {
    const handle = LedgerTransaction.fromBytes('v8', 'Unproven', ledger8Bytes);

    expect([handle.era, handle.stage]).toEqual(['v8', 'Unproven']);
    expect(handle.serialize()).toEqual(ledger8Bytes);
  });

  it('is sealed from an object of any ledger copy', () => {
    const userBuiltV8Tx = { serialize: () => ledger8Bytes };

    const handle = LedgerTransaction.seal('v8', 'Unproven', userBuiltV8Tx);

    expect(handle.serialize()).toEqual(ledger8Bytes);
  });
});
