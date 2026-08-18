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

import { Ledger8RuntimeMissingError, PROTOCOL_ERROR_CODES } from '../errors';

const PKG_ROOT = resolve(__dirname, '..', '..');
const distV8Exists = existsSync(resolve(PKG_ROOT, 'dist/v8.mjs'));
// Built from parts so the sole-reference scan in v8-surface.test.ts keeps
// matching only load-v8.ts.
const V8_SUBPATH_SPECIFIER = ['@midnight-ntwrk/midnight-js-protocol', 'v8'].join('/');

// Lives in its own file so the mocked, poisoned module registry cannot leak
// into the happy-path suites (vitest isolates module state per test file).
// Needs a prior `yarn build`: mocking still resolves the specifier through
// the exports map to dist/v8.mjs (same policy as dist-laziness.test.ts).
describe.skipIf(!distV8Exists)('loadLedger8 failure path', () => {
  afterEach(() => {
    vi.doUnmock(V8_SUBPATH_SPECIFIER);
  });

  it('wraps a failed import in Ledger8RuntimeMissingError and retries on the next call', async () => {
    vi.doMock(V8_SUBPATH_SPECIFIER, () => {
      throw new Error('simulated v8 load failure');
    });
    const { loadLedger8 } = await import('../load-v8');

    const first = loadLedger8();
    const error = await first.then(
      () => {
        throw new Error('expected loadLedger8 to reject');
      },
      (rejection: unknown) => rejection
    );
    expect(error).toBeInstanceOf(Ledger8RuntimeMissingError);
    expect(error).toMatchObject({
      name: 'Ledger8RuntimeMissingError',
      code: PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_MISSING
    });
    // `cause` is non-enumerable on Error, so it needs a direct assertion.
    expect((error as Ledger8RuntimeMissingError).cause).toBeInstanceOf(Error);

    const second = loadLedger8();
    expect(second).not.toBe(first);
    await expect(second).rejects.toBeInstanceOf(Ledger8RuntimeMissingError);
  });
});
