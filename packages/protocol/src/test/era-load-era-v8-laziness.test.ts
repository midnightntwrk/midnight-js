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

import type * as LoadV8Module from '../lib/load-v8';

// Lives in its own file — a single doMock'd `'../lib/load-v8'`, reached only
// through a dynamic re-import of `../lib/era/load-era` — so this poisoned
// module registry cannot leak into the happy-path era suites (same isolation
// precedent as load-v8-failure.test.ts).
//
// What this pins is the one laziness property the facade still owes a v9-only
// consumer. Asking for the v8 era IS the observation of v8, so acquiring the
// retained pre-fork ledger inside `loadLedgerEra('v8')` costs that consumer
// nothing — but a v9 era must never reach for it. Without this gate, a v8
// acquisition hoisted into the shared dispatch would make every v9-only
// consumer instantiate multi-megabyte WASM it never calls, and nothing would
// fail. Asserted against `loadLedger8` itself rather than against the built
// bundle, because this is a property of the call graph, not of how rollup
// happened to chunk it.
describe('loadLedgerEra — v8 ledger module acquisition', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('../lib/load-v8');
  });

  it('never acquires the v8 ledger module for the v9 era', async () => {
    const loadLedger8 = vi.fn(() => Promise.reject(new Error('acquired the v8 ledger module')));
    vi.doMock('../lib/load-v8', () => ({ loadLedger8 }));
    const { loadLedgerEra } = await import('../lib/era/load-era');

    const era = await loadLedgerEra('v9');

    expect(era.version).toBe('v9');
    expect(loadLedger8).not.toHaveBeenCalled();
  });

  // Once, not once per method: the era object binds the acquired module in
  // closure, which is what lets every method on it stay synchronous.
  it('acquires the v8 ledger module exactly once for the v8 era', async () => {
    const actual = await vi.importActual<typeof LoadV8Module>('../lib/load-v8');
    const loadLedger8 = vi.fn(actual.loadLedger8);
    vi.doMock('../lib/load-v8', () => ({ loadLedger8 }));
    const { loadLedgerEra } = await import('../lib/era/load-era');

    const era = await loadLedgerEra('v8');
    await loadLedgerEra('v8');

    expect(era.version).toBe('v8');
    expect(loadLedger8).toHaveBeenCalledTimes(1);
  });
});
