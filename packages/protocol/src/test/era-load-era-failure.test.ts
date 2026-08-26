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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Ledger8RuntimeMissingError, PROTOCOL_ERROR_CODES } from '../errors';

// Lives in its own file so the mocked, poisoned module registry cannot leak
// into the happy-path era suite (vitest isolates module state per test file) —
// the same isolation precedent as load-v8-failure.test.ts.
describe('loadLedgerEra v8 failure path', () => {
  // The facade memoises per era in module scope, and vitest caches a module
  // across the tests in one file. Without a reset the second test would be
  // handed the first test's already-imported copy, still bound to the first
  // test's mock — and would pass or fail for a reason that has nothing to do
  // with what it asserts.
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('../lib/v8/load');
  });

  // A memoised rejection would make one bad install permanent for the life of
  // the process: a consumer that repaired its node_modules and retried would
  // still be handed the original failure.
  it('does not memoise a failed v8 acquisition, and retries on the next call', async () => {
    const loadLedger8 = vi.fn(() =>
      Promise.reject(new Ledger8RuntimeMissingError('/v8', new Error('simulated v8 load failure')))
    );
    vi.doMock('../lib/v8/load', () => ({ loadLedger8 }));
    const { loadLedgerEra } = await import('../lib/era/load-era');

    const first = loadLedgerEra('v8');
    await expect(first).rejects.toBeInstanceOf(Ledger8RuntimeMissingError);

    const second = loadLedgerEra('v8');
    expect(second).not.toBe(first);
    await expect(second).rejects.toBeInstanceOf(Ledger8RuntimeMissingError);
    expect(loadLedger8).toHaveBeenCalledTimes(2);
  });

  // De-memoising on failure is only half the contract. The other half is that
  // the retry actually lands: a repaired install must yield a usable era, and
  // that era must then be memoised like any other, rather than the slot staying
  // cleared and every later call re-importing the WASM.
  it('memoises the era a repaired install finally produces', async () => {
    const repairedModule = { ContractState: class {} };
    const loadLedger8 = vi
      .fn()
      .mockRejectedValueOnce(new Ledger8RuntimeMissingError('/v8', new Error('simulated v8 load failure')))
      .mockResolvedValue(repairedModule);
    vi.doMock('../lib/v8/load', () => ({ loadLedger8 }));
    const { loadLedgerEra } = await import('../lib/era/load-era');

    await expect(loadLedgerEra('v8')).rejects.toBeInstanceOf(Ledger8RuntimeMissingError);

    const repaired = await loadLedgerEra('v8');
    expect(repaired.version).toBe('v8');
    expect(await loadLedgerEra('v8')).toBe(repaired);
    expect(loadLedger8).toHaveBeenCalledTimes(2);
  });

  // The acquisition failure already carries a protocol code and its own
  // wrapped cause. Re-wrapping it here would bury both behind a second layer
  // and break `instanceof` narrowing for every caller.
  // The mock rejects with an already-wrapped Ledger8RuntimeMissingError
  // because that is the real loadLedger8 contract: it never rejects with a raw
  // module-resolution error (see ../lib/load-v8.ts). Asserted by IDENTITY, not
  // just by class: a re-wrap would still be an instance of the same class
  // while burying the original cause a level deeper.
  it('lets a coded acquisition failure through unwrapped', async () => {
    const cause = new Error('ERR_MODULE_NOT_FOUND');
    const missing = new Ledger8RuntimeMissingError('/v8', cause);
    vi.doMock('../lib/v8/load', () => ({ loadLedger8: () => Promise.reject(missing) }));
    const { loadLedgerEra } = await import('../lib/era/load-era');

    const rejection = await loadLedgerEra('v8').then(
      () => {
        throw new Error('expected loadLedgerEra to reject');
      },
      (error: unknown) => error
    );

    expect(rejection).toBe(missing);
    expect(rejection).toMatchObject({ code: PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_MISSING, subpath: '/v8' });
    expect((rejection as Ledger8RuntimeMissingError).cause).toBe(cause);
  });
});
