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
// as load-v8-failure.test.ts).
describe('createLedger8Engine construction — retained runtime unresolvable', () => {
  afterEach(() => {
    vi.doUnmock('../load-v8');
  });

  it('rejects with Ledger8RuntimeMissingError before acquiring any WASM', async () => {
    vi.doMock('../load-v8', () => ({ loadLedger8: () => Promise.reject(new Error('simulated missing v8 install')) }));
    const { createLedger8Engine } = await import('../engine');

    await expect(createLedger8Engine()).rejects.toBeInstanceOf(Ledger8RuntimeMissingError);
  });
});
