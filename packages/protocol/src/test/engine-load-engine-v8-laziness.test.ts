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

import * as ocrt3 from '@midnight-ntwrk/onchain-runtime-v3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Lives in its own file — a single doMock'd `'../lib/v8/load'`, reached only
// through a dynamic re-import of `../lib/engine` — so this poisoned module
// registry cannot leak into the engine happy-path suites (same isolation
// precedent as load-v8-failure.test.ts).
//
// What this pins is the laziness contract stated on `Ledger8Engine`
// (`../lib/v8/engine.ts`): NOTHING on the engine surface needs the v8 ledger
// module, so constructing the engine must not acquire it and neither must any
// of its methods. Without this gate, hoisting the load back into
// `createLedger8Engine`'s `Promise.all` would make every keep-state consumer
// instantiate multi-megabyte v8 WASM it never calls, and hard-depend on
// ledger-v8 resolving, with nothing failing.
//
// The era facade has its own version of this property, and it is a DIFFERENT
// one: `era-load-era-v8-laziness.test.ts` gates `loadLedgerEra('v9')`, which is
// a separate call graph from this one. Neither test covers the other's claim.
//
// Asserted against `loadLedger8` itself rather than against the built bundle,
// because this is a property of the call graph, not of how rollup happened to
// chunk it.
describe('createLedger8Engine — v8 ledger module acquisition', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('../lib/v8/load');
  });

  it('never acquires the v8 ledger module, and serves a working engine without it', async () => {
    const loadLedger8 = vi.fn(() => Promise.reject(new Error('acquired the v8 ledger module')));
    vi.doMock('../lib/v8/load', () => ({ loadLedger8 }));
    const { createLedger8Engine } = await import('../lib/v8/engine');

    const engine = await createLedger8Engine();

    expect(loadLedger8).not.toHaveBeenCalled();

    // Constructed but never used is a weaker claim than constructed and usable:
    // a method that reached for the v8 module lazily would pass the assertion
    // above and fail here. Down-conversion is the cheapest real work on the
    // surface, and it is the step every retained-era consumer starts with.
    const encoded = ocrt3.StateValue.newCell({
      value: [new Uint8Array(32).fill(1)],
      alignment: [{ tag: 'atom', value: { tag: 'field' } }]
    }).encode();

    expect(engine.downConvertForExecution(encoded)).toBeDefined();
    expect(loadLedger8).not.toHaveBeenCalled();
  });

  // The assertion above is only as good as its premise: it covers the surface
  // that exists. A fifth method added later — one that DOES need the v8 module —
  // would leave the claim above true and the contract broken, so the surface
  // this file reasons about is pinned here rather than assumed.
  it('reasons about the whole engine surface', async () => {
    const loadLedger8 = vi.fn(() => Promise.reject(new Error('acquired the v8 ledger module')));
    vi.doMock('../lib/v8/load', () => ({ loadLedger8 }));
    const { createLedger8Engine } = await import('../lib/v8/engine');

    const engine = await createLedger8Engine();

    expect(Object.keys(engine).sort()).toEqual([
      'downConvertForExecution',
      'executeCircuit',
      'executeConstructor',
      'wrapKeepStateCall'
    ]);
  });
});
