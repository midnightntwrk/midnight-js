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

import { loadLedger8Protocol } from '@midnight-ntwrk/midnight-js-protocol';
import { LEDGER_STATE_TAGS } from '@midnight-ntwrk/midnight-js-protocol/version';
import { describe, expect, it, vi } from 'vitest';

import { LedgerState } from '../ledger-state';

const ledger8Import = vi.hoisted(() => vi.fn());

vi.mock('@midnightntwrk/ledger-v8', async (importOriginal) => {
  ledger8Import();
  return importOriginal();
});

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

// A file of its own: the v8 ledger, once loaded, stays loaded for the process. The tests run in
// order, and the last one loads it to prove the mock above sees a load.
describe('LedgerState of a v8 value', () => {
  it('is built and serialized without loading the v8 ledger', async () => {
    const bytes = new TextEncoder().encode(`${LEDGER_STATE_TAGS.ContractState.v8}:body`);

    const state = LedgerState.fromBytes('v8', 'ContractState', bytes);

    expect(state.serialize()).toEqual(bytes);
    await settle();
    expect(ledger8Import).not.toHaveBeenCalled();
  });

  it('sees the v8 ledger load when it is loaded', async () => {
    await loadLedger8Protocol();

    expect(ledger8Import).toHaveBeenCalledOnce();
  });
});
