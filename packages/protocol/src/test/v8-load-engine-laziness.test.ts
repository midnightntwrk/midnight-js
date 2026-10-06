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

import { readFileSync } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fixturePath } from './fixtures';

// Lives in its own file — a single doMock'd `'../lib/v8/load'`, reached only
// through a dynamic re-import of `../lib/v8/engine` — so this poisoned module
// registry cannot leak into the engine happy-path suites (same isolation
// precedent as v8-load-failure.test.ts).
//
// What this pins is the laziness contract stated on `Ledger8Engine`
// (`../lib/v8/engine.ts`): the engine must not reach the v8 ledger through THIS
// package's own loader.
//
// What this does NOT claim, and used to: that no v8 WASM is instantiated at all.
// compact-js's ledger-8 line brings ledger-v8 with it -- `Ledger` on
// `@midnight-ntwrk/compact-js/v8/effect` IS ledger-v8, and `lib/v8/executable.ts`
// decodes chain bytes through it -- so a retained-era execution does load that
// module now. The property still worth gating is that there is exactly ONE
// acquisition path: `loadLedger8` exists for the composition legs, and an engine
// method reaching for it would be a second one.
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

  it('never acquires the v8 ledger module through this package\'s own loader', async () => {
    const loadLedger8 = vi.fn(() => Promise.reject(new Error('acquired the v8 ledger module')));
    vi.doMock('../lib/v8/load', () => ({ loadLedger8 }));
    const { createLedger8Engine } = await import('../lib/v8/engine');

    const engine = await createLedger8Engine();

    expect(loadLedger8).not.toHaveBeenCalled();

    // Constructed but never used is a weaker claim than constructed and usable:
    // a method that reached for this package's v8 loader lazily would pass the
    // assertion above and fail here. `reexpressOperationsForCurrentEra` is the
    // cheapest real work on the surface and targets the CURRENT era, so it has
    // no business touching the retained ledger at all. It refuses an empty
    // entry-point list, so a real registered key is supplied.
    expect(
      engine.reexpressOperationsForCurrentEra([
        {
          circuitId: 'increment',
          verifierKey: new Uint8Array(readFileSync(fixturePath('twin-contract', 'compiled', 'keys', 'increment.verifier'))),
          verifierKeyHash: undefined
        }
      ])
    ).toBeDefined();
    expect(loadLedger8).not.toHaveBeenCalled();

    // The two methods that could PLAUSIBLY reach the loader lazily, which the
    // call above cannot speak for: it targets the current era, so it has no
    // business touching the retained ledger either way. Both are driven far
    // enough to run their own body -- each refuses its arguments before any
    // execution -- which is all this gate needs: an `await loadLedger8()` added
    // inside either one fires before the refusal does.
    await engine
      .executeCircuit({
        contract: { provableCircuits: {}, initialState: () => undefined },
        circuitId: 'increment',
        args: [],
        contractState: { state: { tag: 'null' }, balance: new Map(), entryPoints: [] },
        address: '00'.repeat(32),
        coinPk: '0'.repeat(64),
        privateState: {}
      })
      .catch(() => undefined);
    expect(loadLedger8).not.toHaveBeenCalled();

    await engine
      .executeConstructor({
        contract: { provableCircuits: {}, initialState: () => undefined },
        args: [],
        privateState: {},
        coinPk: '0'.repeat(64),
        signingKey: 'not-a-signing-key',
        verifierKeys: () => Promise.resolve(undefined)
      })
      .catch(() => undefined);
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
      'executeCircuit',
      'executeConstructor',
      'reexpressOperationsForCurrentEra',
      'wrapKeepStateCall'
    ]);
  });
});
