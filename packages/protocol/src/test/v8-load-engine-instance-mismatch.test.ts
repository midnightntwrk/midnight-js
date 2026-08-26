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

import { Ledger8InstanceMismatchError, PROTOCOL_ERROR_CODES } from '../errors';
import type * as InstanceGuard from '../lib/v8/instance-guard';

// Lives in its own file — a single doMock'd `'../lib/v8/instance-guard'`
// scenario, using only a dynamic re-import of `../engine` — so this poisoned
// module registry cannot leak into any other engine-facade suite (same
// isolation precedent as v8-load-failure.test.ts). The underlying detection
// logic (does assertSharedLedger8Instance actually catch a dual-instantiation)
// is already covered by v8-instance-guard.test.ts; this test only proves
// the facade WIRES that guard into construction, rejecting before an engine
// is ever returned.
describe('createLedger8Engine construction — dual-instantiation guard wiring', () => {
  afterEach(() => {
    vi.doUnmock('../lib/v8/instance-guard');
  });

  it('rejects before returning an engine when assertSharedLedger8Instance detects a dual-instantiation', async () => {
    vi.doMock('../lib/v8/instance-guard', async (importOriginal) => {
      const actual = await importOriginal<typeof InstanceGuard>();
      return {
        ...actual,
        assertSharedLedger8Instance: () => {
          throw new Ledger8InstanceMismatchError('onchain-runtime-v3');
        }
      };
    });
    const { createLedger8Engine } = await import('../lib/v8/engine');

    const rejection = await createLedger8Engine().then(
      () => {
        throw new Error('expected createLedger8Engine to reject');
      },
      (error: unknown) => error
    );
    expect(rejection).toBeInstanceOf(Ledger8InstanceMismatchError);
    expect((rejection as Ledger8InstanceMismatchError).code).toBe(PROTOCOL_ERROR_CODES.LEDGER8_INSTANCE_MISMATCH);
  });
});
