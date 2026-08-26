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

import { Ledger8InstanceMismatchError, Ledger8RuntimeMissingError } from '../errors';

// Built from parts so the runtime-reference scan in v8-surface.test.ts keeps
// matching only lib/engine/load-engine.ts. Resolved from this file, it names
// the same module lib/engine/load-engine.ts imports (same precedent as
// load-v8-failure.test.ts's own V8_MODULE_SPECIFIER).
const ENGINE_MODULE_SPECIFIER = ['..', 'engine.js'].join('/');

// Under vitest both sides of that specifier resolve to src/engine.ts, which is
// what makes the doMock below intercept at all — so this suite needs no prior
// `yarn build`. Lives in its own file so the mocked, poisoned module registry
// cannot leak into engine-load-engine.test.ts's happy-path suite (same
// isolation precedent as load-v8-failure.test.ts).
describe('loadLedger8Engine failure path', () => {
  afterEach(() => {
    vi.doUnmock(ENGINE_MODULE_SPECIFIER);
  });

  it('wraps a failed engine-chunk load in Ledger8RuntimeMissingError and retries on the next call', async () => {
    vi.doMock(ENGINE_MODULE_SPECIFIER, () => {
      throw new Error('simulated engine chunk load failure');
    });
    const { loadLedger8Engine } = await import('../lib/v8/load-engine');

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

  it('passes a Ledger8InstanceMismatchError from engine construction through unwrapped, and clears the memo for retry', async () => {
    const mismatch = new Ledger8InstanceMismatchError('onchain-runtime-v3');
    vi.doMock(ENGINE_MODULE_SPECIFIER, () => ({
      createLedger8Engine: () => Promise.reject(mismatch)
    }));
    const { loadLedger8Engine } = await import('../lib/v8/load-engine');

    const first = loadLedger8Engine();
    const error = await first.then(
      () => {
        throw new Error('expected loadLedger8Engine to reject');
      },
      (rejection: unknown) => rejection
    );
    expect(error).toBe(mismatch);

    const second = loadLedger8Engine();
    expect(second).not.toBe(first);
    await expect(second).rejects.toBe(mismatch);
  });

  it('does not double-wrap when the engine chunk itself already rejects with Ledger8RuntimeMissingError', async () => {
    const alreadyWrapped = new Ledger8RuntimeMissingError('/engine', new Error('inner resolution failure'));
    vi.doMock(ENGINE_MODULE_SPECIFIER, () => ({
      createLedger8Engine: () => Promise.reject(alreadyWrapped)
    }));
    const { loadLedger8Engine } = await import('../lib/v8/load-engine');

    const error = await loadLedger8Engine().then(
      () => {
        throw new Error('expected loadLedger8Engine to reject');
      },
      (rejection: unknown) => rejection
    );
    expect(error).toBe(alreadyWrapped);
  });
});
