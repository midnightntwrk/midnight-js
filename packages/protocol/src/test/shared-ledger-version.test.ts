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

import { CURRENT_LEDGER_VERSION, LEDGER_VERSIONS, RETAINED_LEDGER_VERSIONS } from '../lib/shared/ledger-version';
import * as version from '../version';

// `lib/shared/ledger-version.ts` exists to break a module cycle: `errors.ts` needs
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

// Which era is CURRENT is a protocol fact — it is the era whose objects
// `./ledger` hands out live — so it is declared beside the era set rather than
// restated by every package that has to split "now" from "still supported".
describe('CURRENT_LEDGER_VERSION', () => {
  it('is the era whose live objects the ledger subpath serves', () => {
    expect(CURRENT_LEDGER_VERSION).toBe('v9');
  });

  it('is a member of the era set', () => {
    expect(LEDGER_VERSIONS).toContain(CURRENT_LEDGER_VERSION);
  });

  it('is the same value the version module publishes', () => {
    expect(version.CURRENT_LEDGER_VERSION).toBe(CURRENT_LEDGER_VERSION);
  });
});

describe('RETAINED_LEDGER_VERSIONS', () => {
  // Equality against the set difference, not `toContain`: the point of this
  // constant is that it holds EVERY era except the current one, so a member
  // going missing has to fail here. A one-directional assertion would pass on
  // an empty list.
  it('is exactly the era set minus the current era', () => {
    expect([...RETAINED_LEDGER_VERSIONS].sort()).toEqual(
      LEDGER_VERSIONS.filter((era) => era !== CURRENT_LEDGER_VERSION).sort()
    );
  });

  it('does not contain the current era', () => {
    expect(RETAINED_LEDGER_VERSIONS).not.toContain(CURRENT_LEDGER_VERSION);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(RETAINED_LEDGER_VERSIONS)).toBe(true);
  });

  it('is the same object the version module publishes', () => {
    expect(version.RETAINED_LEDGER_VERSIONS).toBe(RETAINED_LEDGER_VERSIONS);
  });
});
