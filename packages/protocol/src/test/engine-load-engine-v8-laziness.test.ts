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

import { afterEach, describe, expect, it, vi } from 'vitest';

// Lives in its own file — a single doMock'd `'../lib/load-v8'`, reached only
// through a dynamic re-import of `../lib/engine` — so this poisoned module
// registry cannot leak into the engine-facade happy-path suites (same
// isolation precedent as load-v8-failure.test.ts).
//
// What this pins is the laziness contract stated on `Ledger8Engine`
// (`../lib/engine/index.ts`): only the two composition legs need the v8 ledger
// module, so constructing the engine must not acquire it. Without this gate,
// hoisting the load back into `createLedger8Engine`'s `Promise.all` would make
// every keep-state consumer instantiate multi-megabyte v8 WASM it never calls,
// and nothing would fail. Asserted against `loadLedger8` itself rather than
// against the built bundle, because this is a property of the call graph, not
// of how rollup happened to chunk it.
describe('createLedger8Engine — v8 ledger module acquisition', () => {
  afterEach(() => {
    vi.doUnmock('../lib/load-v8');
  });

  it('does not acquire the v8 ledger module during construction, and acquires it on the first composition call', async () => {
    const loadLedger8 = vi.fn(() => Promise.reject(new Error('acquired the v8 ledger module')));
    vi.doMock('../lib/load-v8', () => ({ loadLedger8 }));
    const { createLedger8Engine } = await import('../lib/engine');

    const engine = await createLedger8Engine();

    expect(loadLedger8).not.toHaveBeenCalled();
    await expect(
      engine.composeDeployTx({
        contractState: { serialize: () => new Uint8Array([1]) },
        verifierKeys: new Map(),
        networkId: 'test-network',
        ttl: new Date(Date.now() + 3_600_000)
      })
    ).rejects.toThrow(/acquired the v8 ledger module/);
    expect(loadLedger8).toHaveBeenCalledTimes(1);
  });
});
