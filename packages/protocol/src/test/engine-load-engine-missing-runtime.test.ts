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

import { Ledger8RuntimeMissingError } from '../errors';

// Lives in its own file — a single doMock'd `'../load-v8'` scenario, using
// only a dynamic re-import of `../engine` — so this poisoned module registry
// cannot leak into any other engine-facade suite (same isolation precedent
// as load-v8-failure.test.ts). The mock rejects with an already-wrapped
// Ledger8RuntimeMissingError because that is the real loadLedger8 contract:
// it never rejects with a raw module-resolution error (see ../load-v8.ts).
describe('createLedger8Engine construction — retained v8 ledger unresolvable', () => {
  afterEach(() => {
    vi.doUnmock('../load-v8');
  });

  it('rejects with the loader Ledger8RuntimeMissingError, unwrapped, when the v8 ledger module cannot be acquired', async () => {
    const missing = new Ledger8RuntimeMissingError(new Error('simulated missing v8 install'));
    vi.doMock('../load-v8', () => ({ loadLedger8: () => Promise.reject(missing) }));
    const { createLedger8Engine } = await import('../engine');

    await expect(createLedger8Engine()).rejects.toBe(missing);
  });
});
