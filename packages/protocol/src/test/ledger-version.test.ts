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

import { describe, expect, it } from 'vitest';

import { LEDGER_VERSIONS } from '../lib/shared/ledger-version';
import * as version from '../version';

// `lib/ledger-version.ts` exists to break a module cycle: `errors.ts` needs
// `LedgerVersion` to type the era every composition failure names, and
// `version.ts` needs `errors.ts` for the error it throws. Holding the constant
// in a leaf that imports nothing lets both reach it without either importing
// the other.
describe('LEDGER_VERSIONS', () => {
  it('is exactly the closed two-version set', () => {
    expect([...LEDGER_VERSIONS].sort()).toEqual(['v8', 'v9']);
  });

  // Indexed by values only type-checked for TypeScript callers (the envelope
  // and era decoder tables), so a downstream package must not be able to
  // mutate the shared set at runtime — the same discipline
  // `PROTOCOL_ERROR_CODES` applies to its own registry.
  it('is frozen', () => {
    expect(Object.isFrozen(LEDGER_VERSIONS)).toBe(true);
  });

  // Re-exported, not re-declared. A copied literal would type-check, pass the
  // assertion above, and still let the two drift apart on the next edit.
  it('is the same object the version module publishes', () => {
    expect(version.LEDGER_VERSIONS).toBe(LEDGER_VERSIONS);
  });
});
