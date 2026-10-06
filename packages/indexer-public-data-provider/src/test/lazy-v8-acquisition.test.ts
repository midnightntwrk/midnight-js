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

import type * as protocol from '@midnight-ntwrk/midnight-js-protocol';
import type { ProtocolV8 } from '@midnight-ntwrk/midnight-js-protocol';
import { describe, expect, it, vi } from 'vitest';

import { toFinalizedTxData } from '../mapping';
import {
  mintV9TransactionHex,
  type RegularTransactionRow,
  regularTransactionRow,
  V9_ERA_PROTOCOL_VERSION
} from './state-fixtures';

// Deliberately its own file, and deliberately WITHOUT a v8 fixture. The
// sibling suite mints one in `beforeAll` and clears the spy in `beforeEach`,
// which means an eager module-scope `loadLedger8()` in `codec.ts` would be
// recorded at import time and then cleared before any test body ran — so every
// "never acquires the v8 runtime" assertion there would still pass. Nothing in
// this file ever needs the v8 runtime, so the spy's call count here is a
// statement about the module graph rather than about an arrange step.
const { loadLedger8Spy } = vi.hoisted(() => ({ loadLedger8Spy: vi.fn<() => Promise<ProtocolV8>>() }));

vi.mock('@midnight-ntwrk/midnight-js-protocol', async (importOriginal) => {
  const original = await importOriginal<typeof protocol>();
  loadLedger8Spy.mockImplementation(original.loadLedger8);
  return { ...original, loadLedger8: loadLedger8Spy };
});

const TX_ID = 'lazy-acquisition-tx';

const v9RecordAt = (raw: string): RegularTransactionRow =>
  regularTransactionRow({ protocolVersion: V9_ERA_PROTOCOL_VERSION, raw, identifiers: [TX_ID] });

describe('the v8 runtime is acquired on demand, not on import', () => {
  it('is not acquired by importing the read path', () => {
    expect(loadLedger8Spy).not.toHaveBeenCalled();
  });

  it('is still not acquired after a v9 record has been decoded end to end', async () => {
    const record = await toFinalizedTxData(TX_ID, v9RecordAt(mintV9TransactionHex()));

    expect(record.version).toBe('v9');
    expect(loadLedger8Spy).not.toHaveBeenCalled();
  });
});
