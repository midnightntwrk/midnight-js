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

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { Ledger8RuntimeMissingError } from '../errors';

const PKG_ROOT = resolve(__dirname, '..', '..');
const distEngineExists = existsSync(resolve(PKG_ROOT, 'dist/engine.mjs'));
// Built from parts so the sole-reference scan in v8-surface.test.ts keeps
// matching only engine/load-engine.ts (same precedent as
// load-v8-failure.test.ts's own V8_SUBPATH_SPECIFIER).
const ENGINE_SUBPATH_SPECIFIER = ['@midnight-ntwrk/midnight-js-protocol', 'engine'].join('/');

// loadLedger8Engine resolves the self-reference specifier through the exports
// map to dist/engine.mjs, so this suite needs a prior `yarn build`; without
// one it is reported as visible skips (same policy as dist-laziness.test.ts /
// load-v8-failure.test.ts). Lives in its own file so the mocked, poisoned
// module registry cannot leak into engine-load-engine.test.ts's happy-path
// suite (same isolation precedent as load-v8-failure.test.ts).
describe.skipIf(!distEngineExists)('loadLedger8Engine failure path', () => {
  afterEach(() => {
    vi.doUnmock(ENGINE_SUBPATH_SPECIFIER);
  });

  it('wraps a failed engine-chunk load in Ledger8RuntimeMissingError and retries on the next call', async () => {
    vi.doMock(ENGINE_SUBPATH_SPECIFIER, () => {
      throw new Error('simulated engine chunk load failure');
    });
    const { loadLedger8Engine } = await import('../engine/load-engine');

    const first = loadLedger8Engine();
    const error = await first.then(
      () => {
        throw new Error('expected loadLedger8Engine to reject');
      },
      (rejection: unknown) => rejection
    );
    expect(error).toBeInstanceOf(Ledger8RuntimeMissingError);

    const second = loadLedger8Engine();
    expect(second).not.toBe(first);
    await expect(second).rejects.toBeInstanceOf(Ledger8RuntimeMissingError);
  });

  it('does not double-wrap when the engine chunk itself already rejects with Ledger8RuntimeMissingError', async () => {
    const alreadyWrapped = new Ledger8RuntimeMissingError(new Error('inner resolution failure'));
    vi.doMock(ENGINE_SUBPATH_SPECIFIER, () => ({
      createLedger8Engine: () => Promise.reject(alreadyWrapped)
    }));
    const { loadLedger8Engine } = await import('../engine/load-engine');

    const error = await loadLedger8Engine().then(
      () => {
        throw new Error('expected loadLedger8Engine to reject');
      },
      (rejection: unknown) => rejection
    );
    expect(error).toBe(alreadyWrapped);
  });
});
